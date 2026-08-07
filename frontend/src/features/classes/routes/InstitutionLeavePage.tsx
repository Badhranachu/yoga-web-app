import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { formatDate, todayIso, toLocalIso } from '@/shared/lib/date';
import { Button, DateInput, Toast } from '@/shared/ui';
import type { ToastMessage } from '@/shared/ui';
import { classesApi } from '../api/classesApi';
import type { Leave } from '../types';

// Studio-wide closures (holidays, maintenance, etc.) — distinct from
// Instructor Leave, which only records one instructor's unavailability.
// A Leave here blocks EVERY slot in its date range regardless of
// instructor availability (see backend apps.classes_app.services.apply_leave).

// Marks the Leave row created by the Full Slot Stop toggle, so the toggle
// can find and reflect it on load, and delete exactly that row (and no
// other, manually-added leave) when switched back off.
const FULL_STOP_REASON = '__full_slot_stop__';

const SegmentedSwitch = ({
  leftLabel,
  rightLabel,
  value,
  onChange,
  disabled,
}: {
  leftLabel: string;
  rightLabel: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="inline-flex rounded-full border border-[#2B241E]/15 bg-white/60 p-1 text-xs">
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(false)}
      className={`rounded-full px-3 py-1.5 uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        !value ? 'bg-[#2B241E] text-white' : 'text-[#786A58] hover:text-[#2B241E]'
      }`}
    >
      {leftLabel}
    </button>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(true)}
      className={`rounded-full px-3 py-1.5 uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        value ? 'bg-[#2B241E] text-white' : 'text-[#786A58] hover:text-[#2B241E]'
      }`}
    >
      {rightLabel}
    </button>
  </div>
);

export const InstitutionLeavePage = () => {
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [singleDate, setSingleDate] = useState(todayIso());
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [reason, setReason] = useState('');

  const [leaves, setLeaves] = useState<Leave[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStopToggling, setIsStopToggling] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const showError = (text: string) => setToast({ kind: 'error', text });
  const showSuccess = (text: string) => setToast({ kind: 'success', text });

  // The Full Slot Stop toggle reflects whichever non-past leave carries the
  // sentinel reason — there is at most one at a time, since toggling
  // recreates rather than stacks it.
  const activeFullStop = leaves?.find((leave) => leave.reason === FULL_STOP_REASON && !leave.is_past) ?? null;
  const isStopAllOn = activeFullStop !== null;

  const loadLeaves = async () => {
    try {
      const response = await classesApi.getLeaves();
      setLeaves(response.results);
    } catch (err) {
      showError(extractErrorMessage(err, 'Could not load leave history.'));
    }
  };

  useEffect(() => {
    void loadLeaves();
  }, []);

  const handleToggleMultiDay = (checked: boolean) => {
    setIsMultiDay(checked);
    setToast(null);
  };

  const handleToggleFullStop = async (checked: boolean) => {
    if (checked === isStopAllOn) return;
    setToast(null);
    setIsStopToggling(true);
    try {
      if (checked) {
        const horizon = await classesApi.getHorizonSettings();
        const end = new Date();
        end.setDate(end.getDate() + Math.max(horizon.horizon_days, 1));
        await classesApi.addLeave({
          start_date: todayIso(),
          end_date: toLocalIso(end),
          reason: FULL_STOP_REASON,
        });
        showSuccess('All available slots are now blocked.');
      } else if (activeFullStop) {
        await classesApi.deleteLeave(activeFullStop.id);
        showSuccess('Slots are bookable again.');
      }
      await loadLeaves();
    } catch (err) {
      showError(extractErrorMessage(err, 'Could not update the full slot stop.'));
    } finally {
      setIsStopToggling(false);
    }
  };

  const handleSubmit = async () => {
    setToast(null);

    if (!reason.trim()) {
      showError('Reason is required.');
      return;
    }

    let startDate = singleDate;
    let endDate = singleDate;

    if (isMultiDay) {
      if (toDate < fromDate) {
        showError('End date must be on or after the start date.');
        return;
      }
      startDate = fromDate;
      endDate = toDate;
    }

    setIsSubmitting(true);
    try {
      await classesApi.addLeave({ start_date: startDate, end_date: endDate, reason });
      showSuccess('Leave recorded — affected slots are now blocked.');
      setReason('');
      setSingleDate(todayIso());
      setFromDate(todayIso());
      setToDate(todayIso());
      setIsMultiDay(false);
      await loadLeaves();
    } catch (err) {
      showError(extractErrorMessage(err, 'Could not record this leave.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setToast(null);
    setPendingDeleteId(null);
    try {
      await classesApi.deleteLeave(id);
      showSuccess('Leave removed.');
      await loadLeaves();
    } catch (err) {
      showError(extractErrorMessage(err, 'Could not remove this leave.'));
    }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="mb-2 font-serif text-2xl text-[#2B241E]">Institution Full Leave</h2>
      <p className="mb-8 text-sm text-[#786A58]">
        Block the studio from bookings for one day, a range of days, or every slot right now — holidays, closures,
        or maintenance. No slot in the blocked window can be booked, even if instructors are free.
      </p>

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <div className="mb-8 rounded-3xl border border-[#2B241E]/10 bg-white/40 p-6">
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <div>
            <div className="text-sm text-[#2B241E]">Full Slot Stop</div>
            <div className="text-xs text-[#786A58]">
              {isStopAllOn
                ? 'On — every available slot is blocked right now. Turn off to reopen bookings.'
                : 'Turn on to instantly block every currently available slot, regardless of instructor availability.'}
            </div>
          </div>
          <SegmentedSwitch
            leftLabel="Off"
            rightLabel="On"
            value={isStopAllOn}
            onChange={(checked) => void handleToggleFullStop(checked)}
            disabled={isStopToggling || leaves === null}
          />
          {isStopToggling && <span className="ml-3 text-xs text-[#786A58]">Updating…</span>}
        </div>

        <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#2B241E]/10 bg-white/40 px-4 py-3">
          <div>
            <div className="text-xs text-[#786A58]">
              {isMultiDay
                ? 'Choose a from/to date range — every date is blocked from bookings.'
                : 'Pick a single date, or switch to Multiple Days for a range.'}
            </div>
          </div>
          <SegmentedSwitch leftLabel="One Day" rightLabel="Multiple Days" value={isMultiDay} onChange={handleToggleMultiDay} />
        </div>

        {isMultiDay ? (
          <div className="mb-6 rounded-2xl border border-[#2B241E]/10 bg-white/40 p-4">
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
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-[#2B241E]/10 bg-white/40 p-4">
            <label className="mb-1 block text-xs uppercase tracking-widest text-[#786A58]">Date</label>
            <DateInput min={todayIso()} value={singleDate} onChange={setSingleDate} />
          </div>
        )}

        <label className="mb-2 block text-xs uppercase tracking-widest text-[#786A58]">Reason</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Public holiday"
          required
          className="mb-6 w-full rounded-xl border border-[#2B241E]/15 bg-white/60 px-3 py-2.5 text-[#2B241E] outline-none placeholder:text-[#2B241E]/30"
        />

        <Button type="button" variant="primary" onClick={() => void handleSubmit()} disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Leave'}
        </Button>
      </div>

      <h3 className="mb-3 font-serif text-xl text-[#2B241E]">Leave History</h3>
      {leaves === null ? (
        <p className="text-sm text-[#786A58]">Loading…</p>
      ) : leaves.filter((leave) => leave.reason !== FULL_STOP_REASON).length === 0 ? (
        <p className="text-sm text-[#786A58]">No leave has been recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {leaves.filter((leave) => leave.reason !== FULL_STOP_REASON).map((leave) => {
            const dateLabel =
              leave.start_date === leave.end_date
                ? formatDate(leave.start_date)
                : `${formatDate(leave.start_date)} – ${formatDate(leave.end_date)}`;
            return (
              <div
                key={leave.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-[#2B241E]/10 px-4 py-3 text-sm"
              >
                <div>
                  <div className="text-[#2B241E]">{dateLabel}</div>
                  <div className="text-[#786A58]">{leave.reason || 'No reason given'}</div>
                </div>
                {!leave.is_past && (
                  pendingDeleteId === leave.id ? (
                    <div className="flex shrink-0 items-center gap-2 text-xs">
                      <span className="text-[#786A58]">Remove?</span>
                      <button
                        type="button"
                        onClick={() => void handleDelete(leave.id)}
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
                      onClick={() => setPendingDeleteId(leave.id)}
                      aria-label="Remove leave"
                      className="text-[#786A58] hover:text-red-600 transition-colors"
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
    </div>
  );
};
