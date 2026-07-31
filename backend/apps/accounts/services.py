from django.conf import settings
from django.core.mail import send_mail

from .models import PasswordResetToken, User


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
        subject='Reset your EKAM Yoga password',
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


def reset_password_with_token(token: str, new_password: str) -> bool:
    """Consumes a reset token and sets the new password. Returns False if the
    token is missing/expired/already used, True on success."""
    try:
        reset_token = PasswordResetToken.objects.select_related('user').get(token=token)
    except PasswordResetToken.DoesNotExist:
        return False

    if not reset_token.is_valid:
        return False

    user = reset_token.user
    user.set_password(new_password)
    user.save(update_fields=['password'])
    reset_token.mark_used()
    return True
