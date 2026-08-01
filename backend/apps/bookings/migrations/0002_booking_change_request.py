from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='BookingChangeRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('request_type', models.CharField(choices=[('transfer', 'Admin Transfer'), ('reschedule', 'User Reschedule')], max_length=16)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='pending', max_length=16)),
                ('current_date', models.DateField()),
                ('current_start_time', models.TimeField()),
                ('current_end_time', models.TimeField()),
                ('requested_date', models.DateField()),
                ('requested_start_time', models.TimeField()),
                ('requested_end_time', models.TimeField()),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('decision_reason', models.CharField(blank=True, max_length=255)),
                ('notification_sent_at', models.DateTimeField(blank=True, null=True)),
                ('booking', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='change_requests', to='bookings.booking')),
                ('current_slot', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='booking_change_current_requests', to='classes_app.slot')),
                ('requested_by', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='booking_change_requests', to=settings.AUTH_USER_MODEL)),
                ('requested_slot', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='booking_change_requested_requests', to='classes_app.slot')),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_booking_change_requests', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'bookings_booking_change_request',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['booking', 'status'], name='idx_change_booking_status'),
                    models.Index(fields=['request_type', 'status'], name='idx_change_type_status'),
                ],
            },
        ),
    ]
