from django.db import migrations


def generate_initial_slots(apps, schema_editor):
    # Deliberately importing the LIVE service, not a historical model via
    # apps.get_model(). Slot generation is genuinely non-trivial
    # application logic — TimetableConfig.has_break, break-window overlap
    # math, Leave-date exclusion, idempotent get_or_create — that lives in
    # apps.classes_app.services and would have to be duplicated (and kept
    # in sync forever) to reimplement against a frozen historical model,
    # which also doesn't carry over model properties like has_break at
    # all. That reimplementation cost is exactly why this operation was
    # split out of 0004_generate_initial_slots into its own, later
    # migration instead: importing live code is only safe once every
    # schema change it depends on has already been applied by every
    # earlier migration in the chain.
    #
    # This migration depends on 0006 (the latest migration as of when
    # this was written), which is after:
    #   - 0001: Slot / TimetableConfig tables
    #   - 0003: Leave table (generate_slots excludes leave-covered dates)
    #   - 0005: TimetableConfig.break_start_time / break_end_time
    #   - 0006: Slot cleanup (removes is_booked, etc.)
    # so the live TimetableConfig/Slot model's fields always match the
    # database schema at the point this actually runs.
    #
    # generate_slots() is safe to call here even on a database that
    # already has Slot rows (e.g. one where the original, now-emptied
    # 0004 successfully generated slots before this migration existed):
    # it's idempotent by design (get_or_create keyed on date+start_time,
    # backed by a DB unique constraint), so re-running it only fills in
    # any slots still missing for the current horizon.
    from apps.classes_app.services import generate_slots

    generate_slots()


class Migration(migrations.Migration):

    dependencies = [
        ('classes_app', '0006_remove_slot_idx_slot_date_booked_and_more'),
    ]

    operations = [
        migrations.RunPython(generate_initial_slots, migrations.RunPython.noop),
    ]
