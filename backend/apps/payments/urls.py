from django.urls import path

from .views import (
    CreatePaymentOrderView,
    MySubscriptionHistoryStatusView,
    MySubscriptionView,
    PublicPricingView,
    SingleSlotPriceView,
    SubscriptionPlanView,
    SubscriptionStartDateOptionsView,
    PaymentHistoryView,
    ReceiptDownloadView,
    RevenueSummaryView,
    VerifyAndCompletePaymentView,
)

app_name = 'payments'

urlpatterns = [
    path('public-pricing/', PublicPricingView.as_view(), name='public-pricing'),
    path('subscription-plan/', SubscriptionPlanView.as_view(), name='subscription-plan'),
    path('settings/single-slot-price/', SingleSlotPriceView.as_view(), name='single-slot-price'),
    path('subscriptions/me/', MySubscriptionView.as_view(), name='my-subscription'),
    path('subscriptions/me/history-status/', MySubscriptionHistoryStatusView.as_view(), name='my-subscription-history-status'),
    path('subscriptions/start-date-options/', SubscriptionStartDateOptionsView.as_view(), name='subscription-start-date-options'),
    path('orders/create/', CreatePaymentOrderView.as_view(), name='order-create'),
    path('orders/verify/', VerifyAndCompletePaymentView.as_view(), name='order-verify'),
    path('history/', PaymentHistoryView.as_view(), name='payment-history'),
    path('revenue/', RevenueSummaryView.as_view(), name='revenue-summary'),
    path('receipts/<int:pk>/download/', ReceiptDownloadView.as_view(), name='receipt-download'),
]
