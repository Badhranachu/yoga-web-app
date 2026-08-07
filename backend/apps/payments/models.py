import secrets
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel


def _generate_transaction_id():
    return f'txn_{secrets.token_urlsafe(18)}'


def _generate_receipt_number():
    return f'EKAM-{timezone.localdate().strftime("%Y%m%d")}-{secrets.token_hex(5).upper()}'


class SubscriptionPlan(TimeStampedModel):
    """The studio's single subscription offering. One row, admin-edited in
    place — same pattern as classes_app.TimetableConfig. Never created or
    deleted through the app; seeded once by migration.

    monthly_price and included_sessions are exactly the two values the
    admin configures ("Monthly Price", "Included Sessions", default 30).
    """

    monthly_price = models.DecimalField(max_digits=10, decimal_places=2)
    included_sessions = models.PositiveIntegerField(default=30)
    is_active = models.BooleanField(
        default=True,
        help_text='Whether new purchases/renewals are currently allowed against this plan.',
    )

    class Meta:
        db_table = 'payments_subscription_plan'

    def __str__(self):
        return f'{self.monthly_price}/mo — {self.included_sessions} sessions'

    def clean(self):
        from django.core.exceptions import ValidationError

        errors = {}
        if self.monthly_price is not None and self.monthly_price < 0:
            errors['monthly_price'] = 'Monthly price cannot be negative.'
        if self.included_sessions is not None and self.included_sessions <= 0:
            errors['included_sessions'] = 'Included sessions must be at least 1.'
        if errors:
            raise ValidationError(errors)


class UserSubscription(TimeStampedModel):
    """One user's purchased subscription cycle. A user has at most one
    ACTIVE subscription at a time; purchasing/renewing while one is active
    extends it, it does not stack a second row on top.

    sessions_remaining is the live balance this phase's session service
    (apps.payments.services) mutates via deduct_session/restore_session —
    those calls will come from the future Bookings module, never from here.
    """

    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        ACTIVE = 'active', 'Active'
        EXPIRED = 'expired', 'Expired'
        EXHAUSTED = 'exhausted', 'Sessions Exhausted'
        CANCELLED = 'cancelled', 'Cancelled'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscriptions',
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='subscriptions',
        help_text='The plan configuration in effect when this subscription was purchased/renewed.',
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    sessions_included = models.PositiveIntegerField(help_text='Snapshot of plan.included_sessions at purchase/renewal time.')
    sessions_remaining = models.PositiveIntegerField()
    price_paid = models.DecimalField(max_digits=10, decimal_places=2, help_text='Snapshot of plan.monthly_price at purchase/renewal time.')
    start_date = models.DateField()
    end_date = models.DateField()
    low_usage_reminder_sent_at = models.DateTimeField(
        null=True, blank=True,
        help_text='Set once the 10-days-left low-usage reminder email has been sent for this cycle, so it never sends twice.',
    )

    class Meta:
        db_table = 'payments_user_subscription'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status'], name='idx_usersub_user_status'),
        ]

    def __str__(self):
        return f'{self.user_id} — {self.status} ({self.sessions_remaining}/{self.sessions_included})'

    @property
    def is_expired(self) -> bool:
        return timezone.localdate() > self.end_date

    @property
    def has_sessions(self) -> bool:
        return self.sessions_remaining > 0

    @classmethod
    def cycle_end_date(cls, start: 'timezone.datetime.date') -> 'timezone.datetime.date':
        return start + timedelta(days=30)


class SlotPurchase(TimeStampedModel):
    """A pay-per-slot purchase, made when a user has no active subscription
    or has exhausted their session balance. Functions as a single-use
    credit: paid for up front (independent of which slot, if any, is picked
    at that moment), then consumed by apps.bookings.services.create_booking
    the next time this user books any slot — see used_at/used_for_booking.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='slot_purchases',
    )
    price_paid = models.DecimalField(max_digits=10, decimal_places=2, help_text='Snapshot of the single-slot price at purchase time.')
    used_at = models.DateTimeField(null=True, blank=True, help_text='Set when this credit is consumed by a booking.')
    used_for_booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='slot_purchase_credits_used',
        help_text='The booking this credit was spent on, if any.',
    )

    class Meta:
        db_table = 'payments_slot_purchase'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user_id} — single slot @ {self.price_paid}'

    @property
    def is_used(self) -> bool:
        return self.used_at is not None


class PaymentTransaction(TimeStampedModel):
    """Gateway-neutral ledger entry for a completed or attempted payment."""

    class PaymentType(models.TextChoices):
        SUBSCRIPTION = 'subscription', 'Monthly Subscription'
        SINGLE_SLOT = 'single_slot', 'Single Slot'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SUCCESSFUL = 'successful', 'Successful'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='payment_transactions',
    )
    transaction_id = models.CharField(max_length=64, unique=True, default=_generate_transaction_id)
    provider = models.CharField(max_length=64, blank=True, default='')
    provider_transaction_id = models.CharField(max_length=128, blank=True, default='')
    payment_type = models.CharField(max_length=16, choices=PaymentType.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    subscription = models.ForeignKey(
        UserSubscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_transactions',
    )
    slot_purchase = models.ForeignKey(
        SlotPurchase,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_transactions',
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'payments_transaction'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status'], name='idx_payment_user_status'),
            models.Index(fields=['payment_type', 'status'], name='idx_payment_type_status'),
            models.Index(fields=['status', 'created_at'], name='idx_payment_status_date'),
        ]

    def __str__(self):
        return f'{self.transaction_id} — {self.user_id} — {self.amount} {self.currency}'


class Receipt(TimeStampedModel):
    """Immutable receipt snapshot generated for every successful payment."""

    transaction = models.OneToOneField(
        PaymentTransaction,
        on_delete=models.PROTECT,
        related_name='receipt',
    )
    receipt_number = models.CharField(max_length=64, unique=True, default=_generate_receipt_number)
    user_name = models.CharField(max_length=301, blank=True)
    user_email = models.EmailField()
    payment_type = models.CharField(max_length=16, choices=PaymentTransaction.PaymentType.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    payment_date = models.DateTimeField()
    status = models.CharField(max_length=16, choices=PaymentTransaction.Status.choices)

    class Meta:
        db_table = 'payments_receipt'
        ordering = ['-payment_date']

    def __str__(self):
        return self.receipt_number
