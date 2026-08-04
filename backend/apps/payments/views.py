from django.conf import settings
from django.db.models import Count, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.core.models import StudioSetting
from apps.core.permissions import IsAdminRole
from apps.core.responses import error_response, success_response
from apps.core.settings_keys import SINGLE_SLOT_PRICE, SINGLE_SLOT_PRICE_DEFAULT

from .models import PaymentTransaction, Receipt, SubscriptionPlan, UserSubscription
from .pdf import render_receipt_pdf
from .serializers import (
    CreatePaymentOrderSerializer,
    SingleSlotPriceSerializer,
    SlotPurchaseSerializer,
    SubscriptionPlanSerializer,
    PaymentTransactionSerializer,
    ReceiptSerializer,
    UserSubscriptionSerializer,
    VerifyPaymentSerializer,
)
from .services import (
    NoActivePlanError,
    PaymentVerificationError,
    SubscriptionStateError,
    create_order_for_payment_type,
    get_active_subscription,
    get_single_slot_price,
    purchase_subscription,
    record_slot_purchase,
    renew_subscription,
    verify_razorpay_signature,
)


def _payment_processing_unavailable():
    return error_response(
        'Payment processing is not enabled in this environment. Configure a real payment gateway before enabling it.',
        code=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


def _payment_for_subscription(subscription):
    return PaymentTransaction.objects.filter(
        subscription=subscription,
        status=PaymentTransaction.Status.SUCCESSFUL,
    ).select_related('receipt').order_by('-id').first()


def _payment_for_slot_purchase(purchase):
    return PaymentTransaction.objects.filter(
        slot_purchase=purchase,
        status=PaymentTransaction.Status.SUCCESSFUL,
    ).select_related('receipt').order_by('-id').first()


class SubscriptionPlanView(APIView):
    """GET the studio's single subscription plan (any authenticated user —
    pricing must be visible before purchase). PATCH is admin-only and edits
    the one plan row in place; it never creates a second plan.
    """

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), IsAdminRole()]
        return [IsAuthenticated()]

    def get(self, request):
        plan = SubscriptionPlan.objects.order_by('-id').first()
        return success_response(data=SubscriptionPlanSerializer(plan).data if plan else None)

    def patch(self, request):
        plan = SubscriptionPlan.objects.order_by('-id').first()
        if plan is None:
            return error_response('No subscription plan exists to update.', code=status.HTTP_404_NOT_FOUND)

        serializer = SubscriptionPlanSerializer(plan, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(data=serializer.data, message='Subscription plan updated.')


class SingleSlotPriceView(APIView):
    """GET/PUT the single-slot pay-per-visit price. Admin-only write."""

    def get_permissions(self):
        if self.request.method == 'PUT':
            return [IsAuthenticated(), IsAdminRole()]
        return [IsAuthenticated()]

    def get(self, request):
        return success_response(data={'single_slot_price': get_single_slot_price()})

    def put(self, request):
        serializer = SingleSlotPriceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        price = serializer.validated_data['single_slot_price']

        StudioSetting.set_value(
            SINGLE_SLOT_PRICE,
            price,
            description='Price charged for a single pay-per-visit slot (no active subscription required).',
        )
        return success_response(data={'single_slot_price': price}, message='Single slot price updated.')


class MySubscriptionView(APIView):
    """GET the authenticated user's current usable subscription, or null
    if they have none — the frontend uses this to decide whether to offer
    Renew or Purchase, and whether to show the pay-per-slot price.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        subscription = get_active_subscription(request.user)
        return success_response(
            data=UserSubscriptionSerializer(subscription).data if subscription else None,
        )


class MySubscriptionHistoryStatusView(APIView):
    """GET {"has_previous_subscription": bool} — whether the authenticated
    user has ever purchased a subscription before (usable or not). Kept
    separate from MySubscriptionView (which many callers use expecting a
    plain UserSubscription-or-null payload) so Renew can be hidden for a
    member who has genuinely never subscribed, without touching that
    existing contract.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        has_previous_subscription = UserSubscription.objects.filter(user=request.user).exists()
        return success_response(data={'has_previous_subscription': has_previous_subscription})


class CreatePaymentOrderView(APIView):
    """POST {"payment_type": "subscription"|"single_slot"}: creates a
    Razorpay Order for the amount matching the requested action and
    returns the order id/amount/key the frontend needs to open Razorpay
    Checkout. Does not touch the domain (no subscription/slot row is
    created here) — that only happens after the checkout signature is
    verified, in VerifyAndCompletePaymentView.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.PAYMENT_PROCESSING_ENABLED:
            return _payment_processing_unavailable()

        serializer = CreatePaymentOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment_type = serializer.validated_data['payment_type']

        try:
            result = create_order_for_payment_type(request.user, payment_type)
        except NoActivePlanError:
            return error_response('No subscription plan is currently available.')

        order = result['order']
        return success_response(data={
            'order_id': order['id'],
            'amount': order['amount'],
            'currency': order['currency'],
            'key_id': settings.RAZORPAY_KEY_ID,
            'payment_type': payment_type,
        })


class VerifyAndCompletePaymentView(APIView):
    """POST: verifies the Razorpay checkout signature for a completed
    payment and, only once verified, performs the matching domain action
    (purchase/renew subscription, or record a slot purchase). This is the
    single place a subscription/slot-purchase row is created from a real
    payment, replacing the previous auto-success behavior.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.PAYMENT_PROCESSING_ENABLED:
            return _payment_processing_unavailable()

        serializer = VerifyPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            verify_razorpay_signature(
                order_id=data['razorpay_order_id'],
                payment_id=data['razorpay_payment_id'],
                signature=data['razorpay_signature'],
            )
        except PaymentVerificationError as exc:
            return error_response(str(exc), code=status.HTTP_400_BAD_REQUEST)

        provider_metadata = {
            'razorpay_order_id': data['razorpay_order_id'],
            'razorpay_payment_id': data['razorpay_payment_id'],
        }
        action = data['action']

        if action == 'purchase':
            try:
                subscription = purchase_subscription(
                    request.user,
                    provider='razorpay',
                    provider_transaction_id=data['razorpay_payment_id'],
                    metadata=provider_metadata,
                )
            except NoActivePlanError:
                return error_response('No subscription plan is currently available.')
            except SubscriptionStateError as exc:
                return error_response(str(exc))
            return success_response(
                data={
                    'subscription': UserSubscriptionSerializer(subscription).data,
                    'payment': PaymentTransactionSerializer(_payment_for_subscription(subscription)).data,
                },
                message='Subscription purchased successfully.',
                status=status.HTTP_201_CREATED,
            )

        if action == 'renew':
            try:
                subscription = renew_subscription(
                    request.user,
                    provider='razorpay',
                    provider_transaction_id=data['razorpay_payment_id'],
                    metadata=provider_metadata,
                )
            except NoActivePlanError:
                return error_response('No subscription plan is currently available.')
            return success_response(
                data={
                    'subscription': UserSubscriptionSerializer(subscription).data,
                    'payment': PaymentTransactionSerializer(_payment_for_subscription(subscription)).data,
                },
                message='Subscription renewed successfully.',
                status=status.HTTP_201_CREATED,
            )

        purchase = record_slot_purchase(
            request.user,
            provider='razorpay',
            provider_transaction_id=data['razorpay_payment_id'],
            metadata=provider_metadata,
        )
        return success_response(
            data={
                'purchase': SlotPurchaseSerializer(purchase).data,
                'payment': PaymentTransactionSerializer(_payment_for_slot_purchase(purchase)).data,
            },
            message='Slot purchased successfully.',
            status=status.HTTP_201_CREATED,
        )


class PaymentHistoryView(ListAPIView):
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = PaymentTransaction.objects.select_related(
            'user', 'receipt', 'subscription', 'slot_purchase',
        ).order_by('-created_at')
        if not self.request.user.is_admin:
            queryset = queryset.filter(user=self.request.user)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        data = self.get_serializer(page if page is not None else queryset, many=True).data
        if page is not None:
            return self.get_paginated_response(data)
        return success_response(data=data)


class RevenueSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        successful = PaymentTransaction.objects.filter(status=PaymentTransaction.Status.SUCCESSFUL)
        totals = successful.aggregate(total=Sum('amount'), count=Count('id'))
        by_type = successful.values('payment_type').annotate(total=Sum('amount'), count=Count('id'))
        type_summary = {
            item['payment_type']: {
                'total': str(item['total'] or 0),
                'count': item['count'],
            }
            for item in by_type
        }
        return success_response(data={
            'currency': 'INR',
            'total_revenue': str(totals['total'] or 0),
            'transaction_count': totals['count'],
            'by_type': type_summary,
        })


class ReceiptDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        receipt = get_object_or_404(
            Receipt.objects.select_related('transaction', 'transaction__user'),
            pk=pk,
        )
        if not request.user.is_admin and receipt.transaction.user_id != request.user.pk:
            return error_response('You do not have access to this receipt.', code=status.HTTP_403_FORBIDDEN)

        pdf_bytes = render_receipt_pdf(receipt)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{receipt.receipt_number}.pdf"'
        return response
