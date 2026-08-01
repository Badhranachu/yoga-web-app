import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CalendarDays, CreditCard, FileText, History, ReceiptText, UserCircle2 } from 'lucide-react';
import { Button, FormError } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { bookingsApi } from '@/features/bookings/api/bookingsApi';
import { BookingChangeDialog } from '@/features/bookings/components/BookingChangeDialog';
import { classesApi } from '@/features/classes/api/classesApi';
import type { Slot } from '@/features/classes/types';
import type { Booking, BookingChangeRequest, BookingStatus } from '@/features/bookings/types';
import { notificationsApi } from '@/features/notifications/api/notificationsApi';
import type { Notification } from '@/features/notifications/types';
import { paymentsApi } from '@/features/payments/api/paymentsApi';
import type { PaymentTransaction, UserSubscription } from '@/features/payments/types';
import { UserDashboardCard } from '../components/UserDashboardCard';
import { UserDashboardPanel } from '../components/UserDashboardPanel';

const STATUS_STYLES: Record<BookingStatus, string> = {
  booked: 'bg-gold/15 text-gold-dark',
  attended: 'bg-dark/10 text-dark',
  cancelled: 'bg-brown/10 text-brown',
};

const formatDate = (isoDate: string) => new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const formatLongDate = (isoDate: string) => new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const formatTime = (isoTime: string) => new Date(`1970-01-01T${isoTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export const AccountOverviewPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [changeRequests, setChangeRequests] = useState<BookingChangeRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<BookingChangeRequest | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isChanging, setIsChanging] = useState(false);

  const loadDashboard = async () => {
    try {
      const [bookingResponse, requestResponse, subscriptionData, paymentResponse, notificationResponse] = await Promise.all([
        bookingsApi.getMyBookings(), bookingsApi.getMyChangeRequests(), paymentsApi.getMySubscription(),
        paymentsApi.getHistory(), notificationsApi.getNotifications(),
      ]);
      setBookings(bookingResponse.results);
      setChangeRequests(requestResponse.results);
      setSubscription(subscriptionData);
      setPayments(paymentResponse.results);
      setNotifications(notificationResponse.results);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load your dashboard.'));
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

  const handleCancel = async (booking: Booking) => {
    setError(null); setCancellingId(booking.id);
    try { await bookingsApi.cancelBooking(booking.id); await loadDashboard(); }
    catch (err) { setError(extractErrorMessage(err, 'Could not cancel this booking.')); }
    finally { setCancellingId(null); }
  };

  if (!bookings) return <p className="text-sm text-brown">Loading your dashboard…</p>;

  const recentPayment = payments[0];
  const sessionsUsed = subscription ? subscription.sessions_included - subscription.sessions_remaining : 0;
  const nextBooking = upcomingBookings[0];
  const pendingTransfer = changeRequests.some((item) => item.status === 'pending' && item.request_type === 'transfer');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="font-serif text-3xl text-dark">Welcome{user?.first_name ? `, ${user.first_name}` : ''}</h2><p className="mt-1 text-sm text-brown">Your classes, membership, and payment activity in one place.</p></div>
        <Link to="/account/book"><Button type="button" variant="primary">Book a Class</Button></Link>
      </div>

      <FormError message={error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UserDashboardCard label="Subscription Status" value={subscription?.status ?? 'None'} icon={CreditCard} detail={subscription ? `Until ${formatLongDate(subscription.end_date)}` : 'Choose a plan to get started'} />
        <UserDashboardCard label="Sessions Remaining" value={subscription?.sessions_remaining ?? 0} icon={CalendarDays} detail={subscription ? `of ${subscription.sessions_included}` : undefined} />
        <UserDashboardCard label="Sessions Used" value={sessionsUsed} icon={History} />
        <UserDashboardCard label="Next Booking" value={nextBooking ? formatDate(nextBooking.slot.date) : 'None'} icon={CalendarClock} detail={nextBooking ? formatTime(nextBooking.slot.start_time) : 'No upcoming class'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <UserDashboardPanel title="Upcoming Bookings">
          {upcomingBookings.length === 0 ? <p className="text-sm text-brown">No upcoming bookings.</p> : <div className="divide-y divide-beige">{upcomingBookings.slice(0, 4).map((booking) => <div key={booking.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div><p className="text-dark">{formatDate(booking.slot.date)}</p><p className="text-xs text-brown">{formatTime(booking.slot.start_time)} – {formatTime(booking.slot.end_time)}</p></div><span className="text-xs uppercase tracking-wider text-gold-dark">{booking.status}</span></div>)}</div>}
        </UserDashboardPanel>
        <UserDashboardPanel title="Recent Payment">
          {recentPayment ? <div className="flex items-center justify-between gap-4 text-sm"><div><p className="text-dark">{recentPayment.receipt.receipt_number}</p><p className="text-xs text-brown">{recentPayment.payment_type === 'subscription' ? 'Monthly Subscription' : 'Single Slot'} · {formatLongDate(recentPayment.created_at.slice(0, 10))}</p></div><div className="text-right"><p className="text-dark">{recentPayment.amount} {recentPayment.currency}</p><button type="button" onClick={() => void paymentsApi.downloadReceipt(recentPayment.receipt.id)} className="text-xs uppercase tracking-widest text-brown hover:text-gold-dark">Receipt</button></div></div> : <p className="text-sm text-brown">No payments yet.</p>}
        </UserDashboardPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <UserDashboardPanel title="Booking History">
          {bookings.length === 0 ? <p className="text-sm text-brown">You haven’t booked a class yet.</p> : <div className="space-y-2">{bookings.map((booking) => <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-beige px-4 py-3 text-sm"><div><p className="text-dark">{formatDate(booking.slot.date)}</p><p className="text-xs text-brown">{formatTime(booking.slot.start_time)} – {formatTime(booking.slot.end_time)}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_STYLES[booking.status]}`}>{booking.status}</span>{booking.status === 'booked' && <><button onClick={() => void openReschedule(booking)} className="text-xs uppercase tracking-widest text-brown hover:text-gold-dark">Reschedule</button><button onClick={() => void handleCancel(booking)} disabled={cancellingId === booking.id} className="text-xs uppercase tracking-widest text-brown hover:text-red-600 disabled:opacity-40">{cancellingId === booking.id ? 'Cancelling…' : 'Cancel'}</button></>}</div></div>)}</div>}
          {pendingTransfer && <div className="mt-4 space-y-2">{changeRequests.filter((item) => item.status === 'pending' && item.request_type === 'transfer').map((item) => <button key={item.id} type="button" onClick={() => setActiveRequest(item)} className="w-full rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-left text-sm text-dark">Review transfer request for {formatDate(item.requested_date)} at {formatTime(item.requested_start_time)}.</button>)}</div>}
        </UserDashboardPanel>
        <UserDashboardPanel title="Payment History & Receipts">
          {payments.length === 0 ? <p className="text-sm text-brown">No payments yet.</p> : <div className="space-y-2">{payments.map((payment) => <div key={payment.id} className="flex items-center justify-between gap-3 rounded-xl border border-beige px-4 py-3 text-sm"><div className="min-w-0"><p className="truncate text-dark">{payment.receipt.receipt_number}</p><p className="text-xs text-brown">{payment.amount} {payment.currency} · {payment.status}</p></div><button type="button" onClick={() => void paymentsApi.downloadReceipt(payment.receipt.id)} className="flex shrink-0 items-center gap-1 text-xs uppercase tracking-widest text-brown hover:text-gold-dark"><ReceiptText size={14} /> Receipt</button></div>)}</div>}
        </UserDashboardPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <UserDashboardPanel title="Notifications">
          {notifications.length === 0 ? <p className="text-sm text-brown">No notifications.</p> : <div className="space-y-2">{notifications.slice(0, 5).map((notification) => <div key={notification.id} className={`rounded-xl border border-beige px-4 py-3 ${notification.is_read ? 'opacity-65' : 'bg-sand'}`}><div className="flex justify-between gap-3"><p className="text-sm text-dark">{notification.title}</p><span className="text-[11px] text-brown">{formatLongDate(notification.created_at.slice(0, 10))}</span></div><p className="mt-1 text-xs text-brown">{notification.message}</p></div>)}</div>}
        </UserDashboardPanel>
        <UserDashboardPanel title="Profile Summary">
          <div className="flex items-start gap-4"><UserCircle2 size={34} className="text-gold-dark" /><div className="min-w-0 text-sm"><p className="text-dark">{user?.full_name || 'Yoga member'}</p><p className="truncate text-brown">{user?.email}</p>{user?.phone_number && <p className="text-brown">{user.phone_number}</p>}<Link to="/account/profile" className="mt-3 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-brown hover:text-gold-dark"><FileText size={14} /> Edit Profile</Link></div></div>
        </UserDashboardPanel>
      </div>

      {pendingTransfer && <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-dark">A booking transfer request is waiting for your approval. Review it in your booking history.</div>}

      {rescheduleBooking && <BookingChangeDialog booking={rescheduleBooking} requestedSlot={selectedSlot} availableSlots={availableSlots} isSubmitting={isChanging} title="Request Booking Reschedule" onSlotChange={(slotId) => setSelectedSlot(availableSlots.find((slot) => slot.id === slotId) ?? null)} onAccept={() => void handleReschedule()} onReject={() => setRescheduleBooking(null)} />}
      {activeRequest && <BookingChangeDialog booking={activeRequest.booking} requestedSlot={activeRequest.requested_slot} isSubmitting={isChanging} title="Booking Transfer Request" onAccept={() => void handleRequestDecision(true)} onReject={() => void handleRequestDecision(false)} />}
    </div>
  );
};
