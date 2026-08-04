from rest_framework import serializers

from apps.classes_app.serializers import SlotSerializer

from .models import Booking, BookingChangeRequest


class BookingSerializer(serializers.ModelSerializer):
    slot = SlotSerializer(read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'slot', 'user_email', 'status',
            'attended_at', 'created_at',
        ]
        read_only_fields = fields


class CreateBookingSerializer(serializers.Serializer):
    slot_id = serializers.IntegerField()


class CreateBookingChangeRequestSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    slot_id = serializers.IntegerField()


class BookingChangeRequestSerializer(serializers.ModelSerializer):
    booking = BookingSerializer(read_only=True)
    requested_by_email = serializers.EmailField(source='requested_by.email', read_only=True)
    reviewed_by_email = serializers.EmailField(source='reviewed_by.email', read_only=True)
    current_slot = SlotSerializer(read_only=True)
    requested_slot = SlotSerializer(read_only=True)

    class Meta:
        model = BookingChangeRequest
        fields = [
            'id', 'request_type', 'status', 'booking',
            'requested_by_email', 'reviewed_by_email',
            'current_slot', 'requested_slot',
            'current_date', 'current_start_time', 'current_end_time',
            'requested_date', 'requested_start_time', 'requested_end_time',
            'decision_reason', 'notification_sent_at', 'created_at', 'reviewed_at',
        ]
        read_only_fields = fields
