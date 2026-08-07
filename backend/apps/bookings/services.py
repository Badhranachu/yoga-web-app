"""
Booking creation and attendance management.

Capacity model: a slot has multiple bookable spots — one per instructor
account, minus however many are on leave for that specific slot/date (see
apps.classes_app.models.Slot.capacity / booked_count). "Full" now means
booked_count >= capacity, not a boolean is_booked flag.

Race-condition story ("prevent race conditions" / "use database locking"):
Two users could POST a booking for the same slot at virtually the same
instant, both reading booked_count < capacity as true, and both attempt to
create a Booking — a classic TOCTOU (time-of-check to time-of-use) race.
create_booking closes this with select_for_update(): it takes a row-level
lock on the target Slot inside an atomic transaction. Whichever request's
SELECT ... FOR UPDATE commits first holds the lock; the second request's
SELECT blocks until the first transaction commits, then re-reads the
now-committed booking count before deciding whether a spot remains.

Session deduction happens at booking time, not at attendance (business
rule): if the booking user has a usable subscription, create_booking
deducts one session immediately and records which subscription it came
from. There is no cancel-and-refund path — once deducted, a session is
only ever moved to a different slot via transfer/reschedule (which keeps
the same subscription_deducted_from), never returned to the balance.
mark_attended / revert_attended no longer touch the session balance;
attendance is purely a record of whether the member showed up.
"""

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.classes_app.models import Slot
from apps.instructors.models import InstructorProfile
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService
from apps.payments.services import consume_slot_purchase, deduct_session, get_active_subscription, get_unused_slot_purchase

from .models import Booking, BookingChangeRequest


class SlotUnavailableError(Exception):
    """Raised when a slot cannot be booked: already booked, on a leave date, or nonexistent/past."""


class SlotConflictError(SlotUnavailableError):
    """Raised when a requested slot was booked before this transaction won the lock."""

    def __init__(self, message: str, suggested_slot: Slot | None = None):
        super().__init__(message)
        self.suggested_slot = suggested_slot


class BookingStateError(Exception):
    """Raised for invalid booking state transitions (e.g. marking an already-attended booking attended again)."""


class BookingChangeRequestError(Exception):
    """Raised for invalid transfer/reschedule request state or permissions."""


class RequestedSlotUnavailableError(BookingChangeRequestError):
    """Raised when a requested target slot is no longer available."""


def assign_instructor(slot: Slot) -> InstructorProfile | None:
    """Picks a free instructor for a newly-created booking on this slot:
    among instructors NOT on leave for this slot/date (same exclusion
    Slot.instructor_leave_count uses), the one with the fewest upcoming
    BOOKED/ATTENDED assignments gets it — a simple round-robin that spreads
    load without needing any admin setup. Returns None only if every
    instructor is on leave here or no instructor accounts exist at all;
    the caller leaves Booking.instructor null in that case rather than
    failing the booking outright (capacity already guarantees a spot
    exists — see Slot.capacity — this only decides who takes it).
    """
    from apps.instructors.leave_models import InstructorLeave

    on_leave_ids = InstructorLeave.objects.filter(date=slot.date).filter(
        Q(slots=slot) | Q(slots=None)
    ).values_list('instructor_id', flat=True)

    today = timezone.localdate()
    candidates = (
        InstructorProfile.objects.exclude(pk__in=on_leave_ids)
        .annotate(
            upcoming_count=Count(
                'assigned_bookings',
                filter=Q(
                    assigned_bookings__status__in=[Booking.Status.BOOKED, Booking.Status.ATTENDED],
                    assigned_bookings__slot__date__gte=today,
                ),
            ),
        )
        .order_by('upcoming_count', 'id')
    )
    return candidates.first()


def _next_available_slot(slot: Slot) -> Slot | None:
    """Find and lock the next chronological available slot (one with an
    open spot: booked_count < capacity).

    The ordering is explicit and stable (date, start time, id), so every
    conflicted request receives the same suggestion for the same database
    state. The candidate is locked while it is inspected, but never reserved;
    accepting the suggestion must issue a normal booking request.
    """
    today = timezone.localdate()
    candidates = (
        Slot.objects.select_for_update()
        .filter(
            Q(date__gt=slot.date) | Q(date=slot.date, start_time__gt=slot.start_time),
            date__gte=today,
            leave__isnull=True,
        )
        .order_by('date', 'start_time', 'id')
    )
    for candidate in candidates:
        if candidate.capacity > 0 and candidate.booked_count < candidate.capacity:
            return candidate
    return None


def _validate_target_slot(slot: Slot, current_slot_id: int) -> None:
    if slot.pk == current_slot_id:
        raise RequestedSlotUnavailableError('The requested slot must be different from the current slot.')
    if slot.date < timezone.localdate():
        raise RequestedSlotUnavailableError('The requested slot is in the past.')
    if slot.leave_id:
        raise RequestedSlotUnavailableError('The requested slot is unavailable due to studio leave.')
    if slot.capacity <= 0 or slot.booked_count >= slot.capacity:
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
    """Reserves one spot in a slot for a user. Locks the Slot row for the
    duration of this transaction so a concurrent request for the same
    slot_id blocks until this one finishes, then correctly re-reads the
    committed booking count before deciding whether a spot remains.
    A slot has capacity spots (one per instructor, minus any on leave for
    this slot/date — see Slot.capacity); this succeeds as long as
    booked_count < capacity, not just for the very first booking.

    If the user has a usable subscription (active, unexpired, sessions
    remaining), one session is deducted immediately — booking is the
    charge point now, not attendance. Otherwise, if the user has an unused
    single-slot payment credit (apps.payments.services.SlotPurchase with
    used_at=None), that credit is consumed for this booking instead. A user
    with neither is expected to have already paid for this specific slot
    via the single-slot payment flow immediately before this is called
    (BookSlotPage's pay-then-book sequence), which creates the credit this
    call then consumes in the same request.
    """
    try:
        slot = Slot.objects.select_for_update().get(pk=slot_id)
    except Slot.DoesNotExist:
        raise SlotUnavailableError('This slot does not exist.')

    if slot.date < timezone.localdate():
        raise SlotUnavailableError('This slot is in the past and cannot be booked.')

    if slot.leave_id:
        raise SlotUnavailableError('This slot is unavailable due to studio leave.')

    if slot.capacity <= 0:
        raise SlotUnavailableError('This slot has no instructor available.')

    if slot.booked_count >= slot.capacity:
        raise SlotConflictError(
            'This slot is fully booked.',
            suggested_slot=_next_available_slot(slot),
        )

    subscription = get_active_subscription(user)
    if subscription is not None:
        subscription = deduct_session(subscription)

    booking = Booking.objects.create(
        slot=slot,
        user=user,
        status=Booking.Status.BOOKED,
        subscription_deducted_from=subscription,
        instructor=assign_instructor(slot),
    )

    if subscription is None:
        credit = get_unused_slot_purchase(user)
        if credit is not None:
            consume_slot_purchase(credit, booking)

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
def reassign_instructor(booking: Booking, instructor: InstructorProfile | None) -> Booking:
    """Admin action: overrides the auto-assigned instructor for a booking.
    instructor=None explicitly clears the assignment (e.g. the auto-pick
    was wrong and no replacement is decided yet).
    """
    locked = Booking.objects.select_for_update().get(pk=booking.pk)
    locked.instructor = instructor
    locked.save(update_fields=['instructor', 'updated_at'])
    return locked


@transaction.atomic
def mark_attended(booking: Booking) -> Booking:
    """Admin action: marks a BOOKED booking ATTENDED. Purely a record of
    whether the member showed up — the session for this booking (if any)
    was already deducted at booking time, so no balance change happens here.
    """
    locked = Booking.objects.select_for_update().get(pk=booking.pk)

    if locked.status != Booking.Status.BOOKED:
        raise BookingStateError(f'Cannot mark attended from status "{locked.status}".')

    locked.status = Booking.Status.ATTENDED
    locked.attended_at = timezone.now()
    locked.save(update_fields=['status', 'attended_at', 'updated_at'])

    return locked


@transaction.atomic
def revert_attended(booking: Booking) -> Booking:
    """Admin action: reverts an ATTENDED booking back to BOOKED. No balance
    change — attendance no longer affects the session balance either way.
    """
    locked = Booking.objects.select_for_update().get(pk=booking.pk)

    if locked.status != Booking.Status.ATTENDED:
        raise BookingStateError(f'Cannot revert attendance from status "{locked.status}".')

    locked.status = Booking.Status.BOOKED
    locked.attended_at = None
    locked.save(update_fields=['status', 'attended_at', 'updated_at'])

    return locked
