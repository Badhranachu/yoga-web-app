"""
Slot generation: turns TimetableConfig (per-weekday working hours + slot
duration) into concrete, bookable Slot rows.

Invariants enforced everywhere in this module:
  - never create a slot for a date in the past
  - never delete or modify a slot that is_booked=True
  - never delete a slot dated in the past, regardless of booking state
  - generation is idempotent: running it twice produces no duplicates and
    no changes on the second run (get_or_create keyed on date+start_time,
    which also has a DB-level unique constraint as a backstop)
  - generation skips any date covered by an active Leave (see apply_leave)

Leave management: turns an admin-declared Leave (a date range) into Slot
availability changes, without ever deleting a Slot row:
  - future, unbooked slots in range -> leave set (UNAVAILABLE)
  - future, booked slots in range   -> leave set too, surfaced as
    LEAVE_CONFLICT (Slot.availability) so an admin can see the clash;
    the booking itself is never touched or cancelled here
  - past slots in range             -> never touched, regardless of
    booking state (leave still recorded in history via the Leave row)
  - deleting a still-future Leave reverses exactly the slots it set
    (leave=None), restoring prior availability
"""

from datetime import datetime, timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.core.models import StudioSetting
from apps.core.settings_keys import (
    SLOT_GENERATION_HORIZON_DAYS,
    SLOT_GENERATION_HORIZON_DAYS_DEFAULT,
)

from .models import Leave, Slot, TimetableConfig


def get_generation_horizon_days() -> int:
    return StudioSetting.get_int(SLOT_GENERATION_HORIZON_DAYS, SLOT_GENERATION_HORIZON_DAYS_DEFAULT)


def _slot_windows_for_config(config: TimetableConfig):
    """Yields (start_time, end_time) tuples for one day, given a TimetableConfig
    row. Any slot that would overlap the configured break window (rest time)
    is skipped entirely — the break is a gap, not a shortened slot.
    """
    anchor_date = timezone.localdate()
    cursor = datetime.combine(anchor_date, config.start_time)
    day_end = datetime.combine(anchor_date, config.end_time)
    step = timedelta(minutes=config.slot_duration_minutes)

    break_start = datetime.combine(anchor_date, config.break_start_time) if config.has_break else None
    break_end = datetime.combine(anchor_date, config.break_end_time) if config.has_break else None

    while cursor + step <= day_end:
        window_end = cursor + step
        if break_start is not None and cursor < break_end and window_end > break_start:
            cursor += step
            continue
        yield cursor.time(), window_end.time()
        cursor += step


def _dates_under_leave(date_from, date_to) -> set:
    """Every date in [date_from, date_to] covered by any Leave row."""
    leaves = Leave.objects.filter(start_date__lte=date_to, end_date__gte=date_from)
    blocked = set()
    for leave in leaves:
        cursor = max(leave.start_date, date_from)
        end = min(leave.end_date, date_to)
        while cursor <= end:
            blocked.add(cursor)
            cursor += timedelta(days=1)
    return blocked


@transaction.atomic
def generate_slots(*, horizon_days: int | None = None) -> dict:
    """Incrementally generates any missing future slots, for every open
    weekday in TimetableConfig, out to the horizon. Safe to call repeatedly
    (e.g. from a daily cron) — only ever adds rows, never touches existing
    ones. Dates covered by an active Leave are skipped entirely — no slot
    is created there until the leave is removed and generation runs again.

    Returns a summary dict: {"created": N, "horizon_days": N}.
    """
    horizon_days = horizon_days if horizon_days is not None else get_generation_horizon_days()

    today = timezone.localdate()
    horizon_end = today + timedelta(days=horizon_days)
    configs_by_weekday = {c.weekday: c for c in TimetableConfig.objects.filter(is_open=True)}
    leave_dates = _dates_under_leave(today, horizon_end)

    created = 0
    for offset in range(horizon_days + 1):
        target_date = today + timedelta(days=offset)
        if target_date in leave_dates:
            continue

        config = configs_by_weekday.get(target_date.weekday())
        if config is None:
            continue

        for start_time, end_time in _slot_windows_for_config(config):
            _, was_created = Slot.objects.get_or_create(
                date=target_date,
                start_time=start_time,
                defaults={
                    'end_time': end_time,
                    'weekday': config.weekday,
                    'source_config': config,
                },
            )
            if was_created:
                created += 1

    return {'created': created, 'horizon_days': horizon_days}


@transaction.atomic
def regenerate_weekday(weekday: int) -> dict:
    """Called when a single TimetableConfig row (one weekday) changes.

    Deletes only that weekday's FUTURE, UNBOOKED slots, then regenerates
    them from the new config out to the current horizon. Past slots and
    booked slots for this weekday are left untouched no matter what.

    Returns {"deleted": N, "created": N}.
    """
    today = timezone.localdate()

    deleted, _ = Slot.objects.filter(
        weekday=weekday,
        date__gte=today,
        is_booked=False,
    ).delete()

    result = generate_slots()
    return {'deleted': deleted, 'created': result['created']}


@transaction.atomic
def regenerate_all() -> dict:
    """Full future regeneration across every weekday — used when horizon
    changes, or as an explicit admin "resync" action. Same safety
    guarantees as regenerate_weekday: past and booked slots are untouched.
    """
    today = timezone.localdate()

    deleted, _ = Slot.objects.filter(date__gte=today, is_booked=False).delete()
    result = generate_slots()
    return {'deleted': deleted, 'created': result['created']}


@transaction.atomic
def apply_leave(leave: Leave) -> dict:
    """Blocks every FUTURE slot that falls within [leave.start_date,
    leave.end_date] by setting Slot.leave. Never deletes a slot.

    Unbooked slots become UNAVAILABLE; already-booked slots become
    LEAVE_CONFLICT (the booking is left completely alone — this only
    flags the clash for an admin to see and resolve manually).

    Past dates in the range are left alone entirely: the Leave row itself
    is still recorded (history/audit), but no Slot in the past is touched.
    """
    today = timezone.localdate()
    affected = Slot.objects.filter(
        date__gte=max(leave.start_date, today),
        date__lte=leave.end_date,
    )
    updated = affected.update(leave=leave)
    conflicts = affected.filter(is_booked=True).count()
    return {'blocked': updated, 'conflicts': conflicts}


@transaction.atomic
def release_leave(leave: Leave) -> dict:
    """Reverses apply_leave: clears Slot.leave for every slot this leave
    blocked. Called right before a future leave is deleted. Slots that
    were booked keep their booking untouched — only the leave flag clears.
    """
    updated = Slot.objects.filter(leave=leave).update(leave=None)
    return {'restored': updated}
