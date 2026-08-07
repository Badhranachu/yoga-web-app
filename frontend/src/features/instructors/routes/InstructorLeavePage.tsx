import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { formatDate, MONTH_NAMES, todayIso, datesInRange, oneDayLater } from '@/shared/lib/date';
import { Button, DateInput, Toast } from '@/shared/ui';
import type { ToastMessage } from '@/shared/ui';
import { classesApi } from '@/features/classes/api/classesApi';
import type { Slot } from '@/features/classes/types';
import { instructorsApi } from '../api/instructorsApi';
import type { InstructorProfile } from '../types';
import type { InstructorLeave } from '../types/leave';

// Segmented two-option switch: unlike a plain on/off Toggle, both options
// are always labeled and the active one is visually highlighted — avoids
// the "toggle is off but the active option is right there in the label"
// confusion a single boolean switch reads as.
type SegmentedSwitchProps = {
  leftLabel: string;
  rightLabel: string;
  value: boolean; // false = left, true = right
  onChange: (value: boolean) => void;
};

const SegmentedSwitch = ({ leftLabel, rightLabel, value, onChange }: SegmentedSwitchProps) => (
  <div className="inline-flex rounded-full border border-[#2B241E]/15 bg-white/60 p-1 text-xs">
    <button
      type="button"
      onClick={() => onChange(false)}
      className={`rounded-full px-3 py-1.5 uppercase tracking-widest transition-colors ${
        !value ? 'bg-[#2B241E] text-white' : 'text-[#786A58] hover:text-[#2B241E]'
      }`}
    >
      {leftLabel}
    </button>
    <button
      type="button"
      onClick={() => onChange(true)}
      className={`rounded-full px-3 py-1.5 uppercase tracking-widest transition-colors ${
        value ? 'bg-[#2B241E] text-white' : 'text-[#786A58] hover:text-[#2B241E]'
      }`}
    >
      {rightLabel}
    </button>
  </div>
);

const formatTime = (isoTime: string) =>
  new Date(`1970-01-01T${isoTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

// A multi-day leave submission creates one InstructorLeave row per date
// (see submit logic below) — group consecutive whole-day rows for the same
// instructor/reason back into a single range for display, so a 3-day leave
// reads as one entry instead of three.
type LeaveGroup = { leaves: InstructorLeave[] };

const groupLeaves = (leaves: InstructorLeave[]): LeaveGroup[] => {
  const sorted = [...leaves].sort((a, b) => a.instructor_name.localeCompare(b.instructor_name) || a.date.localeCompare(b.date));
  const groups: LeaveGroup[] = [];
  for (const leave of sorted) {
    const last = groups.at(-1);
    const lastLeave = last?.leaves.at(-1);
    const isConsecutive =
      lastLeave &&
      lastLeave.instructor_name === leave.instructor_name &&
      lastLeave.is_full_day &&
      leave.is_full_day &&
      (lastLeave.reason || '') === (leave.reason || '') &&
      oneDayLater(lastLeave.date) === leave.date;
    if (isConsecutive && last) {
      last.leaves.push(leave);
    } else {
      groups.push({ leaves: [leave] });
    }
  }
  return groups;
};

// Admin marks an instructor unavailable. Two shapes:
//   - One Day: a single date, either the whole day or specific slots on it.
//   - Multiple Days: a from/to date range, always whole-day for every date
//     in range — a range is inherently "all day, every day," so there's no
//     per-slot picker for it.
// This is a record only (see InstructorLeave docstring): it does not
// change Slot.availability or block member bookings, since slots aren't
// yet assigned to instructors.
export const InstructorLeavePage = () => {
  const [instructors, setInstructors] = useState<InstructorProfile[] | null>(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState<number | null>(null);
  const [isMultiDay, setIsMultiDay] = useState(false);

  // One Day mode state
  const [singleDate, setSingleDate] = useState(todayIso());
  const [isSpecificSlots, setIsSpecificSlots] = useState(false);
  const [slotsForDate, setSlotsForDate] = useState<Slot[] | null>(null);
  const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([]);

  // Multiple Days mode state
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());

  const [reason, setReason] = useState('');
  const [leaves, setLeaves] = useState<InstructorLeave[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Leave History panel filters
  const [historySearch, setHistorySearch] = useState('');
  const now = new Date();
  const [historyMonth, setHistoryMonth] = useState<{ year: number; month: number } | null>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const showError = (text: string) => setToast({ kind: 'error', text });
  const showSuccess = (text: string) => setToast({ kind: 'success', text });

  const loadInstructors = async () => {
    try {
      const data = await instructorsApi.list();
      setInstructors(data);
      setSelectedInstructorId((current) => current ?? data[0]?.id ?? null);
    } catch (err) {
      showError(extractErrorMessage(err, 'Could not load instructors.'));
    }
  };

  const loadLeaves = async () => {
    try {
      const response = await instructorsApi.getLeaves();
      setLeaves(response.results);
    } catch (err) {
      showError(extractErrorMessage(err, 'Could not load leave history.'));
    }
  };

  useEffect(() => {
    void loadInstructors();
    void loadLeaves();
  }, []);

  const resetForm = () => {
    setSingleDate(todayIso());
    setIsSpecificSlots(false);
    setSlotsForDate(null);
    setSelectedSlotIds([]);
    setFromDate(todayIso());
    setToDate(todayIso());
    setReason('');
  };

  const handleToggleMultiDay = (checked: boolean) => {
    setIsMultiDay(checked);
    setToast(null);
  };

  const handleSingleDateChange = (date: string) => {
    setSingleDate(date);
    setSlotsForDate(null);
    setSelectedSlotIds([]);
  };

  const handleToggleSpecificSlots = async (checked: boolean) => {
    setIsSpecificSlots(checked);
    if (!checked || slotsForDate !== null) return;
    try {
      const results = await classesApi.getAllSlots({ date_from: singleDate, date_to: singleDate });
      setSlotsForDate(results);
    } catch (err) {
      showError(extractErrorMessage(err, 'Could not load slots for this date.'));
    }
  };

  const toggleSlot = (slotId: number) => {
    setSelectedSlotIds((current) =>
      current.includes(slotId) ? current.filter((id) => id !== slotId) : [...current, slotId],
    );
  };

  const handleSubmit = async () => {
    if (!selectedInstructorId) return;
    setToast(null);

    if (!reason.trim()) {
      showError('Reason is required.');
      return;
    }

    if (isMultiDay && toDate < fromDate) {
      showError('End date must be on or after the start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isMultiDay) {
        const dates = datesInRange(fromDate, toDate);
        for (const date of dates) {
          await instructorsApi.addLeave({ instructor: selectedInstructorId, date, slot_ids: [], reason });
        }
        showSuccess(`Leave recorded for ${dates.length} date(s).`);
      } else {
        await instructorsApi.addLeave({
          instructor: selectedInstructorId,
          date: singleDate,
          slot_ids: isSpecificSlots ? selectedSlotIds : [],
          reason,
        });
        showSuccess('Leave recorded.');
      }
      resetForm();
      setIsMultiDay(false);
      await loadLeaves();
    } catch (err) {
      showError(extractErrorMessage(err, 'Could not record leave.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (ids: number[]) => {
    setToast(null);
    setPendingDeleteId(null);
    try {
      await Promise.all(ids.map((id) => instructorsApi.deleteLeave(id)));
      showSuccess('Leave removed.');
      await loadLeaves();
    } catch (err) {
      showError(extractErrorMessage(err, 'Could not remove this leave.'));
    }
  };

  const filteredLeaves = useMemo(() => {
    if (leaves === null) return null;
    const query = historySearch.trim().toLowerCase();
    return leaves.filter((leave) => {
      const matchesSearch = query === '' || leave.instructor_name.toLowerCase().includes(query);
      const leaveDate = new Date(`${leave.date}T00:00:00`);
      const matchesMonth =
        historyMonth === null || (leaveDate.getFullYear() === historyMonth.year && leaveDate.getMonth() === historyMonth.month);
      return matchesSearch && matchesMonth;
    });
  }, [leaves, historySearch, historyMonth]);

  // Every distinct year/month present in the leave data, newest first —
  // populates the month filter dropdown with only months that have entries.
  const monthOptions = useMemo(() => {
    if (leaves === null) return [];
    const seen = new Map<string, { year: number; month: number }>();
    for (const leave of leaves) {
      const d = new Date(`${leave.date}T00:00:00`);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!seen.has(key)) seen.set(key, { year: d.getFullYear(), month: d.getMonth() });
    }
    return [...seen.values()].sort((a, b) => b.year - a.year || b.month - a.month);
  }, [leaves]);

  return (
    <div>
      <h2 className="mb-2 font-serif text-2xl text-[#2B241E]">Instructor Leave</h2>
      <p className="mb-8 max-w-3xl text-sm text-[#786A58]">
        Mark an instructor unavailable for one day (optionally just specific slots), or for a range of days (always
        the whole day). This is a scheduling record only — it doesn't yet block member bookings.
      </p>

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
      <div className="mb-8 rounded-3xl border border-[#2B241E]/10 bg-white/40 p-6">
        <label className="block text-xs uppercase tracking-widest text-[#786A58] mb-2">Instructor</label>
        {instructors === null ? (
          <p className="text-sm text-[#786A58]">Loading instructors…</p>
        ) : instructors.length === 0 ? (
          <p className="text-sm text-[#786A58]">No instructors yet — add one first.</p>
        ) : (
          <select
            value={selectedInstructorId ?? ''}
            onChange={(e) => setSelectedInstructorId(Number(e.target.value))}
            className="mb-6 w-full rounded-xl border border-[#2B241E]/15 bg-white/60 px-3 py-2.5 text-[#2B241E] outline-none"
          >
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.username ?? instructor.email}
              </option>
            ))}
          </select>
        )}

        <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#2B241E]/10 bg-white/40 px-4 py-3">
          <div>
            <div className="text-xs text-[#786A58]">
              {isMultiDay
                ? 'Choose a from/to date range — every date is marked unavailable for the whole day.'
                : 'Pick a single date, or switch to Multiple Days for a range.'}
            </div>
          </div>
          <SegmentedSwitch leftLabel="One Day" rightLabel="Multiple Days" value={isMultiDay} onChange={handleToggleMultiDay} />
        </div>

        {isMultiDay ? (
          <div className="rounded-2xl border border-[#2B241E]/10 bg-white/40 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-[#786A58]">From</label>
                <DateInput
                  min={todayIso()}
                  value={fromDate}
                  onChange={(next) => {
                    setFromDate(next);
                    if (toDate < next) setToDate(next);
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-widest text-[#786A58]">To</label>
                <DateInput min={fromDate} value={toDate} onChange={setToDate} markDate={fromDate} />
              </div>
            </div>
            <p className="mt-3 text-xs text-[#786A58]">
              {datesInRange(fromDate, toDate).length} date(s) will be marked unavailable, whole day.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#2B241E]/10 bg-white/40 p-4">
            <label className="mb-1 block text-xs uppercase tracking-widest text-[#786A58]">Date</label>
            <DateInput min={todayIso()} value={singleDate} onChange={handleSingleDateChange} />

            <div className="mt-4 flex items-center justify-between rounded-xl border border-[#2B241E]/10 bg-white/40 px-3 py-2.5">
              <div>
                <div className="text-xs text-[#786A58]">
                  {isSpecificSlots ? 'Pick which slots below.' : 'The entire date will be marked unavailable.'}
                </div>
              </div>
              <SegmentedSwitch
                leftLabel="Whole Day"
                rightLabel="Specific Slots"
                value={isSpecificSlots}
                onChange={(checked) => void handleToggleSpecificSlots(checked)}
              />
            </div>

            {isSpecificSlots && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-[#786A58]">
                  {slotsForDate === null
                    ? 'Loading slots…'
                    : selectedSlotIds.length === 0
                      ? 'No slots selected yet — pick at least one below.'
                      : `${selectedSlotIds.length} slot(s) selected.`}
                </p>
                {slotsForDate !== null && (
                  slotsForDate.length === 0 ? (
                    <p className="text-sm text-[#786A58]">No slots scheduled on this date.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {slotsForDate.map((slot) => {
                        const isSelected = selectedSlotIds.includes(slot.id);
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => toggleSlot(slot.id)}
                            className={`rounded-lg px-2 py-1.5 text-xs transition-colors ${
                              isSelected ? 'bg-[#2B241E] text-white' : 'bg-white/60 text-[#2B241E] hover:bg-[#2B241E]/10'
                            }`}
                          >
                            {formatTime(slot.start_time)}
                          </button>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        <label className="mt-6 block text-xs uppercase tracking-widest text-[#786A58] mb-2">Reason</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Personal leave"
          required
          className="mb-6 w-full rounded-xl border border-[#2B241E]/15 bg-white/60 px-3 py-2.5 text-[#2B241E] outline-none placeholder:text-[#2B241E]/30"
        />

        <Button type="button" variant="primary" onClick={() => void handleSubmit()} disabled={isSubmitting || !selectedInstructorId}>
          {isSubmitting ? 'Saving…' : 'Save Leave'}
        </Button>
      </div>

      <aside className="h-fit rounded-3xl border border-[#2B241E]/10 bg-white/40 p-6 xl:sticky xl:top-6">
        <h3 className="mb-4 font-serif text-xl text-[#2B241E]">Leave History</h3>

        <div className="relative mb-3">
          <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#786A58]" />
          <input
            type="text"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search instructor…"
            className="w-full rounded-xl border border-[#2B241E]/15 bg-white/60 py-2 pl-9 pr-8 text-sm text-[#2B241E] outline-none placeholder:text-[#2B241E]/30"
          />
          {historySearch && (
            <button
              type="button"
              onClick={() => setHistorySearch('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#786A58] hover:text-[#2B241E]"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="mb-4 flex items-center gap-2">
          <select
            value={historyMonth === null ? 'all' : `${historyMonth.year}-${historyMonth.month}`}
            onChange={(e) => {
              if (e.target.value === 'all') {
                setHistoryMonth(null);
                return;
              }
              // Convert each split segment individually (not
              // `.split('-').map(Number)`, which types each destructured
              // position as `number | undefined` under
              // noUncheckedIndexedAccess) — this value always comes from
              // one of this select's own <option value="{year}-{month}">
              // entries below, so no NaN guard is needed here.
              const [yearPart, monthPart] = e.target.value.split('-');
              setHistoryMonth({ year: Number(yearPart), month: Number(monthPart) });
            }}
            className="w-full rounded-xl border border-[#2B241E]/15 bg-white/60 px-3 py-2 text-sm text-[#2B241E] outline-none"
          >
            <option value="all">All months</option>
            {monthOptions.map(({ year, month }) => (
              <option key={`${year}-${month}`} value={`${year}-${month}`}>
                {MONTH_NAMES[month]} {year}
              </option>
            ))}
          </select>
        </div>

        {filteredLeaves === null ? (
          <p className="text-sm text-[#786A58]">Loading…</p>
        ) : filteredLeaves.length === 0 ? (
          <p className="text-sm text-[#786A58]">
            {leaves && leaves.length > 0 ? 'No leave matches these filters.' : 'No instructor leave recorded yet.'}
          </p>
        ) : (
          <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {groupLeaves(filteredLeaves).map((group) => {
              const first = group.leaves[0]!;
              const last = group.leaves.at(-1)!;
              const dateLabel =
                group.leaves.length > 1 ? `${formatDate(first.date)} – ${formatDate(last.date)}` : formatDate(first.date);
              const canDelete = group.leaves.every((leave) => !leave.is_past);
              return (
                <div
                  key={first.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#2B241E]/10 px-3 py-2.5 text-sm"
                >
                  <div>
                    <div className="text-[#2B241E]">
                      {first.instructor_name} — {dateLabel}
                    </div>
                    <div className="text-[#786A58]">
                      {group.leaves.length > 1
                        ? `${group.leaves.length} days, whole day`
                        : first.is_full_day
                          ? 'Whole day'
                          : `${first.slot_ids.length} slot(s)`}
                      {first.reason && ` · ${first.reason}`}
                    </div>
                  </div>
                  {canDelete && (
                    pendingDeleteId === first.id ? (
                      <div className="flex shrink-0 items-center gap-2 text-xs">
                        <span className="text-[#786A58]">Remove?</span>
                        <button
                          type="button"
                          onClick={() => void handleDelete(group.leaves.map((leave) => leave.id))}
                          className="rounded-full bg-red-600 px-2.5 py-1 text-white hover:bg-red-700"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(null)}
                          className="rounded-full border border-[#2B241E]/15 px-2.5 py-1 text-[#786A58] hover:text-[#2B241E]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(first.id)}
                        aria-label="Remove leave"
                        className="shrink-0 text-[#786A58] hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </aside>
      </div>
    </div>
  );
};
