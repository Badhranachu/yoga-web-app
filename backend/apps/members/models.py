from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class UserProfile(TimeStampedModel):
    """Member-specific profile extension for normal users.

    Authentication and shared account fields stay on accounts.User. This model
    holds member-only details and is created only for role=user accounts.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_profile',
    )
    username = models.CharField(max_length=150, unique=True, null=True, blank=True)

    class Meta:
        db_table = 'members_user_profile'
        ordering = ['-created_at']

    def __str__(self):
        return self.username or self.user.email
