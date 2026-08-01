"""
Booking creation, cancellation, and attendance management.

Race-condition story ("prevent race conditions" / "use database locking"):
Two users could POST a booking for the same slot at virtually the same
instant. Without locking, both requests could read is_booked=False,
both pass the check, and both attempt to create a Booking — a classic
TOCTOU (time-of-check to time-of-use) race.

create_booking closes this with two independent layers:
  1. select_for_update() takes a row-level lock on the target Slot inside
     an atomic transaction. Whichever request's SELECT ... FOR UPDATE
     commits first holds the lock; the second request's SELECT blocks
     until the first transaction commits or rolls back, then re-reads
     the now-committed state and correctly sees is_booked=True.
  2. Booking.slot is a OneToOneField (DB-level UNIQUE constraint) as a
     hard backstop — even if the row lock were somehow bypassed, the
     database itself refuses a second Booking row for the same slot_id.

Attendance and session deduction are intentionally decoupled from booking
creation (business rule): booking only reserves a slot. A session is
deducted only when an admin marks a booking ATTENDED, and restored if
that's reverted — see mark_attended / revert_attended, which call
apps.payments.services.deduct_session / restore_session.
"""

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.classes_app.models import Slot
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService
from apps.payments.services import deduct_session, get_active_subscription, restore_session

from .models import Booking, BookingChangeRequest


class SlotUnavailableError(Exception):
    """Raised when a slot cannot be booked: already booked, on a leave date, or nonexistent/past."""


class SlotConflictError(SlotUnavailableError):
    """Raised when a requested slot was booked before this transaction won the lock."""

    def __init__(self, message: str, suggested_slot: Slot | None = None):
        super().__init__(message)
        self.suggested_slot = suggested_slot


class BookingStateError(Exception):
    """Raised for invalid booking state transitions (e.g. cancelling an already-cancelled booking)."""


class BookingChangeRequestError(Exception):
    """Raised for invalid transfer/reschedule request state or permissions."""


class RequestedSlotUnavailableError(BookingChangeRequestError):
    """Raised when a requested target slot is no longer available."""


def _next_available_slot(slot: Slot) -> Slot | None:
    """Find and lock the next chronological available slot.

    The ordering is explicit and stable (date, start time, id), so every
    conflicted request receives the same suggestion for the same database
    state. The candidate is locked while it is inspected, but never reserved;
    accepting the suggestion must issue a normal booking request.
    """
    today = timezone.localdate()
    return (
        Slot.objects.select_for_update()
        .filter(
            Q(date__gt=slot.date) | Q(date=slot.date, start_time__gt=slot.start_time),
            date__gte=today,
            is_booked=False,
            leave__isnull=True,
        )
        .order_by('date', 'start_time', 'id')
        .first()
    )


def _validate_target_slot(slot: Slot, current_slot_id: int) -> None:
    if slot.pk == current_slot_id:
        raise RequestedSlotUnavailableError('The requested slot must be different from the current slot.')
    if slot.date < timezone.localdate():
        raise RequestedSlotUnavailableError('The requested slot is in the past.')
    if slot.leave_id:
        raise RequestedSlotUnavailableError('The requested slot is unavailable due to studio leave.')
    if slot.is_booked:
        raise RequestedSlotUnavailableError('The requested slot has already been booked.')


def _notify_change_request(change_request: BookingChangeRequest) -> None:
    """Send the existing email-based notification mechanism and audit delivery."""
    booking = change_request.booking
    if change_request.request_type == BookingChangeRequest.RequestType.TRANSFER:
        recipients = [booking.user.email]
        subject = 'Action required: your EKAM Yoga booking transfer'
        greeting = booking.user.first_name or 'there'
        action = 'Please accept or reject this transfer request from your account.'
    else:
        recipients = list(
            booking.user.__class__.objects.filter(
                role=booking.user.Role.ADMIN,
                is_active=True,
            ).values_list('email', flat=True)
        )
        subject = 'Action required: booking reschedule request'
        greeting = 'Admin'
        action = 'Please approve or reject this reschedule request from the dashboard.'

        NotificationService.notify_admins(
            Notification.NotificationType.RESCHEDULE_REQUEST,
            'Reschedule Request',
            f'{booking.user.email} requested a new class time: {change_request.requested_date} '
            f'at {change_request.requested_start_time.strftime("%H:%M")}.',
            related_type='booking_change_request',
            related_id=change_request.pk,
            action_url='/dashboard/bookings',
            dedupe_key=f'reschedule-request:{change_request.pk}',
        )

    if change_request.request_type == BookingChangeRequest.RequestType.TRANSFER:
        NotificationService.create(
            booking.user,
            Notification.NotificationType.TRANSFER_REQUEST,
            'Transfer Request',
            f'An admin requested to move your booking to {change_request.requested_date} '
            f'at {change_request.requested_start_time.strftime("%H:%M")}.',
            related_type='booking_change_request',
            related_id=change_request.pk,
            action_url='/account',
            dedupe_key=f'transfer-request:{change_request.pk}',
        )

    if recipients:
        send_mail(
            subject=subject,
            message=(
                f'Hello {greeting},\n\n'
                f'Current slot: {change_request.current_date} '
                f'{change_request.current_start_time.strftime("%H:%M")}–'
                f'{change_request.current_end_time.strftime("%H:%M")}\n'
                f'Requested slot: {change_request.requested_date} '
                f'{change_request.requested_start_time.strftime("%H:%M")}–'
                f'{change_request.requested_end_time.strftime("%H:%M")}\n\n'
                f'{action}'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=True,
        )

    change_request.notification_sent_at = timezone.now()
    change_request.save(update_fields=['notification_sent_at', 'updated_at'])


@transaction.atomic
def _create_change_request(user, booking_id: int, slot_id: int, request_type: str) -> BookingChangeRequest:
    booking = Booking.objects.select_for_update().select_related('slot', 'user').get(pk=booking_id)

    if booking.status != Booking.Status.BOOKED:
        raise BookingChangeRequestError('Only booked reservations can be transferred or rescheduled.')

    if request_type == BookingChangeRequest.RequestType.TRANSFER:
        if not user.is_admin:
            raise BookingChangeRequestError('Only an admin can create a transfer request.')
    elif booking.user_id != user.pk:
        raise BookingChangeRequestError('You can only reschedule your own booking.')

    if BookingChangeRequest.objects.filter(
        booking=booking,
        status=BookingChangeRequest.Status.PENDING,
    ).exists():
        raise BookingChangeRequestError('A change request is already pending for this booking.')

    try:
        target = Slot.objects.select_for_update().get(pk=slot_id)
    except Slot.DoesNotExist as exc:
        raise RequestedSlotUnavailableError('The requested slot does not exist.') from exc
    _validate_target_slot(target, booking.slot_id)

    change_request = BookingChangeRequest.objects.create(
        booking=booking,
        request_type=request_type,
        requested_by=user,
        current_slot=booking.slot,
        requested_slot=target,
        current_date=booking.slot.date,
        current_start_time=booking.slot.start_time,
        current_end_time=booking.slot.end_time,
        requested_date=target.date,
        requested_start_time=target.start_time,
        requested_end_time=target.end_time,
    )
    _notify_change_request(change_request)
    return change_request


def create_transfer_request(admin, booking_id: int, slot_id: int) -> BookingChangeRequest:
    return _create_change_request(admin, booking_id, slot_id, BookingChangeRequest.RequestType.TRANSFER)


def create_reschedule_request(user, booking_id: int, slot_id: int) -> BookingChangeRequest:
    return _create_change_request(user, booking_id, slot_id, BookingChangeRequest.RequestType.RESCHEDULE)


def _lock_change_request(request_id: int):
    request = BookingChangeRequest.objects.get(pk=request_id)
    booking = Booking.objects.select_for_update().select_related('slot', 'user').get(pk=request.booking_id)
    locked_request = BookingChangeRequest.objects.select_for_update().select_related(
        'booking', 'booking__user', 'requested_by', 'requested_slot', 'current_slot'
    ).get(pk=request_id)
    return locked_request, booking


def _validate_decision_actor(change_request: BookingChangeRequest, actor) -> None:
    if change_request.request_type == BookingChangeRequest.RequestType.TRANSFER:
        if change_request.booking.user_id != actor.pk:
            raise BookingChangeRequestError('Only the booking owner can respond to a transfer request.')
    elif not actor.is_admin:
        raise BookingChangeRequestError('Only an admin can respond to a reschedule request.')


@transaction.atomic
def approve_change_request(request_id: int, actor) -> BookingChangeRequest:
    change_request, booking = _lock_change_request(request_id)
    _validate_decision_actor(change_request, actor)

    if change_request.status != BookingChangeRequest.Status.PENDING:
        raise BookingChangeRequestError('This change request has already been decided.')
    if booking.status != Booking.Status.BOOKED:
        raise BookingChangeRequestError('Only booked reservations can be moved.')

    old_slot = Slot.objects.select_for_update().get(pk=booking.slot_id)
    if change_request.requested_slot_id is None:
        raise RequestedSlotUnavailableError('The requested slot no longer exists.')
    try:
        target_slot = Slot.objects.select_for_update().get(pk=change_request.requested_slot_id)
    except Slot.DoesNotExist as exc:
        raise RequestedSlotUnavailableError('The requested slot no longer exists.') from exc
    _validate_target_slot(target_slot, old_slot.pk)

    old_slot.is_booked = False
    old_slot.save(update_fields=['is_booked', 'updated_at'])
    target_slot.is_booked = True
    target_slot.save(update_fields=['is_booked', 'updated_at'])
    booking.slot = target_slot
    booking.save(update_fields=['slot', 'updated_at'])

    change_request.status = BookingChangeRequest.Status.APPROVED
    change_request.reviewed_by = actor
    change_request.reviewed_at = timezone.now()
    change_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
    change_request.booking = booking
    change_request.requested_slot = target_slot

    if change_request.request_type == BookingChangeRequest.RequestType.TRANSFER:
        recipient = booking.user
        notification_type = Notification.NotificationType.TRANSFER_APPROVED
        title = 'Transfer Approved'
        message = f'Your booking was moved to {target_slot.date} at {target_slot.start_time.strftime("%H:%M")}.'
        action_url = '/account'
    else:
        recipient = change_request.requested_by
        notification_type = Notification.NotificationType.RESCHEDULE_APPROVED
        title = 'Reschedule Approved'
        message = f'Your reschedule request was approved for {target_slot.date} at {target_slot.start_time.strftime("%H:%M")}.'
        action_url = '/account'
    NotificationService.create(
        recipient,
        notification_type,
        title,
        message,
        related_type='booking_change_request',
        related_id=change_request.pk,
        action_url=action_url,
        dedupe_key=f'change-approved:{change_request.pk}',
    )
    return change_request


@transaction.atomic
def reject_change_request(request_id: int, actor, reason: str = '') -> BookingChangeRequest:
    change_request, _booking = _lock_change_request(request_id)
    _validate_decision_actor(change_request, actor)

    if change_request.status != BookingChangeRequest.Status.PENDING:
        raise BookingChangeRequestError('This change request has already been decided.')

    change_request.status = BookingChangeRequest.Status.REJECTED
    change_request.reviewed_by = actor
    change_request.reviewed_at = timezone.now()
    change_request.decision_reason = reason[:255]
    change_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'decision_reason', 'updated_at'])

    if change_request.request_type == BookingChangeRequest.RequestType.TRANSFER:
        recipient = change_request.booking.user
        notification_type = Notification.NotificationType.TRANSFER_REJECTED
        title = 'Transfer Rejected'
        action_url = '/account'
    else:
        recipient = change_request.requested_by
        notification_type = Notification.NotificationType.RESCHEDULE_REJECTED
        title = 'Reschedule Rejected'
        action_url = '/account'
    NotificationService.create(
        recipient,
        notification_type,
        title,
        f'Your booking change request was rejected{f": {reason}" if reason else "."}',
        related_type='booking_change_request',
        related_id=change_request.pk,
        action_url=action_url,
        dedupe_key=f'change-rejected:{change_request.pk}',
    )
    return change_request


@transaction.atomic
def create_booking(user, slot_id: int) -> Booking:
    """Reserves a slot for a user. Locks the Slot row for the duration of
    this transaction so a concurrent request for the same slot_id blocks
    until this one finishes, then correctly sees the slot as unavailable.

    No payment or subscription check happens here — booking creation is
    independent of payment/subscription balance, per business rule.
    """
    try:
        slot = Slot.objects.select_for_update().get(pk=slot_id)
    except Slot.DoesNotExist:
        raise SlotUnavailableError('This slot does not exist.')

    if slot.date < timezone.localdate():
        raise SlotUnavailableError('This slot is in the past and cannot be booked.')

    if slot.leave_id:
        raise SlotUnavailableError('This slot is unavailable due to studio leave.')

    if slot.is_booked:
        raise SlotConflictError(
            'This slot has already been booked.',
            suggested_slot=_next_available_slot(slot),
        )

    if Booking.objects.filter(slot=slot, status=Booking.Status.BOOKED).exists():
        raise SlotConflictError(
            'This slot already has an active booking.',
            suggested_slot=_next_available_slot(slot),
        )

    booking = Booking.objects.create(slot=slot, user=user, status=Booking.Status.BOOKED)

    slot.is_booked = True
    slot.save(update_fields=['is_booked', 'updated_at'])

    NotificationService.create(
        user,
        Notification.NotificationType.BOOKING_CONFIRMED,
        'Booking Confirmed',
        f'Your class is booked for {slot.date} at {slot.start_time.strftime("%H:%M")}.',
        related_type='booking',
        related_id=booking.pk,
        action_url='/account',
        dedupe_key=f'booking-confirmed:{booking.pk}',
    )

    return booking


@transaction.atomic
def cancel_booking(booking: Booking) -> Booking:
    """Cancels a BOOKED (not yet attended) booking and frees the slot.
    The Booking row is kept — cancelled bookings remain visible as
    history, they are never deleted. No session is deducted or restored:
    per business rule, only attendance touches the session balance.
    """
    locked = Booking.objects.select_for_update().select_related('slot').get(pk=booking.pk)

    if locked.status != Booking.Status.BOOKED:
        raise BookingStateError(f'Cannot cancel a booking with status "{locked.status}".')

    locked.status = Booking.Status.CANCELLED
    locked.cancelled_at = timezone.now()
    locked.save(update_fields=['status', 'cancelled_at', 'updated_at'])

    slot = locked.slot
    slot.is_booked = False
    slot.save(update_fields=['is_booked', 'updated_at'])

    NotificationService.create(
        locked.user,
        Notification.NotificationType.BOOKING_CANCELLED,
        'Booking Cancelled',
        f'Your booking for {slot.date} at {slot.start_time.strftime("%H:%M")} was cancelled.',
        related_type='booking',
        related_id=locked.pk,
        action_url='/account',
        dedupe_key=f'booking-cancelled:{locked.pk}',
    )

    return locked


@transaction.atomic
def mark_attended(booking: Booking) -> Booking:
    """Admin action: marks a BOOKED booking ATTENDED and deducts one
    session from the booking user's currently active subscription, if
    they have one. A pay-per-slot user (no active subscription) has
    nothing to deduct — attendance is still recorded, just without a
    balance change.

    Records exactly which subscription the session was deducted from
    (subscription_deducted_from), so revert_attended restores to that
    same subscription later rather than whichever one happens to be
    active at revert time — those can differ if the user renews in between.
    """
    locked = Booking.objects.select_for_update().get(pk=booking.pk)

    if locked.status != Booking.Status.BOOKED:
        raise BookingStateError(f'Cannot mark attended from status "{locked.status}".')

    subscription = get_active_subscription(locked.user)
    if subscription is not None:
        deduct_session(subscription)
        locked.subscription_deducted_from = subscription

    locked.status = Booking.Status.ATTENDED
    locked.attended_at = timezone.now()
    locked.save(update_fields=['status', 'attended_at', 'subscription_deducted_from', 'updated_at'])

    return locked


@transaction.atomic
def revert_attended(booking: Booking) -> Booking:
    """Admin action: reverts an ATTENDED booking back to BOOKED. If a
    session was deducted at attend time (subscription_deducted_from is
    set), restores exactly one session to that same subscription —
    never to a different one the user may have since purchased.
    """
    locked = Booking.objects.select_for_update().get(pk=booking.pk)

    if locked.status != Booking.Status.ATTENDED:
        raise BookingStateError(f'Cannot revert attendance from status "{locked.status}".')

    if locked.subscription_deducted_from is not None:
        restore_session(locked.subscription_deducted_from)
        locked.subscription_deducted_from = None

    locked.status = Booking.Status.BOOKED
    locked.attended_at = None
    locked.save(update_fields=['status', 'attended_at', 'subscription_deducted_from', 'updated_at'])

    return locked
