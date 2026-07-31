from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import TimetableConfig
from .services import regenerate_weekday


@receiver(post_save, sender=TimetableConfig)
def on_timetable_config_saved(sender, instance: TimetableConfig, **kwargs):
    """Changing a weekday's working hours regenerates only that weekday's
    future, unbooked slots — never past slots, never booked ones."""
    regenerate_weekday(instance.weekday)
