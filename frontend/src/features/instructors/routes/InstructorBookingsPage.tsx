import { useEffect, useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { useLiveClock } from '@/shared/lib/useLiveClock';
import { FormError } from '@/shared/ui';
import { bookingsApi } from '@/features/bookings/api/bookingsApi';
import type { InstructorBooking } from '@/features/bookings/types';
import { EFFECTIVE_STATUS_LABEL, EFFECTIVE_STATUS_STYLES, getEffectiveStatus } from '@/features/bookings/lib/bookingStatus';

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

const formatTime = (isoTime: string) =>
  new Date(`1970-01-01T${isoTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

// Mirrors the backend's INSTRUCTOR_ATTEND_WINDOW_*_MINUTES — a few
// minutes before the slot starts through 10 minutes after, so instructors
// can self-confirm attendance right around class time (not hours later).
const ATTEND_WINDOW_BEFORE_MINUTES = 5;
const ATTEND_WINDOW_AFTER_MINUTES = 10;

const isWithinAttendWindow = (booking: InstructorBooking) => {
  const start = new Date(`${booking.slot.date}T${booking.slot.start_time}`);
  const windowStart = new Date(start.getTime() - ATTEND_WINDOW_BEFORE_MINUTES * 60_000);
  const windowEnd = new Date(start.getTime() + ATTEND_WINDOW_AFTER_MINUTES * 60_000);
  const now = new Date();
  return now >= windowStart && now <= windowEnd;
};

// Bookings auto-assigned to this instructor (see backend
// apps.bookings.services.assign_instructor) — includes customer contact
// details so the instructor knows who they're teaching.
export const InstructorBookingsPage = () => {
  useLiveClock();
  const [bookings, setBookings] = useState<InstructorBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);

  const load = async () => {
    try {
      const response = await bookingsApi.getInstructorBookings();
      setBookings(response.results);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load your bookings.'));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleMarkAttended = async (bookingId: number) => {
    setError(null);
    setMarkingId(bookingId);
    try {
      await bookingsApi.instructorMarkAttended(bookingId);
      await load();
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not mark this class as attended.'));
    } finally {
      setMarkingId(null);
    }
  };

  // "Upcoming" means genuinely still ahead — a class whose end time has
  // already passed today moves to "Past" even though its date is still
  // today, matching the same effective-status computation used on the
  // member side (see getEffectiveStatus).
  const upcoming = (bookings ?? [])
    .filter((booking) => getEffectiveStatus(booking) === 'booked')
    .sort((a, b) => `${a.slot.date}${a.slot.start_time}`.localeCompare(`${b.slot.date}${b.slot.start_time}`));
  const past = (bookings ?? [])
    .filter((booking) => getEffectiveStatus(booking) !== 'booked')
    .sort((a, b) => `${b.slot.date}${b.slot.start_time}`.localeCompare(`${a.slot.date}${a.slot.start_time}`));

  return (
    <div className="max-w-3xl">
      <h2 className="mb-2 font-serif text-2xl text-[#2B241E]">My Bookings</h2>
      <p className="mb-8 text-sm text-[#786A58]">
        Classes assigned to you, with the member's contact details.
      </p>

      <FormError message={error} />

      {bookings === null ? (
        <p className="text-sm text-[#786A58]">Loading…</p>
      ) : bookings.length === 0 ? (
        <p className="text-sm text-[#786A58]">No bookings assigned to you yet.</p>
      ) : (
        <>
          <h3 className="mb-3 font-serif text-xl text-[#2B241E]">Upcoming</h3>
          {upcoming.length === 0 ? (
            <p className="mb-8 text-sm text-[#786A58]">No upcoming classes.</p>
          ) : (
            <div className="mb-8 space-y-2">
              {upcoming.map((booking) => {
                const canAttend = isWithinAttendWindow(booking);
                return (
                  <div key={booking.id} className="rounded-xl border border-[#2B241E]/10 bg-white/40 px-4 py-3 text-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[#2B241E]">
                        {formatDate(booking.slot.date)} · {formatTime(booking.slot.start_time)}–{formatTime(booking.slot.end_time)}
                      </span>
                      <span className="text-xs uppercase tracking-widest text-[#D8B46A]">Booked</span>
                    </div>
                    <div className="text-[#2B241E]">{booking.customer_name}</div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#786A58]">
                      <span className="flex items-center gap-1">
                        <Mail size={12} strokeWidth={1.5} /> {booking.customer_email}
                      </span>
                      {booking.customer_phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} strokeWidth={1.5} /> {booking.customer_phone}
                        </span>
                      )}
                    </div>
                    {canAttend && (
                      <button
                        type="button"
                        onClick={() => void handleMarkAttended(booking.id)}
                        disabled={markingId === booking.id}
                        className="mt-3 rounded-lg bg-[#2B241E] px-3 py-1.5 text-xs uppercase tracking-widest text-white hover:bg-[#3d342b] disabled:opacity-50"
                      >
                        {markingId === booking.id ? 'Marking…' : 'Mark Attended'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <h3 className="mb-3 font-serif text-xl text-[#2B241E]">Past</h3>
          {past.length === 0 ? (
            <p className="text-sm text-[#786A58]">No past classes yet.</p>
          ) : (
            <div className="space-y-2">
              {past.map((booking) => {
                const effectiveStatus = getEffectiveStatus(booking);
                return (
                  <div key={booking.id} className="rounded-xl border border-[#2B241E]/10 px-4 py-3 text-sm opacity-75">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[#2B241E]">
                        {formatDate(booking.slot.date)} · {formatTime(booking.slot.start_time)}–{formatTime(booking.slot.end_time)}
                      </span>
                      <span className={`text-xs uppercase tracking-widest ${EFFECTIVE_STATUS_STYLES[effectiveStatus]}`}>
                        {EFFECTIVE_STATUS_LABEL[effectiveStatus]}
                      </span>
                    </div>
                    <div className="text-[#786A58]">{booking.customer_name}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
