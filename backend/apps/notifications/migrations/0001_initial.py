import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('notification_type', models.CharField(choices=[('booking_confirmed', 'Booking Confirmed'), ('booking_cancelled', 'Booking Cancelled'), ('transfer_request', 'Transfer Request'), ('transfer_approved', 'Transfer Approved'), ('transfer_rejected', 'Transfer Rejected'), ('reschedule_request', 'Reschedule Request'), ('reschedule_approved', 'Reschedule Approved'), ('reschedule_rejected', 'Reschedule Rejected'), ('subscription_purchased', 'Subscription Purchased'), ('subscription_renewed', 'Subscription Renewed'), ('subscription_expired', 'Subscription Expired'), ('payment_successful', 'Payment Successful')], max_length=32)),
                ('channel', models.CharField(choices=[('in_app', 'In App')], default='in_app', max_length=16)),
                ('title', models.CharField(max_length=160)),
                ('message', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('related_type', models.CharField(blank=True, max_length=64)),
                ('related_id', models.CharField(blank=True, max_length=64)),
                ('action_url', models.CharField(blank=True, max_length=255)),
                ('dedupe_key', models.CharField(blank=True, max_length=160, null=True, unique=True)),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'notifications_notification',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['recipient', 'is_read'], name='idx_notif_recipient_read'), models.Index(fields=['recipient', 'created_at'], name='idx_notif_recipient_date')],
            },
        ),
    ]
