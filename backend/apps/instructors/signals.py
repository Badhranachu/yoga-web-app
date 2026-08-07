from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.accounts.models import User

from .models import InstructorProfile


@receiver(post_save, sender=User)
def ensure_instructor_profile(sender, instance: User, created: bool, **kwargs):
    if instance.role != User.Role.INSTRUCTOR:
        return
    if created or not hasattr(instance, 'instructor_profile'):
        InstructorProfile.objects.get_or_create(user=instance)
