from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel

from .leave_models import InstructorLeave  # noqa: F401


class InstructorProfile(TimeStampedModel):
    """Instructor-specific profile extension, symmetric to
    apps.members.UserProfile (role=user) and apps.accounts.AdminProfile
    (role=admin). Shared account fields — name, email, phone, address —
    stay on accounts.User; this model holds instructor-only details and is
    created only for role=instructor accounts.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='instructor_profile',
    )
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)

    class Meta:
        db_table = 'instructors_instructor_profile'
        ordering = ['-created_at']

    def __str__(self):
        return self.username or self.user.email
