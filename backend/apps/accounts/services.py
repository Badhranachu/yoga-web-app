from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .models import EmailChangeRequest, PasswordResetToken, RegistrationOTP, User


class EmailChangeError(Exception):
    """Raised for invalid/expired/mismatched email-change OTP verification."""


class RegistrationOTPError(Exception):
    """Raised for invalid/expired/mismatched registration-email OTP verification."""


def issue_password_reset_token(email: str) -> None:
    """Creates a reset token and emails the reset link, if the email matches
    an account. Silent no-op otherwise — the caller always returns a generic
    success message so this endpoint can't be used to enumerate accounts.
    """
    try:
        user = User.objects.get(email=email.lower().strip(), is_active=True)
    except User.DoesNotExist:
        return

    reset_token = PasswordResetToken.objects.create(user=user)
    reset_link = f'{settings.FRONTEND_URL}/reset-password?token={reset_token.token}'

    send_mail(
        subject='Reset your Harmony Fusion Studio password',
        message=(
            f'Hello{" " + user.first_name if user.first_name else ""},\n\n'
            f'Use the link below to reset your password. It expires in '
            f'{settings.PASSWORD_RESET_TOKEN_TTL_HOURS} hour(s).\n\n'
            f'{reset_link}\n\n'
            "If you didn't request this, you can safely ignore this email."
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


@transaction.atomic
def reset_password_with_token(token: str, new_password: str) -> bool:
    """Consumes a reset token and sets the new password. Returns False if the
    token is missing/expired/already used, True on success."""
    try:
        reset_token = PasswordResetToken.objects.select_for_update().select_related('user').get(token=token)
    except PasswordResetToken.DoesNotExist:
        return False

    if not reset_token.is_valid:
        return False

    user = reset_token.user
    user.set_password(new_password)
    user.save(update_fields=['password'])
    reset_token.mark_used()
    return True


@transaction.atomic
def request_email_change(user, new_email: str) -> EmailChangeRequest:
    """Starts an email-change flow: creates a fresh OTP request and emails
    the 6-digit code to the NEW address (proving the user actually
    controls it) — the account's email is untouched until verify_email_change
    succeeds. Invalidates any still-pending request for this user first, so
    only the most recent code is ever valid.

    fail_silently=False here deliberately: if the studio's email settings
    aren't configured (or SMTP genuinely fails), the caller must see a real
    error rather than a false "code sent" success — the whole point of this
    flow is that the code actually reaches the new address. The OTP row is
    only committed if send_mail succeeds (atomic + re-raise rolls it back).
    """
    new_email = new_email.lower().strip()
    if User.objects.filter(email=new_email).exclude(pk=user.pk).exists():
        raise EmailChangeError('An account with this email already exists.')

    EmailChangeRequest.objects.filter(user=user, used_at__isnull=True).update(used_at=timezone.now())

    change_request = EmailChangeRequest.objects.create(user=user, new_email=new_email)

    try:
        send_mail(
            subject='Confirm your new Harmony Fusion Studio email',
            message=(
                f'Hello{" " + user.first_name if user.first_name else ""},\n\n'
                f'Use the code below to confirm {new_email} as your new email address. '
                f'It expires in 5 minutes.\n\n'
                f'{change_request.otp_code}\n\n'
                "If you didn't request this, you can safely ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[new_email],
            fail_silently=False,
        )
    except Exception as exc:
        raise EmailChangeError('Could not send the verification email. Please try again later.') from exc

    return change_request


@transaction.atomic
def verify_email_change(user, otp_code: str) -> User:
    """Verifies the OTP for the user's most recent pending email-change
    request and, only on success, updates User.email. Raises EmailChangeError
    with a user-facing message on any failure (no pending request, expired,
    too many attempts, wrong code) without revealing which case it was.
    """
    change_request = (
        EmailChangeRequest.objects.select_for_update()
        .filter(user=user, used_at__isnull=True)
        .order_by('-created_at')
        .first()
    )
    if change_request is None or not change_request.is_valid:
        raise EmailChangeError('This code is invalid or has expired. Request a new one.')

    if change_request.otp_code != otp_code.strip():
        change_request.register_failed_attempt()
        raise EmailChangeError('Incorrect code.')

    if User.objects.filter(email=change_request.new_email).exclude(pk=user.pk).exists():
        raise EmailChangeError('An account with this email already exists.')

    user.email = change_request.new_email
    user.save(update_fields=['email'])
    change_request.mark_used()
    return user


@transaction.atomic
def request_registration_otp(email: str) -> RegistrationOTP:
    """Starts email verification ahead of account creation — used by public
    self-registration and by admin-initiated admin/instructor creation
    alike, since both need proof the submitted email is reachable before
    the rest of the form is unlocked. Invalidates any still-pending code
    for this email first, so only the most recent one is ever valid.
    """
    email = email.lower().strip()
    if User.objects.filter(email=email).exists():
        raise RegistrationOTPError('An account with this email already exists.')

    RegistrationOTP.objects.filter(email=email, verified_at__isnull=True, consumed_at__isnull=True).update(
        consumed_at=timezone.now()
    )

    otp = RegistrationOTP.objects.create(email=email)

    try:
        send_mail(
            subject='Verify your email for Harmony Fusion Studio',
            message=(
                'Use the code below to verify this email address before continuing. '
                'It expires in 5 minutes.\n\n'
                f'{otp.otp_code}\n\n'
                "If you didn't request this, you can safely ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as exc:
        raise RegistrationOTPError('Could not send the verification email. Please try again later.') from exc

    return otp


@transaction.atomic
def verify_registration_otp(email: str, otp_code: str) -> RegistrationOTP:
    """Verifies the OTP for this email's most recent pending registration
    request. On success, the account-creation serializers (RegisterSerializer,
    AdminCreateAdminSerializer, AdminCreateInstructorSerializer) will accept
    that email — see get_verified_registration_otp.
    """
    email = email.lower().strip()
    otp = (
        RegistrationOTP.objects.select_for_update()
        .filter(email=email, verified_at__isnull=True, consumed_at__isnull=True)
        .order_by('-created_at')
        .first()
    )
    if otp is None or not otp.can_be_verified:
        raise RegistrationOTPError('This code is invalid or has expired. Request a new one.')

    if otp.otp_code != otp_code.strip():
        otp.register_failed_attempt()
        raise RegistrationOTPError('Incorrect code.')

    otp.mark_verified()
    return otp


def get_verified_registration_otp(email: str) -> RegistrationOTP | None:
    """Looks up a still-usable verified OTP for this email (verified within
    the last 30 minutes, not yet consumed). Called from the account-creation
    serializers to gate create(); callers must invoke otp.mark_consumed()
    once the account is actually created, so a code can't be replayed for a
    second account.
    """
    email = email.lower().strip()
    otp = RegistrationOTP.objects.filter(email=email, consumed_at__isnull=True).order_by('-created_at').first()
    if otp and otp.is_valid_for_registration:
        return otp
    return None
