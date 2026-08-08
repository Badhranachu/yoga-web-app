from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .models import EmailChangeRequest, PasswordResetToken, User


class EmailChangeError(Exception):
    """Raised for invalid/expired/mismatched email-change OTP verification."""


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
