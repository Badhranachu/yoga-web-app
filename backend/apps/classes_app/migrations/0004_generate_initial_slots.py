from django.db import migrations


def generate_initial_slots(apps, schema_editor):
    # No-op — this migration used to call the live
    # apps.classes_app.services.generate_slots() here. That function
    # reads TimetableConfig.break_start_time / break_end_time, which
    # aren't added to the database until migration 0005 (which, being a
    # later migration, necessarily depends on this one existing first).
    #
    # Because this RunPython imported the CURRENT application code
    # instead of a frozen historical model, its behavior was never
    # pinned to this point in schema history: it broke retroactively the
    # moment break_start_time/break_end_time were added to the live
    # TimetableConfig model and to generate_slots()'s code path, even
    # though this migration file itself never changed — importing live
    # app/service code from inside a migration is exactly what Django's
    # migration docs warn against, for this reason.
    #
    # The actual initial-slot generation now happens in
    # 0007_generate_initial_slots, which runs after every schema change
    # generate_slots() depends on (0005's break_* columns, 0006's Slot
    # cleanup) has already been applied — so by the time it runs, the
    # live code and the database agree.
    #
    # This migration is kept in place (not deleted or renamed) and left
    # as a harmless no-op rather than removed, because two apps.bookings
    # migrations already depend on it by name
    # (('classes_app', '0004_generate_initial_slots')), and because any
    # database that has already recorded it as applied doesn't need
    # special-casing — Django only ever skips an already-applied
    # migration, it never re-runs it.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('classes_app', '0003_leave_management'),
    ]

    operations = [
        migrations.RunPython(generate_initial_slots, migrations.RunPython.noop),
    ]
