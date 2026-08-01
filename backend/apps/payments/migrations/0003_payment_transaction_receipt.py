import apps.payments.models
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0002_seed_subscription_plan'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PaymentTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('transaction_id', models.CharField(default=apps.payments.models._generate_transaction_id, max_length=64, unique=True)),
                ('provider', models.CharField(blank=True, default='', max_length=64)),
                ('provider_transaction_id', models.CharField(blank=True, default='', max_length=128)),
                ('payment_type', models.CharField(choices=[('subscription', 'Monthly Subscription'), ('single_slot', 'Single Slot')], max_length=16)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('currency', models.CharField(default='AED', max_length=3)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('successful', 'Successful'), ('failed', 'Failed'), ('refunded', 'Refunded')], default='pending', max_length=16)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('slot_purchase', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payment_transactions', to='payments.slotpurchase')),
                ('subscription', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payment_transactions', to='payments.usersubscription')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='payment_transactions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'payments_transaction',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['user', 'status'], name='idx_payment_user_status'), models.Index(fields=['payment_type', 'status'], name='idx_payment_type_status')],
            },
        ),
        migrations.CreateModel(
            name='Receipt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('receipt_number', models.CharField(default=apps.payments.models._generate_receipt_number, max_length=64, unique=True)),
                ('user_name', models.CharField(blank=True, max_length=301)),
                ('user_email', models.EmailField(max_length=254)),
                ('payment_type', models.CharField(choices=[('subscription', 'Monthly Subscription'), ('single_slot', 'Single Slot')], max_length=16)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('currency', models.CharField(default='AED', max_length=3)),
                ('payment_date', models.DateTimeField()),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('successful', 'Successful'), ('failed', 'Failed'), ('refunded', 'Refunded')], max_length=16)),
                ('transaction', models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name='receipt', to='payments.paymenttransaction')),
            ],
            options={
                'db_table': 'payments_receipt',
                'ordering': ['-payment_date'],
            },
        ),
    ]
