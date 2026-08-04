from django.contrib import admin

from .models import PaymentTransaction, Receipt, SlotPurchase, SubscriptionPlan, UserSubscription


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['id', 'monthly_price', 'included_sessions', 'is_active', 'updated_at']
    list_display_links = ['id']
    list_editable = ['monthly_price', 'included_sessions', 'is_active']


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'status', 'sessions_remaining', 'sessions_included', 'start_date', 'end_date']
    list_filter = ['status', 'start_date']
    search_fields = ['user__email']
    date_hierarchy = 'start_date'
    readonly_fields = [field.name for field in UserSubscription._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SlotPurchase)
class SlotPurchaseAdmin(admin.ModelAdmin):
    list_display = ['user', 'price_paid', 'is_used_label', 'used_for_booking', 'created_at']
    list_filter = ['used_at']
    search_fields = ['user__email']
    readonly_fields = [field.name for field in SlotPurchase._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description='Used', boolean=True)
    def is_used_label(self, obj):
        return obj.is_used


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ['transaction_id', 'user', 'payment_type', 'amount', 'currency', 'status', 'created_at']
    list_filter = ['payment_type', 'status', 'currency']
    search_fields = ['transaction_id', 'provider_transaction_id', 'user__email']
    readonly_fields = [field.name for field in PaymentTransaction._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ['receipt_number', 'user_email', 'payment_type', 'amount', 'currency', 'status', 'payment_date']
    list_filter = ['payment_type', 'status', 'currency']
    search_fields = ['receipt_number', 'user_email', 'transaction__transaction_id']
    readonly_fields = [field.name for field in Receipt._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
