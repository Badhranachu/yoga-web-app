from django.urls import path

from .views import (
    MySubscriptionView,
    PayPerSlotView,
    PurchaseSubscriptionView,
    RenewSubscriptionView,
    SingleSlotPriceView,
    SubscriptionPlanView,
    PaymentHistoryView,
    ReceiptDownloadView,
    RevenueSummaryView,
)

app_name = 'payments'

urlpatterns = [
    path('subscription-plan/', SubscriptionPlanView.as_view(), name='subscription-plan'),
    path('settings/single-slot-price/', SingleSlotPriceView.as_view(), name='single-slot-price'),
    path('subscriptions/me/', MySubscriptionView.as_view(), name='my-subscription'),
    path('subscriptions/purchase/', PurchaseSubscriptionView.as_view(), name='subscription-purchase'),
    path('subscriptions/renew/', RenewSubscriptionView.as_view(), name='subscription-renew'),
    path('slot-purchases/', PayPerSlotView.as_view(), name='slot-purchase'),
    path('history/', PaymentHistoryView.as_view(), name='payment-history'),
    path('revenue/', RevenueSummaryView.as_view(), name='revenue-summary'),
    path('receipts/<int:pk>/download/', ReceiptDownloadView.as_view(), name='receipt-download'),
]
