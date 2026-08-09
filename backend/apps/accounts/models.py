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


def _generate_otp():
    return f'{secrets.randbelow(1_000_000):06d}'


def _otp_expiry():
    return timezone.now() + timedelta(minutes=5)


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
        INSTRUCTOR = 'instructor', 'Instructor'

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    phone_number = models.CharField(max_length=32, blank=True)
    address = models.CharField(max_length=255, blank=True)
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.USER)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'accounts_user'
        ordering = ['-created_at']
        verbose_name = 'Custom User'
        verbose_name_plural = 'Custom Users'
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

    @property
    def is_instructor(self):
        return self.role == self.Role.INSTRUCTOR


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


class EmailChangeRequest(TimeStampedModel):
    """A pending request to change the authenticated user's email, guarded
    by a 6-digit OTP sent to the NEW address. The account's email is only
    updated once the correct code is submitted within the 5-minute window
    (see apps.accounts.services.verify_email_change) — never before.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='email_change_requests',
    )
    new_email = models.EmailField()
    otp_code = models.CharField(max_length=6, default=_generate_otp)
    expires_at = models.DateTimeField(default=_otp_expiry)
    used_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'accounts_email_change_request'
        ordering = ['-created_at']

    def __str__(self):
        return f'Email change for {self.user_id} -> {self.new_email}'

    @property
    def is_valid(self):
        return self.used_at is None and timezone.now() < self.expires_at and self.attempts < 5

    def mark_used(self):
        self.used_at = timezone.now()
        self.save(update_fields=['used_at', 'updated_at'])

    def register_failed_attempt(self):
        self.attempts += 1
        self.save(update_fields=['attempts', 'updated_at'])


def _registration_otp_expiry():
    return timezone.now() + timedelta(minutes=5)


class RegistrationOTP(TimeStampedModel):
    """A pending email-ownership check for account creation — member
    self-registration, or an admin creating another admin/instructor
    account. Not tied to a User row since the account doesn't exist yet;
    keyed by email instead. Registration is only allowed once verified_at
    is set (see apps.accounts.services.get_verified_registration_otp), and
    consumed_at prevents a verified-but-unused code being replayed later.
    """

    email = models.EmailField()
    otp_code = models.CharField(max_length=6, default=_generate_otp)
    expires_at = models.DateTimeField(default=_registration_otp_expiry)
    verified_at = models.DateTimeField(null=True, blank=True)
    consumed_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'accounts_registration_otp'
        ordering = ['-created_at']

    def __str__(self):
        return f'Registration OTP for {self.email}'

    @property
    def can_be_verified(self):
        return self.verified_at is None and self.consumed_at is None and timezone.now() < self.expires_at and self.attempts < 5

    @property
    def is_valid_for_registration(self):
        if self.verified_at is None or self.consumed_at is not None:
            return False
        return timezone.now() < self.verified_at + timedelta(minutes=30)

    def mark_verified(self):
        self.verified_at = timezone.now()
        self.save(update_fields=['verified_at', 'updated_at'])

    def mark_consumed(self):
        self.consumed_at = timezone.now()
        self.save(update_fields=['consumed_at', 'updated_at'])

    def register_failed_attempt(self):
        self.attempts += 1
        self.save(update_fields=['attempts', 'updated_at'])


class AdminProfile(TimeStampedModel):
    """Admin-specific profile extension, symmetric to apps.members.UserProfile
    (which extends role=user accounts). Shared account fields — name, email,
    phone, address, age — stay on accounts.User; this model exists as the
    place for admin-only fields as they're needed. Created only for
    role=admin accounts (see signals.ensure_admin_profile).
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_profile',
    )

    class Meta:
        db_table = 'accounts_admin_profile'
        ordering = ['-created_at']

    def __str__(self):
        return f'Admin profile — {self.user.email}'
