from django.db import migrations, models


def migrate_currency_to_inr(apps, schema_editor):
    PaymentTransaction = apps.get_model('payments', 'PaymentTransaction')
    Receipt = apps.get_model('payments', 'Receipt')

    PaymentTransaction.objects.filter(currency='AED').update(currency='INR')
    Receipt.objects.filter(currency='AED').update(currency='INR')


def revert_currency_to_aed(apps, schema_editor):
    PaymentTransaction = apps.get_model('payments', 'PaymentTransaction')
    Receipt = apps.get_model('payments', 'Receipt')

    PaymentTransaction.objects.filter(currency='INR').update(currency='AED')
    Receipt.objects.filter(currency='INR').update(currency='AED')


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0004_paymenttransaction_idx_payment_status_date'),
    ]

    operations = [
        migrations.AlterField(
            model_name='paymenttransaction',
            name='currency',
            field=models.CharField(default='INR', max_length=3),
        ),
        migrations.AlterField(
            model_name='receipt',
            name='currency',
            field=models.CharField(default='INR', max_length=3),
        ),
        migrations.RunPython(migrate_currency_to_inr, revert_currency_to_aed),
    ]
