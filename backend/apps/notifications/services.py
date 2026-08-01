from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User

from .models import Notification


class NotificationService:
    """Reusable in-app notification service.

    Business modules call this service instead of writing notification rows
    directly. Future email/SMS adapters can subscribe at this boundary
    without changing booking, payment, or subscription logic.
    """

    @staticmethod
    @transaction.atomic
    def create(
        recipient,
        notification_type: str,
        title: str,
        message: str,
        *,
        related_type: str = '',
        related_id: int | str | None = None,
        action_url: str = '',
        dedupe_key: str | None = None,
    ) -> Notification:
        defaults = {
            'notification_type': notification_type,
            'channel': Notification.Channel.IN_APP,
            'title': title,
            'message': message,
            'related_type': related_type,
            'related_id': '' if related_id is None else str(related_id),
            'action_url': action_url,
        }
        if dedupe_key:
            notification, _created = Notification.objects.get_or_create(
                dedupe_key=dedupe_key,
                defaults={'recipient': recipient, **defaults},
            )
            return notification
        return Notification.objects.create(recipient=recipient, **defaults)

    @staticmethod
    def notify_admins(notification_type: str, title: str, message: str, **kwargs) -> list[Notification]:
        return [
            NotificationService.create(
                admin,
                notification_type,
                title,
                message,
                **{
                    **kwargs,
                    'dedupe_key': (
                        f"{kwargs['dedupe_key']}:{admin.pk}"
                        if kwargs.get('dedupe_key')
                        else None
                    ),
                },
            )
            for admin in User.objects.filter(role=User.Role.ADMIN, is_active=True)
        ]

    @staticmethod
    @transaction.atomic
    def mark_read(notification: Notification) -> Notification:
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at', 'updated_at'])
        return notification

    @staticmethod
    @transaction.atomic
    def mark_all_read(user) -> int:
        return Notification.objects.filter(recipient=user, is_read=False).update(
            is_read=True,
            read_at=timezone.now(),
            updated_at=timezone.now(),
        )
