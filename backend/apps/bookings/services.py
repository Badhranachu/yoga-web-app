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


class AttendanceWindowError(BookingStateError):
    """Raised when an instructor tries to self-mark attendance outside the
    allowed window around the slot's start time (see
    instructor_mark_attended)."""


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
    # Date-only would wrongly accept a same-day slot whose time has
    # already elapsed (e.g. picking a 9 AM slot at 8 PM) — compare the
    # full end datetime instead.
    now = timezone.localtime()
    if slot.date < now.date() or (slot.date == now.date() and slot.end_time <= now.time()):
        raise RequestedSlotUnavailableError('The requested slot is in the past.')
    if slot.leave_id:
        raise RequestedSlotUnavailableError('The requested slot is unavailable due to studio leave.')
    if slot.capacity <= 0 or slot.booked_count >= slot.capacity:
        raise RequestedSlotUnavailableError('The requested slot has already been booked.')


def _notify_change_request(change_request: BookingChangeRequest) -> None:
    """Send the existing email-based notification mechanism and audit
    delivery. TRANSFER-only — the RESCHEDULE request_type this used to
    also handle was retired in favor of self_reschedule_booking (member
    reschedules are instant now, no approval to notify anyone about).
    """
    booking = change_request.booking
    recipients = [booking.user.email]
    subject = 'Action required: your Harmony Fusion Studio booking transfer'
    greeting = booking.user.first_name or 'there'
    action = 'Please accept or reject this transfer request from your account.'

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
def create_transfer_request(admin, booking_id: int, slot_id: int) -> BookingChangeRequest:
    """Admin-initiated: moves a MEMBER's booking, but only takes effect once
    the member approves it (see approve_change_request) — the member owns
    the decision since it's their class being moved without them asking.
    Member-initiated reschedules are instant instead (see
    self_reschedule_booking) — a member doesn't need anyone's permission
    to move their own booking to another open slot.
    """
    booking = Booking.objects.select_for_update().select_related('slot', 'user').get(pk=booking_id)

    if booking.status != Booking.Status.BOOKED:
        raise BookingChangeRequestError('Only booked reservations can be transferred.')
    if not admin.is_admin:
        raise BookingChangeRequestError('Only an admin can create a transfer request.')
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
        request_type=BookingChangeRequest.RequestType.TRANSFER,
        requested_by=admin,
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


@transaction.atomic
def self_reschedule_booking(user, booking_id: int, slot_id: int) -> Booking:
    """Member-initiated: instantly moves the member's own booking to a
    different open slot — no admin approval step, unlike the admin's
    transfer flow above. Same locking and target-slot validation as
    approve_change_request, just without any BookingChangeRequest
    bookkeeping, since there's no approval decision to record.
    """
    booking = Booking.objects.select_for_update().select_related('slot', 'user').get(pk=booking_id)

    if booking.user_id != user.pk:
        raise BookingChangeRequestError('You can only reschedule your own booking.')
    if booking.status != Booking.Status.BOOKED:
        raise BookingChangeRequestError('Only booked reservations can be rescheduled.')

    try:
        target_slot = Slot.objects.select_for_update().get(pk=slot_id)
    except Slot.DoesNotExist as exc:
        raise RequestedSlotUnavailableError('The requested slot does not exist.') from exc
    _validate_target_slot(target_slot, booking.slot_id)

    old_slot = booking.slot
    booking.slot = target_slot
    booking.save(update_fields=['slot', 'updated_at'])

    NotificationService.create(
        user,
        Notification.NotificationType.RESCHEDULE_APPROVED,
        'Class Rescheduled',
        f'Your class was moved from {old_slot.date} at {old_slot.start_time.strftime("%H:%M")} '
        f'to {target_slot.date} at {target_slot.start_time.strftime("%H:%M")}.',
        related_type='booking',
        related_id=booking.pk,
        action_url='/account',
        dedupe_key=f'self-reschedule:{booking.pk}:{target_slot.pk}',
    )
    return booking


def _lock_change_request(request_id: int):
    request = BookingChangeRequest.objects.get(pk=request_id)
    booking = Booking.objects.select_for_update().select_related('slot', 'user').get(pk=request.booking_id)
    locked_request = BookingChangeRequest.objects.select_for_update().select_related(
        'booking', 'booking__user', 'requested_by', 'requested_slot', 'current_slot'
    ).get(pk=request_id)
    return locked_request, booking


def _validate_decision_actor(change_request: BookingChangeRequest, actor) -> None:
    if change_request.booking.user_id != actor.pk:
        raise BookingChangeRequestError('Only the booking owner can respond to a transfer request.')


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

    NotificationService.create(
        booking.user,
        Notification.NotificationType.TRANSFER_APPROVED,
        'Transfer Approved',
        f'Your booking was moved to {target_slot.date} at {target_slot.start_time.strftime("%H:%M")}.',
        related_type='booking_change_request',
        related_id=change_request.pk,
        action_url='/account',
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

    NotificationService.create(
        change_request.booking.user,
        Notification.NotificationType.TRANSFER_REJECTED,
        'Transfer Rejected',
        f'Your booking change request was rejected{f": {reason}" if reason else "."}',
        related_type='booking_change_request',
        related_id=change_request.pk,
        action_url='/account',
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


# Self-attendance window: an instructor can mark their own assigned
# booking attended starting a few minutes before the slot's official
# start time (early arrivals shouldn't be blocked) through 10 minutes
# after it (late enough to confirm the class actually started, not so
# late that a forgotten class from hours ago could be waved through).
INSTRUCTOR_ATTEND_WINDOW_BEFORE_MINUTES = 5
INSTRUCTOR_ATTEND_WINDOW_AFTER_MINUTES = 10


def _minutes_from_slot_start(slot: Slot, now) -> float:
    """Minutes elapsed since the slot's start (negative if still ahead of
    it), computed from date+time-of-day components directly rather than
    building tz-aware datetimes — mirrors the comparison style already
    used in _validate_target_slot, and sidesteps any DST/tz edge cases
    since everything here is studio-local wall-clock time.
    """
    day_delta_minutes = (slot.date - now.date()).days * 24 * 60
    start_minutes = slot.start_time.hour * 60 + slot.start_time.minute
    now_minutes = now.hour * 60 + now.minute
    return day_delta_minutes + (now_minutes - start_minutes)


@transaction.atomic
def instructor_mark_attended(instructor_user, booking_id: int) -> Booking:
    """Lets the ASSIGNED INSTRUCTOR (not just an admin) mark their own
    booking attended, but only within a short window around the slot's
    start time — see INSTRUCTOR_ATTEND_WINDOW_*_MINUTES. Delegates the
    actual state transition to mark_attended so both entry points share
    one implementation of what "attended" means.
    """
    locked = Booking.objects.select_for_update().select_related('slot', 'instructor__user').get(pk=booking_id)

    if locked.instructor_id is None or locked.instructor.user_id != instructor_user.pk:
        raise BookingStateError('You can only mark attendance for classes assigned to you.')

    now = timezone.localtime()
    elapsed = _minutes_from_slot_start(locked.slot, now)
    if elapsed < -INSTRUCTOR_ATTEND_WINDOW_BEFORE_MINUTES:
        raise AttendanceWindowError('Too early — attendance can be marked closer to the class start time.')
    if elapsed > INSTRUCTOR_ATTEND_WINDOW_AFTER_MINUTES:
        raise AttendanceWindowError('Too late — this class\'s attendance window has closed.')

    return mark_attended(locked)


def get_instructor_stats(instructor_profile) -> dict:
    """Overview numbers for the instructor's own dashboard: hours worked
    and class counts, split by today / this month / all-time.

    "Hours worked" and "attended" cover every class whose slot has
    already ended, whether or not it was ever marked attended — per the
    business rule that a class counts as worked once its time has
    passed, independent of member attendance. "Expired, not attempted"
    is the subset of those that were never marked attended at all — the
    one figure that does depend on attendance being recorded.
    """
    now = timezone.localtime()
    today = now.date()
    month_start = today.replace(day=1)

    bookings = list(Booking.objects.filter(instructor=instructor_profile).select_related('slot'))

    def has_ended(slot) -> bool:
        return slot.date < today or (slot.date == today and slot.end_time <= now.time())

    def duration_hours(slot) -> float:
        start_minutes = slot.start_time.hour * 60 + slot.start_time.minute
        end_minutes = slot.end_time.hour * 60 + slot.end_time.minute
        return (end_minutes - start_minutes) / 60

    attended = [b for b in bookings if b.status == Booking.Status.ATTENDED]
    expired_unattempted = [b for b in bookings if b.status == Booking.Status.BOOKED and has_ended(b.slot)]
    past = attended + expired_unattempted
    upcoming = [b for b in bookings if b.status == Booking.Status.BOOKED and not has_ended(b.slot)]

    def is_today(d) -> bool:
        return d == today

    def is_this_month(d) -> bool:
        return month_start <= d <= today

    def bucket(items, predicate=lambda _d: True):
        matched = [b for b in items if predicate(b.slot.date)]
        return {'count': len(matched), 'hours': round(sum(duration_hours(b.slot) for b in matched), 2)}

    def classes_bucket(predicate):
        matched = [b for b in bookings if predicate(b.slot.date)]
        return len(matched)

    return {
        'hours_worked': {
            'today': bucket(past, is_today)['hours'],
            'month': bucket(past, is_this_month)['hours'],
            'total': bucket(past)['hours'],
        },
        'attended': {
            'today': bucket(attended, is_today)['count'],
            'month': bucket(attended, is_this_month)['count'],
            'total': bucket(attended)['count'],
        },
        'expired_unattempted': {
            'today': bucket(expired_unattempted, is_today)['count'],
            'month': bucket(expired_unattempted, is_this_month)['count'],
            'total': bucket(expired_unattempted)['count'],
        },
        'classes_today_total': classes_bucket(is_today),
        'classes_month_total': classes_bucket(is_this_month),
        'upcoming_count': len(upcoming),
    }
