import { useEffect, useState } from 'react';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { useLiveClock } from '@/shared/lib/useLiveClock';
import { formatDate as formatCalendarDate, todayIso } from '@/shared/lib/date';
import { DateInput, FormError, Pagination } from '@/shared/ui';
import { bookingsApi } from '@/features/bookings/api/bookingsApi';
import type { EffectiveBookingStatus } from '@/features/bookings/api/bookingsApi';
import type { Booking } from '@/features/bookings/types';
import { EFFECTIVE_STATUS_LABEL, EFFECTIVE_STATUS_STYLES, getEffectiveStatus } from '@/features/bookings/lib/bookingStatus';

const PAGE_SIZE = 10;

const formatTime = (isoTime: string) =>
  new Date(`1970-01-01T${isoTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

type StatusFilter = 'all' | EffectiveBookingStatus;

// Full booking history — every booking the member has ever made, not just
// what's upcoming (that's the "My Bookings" page). Filterable by status
// and a from/to date range, 10 per page (see backend
// apps.bookings.views.MyBookingHistoryView).
export const BookingHistoryPage = () => {
  useLiveClock();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [useDateRange, setUseDateRange] = useState(false);
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const response = await bookingsApi.getMyBookingHistory({
        page,
        status: statusFilter === 'all' ? undefined : statusFilter,
        date_from: useDateRange ? fromDate : undefined,
        date_to: useDateRange ? toDate : undefined,
      });
      setBookings(response.results);
      setTotalCount(response.count);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load your booking history.'));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, useDateRange, fromDate, toDate]);

  const handleStatusChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleDateRangeToggle = (checked: boolean) => {
    setUseDateRange(checked);
    setPage(1);
  };

  return (
    <div className="max-w-3xl">
      <h2 className="mb-2 font-serif text-3xl text-dark">Booking History</h2>
      <p className="mb-8 text-sm text-brown">Every class you've ever booked, searchable by status and date.</p>

      <FormError message={error} />

      <div className="mb-6 rounded-2xl border border-beige bg-white/40 p-5">
        <div className="mb-4">
          <label className="mb-2 block text-xs uppercase tracking-widest text-brown">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
            className="w-full rounded-xl border border-beige bg-white/70 px-3 py-2.5 text-sm text-dark outline-none sm:w-64"
          >
            <option value="all">All</option>
            <option value="booked">Booked</option>
            <option value="attended">Attended</option>
            <option value="expired">Class Expired</option>
          </select>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="use-date-range"
            checked={useDateRange}
            onChange={(e) => handleDateRangeToggle(e.target.checked)}
            className="h-4 w-4 accent-gold-dark"
          />
          <label htmlFor="use-date-range" className="text-xs uppercase tracking-widest text-brown">
            Filter by date range
          </label>
        </div>

        {useDateRange && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-brown">From</label>
              <DateInput
                value={fromDate}
                onChange={(next) => {
                  setFromDate(next);
                  if (toDate < next) setToDate(next);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-brown">To</label>
              <DateInput
                value={toDate}
                min={fromDate}
                markDate={fromDate}
                onChange={(next) => {
                  setToDate(next);
                  setPage(1);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {bookings === null ? (
        <p className="text-sm text-brown">Loading…</p>
      ) : bookings.length === 0 ? (
        <p className="text-sm text-brown">No bookings match these filters.</p>
      ) : (
        <div className="divide-y divide-beige rounded-2xl border border-beige bg-white/40 px-5">
          {bookings.map((booking) => {
            const effectiveStatus = getEffectiveStatus(booking);
            return (
              <div key={booking.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div>
                  <p className="text-dark">{formatCalendarDate(booking.slot.date)}</p>
                  <p className="text-xs text-brown">
                    {formatTime(booking.slot.start_time)} – {formatTime(booking.slot.end_time)}
                  </p>
                </div>
                <span className={`text-xs uppercase tracking-wider ${EFFECTIVE_STATUS_STYLES[effectiveStatus]}`}>
                  {EFFECTIVE_STATUS_LABEL[effectiveStatus]}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} onPageChange={setPage} />
    </div>
  );
};
