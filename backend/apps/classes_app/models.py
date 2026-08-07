from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class TimetableConfig(TimeStampedModel):
    """Per-weekday studio operating hours + slot duration. This is the ONLY
    thing an admin configures — individual daily slots are never hand-created;
    they're derived from this table by services.generate_slots().

    One row per weekday (seeded by migration 0002). Editing a row and
    saving triggers regeneration of that weekday's future, unbooked slots
    (see apps.classes_app.signals) — past slots and booked slots are never
    touched.
    """

    class Weekday(models.IntegerChoices):
        MONDAY = 0, 'Monday'
        TUESDAY = 1, 'Tuesday'
        WEDNESDAY = 2, 'Wednesday'
        THURSDAY = 3, 'Thursday'
        FRIDAY = 4, 'Friday'
        SATURDAY = 5, 'Saturday'
        SUNDAY = 6, 'Sunday'

    weekday = models.PositiveSmallIntegerField(choices=Weekday.choices, unique=True)
    is_open = models.BooleanField(default=True)
    start_time = models.TimeField(help_text='Working start time, e.g. 09:00.')
    end_time = models.TimeField(help_text='Working end time, e.g. 21:00.')
    slot_duration_minutes = models.PositiveSmallIntegerField(help_text='Length of each generated slot, in minutes.')
    break_start_time = models.TimeField(
        null=True, blank=True,
        help_text='Start of the daily rest/break window (optional). No slots are generated inside it.',
    )
    break_end_time = models.TimeField(
        null=True, blank=True,
        help_text='End of the daily rest/break window (optional).',
    )

    class Meta:
        db_table = 'classes_timetable_config'
        ordering = ['weekday']

    def __str__(self):
        return f'{self.get_weekday_display()}: {self.start_time}-{self.end_time} ({self.slot_duration_minutes}min)'

    def clean(self):
        from django.core.exceptions import ValidationError

        errors = {}
        if self.is_open:
            if self.start_time is None or self.end_time is None:
                errors['start_time'] = 'Start and end time are required for an open day.'
            elif self.start_time >= self.end_time:
                errors['end_time'] = 'End time must be after start time.'
            if not self.slot_duration_minutes:
                errors['slot_duration_minutes'] = 'Slot duration is required for an open day.'

            has_break_start = self.break_start_time is not None
            has_break_end = self.break_end_time is not None
            if has_break_start != has_break_end:
                errors['break_end_time'] = 'Both break start and end time are required together.'
            elif has_break_start and has_break_end:
                if self.break_start_time >= self.break_end_time:
                    errors['break_end_time'] = 'Break end time must be after break start time.'
                if self.start_time is not None and self.end_time is not None:
                    if self.break_start_time < self.start_time or self.break_end_time > self.end_time:
                        errors['break_start_time'] = 'Break time must fall within the working hours.'
        if errors:
            raise ValidationError(errors)

    @property
    def has_break(self) -> bool:
        return self.break_start_time is not None and self.break_end_time is not None


class Slot(TimeStampedModel):
    """A single bookable time-window, derived from TimetableConfig by
    services.generate_slots(). Never created directly by an admin.

    Capacity model: a slot has multiple bookable spots, not just one — one
    per instructor account that exists (apps.instructors.InstructorProfile),
    minus however many are on leave for this specific slot or its whole
    date (apps.instructors.InstructorLeave). See capacity/booked_count/
    availability below for how that plays out; this is computed live on
    every read, never stored, since it must react immediately to admin
    adding/removing instructors or leave without any slot regeneration.

    leave: set when a studio-wide Leave (apps.classes_app.services.apply_leave)
    blocks this slot entirely — distinct from per-instructor
    InstructorLeave, which only reduces capacity by however many
    instructors are unavailable rather than blocking the slot outright.
      - leave is None, capacity > booked_count      -> AVAILABLE
      - leave is set                                -> UNAVAILABLE (studio-wide, conflict if booked)
      - leave is None, capacity <= 0                -> UNAVAILABLE (no instructor available)
      - leave is None, capacity <= booked_count > 0  -> BOOKED (full)
    """

    class Availability(models.TextChoices):
        AVAILABLE = 'available', 'Available'
        UNAVAILABLE = 'unavailable', 'Unavailable'
        BOOKED = 'booked', 'Booked'
        LEAVE_CONFLICT = 'leave_conflict', 'Leave Conflict'

    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    weekday = models.PositiveSmallIntegerField(choices=TimetableConfig.Weekday.choices)
    source_config = models.ForeignKey(
        TimetableConfig,
        on_delete=models.SET_NULL,
        null=True,
        related_name='slots',
        help_text='The TimetableConfig row this slot was generated from.',
    )
    leave = models.ForeignKey(
        'Leave',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='blocked_slots',
        help_text='Set when this slot falls within an active studio-wide leave period.',
    )

    class Meta:
        db_table = 'classes_slot'
        ordering = ['date', 'start_time']
        constraints = [
            models.UniqueConstraint(fields=['date', 'start_time'], name='unique_slot_per_date_start_time'),
        ]
        indexes = [
            models.Index(fields=['date'], name='idx_slot_date'),
            models.Index(fields=['leave'], name='idx_slot_leave'),
        ]

    def __str__(self):
        return f'{self.date} {self.start_time}-{self.end_time}'

    @property
    def total_instructor_count(self) -> int:
        from apps.instructors.models import InstructorProfile
        return InstructorProfile.objects.count()

    @property
    def instructor_leave_count(self) -> int:
        """How many instructors are unavailable for this specific slot —
        either via a leave naming this exact slot, or a whole-day leave
        (no slots selected) for this slot's date.
        """
        from apps.instructors.leave_models import InstructorLeave

        return InstructorLeave.objects.filter(date=self.date).filter(
            models.Q(slots=self) | models.Q(slots=None)
        ).values('instructor_id').distinct().count()

    @property
    def capacity(self) -> int:
        return max(0, self.total_instructor_count - self.instructor_leave_count)

    @property
    def booked_count(self) -> int:
        return self.bookings.filter(status__in=['booked', 'attended']).count()

    @property
    def is_booked(self) -> bool:
        """True once every spot is taken. Kept as a convenience property
        (no longer a stored field) for any code that only cares about
        full-vs-not-full rather than the exact count."""
        return self.capacity <= 0 or self.booked_count >= self.capacity

    @property
    def availability(self) -> str:
        if self.leave_id:
            return self.Availability.LEAVE_CONFLICT if self.booked_count > 0 else self.Availability.UNAVAILABLE
        if self.capacity <= 0:
            return self.Availability.UNAVAILABLE
        if self.booked_count >= self.capacity:
            return self.Availability.BOOKED
        return self.Availability.AVAILABLE


class Leave(TimeStampedModel):
    """An admin-declared studio closure over an inclusive date range. No
    slot may be booked on a leave date — see services.apply_leave /
    services.release_leave for how this is enforced against Slot rows.

    Deleting a Leave is only permitted while it is still in the future
    (see views.LeaveDetailView) — past leave is kept as permanent history
    and is never removable, per business rule.
    """

    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='leaves_created',
    )

    class Meta:
        db_table = 'classes_leave'
        ordering = ['-start_date']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F('start_date')),
                name='leave_end_date_gte_start_date',
            ),
        ]
        indexes = [
            models.Index(fields=['start_date', 'end_date'], name='idx_leave_date_range'),
        ]

    def __str__(self):
        return f'Leave {self.start_date} to {self.end_date}'
