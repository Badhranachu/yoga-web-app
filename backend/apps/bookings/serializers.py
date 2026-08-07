from rest_framework import serializers

from apps.classes_app.serializers import SlotSerializer
from apps.instructors.models import InstructorProfile

from .models import Booking, BookingChangeRequest


class BookingSerializer(serializers.ModelSerializer):
    slot = SlotSerializer(read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    instructor_name = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'slot', 'user_email', 'status',
            'attended_at', 'created_at', 'instructor_id', 'instructor_name',
        ]
        read_only_fields = fields

    def get_instructor_name(self, obj: Booking) -> str | None:
        if obj.instructor_id is None:
            return None
        return obj.instructor.username or obj.instructor.user.email


class InstructorBookingSerializer(serializers.ModelSerializer):
    """Bookings assigned to the requesting instructor — includes the
    customer's contact details, since the instructor needs to know who
    they're teaching (name, email, phone), unlike the plain member-facing
    BookingSerializer.
    """

    slot = SlotSerializer(read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.EmailField(source='user.email', read_only=True)
    customer_phone = serializers.CharField(source='user.phone_number', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'slot', 'status', 'attended_at', 'created_at',
            'customer_name', 'customer_email', 'customer_phone',
        ]
        read_only_fields = fields

    def get_customer_name(self, obj: Booking) -> str:
        return obj.user.full_name or obj.user.email


class ReassignInstructorSerializer(serializers.Serializer):
    instructor_id = serializers.PrimaryKeyRelatedField(
        source='instructor', queryset=InstructorProfile.objects.all(), allow_null=True,
    )


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
