import type { EffectiveBookingStatus } from '../api/bookingsApi';

// Structural, not `Booking` specifically — also satisfied by
// InstructorBooking (member-facing and instructor-facing booking shapes
// both carry status + slot, just with different contact-detail fields
// alongside), so both pages can compute the same effective status from
// the same function.
type StatusableBooking = {
  status: 'booked' | 'attended';
  slot: { date: string; end_time: string };
};

// Mirrors the backend's exact "effective status" computation (see
// apps.bookings.views.MyBookingHistoryView) so the same booking is never
// labeled differently depending on which page is showing it: a BOOKED
// row whose slot has already ended (date in the past, or today with an
// end_time that's already passed) reads as "expired", not "booked" — it
// was never marked attended and the instructor/member can no longer act
// on it. ATTENDED rows are untouched — attendance is already a more
// specific, settled outcome than "the class ended".
export const getEffectiveStatus = (booking: StatusableBooking): EffectiveBookingStatus => {
  if (booking.status === 'attended') return 'attended';

  const now = new Date();
  const slotEnd = new Date(`${booking.slot.date}T${booking.slot.end_time}`);
  return slotEnd <= now ? 'expired' : 'booked';
};

export const EFFECTIVE_STATUS_LABEL: Record<EffectiveBookingStatus, string> = {
  booked: 'Booked',
  attended: 'Attended',
  expired: 'Class Expired',
};

export const EFFECTIVE_STATUS_STYLES: Record<EffectiveBookingStatus, string> = {
  booked: 'text-gold-dark',
  attended: 'text-dark',
  expired: 'text-brown',
};
