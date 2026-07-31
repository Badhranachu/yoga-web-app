from datetime import time

from django.db import migrations


DEFAULT_START = time(9, 0)
DEFAULT_END = time(21, 0)
DEFAULT_DURATION_MINUTES = 60


def seed_timetable_config(apps, schema_editor):
    TimetableConfig = apps.get_model('classes_app', 'TimetableConfig')

    for weekday in range(7):
        TimetableConfig.objects.get_or_create(
            weekday=weekday,
            defaults={
                'is_open': True,
                'start_time': DEFAULT_START,
                'end_time': DEFAULT_END,
                'slot_duration_minutes': DEFAULT_DURATION_MINUTES,
            },
        )

    # Historical models in a migration don't fire signals, so the initial
    # batch of slots is generated explicitly here using the real service
    # (safe: it only touches concrete Slot/TimetableConfig rows, not
    # migration state).
    from apps.classes_app.services import generate_slots

    generate_slots()


def unseed_timetable_config(apps, schema_editor):
    TimetableConfig = apps.get_model('classes_app', 'TimetableConfig')
    TimetableConfig.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('classes_app', '0001_initial'),
        # generate_slots() reads apps.core.StudioSetting via the real model
        # (not historical state), so core's table must already exist.
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_timetable_config, unseed_timetable_config),
    ]
