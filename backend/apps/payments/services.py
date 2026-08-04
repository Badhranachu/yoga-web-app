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

import hmac
import hashlib
from datetime import timedelta
from decimal import Decimal

import razorpay
from django.conf import settings
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


class PaymentVerificationError(Exception):
    """Raised when a Razorpay checkout signature fails verification."""


def get_razorpay_client() -> razorpay.Client:
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_razorpay_order(amount: Decimal, *, receipt: str) -> dict:
    """Creates a Razorpay Order for the given amount (INR) and returns the
    raw order dict. amount is in rupees; Razorpay expects paise.
    """
    client = get_razorpay_client()
    return client.order.create({
        'amount': int(amount * 100),
        'currency': 'INR',
        'receipt': receipt,
        'payment_capture': 1,
    })


def verify_razorpay_signature(*, order_id: str, payment_id: str, signature: str) -> None:
    generated = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode('utf-8'),
        f'{order_id}|{payment_id}'.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(generated, signature):
        raise PaymentVerificationError('Payment signature verification failed.')


def get_active_plan() -> SubscriptionPlan:
    plan = SubscriptionPlan.objects.filter(is_active=True).order_by('-id').first()
    if plan is None:
        raise NoActivePlanError('No active subscription plan is configured.')
    return plan


def get_single_slot_price() -> Decimal:
    return StudioSetting.get_decimal(SINGLE_SLOT_PRICE, Decimal(SINGLE_SLOT_PRICE_DEFAULT))


def create_order_for_payment_type(user, payment_type: str) -> dict:
    """Creates a Razorpay order for the amount matching the requested
    action (subscription purchase/renew always charges the current plan
    price; single_slot charges the current single-slot price). Returns the
    raw order data the frontend needs to open Razorpay Checkout.
    """
    if payment_type == PaymentTransaction.PaymentType.SUBSCRIPTION:
        amount = get_active_plan().monthly_price
    else:
        amount = get_single_slot_price()

    order = create_razorpay_order(amount, receipt=f'{payment_type}-{user.pk}-{int(timezone.now().timestamp())}')
    return {'order': order, 'amount': amount}


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
def purchase_subscription(user, *, provider: str = '', provider_transaction_id: str = '', metadata: dict | None = None) -> UserSubscription:
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
        provider=provider,
        provider_transaction_id=provider_transaction_id,
        metadata=metadata,
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
def renew_subscription(user, *, provider: str = '', provider_transaction_id: str = '', metadata: dict | None = None) -> UserSubscription:
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
        provider=provider,
        provider_transaction_id=provider_transaction_id,
        metadata=metadata,
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
def record_slot_purchase(user, *, provider: str = '', provider_transaction_id: str = '', metadata: dict | None = None) -> SlotPurchase:
    """Pay-per-slot path, used when the user has no usable subscription.
    Creates an unused credit — see get_unused_slot_purchase / consume_slot_purchase
    for how it's later redeemed against a specific booking.
    """
    purchase = SlotPurchase.objects.create(user=user, price_paid=get_single_slot_price())
    record_successful_payment(
        user,
        purchase.price_paid,
        PaymentTransaction.PaymentType.SINGLE_SLOT,
        slot_purchase=purchase,
        provider=provider,
        provider_transaction_id=provider_transaction_id,
        metadata=metadata,
    )
    return purchase


def get_unused_slot_purchase(user) -> SlotPurchase | None:
    """The user's oldest unused single-slot credit, if any — spent
    oldest-first so credits don't sit around indefinitely. Used by
    apps.bookings.services.create_booking to decide whether a booking is
    already paid for.
    """
    return SlotPurchase.objects.filter(user=user, used_at__isnull=True).order_by('created_at').first()


@transaction.atomic
def consume_slot_purchase(purchase: SlotPurchase, booking) -> SlotPurchase:
    """Marks a single-slot credit as spent on the given booking. Locks the
    row so two concurrent bookings can never both consume the same credit.
    """
    locked = SlotPurchase.objects.select_for_update().get(pk=purchase.pk)
    if locked.used_at is not None:
        raise SubscriptionStateError('This slot credit has already been used.')

    locked.used_at = timezone.now()
    locked.used_for_booking = booking
    locked.save(update_fields=['used_at', 'used_for_booking', 'updated_at'])
    return locked
