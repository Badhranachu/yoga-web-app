import { useEffect, useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { FormError } from '@/shared/ui';
import { bookingsApi } from '@/features/bookings/api/bookingsApi';
import type { InstructorBooking } from '@/features/bookings/types';

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

const formatTime = (isoTime: string) =>
  new Date(`1970-01-01T${isoTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

// Bookings auto-assigned to this instructor (see backend
// apps.bookings.services.assign_instructor) — includes customer contact
// details so the instructor knows who they're teaching.
export const InstructorBookingsPage = () => {
  const [bookings, setBookings] = useState<InstructorBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await bookingsApi.getInstructorBookings();
        setBookings(response.results);
      } catch (err) {
        setError(extractErrorMessage(err, 'Could not load your bookings.'));
      }
    };
    void load();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (bookings ?? [])
    .filter((booking) => booking.status === 'booked' && booking.slot.date >= today)
    .sort((a, b) => `${a.slot.date}${a.slot.start_time}`.localeCompare(`${b.slot.date}${b.slot.start_time}`));
  const past = (bookings ?? [])
    .filter((booking) => !(booking.status === 'booked' && booking.slot.date >= today))
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
              {upcoming.map((booking) => (
                <div key={booking.id} className="rounded-xl border border-[#2B241E]/10 bg-white/40 px-4 py-3 text-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[#2B241E]">
                      {formatDate(booking.slot.date)} · {formatTime(booking.slot.start_time)}–{formatTime(booking.slot.end_time)}
                    </span>
                    <span className="text-xs uppercase tracking-widest text-[#D8B46A]">{booking.status}</span>
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
                </div>
              ))}
            </div>
          )}

          <h3 className="mb-3 font-serif text-xl text-[#2B241E]">Past</h3>
          {past.length === 0 ? (
            <p className="text-sm text-[#786A58]">No past classes yet.</p>
          ) : (
            <div className="space-y-2">
              {past.map((booking) => (
                <div key={booking.id} className="rounded-xl border border-[#2B241E]/10 px-4 py-3 text-sm opacity-75">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[#2B241E]">
                      {formatDate(booking.slot.date)} · {formatTime(booking.slot.start_time)}–{formatTime(booking.slot.end_time)}
                    </span>
                    <span className="text-xs uppercase tracking-widest text-[#786A58]">{booking.status}</span>
                  </div>
                  <div className="text-[#786A58]">{booking.customer_name}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
