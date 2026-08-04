from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.accounts.models import User

from .models import UserProfile


@receiver(post_save, sender=User)
def ensure_normal_user_profile(sender, instance: User, created: bool, **kwargs):
    if instance.role != User.Role.USER:
        return
    if created or not hasattr(instance, 'user_profile'):
        UserProfile.objects.get_or_create(user=instance)
