from django.db import migrations, models


def migrate_currency_to_aed(apps, schema_editor):
    PaymentTransaction = apps.get_model('payments', 'PaymentTransaction')
    Receipt = apps.get_model('payments', 'Receipt')

    PaymentTransaction.objects.filter(currency='INR').update(currency='AED')
    Receipt.objects.filter(currency='INR').update(currency='AED')


def revert_currency_to_inr(apps, schema_editor):
    PaymentTransaction = apps.get_model('payments', 'PaymentTransaction')
    Receipt = apps.get_model('payments', 'Receipt')

    PaymentTransaction.objects.filter(currency='AED').update(currency='INR')
    Receipt.objects.filter(currency='AED').update(currency='INR')


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0008_alter_usersubscription_status'),
    ]

    operations = [
        migrations.AlterField(
            model_name='paymenttransaction',
            name='currency',
            field=models.CharField(default='AED', max_length=3),
        ),
        migrations.AlterField(
            model_name='receipt',
            name='currency',
            field=models.CharField(default='AED', max_length=3),
        ),
        migrations.RunPython(migrate_currency_to_aed, revert_currency_to_inr),
    ]
