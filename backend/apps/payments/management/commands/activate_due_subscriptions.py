from django.core.management.base import BaseCommand

from apps.payments.services import activate_due_subscriptions


class Command(BaseCommand):
    """Flips any SCHEDULED subscription whose start_date has arrived over to
    ACTIVE (renewals purchased ahead of time, or a purchase scheduled for a
    future date).

    Intended to run on a daily schedule (cron / Windows Task Scheduler)
    alongside generate_slots and send_low_usage_reminders.

    Usage: python manage.py activate_due_subscriptions
    """

    help = 'Activates scheduled subscriptions whose start date has arrived.'

    def handle(self, *args, **options):
        result = activate_due_subscriptions()
        self.stdout.write(self.style.SUCCESS(f"Activated {result['activated']} subscription(s)."))
