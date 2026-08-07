import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, FormError } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { bookingsApi } from '@/features/bookings/api/bookingsApi';
import { BookingChangeDialog } from '@/features/bookings/components/BookingChangeDialog';
import { classesApi } from '@/features/classes/api/classesApi';
import type { Slot } from '@/features/classes/types';
import type { Booking, BookingChangeRequest } from '@/features/bookings/types';
import { UserDashboardPanel } from '../components/UserDashboardPanel';

const formatDate = (isoDate: string) => new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const formatTime = (isoTime: string) => new Date(`1970-01-01T${isoTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export const AccountOverviewPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changeRequests, setChangeRequests] = useState<BookingChangeRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<BookingChangeRequest | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isChanging, setIsChanging] = useState(false);

  const loadDashboard = async () => {
    try {
      const [bookingResponse, requestResponse] = await Promise.all([
        bookingsApi.getMyBookings(), bookingsApi.getMyChangeRequests(),
      ]);
      setBookings(bookingResponse.results);
      setChangeRequests(requestResponse.results);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load your bookings.'));
    }
  };

  useEffect(() => { void loadDashboard(); }, []);

  const upcomingBookings = useMemo(() => {
    if (!bookings) return [];
    const today = new Date().toISOString().slice(0, 10);
    return bookings.filter((booking) => booking.status === 'booked' && booking.slot.date >= today)
      .sort((a, b) => `${a.slot.date}${a.slot.start_time}`.localeCompare(`${b.slot.date}${b.slot.start_time}`));
  }, [bookings]);

  const openReschedule = async (booking: Booking) => {
    setError(null);
    try {
      const response = await classesApi.getSlots({ page: 1 });
      const slots = response.results.filter((slot) => slot.availability === 'available' && slot.id !== booking.slot.id);
      setAvailableSlots(slots); setSelectedSlot(slots[0] ?? null); setRescheduleBooking(booking);
    } catch (err) { setError(extractErrorMessage(err, 'Could not load available slots.')); }
  };

  const handleReschedule = async () => {
    if (!rescheduleBooking || !selectedSlot) return;
    setIsChanging(true);
    try {
      await bookingsApi.createRescheduleRequest({ booking_id: rescheduleBooking.id, slot_id: selectedSlot.id });
      setRescheduleBooking(null); await loadDashboard();
    } catch (err) { setError(extractErrorMessage(err, 'Could not submit the reschedule request.')); }
    finally { setIsChanging(false); }
  };

  const handleRequestDecision = async (approve: boolean) => {
    if (!activeRequest) return;
    setIsChanging(true);
    try {
      if (approve) await bookingsApi.approveChangeRequest(activeRequest.id);
      else await bookingsApi.rejectChangeRequest(activeRequest.id);
      setActiveRequest(null); await loadDashboard();
    } catch (err) { setError(extractErrorMessage(err, 'Could not update the booking request.')); }
    finally { setIsChanging(false); }
  };

  if (!bookings) return <p className="text-sm text-brown">Loading your bookings…</p>;

  const pendingTransfer = changeRequests.some((item) => item.status === 'pending' && item.request_type === 'transfer');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="font-serif text-3xl text-dark">Welcome{user?.first_name ? `, ${user.first_name}` : ''}</h2><p className="mt-1 text-sm text-brown">Your upcoming classes.</p></div>
        <Link to="/account/book"><Button type="button" variant="primary">Book a Class</Button></Link>
      </div>

      <FormError message={error} />

      <UserDashboardPanel title="Upcoming Bookings">
        {upcomingBookings.length === 0 ? <p className="text-sm text-brown">No upcoming bookings.</p> : <div className="divide-y divide-beige">{upcomingBookings.map((booking) => <div key={booking.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div><p className="text-dark">{formatDate(booking.slot.date)}</p><p className="text-xs text-brown">{formatTime(booking.slot.start_time)} – {formatTime(booking.slot.end_time)}</p></div><div className="flex items-center gap-3"><span className="text-xs uppercase tracking-wider text-gold-dark">{booking.status}</span><button onClick={() => void openReschedule(booking)} className="text-xs uppercase tracking-widest text-brown hover:text-gold-dark">Reschedule</button></div></div>)}</div>}
        {pendingTransfer && <div className="mt-4 space-y-2">{changeRequests.filter((item) => item.status === 'pending' && item.request_type === 'transfer').map((item) => <button key={item.id} type="button" onClick={() => setActiveRequest(item)} className="w-full rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-left text-sm text-dark">Review transfer request for {formatDate(item.requested_date)} at {formatTime(item.requested_start_time)}.</button>)}</div>}
      </UserDashboardPanel>

      {rescheduleBooking && <BookingChangeDialog booking={rescheduleBooking} requestedSlot={selectedSlot} availableSlots={availableSlots} isSubmitting={isChanging} title="Request Booking Reschedule" onSlotChange={(slotId) => setSelectedSlot(availableSlots.find((slot) => slot.id === slotId) ?? null)} onAccept={() => void handleReschedule()} onReject={() => setRescheduleBooking(null)} />}
      {activeRequest && <BookingChangeDialog booking={activeRequest.booking} requestedSlot={activeRequest.requested_slot} isSubmitting={isChanging} title="Booking Transfer Request" onAccept={() => void handleRequestDecision(true)} onReject={() => void handleRequestDecision(false)} />}
    </div>
  );
};
