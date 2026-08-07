"""
Kept in a separate module (not models.py) purely so InstructorLeave, which
depends on apps.classes_app.Slot, doesn't force InstructorProfile's own
module to import classes_app — models.py re-exports it below so callers
never notice the split.
"""

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class InstructorLeave(TimeStampedModel):
    """Records that a given instructor is unavailable on a date, either for
    the whole day or for specific slots on that date. This is a record
    only — it does not (yet) change Slot.availability or block member
    bookings; Slot has no instructor assignment for it to act on.

    slots being empty means "the whole date" for this instructor; a
    non-empty selection means only those specific slots.
    """

    instructor = models.ForeignKey(
        'instructors.InstructorProfile',
        on_delete=models.CASCADE,
        related_name='leaves',
    )
    date = models.DateField()
    slots = models.ManyToManyField(
        'classes_app.Slot',
        blank=True,
        related_name='instructor_leaves',
        help_text='Specific slots this instructor is unavailable for on this date. Empty means the whole date.',
    )
    reason = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='instructor_leaves_created',
    )

    class Meta:
        db_table = 'instructors_instructor_leave'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['instructor', 'date'], name='idx_instrleave_instr_date'),
        ]

    def __str__(self):
        return f'{self.instructor} — leave on {self.date}'

    @property
    def is_full_day(self) -> bool:
        return not self.slots.exists()
