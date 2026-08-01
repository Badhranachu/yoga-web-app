from django.db import migrations


def generate_initial_slots(apps, schema_editor):
    # Run after 0003 so the real slot-generation service can safely query
    # classes_leave on a fresh database.
    from apps.classes_app.services import generate_slots

    generate_slots()


class Migration(migrations.Migration):

    dependencies = [
        ('classes_app', '0003_leave_management'),
    ]

    operations = [
        migrations.RunPython(generate_initial_slots, migrations.RunPython.noop),
    ]
