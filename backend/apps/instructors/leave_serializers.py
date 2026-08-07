from django.utils import timezone
from rest_framework import serializers

from apps.classes_app.models import Slot

from .leave_models import InstructorLeave
from .models import InstructorProfile


class InstructorLeaveSerializer(serializers.ModelSerializer):
    instructor_name = serializers.SerializerMethodField()
    instructor_email = serializers.EmailField(source='instructor.user.email', read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    is_full_day = serializers.BooleanField(read_only=True)
    is_past = serializers.SerializerMethodField()
    slot_ids = serializers.PrimaryKeyRelatedField(source='slots', many=True, read_only=True)

    class Meta:
        model = InstructorLeave
        fields = [
            'id', 'instructor', 'instructor_name', 'instructor_email', 'date',
            'slot_ids', 'is_full_day', 'reason', 'created_by_email', 'is_past', 'created_at',
        ]
        read_only_fields = [
            'id', 'instructor_name', 'instructor_email', 'is_full_day',
            'created_by_email', 'is_past', 'created_at',
        ]

    def get_instructor_name(self, obj: InstructorLeave) -> str:
        return obj.instructor.username or obj.instructor.user.email

    def get_is_past(self, obj: InstructorLeave) -> bool:
        return obj.date < timezone.localdate()


class CreateInstructorLeaveSerializer(serializers.Serializer):
    instructor = serializers.PrimaryKeyRelatedField(queryset=InstructorProfile.objects.all())
    date = serializers.DateField()
    slot_ids = serializers.PrimaryKeyRelatedField(
        source='slots', queryset=Slot.objects.all(), many=True, required=False, default=list,
    )
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')

    def validate_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError('Leave cannot be added for a past date.')
        return value

    def validate(self, attrs):
        instructor = attrs.get('instructor')
        date = attrs.get('date')
        slots = attrs.get('slots') or []
        mismatched = [slot for slot in slots if slot.date != date]
        if mismatched:
            raise serializers.ValidationError({'slot_ids': 'All selected slots must fall on the chosen date.'})

        existing = InstructorLeave.objects.filter(instructor=instructor, date=date)
        if not slots:
            if existing.exists():
                raise serializers.ValidationError('This instructor already has leave recorded for this date.')
        else:
            for leave in existing:
                if leave.is_full_day or leave.slots.filter(pk__in=[slot.pk for slot in slots]).exists():
                    raise serializers.ValidationError('This instructor already has leave recorded for this date.')
        return attrs

    def create(self, validated_data):
        slots = validated_data.pop('slots', [])
        leave = InstructorLeave.objects.create(**validated_data)
        if slots:
            leave.slots.set(slots)
        return leave
