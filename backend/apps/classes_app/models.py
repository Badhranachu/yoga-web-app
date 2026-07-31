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
        if errors:
            raise ValidationError(errors)


class Slot(TimeStampedModel):
    """A single bookable time-window, derived from TimetableConfig by
    services.generate_slots(). Never created directly by an admin.

    is_booked exists now so the generation/regeneration logic (this phase)
    already respects it and never deletes or mutates a booked slot, even
    though nothing sets it True until the booking module (a later phase)
    exists.

    leave: set when a Leave (apps.classes_app.services.apply_leave) blocks
    this slot. Availability is derived from (is_booked, leave), never
    stored as a separate redundant status field:
      - leave is None, not booked      -> AVAILABLE
      - leave is set,  not booked      -> UNAVAILABLE (blocked by leave)
      - leave is None, booked          -> BOOKED
      - leave is set,  booked          -> LEAVE_CONFLICT (needs admin attention)
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
    is_booked = models.BooleanField(default=False)
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
        help_text='Set when this slot falls within an active leave period.',
    )

    class Meta:
        db_table = 'classes_slot'
        ordering = ['date', 'start_time']
        constraints = [
            models.UniqueConstraint(fields=['date', 'start_time'], name='unique_slot_per_date_start_time'),
        ]
        indexes = [
            models.Index(fields=['date'], name='idx_slot_date'),
            models.Index(fields=['date', 'is_booked'], name='idx_slot_date_booked'),
            models.Index(fields=['leave'], name='idx_slot_leave'),
        ]

    def __str__(self):
        return f'{self.date} {self.start_time}-{self.end_time}'

    @property
    def availability(self) -> str:
        if self.leave_id and self.is_booked:
            return self.Availability.LEAVE_CONFLICT
        if self.leave_id:
            return self.Availability.UNAVAILABLE
        if self.is_booked:
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
