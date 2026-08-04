from decimal import Decimal

from rest_framework import serializers

from .models import PaymentTransaction, Receipt, SlotPurchase, SubscriptionPlan, UserSubscription


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = ['id', 'monthly_price', 'included_sessions', 'is_active', 'updated_at']
        read_only_fields = ['id', 'updated_at']

    def validate_monthly_price(self, value):
        if value < 0:
            raise serializers.ValidationError('Monthly price cannot be negative.')
        return value

    def validate_included_sessions(self, value):
        if value <= 0:
            raise serializers.ValidationError('Included sessions must be at least 1.')
        return value


class UserSubscriptionSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    has_sessions = serializers.BooleanField(read_only=True)

    class Meta:
        model = UserSubscription
        fields = [
            'id', 'user_email', 'status', 'sessions_included', 'sessions_remaining',
            'price_paid', 'start_date', 'end_date', 'is_expired', 'has_sessions', 'created_at',
        ]
        read_only_fields = fields


class SlotPurchaseSerializer(serializers.ModelSerializer):
    is_used = serializers.BooleanField(read_only=True)

    class Meta:
        model = SlotPurchase
        fields = ['id', 'price_paid', 'is_used', 'used_at', 'created_at']
        read_only_fields = fields


class SingleSlotPriceSerializer(serializers.Serializer):
    single_slot_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0'))


class CreatePaymentOrderSerializer(serializers.Serializer):
    payment_type = serializers.ChoiceField(choices=PaymentTransaction.PaymentType.choices)


class VerifyPaymentSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['purchase', 'renew', 'slot'])
    razorpay_order_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()


class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = [
            'id', 'receipt_number', 'user_name', 'user_email',
            'payment_type', 'amount', 'currency', 'payment_date', 'status',
        ]
        read_only_fields = fields


class PaymentTransactionSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    receipt = ReceiptSerializer(read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'transaction_id', 'provider', 'provider_transaction_id',
            'user_email', 'payment_type', 'amount', 'currency', 'status',
            'subscription_id', 'slot_purchase_id', 'receipt', 'created_at',
        ]
        read_only_fields = fields
