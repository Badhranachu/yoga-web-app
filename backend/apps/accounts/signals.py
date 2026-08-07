from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import AdminProfile, User


@receiver(post_save, sender=User)
def ensure_admin_profile(sender, instance: User, created: bool, **kwargs):
    if instance.role != User.Role.ADMIN:
        return
    if created or not hasattr(instance, 'admin_profile'):
        AdminProfile.objects.get_or_create(user=instance)
