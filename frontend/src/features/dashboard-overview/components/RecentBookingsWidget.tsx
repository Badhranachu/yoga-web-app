import type { DashboardBooking } from '../types';

export const RecentBookingsWidget = ({ bookings }: { bookings: DashboardBooking[] }) => (
  <section className="rounded-2xl border border-beige bg-cream p-5 shadow-sm">
    <h3 className="font-serif text-xl text-dark">Recent Bookings</h3>
    <div className="mt-4 divide-y divide-beige">
      {bookings.length === 0 && <p className="py-3 text-sm text-brown">No bookings yet.</p>}
      {bookings.map((booking) => (
        <div key={booking.id} className="flex items-center justify-between gap-4 py-3 text-sm">
          <div className="min-w-0"><p className="truncate text-dark">{booking.user_email}</p><p className="text-xs text-brown">{booking.date} · {booking.start_time}</p></div>
          <span className="shrink-0 text-xs text-brown">{booking.status}</span>
        </div>
      ))}
    </div>
  </section>
);
