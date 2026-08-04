from django.conf import settings
from django.db import models

from apps.classes_app.models import Slot
from apps.core.models import TimeStampedModel
from apps.payments.models import UserSubscription


class Booking(TimeStampedModel):
    """A single user's reservation of a single slot.

    slot is a OneToOneField — this is the hard, DB-level guarantee behind
    "one slot can contain only one booking." Combined with
    select_for_update() row-locking in services.create_booking, this is
    what actually prevents two concurrent requests from double-booking
    the same slot (see services.py for the full race-condition story).

    Booking deducts a session immediately at creation time if the user has
    a usable subscription (see services.create_booking, which calls
    apps.payments.services.deduct_session). There is no cancel-and-refund
    path — once deducted, a session only ever moves to a different slot via
    transfer/reschedule, never back to the balance. Attendance
    (mark_attended / revert_attended) is a pure status flag and no longer
    touches the session balance.
    """

    class Status(models.TextChoices):
        BOOKED = 'booked', 'Booked'
        ATTENDED = 'attended', 'Attended'

    slot = models.ForeignKey(
        Slot,
        on_delete=models.PROTECT,
        related_name='bookings',
        help_text='One slot can contain only one booking — enforced by this being a OneToOneField.',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='bookings',
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.BOOKED)
    attended_at = models.DateTimeField(null=True, blank=True)
    subscription_deducted_from = models.ForeignKey(
        UserSubscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings_deducted',
        help_text='Set when a session was deducted for this booking at creation time (create_booking).',
    )

    class Meta:
        db_table = 'bookings_booking'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status'], name='idx_booking_user_status'),
            models.Index(fields=['created_at'], name='idx_booking_created_date'),
        ]

    def __str__(self):
        return f'{self.user_id} — {self.slot_id} ({self.status})'


class BookingChangeRequest(TimeStampedModel):
    """Auditable, approval-gated request to move an existing booking."""

    class RequestType(models.TextChoices):
        TRANSFER = 'transfer', 'Admin Transfer'
        RESCHEDULE = 'reschedule', 'User Reschedule'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    booking = models.ForeignKey(
        Booking,
        on_delete=models.PROTECT,
        related_name='change_requests',
    )
    request_type = models.CharField(max_length=16, choices=RequestType.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='booking_change_requests',
    )
    current_slot = models.ForeignKey(
        Slot,
        on_delete=models.SET_NULL,
        null=True,
        related_name='booking_change_current_requests',
    )
    requested_slot = models.ForeignKey(
        Slot,
        on_delete=models.SET_NULL,
        null=True,
        related_name='booking_change_requested_requests',
    )
    current_date = models.DateField()
    current_start_time = models.TimeField()
    current_end_time = models.TimeField()
    requested_date = models.DateField()
    requested_start_time = models.TimeField()
    requested_end_time = models.TimeField()
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_booking_change_requests',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    decision_reason = models.CharField(max_length=255, blank=True)
    notification_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'bookings_booking_change_request'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['booking', 'status'], name='idx_change_booking_status'),
            models.Index(fields=['request_type', 'status'], name='idx_change_type_status'),
            models.Index(fields=['requested_date'], name='idx_change_requested_date'),
        ]

    def __str__(self):
        return f'{self.request_type} #{self.pk} for booking {self.booking_id} ({self.status})'
