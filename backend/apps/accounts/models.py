import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel

from .managers import UserManager


def _generate_token():
    return secrets.token_urlsafe(48)


def _default_expiry():
    return timezone.now() + timedelta(hours=1)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    """Custom user model, authenticated by email instead of username.

    Role is a coarse authorization flag consumed by DRF permission classes
    (see apps.core.permissions) and the frontend route guards. It is
    intentionally separate from is_staff/is_superuser, which continue to
    gate Django admin access only.
    """

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        USER = 'user', 'User'

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    phone_number = models.CharField(max_length=32, blank=True)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.USER)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'accounts_user'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active', 'created_at'], name='idx_user_active_date'),
        ]

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN


class PasswordResetToken(TimeStampedModel):
    """Single-use, expiring token issued for the forgot-password flow."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
    )
    token = models.CharField(max_length=128, unique=True, default=_generate_token)
    expires_at = models.DateTimeField(default=_default_expiry)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'accounts_password_reset_token'
        ordering = ['-created_at']

    def __str__(self):
        return f'Reset token for {self.user_id}'

    @property
    def is_valid(self):
        return self.used_at is None and timezone.now() < self.expires_at

    def mark_used(self):
        self.used_at = timezone.now()
        self.save(update_fields=['used_at', 'updated_at'])
