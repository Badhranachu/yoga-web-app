from django.core.management.base import BaseCommand

from apps.payments.services import send_low_usage_reminders


class Command(BaseCommand):
    """Emails members with 10 days left on their subscription cycle who
    have used fewer than 20 of their sessions so far.

    Intended to run on a daily schedule (cron / Windows Task Scheduler)
    alongside generate_slots — each subscription is only ever reminded
    once per cycle (see UserSubscription.low_usage_reminder_sent_at).

    Usage: python manage.py send_low_usage_reminders
    """

    help = 'Emails members with low session usage and 10 days left on their subscription cycle.'

    def handle(self, *args, **options):
        result = send_low_usage_reminders()
        self.stdout.write(
            self.style.SUCCESS(
                f"Checked {result['checked']} subscription(s), sent {result['sent']} reminder(s)."
            )
        )
