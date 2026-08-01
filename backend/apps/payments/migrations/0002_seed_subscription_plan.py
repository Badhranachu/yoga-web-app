from django.db import migrations

DEFAULT_MONTHLY_PRICE = '1200.00'
DEFAULT_INCLUDED_SESSIONS = 30


def seed_plan(apps, schema_editor):
    SubscriptionPlan = apps.get_model('payments', 'SubscriptionPlan')
    if not SubscriptionPlan.objects.exists():
        SubscriptionPlan.objects.create(
            monthly_price=DEFAULT_MONTHLY_PRICE,
            included_sessions=DEFAULT_INCLUDED_SESSIONS,
            is_active=True,
        )


def unseed_plan(apps, schema_editor):
    SubscriptionPlan = apps.get_model('payments', 'SubscriptionPlan')
    SubscriptionPlan.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_plan, unseed_plan),
    ]
