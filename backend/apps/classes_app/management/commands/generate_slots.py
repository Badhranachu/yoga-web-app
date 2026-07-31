from django.core.management.base import BaseCommand

from apps.classes_app.services import generate_slots


class Command(BaseCommand):
    """Incrementally generates any missing future slots out to the current
    horizon (apps.core.StudioSetting: slot_generation_horizon_days).

    Intended to run on a daily schedule (cron / Windows Task Scheduler) so
    the horizon keeps rolling forward as time passes — e.g. today N days
    ahead is always generated, even though nobody edited TimetableConfig.
    Safe to run as often as you like: idempotent, only ever adds rows.

    Usage: python manage.py generate_slots
    """

    help = 'Generates missing future slots from TimetableConfig, out to the configured horizon.'

    def handle(self, *args, **options):
        result = generate_slots()
        self.stdout.write(
            self.style.SUCCESS(
                f"Generated {result['created']} new slot(s) within a {result['horizon_days']}-day horizon."
            )
        )
