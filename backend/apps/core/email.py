"""Shared branded-email senders used across accounts/bookings/payments.

Every outgoing email in the app should go through one of these two
functions rather than calling django.core.mail.send_mail directly, so every
message shares the same HTML shell (apps/core/templates/core/emails/_base.html)
and always ships a plain-text alternative part — mail clients and spam
filters both weigh a missing text/plain part negatively, since HTML-only
mail is a classic spam signal.
"""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def _send(*, subject: str, html_body: str, text_body: str, recipient: str, fail_silently: bool) -> None:
    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
    )
    message.attach_alternative(html_body, 'text/html')
    message.send(fail_silently=fail_silently)


def send_otp_email(
    *,
    subject: str,
    heading: str,
    intro: str,
    otp_code: str,
    recipient: str,
    first_name: str = '',
    fail_silently: bool = False,
) -> None:
    """A 6-digit-code email (registration, password reset, email change) —
    same visual shape every time, just different subject/intro copy."""
    context = {'heading': heading, 'intro': intro, 'otp_code': otp_code, 'first_name': first_name}
    html_body = render_to_string('core/emails/otp_code.html', context)
    text_body = (
        f'Hello{" " + first_name if first_name else ""},\n\n'
        f'{intro}\n\n'
        f'{otp_code}\n\n'
        "If you didn't request this, you can safely ignore this email."
    )
    _send(subject=subject, html_body=html_body, text_body=text_body, recipient=recipient, fail_silently=fail_silently)


def send_notice_email(
    *,
    subject: str,
    heading: str,
    paragraphs: list[str],
    recipient: str,
    first_name: str = '',
    cta_url: str | None = None,
    cta_label: str = '',
    fail_silently: bool = False,
) -> None:
    """A plain announcement email (transfer request, low-usage reminder) —
    a greeting, one or more paragraphs, and an optional CTA button."""
    context = {
        'heading': heading,
        'paragraphs': paragraphs,
        'first_name': first_name,
        'cta_url': cta_url,
        'cta_label': cta_label,
    }
    html_body = render_to_string('core/emails/notice.html', context)
    text_body = (
        f'Hello{" " + first_name if first_name else ""},\n\n'
        + '\n\n'.join(paragraphs)
        + (f'\n\n{cta_label}: {cta_url}' if cta_url else '')
    )
    # Belt-and-braces: strip any accidental markup from the paragraphs
    # themselves so the text part never carries stray HTML.
    text_body = strip_tags(text_body)
    _send(subject=subject, html_body=html_body, text_body=text_body, recipient=recipient, fail_silently=fail_silently)
