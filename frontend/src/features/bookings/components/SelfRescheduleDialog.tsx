import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { useBodyScrollLock } from '@/shared/lib/useBodyScrollLock';
import { toLocalIso, todayIso } from '@/shared/lib/date';
import { FormError, LoadingBar, MiniCalendar } from '@/shared/ui';
import { classesApi } from '@/features/classes/api/classesApi';
import type { Slot } from '@/features/classes/types';
import { bookingsApi } from '../api/bookingsApi';
import type { Booking } from '../types';

export type SelfRescheduleDialogProps = {
  booking: Booking;
  onRescheduled: () => void;
  onClose: () => void;
};

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

const formatTime = (isoTime: string) =>
  new Date(`1970-01-01T${isoTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

type Step = 'pick' | 'confirm-1' | 'confirm-2';

// Member-initiated reschedule — instant, no admin approval (see backend
// apps.bookings.services.self_reschedule_booking). Two-step confirmation
// on purpose: moving a class immediately, with no separate approval step
// to catch a mistake, means the UI itself should be the safety net.
export const SelfRescheduleDialog = ({ booking, onRescheduled, onClose }: SelfRescheduleDialogProps) => {
  useBodyScrollLock();

  const [step, setStep] = useState<Step>('pick');
  const [selectedDate, setSelectedDate] = useState<string>(booking.slot.date >= todayIso() ? booking.slot.date : todayIso());
  const [datesWithAvailability, setDatesWithAvailability] = useState<Set<string>>(new Set());
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);
  const [dateSlots, setDateSlots] = useState<Slot[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxDate = toLocalIso(new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0));

  // Fetching the whole 2-month window up front meant walking ~30+
  // sequential paginated requests (PAGE_SIZE=20) before the calendar
  // could show anything. Instead, fetch only the currently-visible month
  // — MiniCalendar's onMonthChange fires once on mount (for whichever
  // month it opens on) and again on every prev/next — and cache each
  // month once loaded so flipping back to a month already seen is free.
  const loadedMonthsRef = useRef<Set<string>>(new Set());

  const handleMonthChange = async (year: number, month: number) => {
    const monthKey = `${year}-${month}`;
    if (loadedMonthsRef.current.has(monthKey)) return;
    loadedMonthsRef.current.add(monthKey);

    const monthStart = toLocalIso(new Date(year, month, 1));
    const monthEnd = toLocalIso(new Date(year, month + 1, 0));
    const dateFrom = monthStart < todayIso() ? todayIso() : monthStart;
    const dateTo = monthEnd > maxDate ? maxDate : monthEnd;
    if (dateFrom > dateTo) return;

    setIsLoadingCalendar(true);
    try {
      const results = await classesApi.getAllSlots({ date_from: dateFrom, date_to: dateTo });
      setDatesWithAvailability((current) => {
        const next = new Set(current);
        for (const slot of results) {
          if (slot.availability === 'available' && slot.id !== booking.slot.id) next.add(slot.date);
        }
        return next;
      });
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load calendar availability.'));
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const loadSlotsForDate = async (date: string) => {
    setDateSlots(null);
    setSelectedSlot(null);
    try {
      const now = new Date();
      const results = await classesApi.getAllSlots({ date_from: date, date_to: date });
      const bookable = results.filter((slot) => {
        if (slot.id === booking.slot.id) return false;
        if (slot.availability !== 'available') return false;
        const slotEnd = new Date(`${slot.date}T${slot.end_time}`);
        return slotEnd > now;
      });
      setDateSlots(bookable);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load slots for this date.'));
    }
  };

  useEffect(() => {
    void loadSlotsForDate(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handleFinalConfirm = async () => {
    if (!selectedSlot) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await bookingsApi.selfReschedule({ booking_id: booking.id, slot_id: selectedSlot.id });
      onRescheduled();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not reschedule this booking.'));
      setStep('pick');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/45 px-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-title"
        className="w-full max-w-lg rounded-3xl border border-white/60 bg-cream p-7 shadow-2xl [zoom:0.8]"
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 id="reschedule-title" className="font-serif text-2xl text-dark">Reschedule Class</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-brown hover:text-dark transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-beige bg-white/40 p-3 text-sm">
          <div className="text-xs uppercase tracking-widest text-brown">Current Slot</div>
          <div className="mt-1 text-dark">{formatDate(booking.slot.date)}</div>
          <div className="text-brown">{formatTime(booking.slot.start_time)} – {formatTime(booking.slot.end_time)}</div>
        </div>

        <FormError message={error} />

        {step === 'pick' && (
          <>
            {isLoadingCalendar && <LoadingBar label="Loading availability…" />}
            <MiniCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              maxDate={maxDate}
              markedDates={datesWithAvailability}
              onMonthChange={(year, month) => void handleMonthChange(year, month)}
            />

            <div className="mt-5">
              <div className="mb-2 text-xs uppercase tracking-widest text-brown">
                Available times on {formatDate(selectedDate)}
              </div>
              {dateSlots === null ? (
                <LoadingBar label="Loading times…" />
              ) : dateSlots.length === 0 ? (
                <p className="text-sm text-brown">No free slots on this date.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {dateSlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-lg px-2 py-1.5 text-xs transition-colors ${
                        selectedSlot?.id === slot.id ? 'bg-dark text-white' : 'bg-white/60 text-dark hover:bg-dark/10'
                      }`}
                    >
                      {formatTime(slot.start_time)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-xs uppercase tracking-widest text-brown transition-colors hover:text-dark">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep('confirm-1')}
                disabled={selectedSlot === null}
                className="rounded-full bg-dark px-5 py-2 text-xs uppercase tracking-widest text-white transition-colors hover:bg-gold disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'confirm-1' && selectedSlot && (
          <>
            <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm text-dark">
              Move your class to <span className="font-semibold">{formatDate(selectedSlot.date)}</span> at{' '}
              <span className="font-semibold">{formatTime(selectedSlot.start_time)}</span>? This happens immediately —
              no one needs to approve it.
            </div>
            <div className="mt-7 flex justify-end gap-3">
              <button type="button" onClick={() => setStep('pick')} className="rounded-full px-4 py-2 text-xs uppercase tracking-widest text-brown transition-colors hover:text-dark">
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep('confirm-2')}
                className="rounded-full bg-dark px-5 py-2 text-xs uppercase tracking-widest text-white transition-colors hover:bg-gold"
              >
                Yes, continue
              </button>
            </div>
          </>
        )}

        {step === 'confirm-2' && selectedSlot && (
          <>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-dark">
              Last check — reschedule to <span className="font-semibold">{formatDate(selectedSlot.date)} at {formatTime(selectedSlot.start_time)}</span> for good?
              Your {formatDate(booking.slot.date)} {formatTime(booking.slot.start_time)} spot will be given up right away.
            </div>
            <div className="mt-7 flex justify-end gap-3">
              <button type="button" onClick={() => setStep('confirm-1')} disabled={isSubmitting} className="rounded-full px-4 py-2 text-xs uppercase tracking-widest text-brown transition-colors hover:text-dark disabled:opacity-40">
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleFinalConfirm()}
                disabled={isSubmitting}
                className="rounded-full bg-dark px-5 py-2 text-xs uppercase tracking-widest text-white transition-colors hover:bg-gold disabled:opacity-40"
              >
                {isSubmitting ? 'Rescheduling…' : 'Confirm Reschedule'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
