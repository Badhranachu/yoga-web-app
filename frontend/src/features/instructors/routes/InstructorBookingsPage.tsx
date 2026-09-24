import { useEffect, useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { useLiveClock } from '@/shared/lib/useLiveClock';
import { FormError } from '@/shared/ui';
import { bookingsApi } from '@/features/bookings/api/bookingsApi';
import type { InstructorBooking } from '@/features/bookings/types';
import { getEffectiveStatus } from '@/features/bookings/lib/bookingStatus';

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

const formatTime = (isoTime: string) =>
  new Date(`1970-01-01T${isoTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

// Mirrors the backend's INSTRUCTOR_ATTEND_WINDOW_*_MINUTES — 15 minutes
// before the slot starts through 15 minutes after, so instructors can
// self-confirm attendance right around class time (not hours later).
const ATTEND_WINDOW_BEFORE_MINUTES = 15;
const ATTEND_WINDOW_AFTER_MINUTES = 15;

const isWithinAttendWindow = (booking: InstructorBooking) => {
  const start = new Date(`${booking.slot.date}T${booking.slot.start_time}`);
  const windowStart = new Date(start.getTime() - ATTEND_WINDOW_BEFORE_MINUTES * 60_000);
  const windowEnd = new Date(start.getTime() + ATTEND_WINDOW_AFTER_MINUTES * 60_000);
  const now = new Date();
  return now >= windowStart && now <= windowEnd;
};

type Tab = 'upcoming' | 'attended' | 'not_attended';

// Bookings auto-assigned to this instructor (see backend
// apps.bookings.services.assign_instructor) — includes customer contact
// details so the instructor knows who they're teaching.
export const InstructorBookingsPage = () => {
  useLiveClock();
  const [bookings, setBookings] = useState<InstructorBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');

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
  // already passed today moves out of Upcoming even though its date is
  // still today, matching the same effective-status computation used on
  // the member side (see getEffectiveStatus). Once attended, a booking
  // moves straight to the Attended tab regardless of time.
  const upcoming = (bookings ?? [])
    .filter((booking) => getEffectiveStatus(booking) === 'booked')
    .sort((a, b) => `${a.slot.date}${a.slot.start_time}`.localeCompare(`${b.slot.date}${b.slot.start_time}`));
  const attended = (bookings ?? [])
    .filter((booking) => getEffectiveStatus(booking) === 'attended')
    .sort((a, b) => `${b.slot.date}${b.slot.start_time}`.localeCompare(`${a.slot.date}${a.slot.start_time}`));
  const notAttended = (bookings ?? [])
    .filter((booking) => getEffectiveStatus(booking) === 'expired')
    .sort((a, b) => `${b.slot.date}${b.slot.start_time}`.localeCompare(`${a.slot.date}${a.slot.start_time}`));

  const TAB_CONFIG: { value: Tab; label: string; count: number }[] = [
    { value: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { value: 'attended', label: 'Attended', count: attended.length },
    { value: 'not_attended', label: 'Not Attended', count: notAttended.length },
  ];

  const activeList = activeTab === 'upcoming' ? upcoming : activeTab === 'attended' ? attended : notAttended;

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
          <div className="mb-6 flex w-full gap-2">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center text-[11px] uppercase leading-tight tracking-widest transition-colors ${
                  activeTab === tab.value
                    ? 'bg-[#2B241E] text-white'
                    : 'border border-[#2B241E]/15 text-[#786A58] hover:border-[#D8B46A] hover:text-[#2B241E]'
                }`}
              >
                <span className="whitespace-normal break-words">{tab.label}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    activeTab === tab.value ? 'bg-white/20' : 'bg-[#2B241E]/10'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {activeList.length === 0 ? (
            <p className="text-sm text-[#786A58]">Nothing here yet.</p>
          ) : (
            <div className="space-y-2">
              {activeList.map((booking) => {
                const canAttend = activeTab === 'upcoming' && isWithinAttendWindow(booking);
                const isPast = activeTab !== 'upcoming';
                return (
                  <div
                    key={booking.id}
                    className={`rounded-xl border border-[#2B241E]/10 px-4 py-3 text-sm ${
                      isPast ? 'opacity-75' : 'bg-white/40'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[#2B241E]">
                        {formatDate(booking.slot.date)} · {formatTime(booking.slot.start_time)}–{formatTime(booking.slot.end_time)}
                      </span>
                      <span
                        className={`text-xs uppercase tracking-widest ${
                          activeTab === 'upcoming'
                            ? 'text-[#D8B46A]'
                            : activeTab === 'attended'
                              ? 'text-[#2B241E]'
                              : 'text-[#786A58]'
                        }`}
                      >
                        {activeTab === 'upcoming' ? 'Booked' : activeTab === 'attended' ? 'Attended' : 'Not Attended'}
                      </span>
                    </div>
                    <div className={isPast ? 'text-[#786A58]' : 'text-[#2B241E]'}>{booking.customer_name}</div>
                    {activeTab === 'upcoming' && (
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
                    )}
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
        </>
      )}
    </div>
  );
};
