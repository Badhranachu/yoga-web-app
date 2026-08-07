from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Notification(TimeStampedModel):
    """In-app notification record with a future-proof delivery boundary."""

    class NotificationType(models.TextChoices):
        BOOKING_CONFIRMED = 'booking_confirmed', 'Booking Confirmed'
        BOOKING_CANCELLED = 'booking_cancelled', 'Booking Cancelled'
        TRANSFER_REQUEST = 'transfer_request', 'Transfer Request'
        TRANSFER_APPROVED = 'transfer_approved', 'Transfer Approved'
        TRANSFER_REJECTED = 'transfer_rejected', 'Transfer Rejected'
        RESCHEDULE_REQUEST = 'reschedule_request', 'Reschedule Request'
        RESCHEDULE_APPROVED = 'reschedule_approved', 'Reschedule Approved'
        RESCHEDULE_REJECTED = 'reschedule_rejected', 'Reschedule Rejected'
        SUBSCRIPTION_PURCHASED = 'subscription_purchased', 'Subscription Purchased'
        SUBSCRIPTION_RENEWED = 'subscription_renewed', 'Subscription Renewed'
        SUBSCRIPTION_EXPIRED = 'subscription_expired', 'Subscription Expired'
        SUBSCRIPTION_LOW_USAGE = 'subscription_low_usage', 'Subscription Low Usage'
        PAYMENT_SUCCESSFUL = 'payment_successful', 'Payment Successful'

    class Channel(models.TextChoices):
        IN_APP = 'in_app', 'In App'

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    notification_type = models.CharField(max_length=32, choices=NotificationType.choices)
    channel = models.CharField(max_length=16, choices=Channel.choices, default=Channel.IN_APP)
    title = models.CharField(max_length=160)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    related_type = models.CharField(max_length=64, blank=True)
    related_id = models.CharField(max_length=64, blank=True)
    action_url = models.CharField(max_length=255, blank=True)
    dedupe_key = models.CharField(max_length=160, unique=True, null=True, blank=True)

    class Meta:
        db_table = 'notifications_notification'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read'], name='idx_notif_recipient_read'),
            models.Index(fields=['recipient', 'created_at'], name='idx_notif_recipient_date'),
        ]

    def __str__(self):
        return f'{self.recipient_id} — {self.title}'
