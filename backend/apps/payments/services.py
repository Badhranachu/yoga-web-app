"""
Subscription business logic: purchasing, renewing, and session-balance
mutation. Kept entirely separate from any booking implementation — the
future Bookings module is expected to import and call deduct_session /
restore_session when a booking's attendance status changes, but nothing
in this module knows what a "booking" or a "slot" is.

Reusability contract for deduct_session / restore_session:
    deduct_session(subscription)   # Booking marked attended
    restore_session(subscription)  # Attended booking reverted
Both operate purely on a UserSubscription instance and return it updated.
Callers decide *when* to call them; this module only enforces that a
balance never goes negative and status transitions stay consistent.
"""

from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.core.models import StudioSetting
from apps.core.settings_keys import SINGLE_SLOT_PRICE, SINGLE_SLOT_PRICE_DEFAULT
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService

from .models import PaymentTransaction, Receipt, SlotPurchase, SubscriptionPlan, UserSubscription

SUBSCRIPTION_CYCLE_DAYS = 30


class NoActivePlanError(Exception):
    """Raised when a purchase/renewal is attempted but no active SubscriptionPlan exists."""


class SubscriptionStateError(Exception):
    """Raised for invalid subscription state transitions (e.g. deducting with no active subscription)."""


def get_active_plan() -> SubscriptionPlan:
    plan = SubscriptionPlan.objects.filter(is_active=True).order_by('-id').first()
    if plan is None:
        raise NoActivePlanError('No active subscription plan is configured.')
    return plan


def get_single_slot_price() -> Decimal:
    return StudioSetting.get_decimal(SINGLE_SLOT_PRICE, Decimal(SINGLE_SLOT_PRICE_DEFAULT))


@transaction.atomic
def record_successful_payment(
    user,
    amount: Decimal,
    payment_type: str,
    *,
    subscription: UserSubscription | None = None,
    slot_purchase: SlotPurchase | None = None,
    provider: str = '',
    provider_transaction_id: str = '',
    metadata: dict | None = None,
) -> PaymentTransaction:
    """Create the internal payment ledger entry and immutable receipt.

    This is the gateway boundary: a future adapter can supply provider and
    provider_transaction_id after charging externally, without putting any
    gateway-specific code in subscription or booking services.
    """
    payment = PaymentTransaction.objects.create(
        user=user,
        provider=provider,
        provider_transaction_id=provider_transaction_id,
        payment_type=payment_type,
        amount=amount,
        status=PaymentTransaction.Status.SUCCESSFUL,
        subscription=subscription,
        slot_purchase=slot_purchase,
        metadata=metadata or {},
    )
    Receipt.objects.create(
        transaction=payment,
        user_name=user.full_name,
        user_email=user.email,
        payment_type=payment_type,
        amount=amount,
        currency=payment.currency,
        payment_date=payment.created_at,
        status=payment.status,
    )
    NotificationService.create(
        user,
        Notification.NotificationType.PAYMENT_SUCCESSFUL,
        'Payment Successful',
        f'Your payment of {payment.amount} {payment.currency} was successful.',
        related_type='payment_transaction',
        related_id=payment.pk,
        action_url='/account/subscription',
        dedupe_key=f'payment-successful:{payment.pk}',
    )
    return payment


def get_active_subscription(user) -> UserSubscription | None:
    """The user's current usable subscription, or None. A subscription is
    only "usable" while ACTIVE, not expired by date, and has sessions
    remaining — callers needing the raw latest row regardless of state
    should query UserSubscription directly instead.
    """
    subscription = (
        UserSubscription.objects.filter(user=user, status=UserSubscription.Status.ACTIVE)
        .order_by('-created_at')
        .first()
    )
    if subscription is None:
        return None

    _sync_status(subscription)
    if subscription.status != UserSubscription.Status.ACTIVE:
        return None
    return subscription


def _sync_status(subscription: UserSubscription) -> None:
    """Lazily transitions a subscription out of ACTIVE if it has expired
    by date or run out of sessions, so status is always accurate on read
    without needing a scheduled job."""
    if subscription.status != UserSubscription.Status.ACTIVE:
        return

    new_status = None
    if subscription.is_expired:
        new_status = UserSubscription.Status.EXPIRED
    elif subscription.sessions_remaining <= 0:
        new_status = UserSubscription.Status.EXHAUSTED

    if new_status:
        subscription.status = new_status
        subscription.save(update_fields=['status', 'updated_at'])
        if new_status == UserSubscription.Status.EXPIRED:
            NotificationService.create(
                subscription.user,
                Notification.NotificationType.SUBSCRIPTION_EXPIRED,
                'Subscription Expired',
                'Your subscription has expired. Renew to continue your membership.',
                related_type='subscription',
                related_id=subscription.pk,
                action_url='/account/subscription',
                dedupe_key=f'subscription-expired:{subscription.pk}',
            )


@transaction.atomic
def purchase_subscription(user) -> UserSubscription:
    """Starts a brand-new subscription cycle for a user who has no
    currently-active one. If the user already has an ACTIVE, usable
    subscription, this raises rather than silently stacking a second one
    — renew_subscription is the correct call for extending an existing one.
    """
    # Serialize purchase/renewal decisions per user. A user row is always
    # present, so this lock prevents two concurrent requests from both
    # observing "no active subscription" and creating duplicate active rows.
    locked_user = user.__class__.objects.select_for_update().get(pk=user.pk)
    existing = get_active_subscription(locked_user)
    if existing is not None:
        raise SubscriptionStateError('User already has an active subscription. Use renew instead.')

    plan = get_active_plan()
    today = timezone.localdate()

    subscription = UserSubscription.objects.create(
        user=locked_user,
        plan=plan,
        status=UserSubscription.Status.ACTIVE,
        sessions_included=plan.included_sessions,
        sessions_remaining=plan.included_sessions,
        price_paid=plan.monthly_price,
        start_date=today,
        end_date=today + timedelta(days=SUBSCRIPTION_CYCLE_DAYS),
    )
    record_successful_payment(
        locked_user,
        plan.monthly_price,
        PaymentTransaction.PaymentType.SUBSCRIPTION,
        subscription=subscription,
    )
    NotificationService.create(
        locked_user,
        Notification.NotificationType.SUBSCRIPTION_PURCHASED,
        'Subscription Purchased',
        f'Your subscription is active with {subscription.sessions_included} sessions.',
        related_type='subscription',
        related_id=subscription.pk,
        action_url='/account/subscription',
        dedupe_key=f'subscription-purchased:{subscription.pk}',
    )
    return subscription


@transaction.atomic
def renew_subscription(user) -> UserSubscription:
    """Renews the user's subscription — usable whether the previous cycle
    is still active, expired, or exhausted (all three are legitimate
    reasons to renew). Always starts a fresh cycle at the plan's current
    price/session count rather than carrying over unused sessions, and
    marks any prior ACTIVE row as no longer active first.
    """
    locked_user = user.__class__.objects.select_for_update().get(pk=user.pk)
    plan = get_active_plan()
    today = timezone.localdate()

    previous = (
        UserSubscription.objects.filter(user=locked_user, status=UserSubscription.Status.ACTIVE)
        .order_by('-created_at')
        .first()
    )
    if previous is not None:
        previous.status = UserSubscription.Status.CANCELLED
        previous.save(update_fields=['status', 'updated_at'])

    subscription = UserSubscription.objects.create(
        user=locked_user,
        plan=plan,
        status=UserSubscription.Status.ACTIVE,
        sessions_included=plan.included_sessions,
        sessions_remaining=plan.included_sessions,
        price_paid=plan.monthly_price,
        start_date=today,
        end_date=today + timedelta(days=SUBSCRIPTION_CYCLE_DAYS),
    )
    record_successful_payment(
        locked_user,
        plan.monthly_price,
        PaymentTransaction.PaymentType.SUBSCRIPTION,
        subscription=subscription,
    )
    NotificationService.create(
        locked_user,
        Notification.NotificationType.SUBSCRIPTION_RENEWED,
        'Subscription Renewed',
        f'Your subscription was renewed with {subscription.sessions_included} sessions.',
        related_type='subscription',
        related_id=subscription.pk,
        action_url='/account/subscription',
        dedupe_key=f'subscription-renewed:{subscription.pk}',
    )
    return subscription


@transaction.atomic
def deduct_session(subscription: UserSubscription) -> UserSubscription:
    """Deducts exactly one session from the given subscription's balance.
    Intended caller: the future Bookings module, when a booking is marked
    attended. Never lets the balance go below zero; transitions the
    subscription to EXHAUSTED the moment it hits zero so
    get_active_subscription() stops returning it immediately.
    """
    locked = UserSubscription.objects.select_for_update().get(pk=subscription.pk)

    if locked.sessions_remaining <= 0:
        raise SubscriptionStateError('This subscription has no sessions remaining to deduct.')

    locked.sessions_remaining -= 1
    if locked.sessions_remaining == 0:
        locked.status = UserSubscription.Status.EXHAUSTED
    locked.save(update_fields=['sessions_remaining', 'status', 'updated_at'])
    return locked


@transaction.atomic
def restore_session(subscription: UserSubscription) -> UserSubscription:
    """Restores exactly one session to the given subscription's balance.
    Intended caller: the future Bookings module, when a previously
    attended booking is reverted (e.g. an attendance-marking mistake is
    corrected). Never restores past the plan's original session count,
    and reactivates an EXHAUSTED subscription back to ACTIVE if it still
    has valid dates.
    """
    locked = UserSubscription.objects.select_for_update().get(pk=subscription.pk)

    if locked.sessions_remaining >= locked.sessions_included:
        raise SubscriptionStateError('Cannot restore a session above the plan\'s included session count.')

    locked.sessions_remaining += 1
    if locked.status == UserSubscription.Status.EXHAUSTED and not locked.is_expired:
        locked.status = UserSubscription.Status.ACTIVE
    locked.save(update_fields=['sessions_remaining', 'status', 'updated_at'])
    return locked


@transaction.atomic
def record_slot_purchase(user) -> SlotPurchase:
    """Pay-per-slot path, used when the user has no usable subscription.
    Purely a payment record for this phase — the future Bookings module
    ties a specific slot booking to this purchase.
    """
    purchase = SlotPurchase.objects.create(user=user, price_paid=get_single_slot_price())
    record_successful_payment(
        user,
        purchase.price_paid,
        PaymentTransaction.PaymentType.SINGLE_SLOT,
        slot_purchase=purchase,
    )
    return purchase
