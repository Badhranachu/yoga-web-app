from django.utils import timezone
from rest_framework import serializers

from apps.core.settings_keys import (
    SLOT_GENERATION_HORIZON_DAYS_MAX,
    SLOT_GENERATION_HORIZON_DAYS_MIN,
)

from .models import Leave, Slot, TimetableConfig


class TimetableConfigSerializer(serializers.ModelSerializer):
    weekday_display = serializers.CharField(source='get_weekday_display', read_only=True)

    class Meta:
        model = TimetableConfig
        fields = [
            'id', 'weekday', 'weekday_display', 'is_open',
            'start_time', 'end_time', 'slot_duration_minutes',
            'break_start_time', 'break_end_time',
            'updated_at',
        ]
        read_only_fields = ['id', 'weekday_display', 'updated_at']

    def validate(self, attrs):
        is_open = attrs.get('is_open', getattr(self.instance, 'is_open', True))
        start_time = attrs.get('start_time', getattr(self.instance, 'start_time', None))
        end_time = attrs.get('end_time', getattr(self.instance, 'end_time', None))
        duration = attrs.get('slot_duration_minutes', getattr(self.instance, 'slot_duration_minutes', None))
        break_start = attrs.get('break_start_time', getattr(self.instance, 'break_start_time', None))
        break_end = attrs.get('break_end_time', getattr(self.instance, 'break_end_time', None))

        if is_open:
            if not start_time or not end_time:
                raise serializers.ValidationError('Start and end time are required for an open day.')
            if start_time >= end_time:
                raise serializers.ValidationError({'end_time': 'End time must be after start time.'})
            if not duration or duration <= 0:
                raise serializers.ValidationError({'slot_duration_minutes': 'Slot duration must be a positive number of minutes.'})

            if (break_start is None) != (break_end is None):
                raise serializers.ValidationError({'break_end_time': 'Both break start and end time are required together.'})
            if break_start is not None and break_end is not None:
                if break_start >= break_end:
                    raise serializers.ValidationError({'break_end_time': 'Break end time must be after break start time.'})
                if break_start < start_time or break_end > end_time:
                    raise serializers.ValidationError({'break_start_time': 'Break time must fall within the working hours.'})

        return attrs


class SlotSerializer(serializers.ModelSerializer):
    weekday_display = serializers.CharField(source='get_weekday_display', read_only=True)
    availability = serializers.CharField(read_only=True)

    class Meta:
        model = Slot
        fields = [
            'id', 'date', 'start_time', 'end_time', 'weekday', 'weekday_display',
            'is_booked', 'availability',
        ]
        read_only_fields = fields


class SlotGenerationHorizonSerializer(serializers.Serializer):
    horizon_days = serializers.IntegerField(
        min_value=SLOT_GENERATION_HORIZON_DAYS_MIN,
        max_value=SLOT_GENERATION_HORIZON_DAYS_MAX,
    )


class LeaveSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    is_past = serializers.SerializerMethodField()

    class Meta:
        model = Leave
        fields = [
            'id', 'start_date', 'end_date', 'reason',
            'created_by_email', 'is_past', 'created_at',
        ]
        read_only_fields = ['id', 'created_by_email', 'is_past', 'created_at']

    def get_is_past(self, obj: Leave) -> bool:
        return obj.end_date < timezone.localdate()

    def validate(self, attrs):
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')

        if end_date < start_date:
            raise serializers.ValidationError({'end_date': 'End date must be on or after the start date.'})

        today = timezone.localdate()
        if start_date < today:
            raise serializers.ValidationError({'start_date': 'Leave cannot be added for a past date.'})

        overlap_exists = Leave.objects.filter(
            start_date__lte=end_date,
            end_date__gte=start_date,
        ).exists()
        if overlap_exists:
            raise serializers.ValidationError('This date range overlaps an existing leave.')

        return attrs
