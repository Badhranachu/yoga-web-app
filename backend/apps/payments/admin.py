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

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SlotPurchase)
class SlotPurchaseAdmin(admin.ModelAdmin):
    list_display = ['user', 'price_paid', 'created_at']
    search_fields = ['user__email']
    date_hierarchy = 'created_at'
    readonly_fields = ['user', 'price_paid']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


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

    def has_delete_permission(self, request, obj=None):
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

    def has_delete_permission(self, request, obj=None):
        return False
