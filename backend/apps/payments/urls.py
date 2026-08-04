from django.urls import path

from .views import (
    CreatePaymentOrderView,
    MySubscriptionHistoryStatusView,
    MySubscriptionView,
    SingleSlotPriceView,
    SubscriptionPlanView,
    PaymentHistoryView,
    ReceiptDownloadView,
    RevenueSummaryView,
    VerifyAndCompletePaymentView,
)

app_name = 'payments'

urlpatterns = [
    path('subscription-plan/', SubscriptionPlanView.as_view(), name='subscription-plan'),
    path('settings/single-slot-price/', SingleSlotPriceView.as_view(), name='single-slot-price'),
    path('subscriptions/me/', MySubscriptionView.as_view(), name='my-subscription'),
    path('subscriptions/me/history-status/', MySubscriptionHistoryStatusView.as_view(), name='my-subscription-history-status'),
    path('orders/create/', CreatePaymentOrderView.as_view(), name='order-create'),
    path('orders/verify/', VerifyAndCompletePaymentView.as_view(), name='order-verify'),
    path('history/', PaymentHistoryView.as_view(), name='payment-history'),
    path('revenue/', RevenueSummaryView.as_view(), name='revenue-summary'),
    path('receipts/<int:pk>/download/', ReceiptDownloadView.as_view(), name='receipt-download'),
]
