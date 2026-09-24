import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, CalendarDays, CalendarX2, Phone, Search, X } from 'lucide-react';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { useBodyScrollLock } from '@/shared/lib/useBodyScrollLock';
import { FormError } from '@/shared/ui';
import { bookingsApi } from '@/features/bookings/api/bookingsApi';
import type { InstructorAttendanceDetail, InstructorAttendanceOverview } from '@/features/bookings/types';

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

const formatTime = (isoTime: string) =>
  new Date(`1970-01-01T${isoTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

type DetailTab = 'upcoming' | 'attended' | 'not_attended';

// Admin-only: how many assigned slots each instructor has upcoming,
// attended, and not attended — one card per instructor, so an admin can
// spot at a glance who's missing attendance confirmations without opening
// every instructor's own bookings page individually. Search filters by
// name/email; the date range scopes both the card counts and, when a card
// is opened, the booking lists behind them.
export const InstructorAttendancePage = () => {
  const [instructors, setInstructors] = useState<InstructorAttendanceOverview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selected, setSelected] = useState<InstructorAttendanceOverview | null>(null);
  const [detail, setDetail] = useState<InstructorAttendanceDetail | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('upcoming');
  const [detailError, setDetailError] = useState<string | null>(null);

  useBodyScrollLock(selected !== null);

  const load = () => {
    setError(null);
    bookingsApi
      .getAdminInstructorAttendance({ date_from: dateFrom || undefined, date_to: dateTo || undefined })
      .then(setInstructors)
      .catch((err) => setError(extractErrorMessage(err, 'Could not load instructor attendance.')));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const openDetail = (instructor: InstructorAttendanceOverview) => {
    setSelected(instructor);
    setDetail(null);
    setDetailError(null);
    setDetailTab('upcoming');
    bookingsApi
      .getAdminInstructorAttendanceDetail(instructor.id, { date_from: dateFrom || undefined, date_to: dateTo || undefined })
      .then(setDetail)
      .catch((err) => setDetailError(extractErrorMessage(err, 'Could not load this instructor\'s bookings.')));
  };

  const closeDetail = () => {
    setSelected(null);
    setDetail(null);
  };

  const filtered = useMemo(() => {
    if (!instructors) return null;
    const term = search.trim().toLowerCase();
    if (!term) return instructors;
    return instructors.filter(
      (instructor) => (instructor.username ?? '').toLowerCase().includes(term) || instructor.email.toLowerCase().includes(term),
    );
  }, [instructors, search]);

  const detailList = detail ? detail[detailTab] : [];

  return (
    <div>
      <h2 className="mb-2 font-serif text-2xl text-[#2B241E]">Instructor Attendance</h2>
      <p className="mb-6 text-sm text-[#786A58]">
        Upcoming, attended, and not-attended slot counts for every instructor. Tap a card for the full list.
      </p>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#786A58]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-full border border-[#2B241E]/15 bg-white/60 py-2.5 pl-10 pr-4 text-sm text-[#2B241E] outline-none focus:border-[#D8B46A]"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            max={dateTo || undefined}
            className="rounded-full border border-[#2B241E]/15 bg-white/60 px-4 py-2.5 text-sm text-[#2B241E] outline-none focus:border-[#D8B46A]"
          />
          <span className="text-xs uppercase tracking-widest text-[#786A58]">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            min={dateFrom || undefined}
            className="rounded-full border border-[#2B241E]/15 bg-white/60 px-4 py-2.5 text-sm text-[#2B241E] outline-none focus:border-[#D8B46A]"
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              aria-label="Clear date filter"
              className="rounded-full p-2 text-[#786A58] hover:bg-[#2B241E]/5 hover:text-[#2B241E]"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <FormError message={error} />

      {filtered === null ? (
        <p className="text-sm text-[#786A58]">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[#786A58]">No instructors match.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((instructor) => (
            <button
              key={instructor.id}
              type="button"
              onClick={() => openDetail(instructor)}
              className="rounded-2xl border border-[#2B241E]/10 bg-white/40 p-5 text-left transition-colors hover:border-[#D8B46A]"
            >
              <div className="mb-4 flex items-center gap-3">
                {instructor.photo ? (
                  <img src={instructor.photo} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2B241E]/10 text-xs text-[#786A58]">
                    None
                  </span>
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium text-[#2B241E]">{instructor.username ?? '—'}</div>
                  <div className="truncate text-xs text-[#786A58]">{instructor.email}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[#D8B46A]/15 px-2 py-3">
                  <CalendarDays size={16} className="mx-auto mb-1 text-[#D8B46A]" />
                  <div className="font-serif text-lg text-[#2B241E]">{instructor.upcoming_count}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[#786A58]">Upcoming</div>
                </div>
                <div className="rounded-xl bg-[#2B241E]/10 px-2 py-3">
                  <CalendarCheck2 size={16} className="mx-auto mb-1 text-[#2B241E]" />
                  <div className="font-serif text-lg text-[#2B241E]">{instructor.attended_count}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[#786A58]">Attended</div>
                </div>
                <div className="rounded-xl bg-red-500/10 px-2 py-3">
                  <CalendarX2 size={16} className="mx-auto mb-1 text-red-600" />
                  <div className="font-serif text-lg text-[#2B241E]">{instructor.not_attended_count}</div>
                  <div className="text-[10px] uppercase tracking-widest text-[#786A58]">Not Attended</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B241E]/35 px-4">
          <div className="flex h-[min(85vh,640px)] w-full max-w-2xl flex-col rounded-[28px] border border-white/70 bg-[#F5EFE5] p-6 shadow-2xl">
            <div className="mb-6 flex shrink-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate font-serif text-2xl text-[#2B241E]">{selected.username ?? selected.email}</h3>
                <p className="mt-1 truncate text-sm text-[#786A58]">{selected.email}</p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="shrink-0 text-sm uppercase tracking-widest text-[#786A58] hover:text-[#2B241E]"
              >
                Close
              </button>
            </div>

            <FormError message={detailError} />

            <div className="mb-5 flex w-full shrink-0 gap-2">
              {(
                [
                  { value: 'upcoming', label: 'Upcoming', count: selected.upcoming_count },
                  { value: 'attended', label: 'Attended', count: selected.attended_count },
                  { value: 'not_attended', label: 'Not Attended', count: selected.not_attended_count },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setDetailTab(tab.value)}
                  className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center text-[11px] uppercase leading-tight tracking-widest transition-colors ${
                    detailTab === tab.value
                      ? 'bg-[#2B241E] text-white'
                      : 'border border-[#2B241E]/15 text-[#786A58] hover:border-[#D8B46A] hover:text-[#2B241E]'
                  }`}
                >
                  <span className="whitespace-normal break-words">{tab.label}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      detailTab === tab.value ? 'bg-white/20' : 'bg-[#2B241E]/10'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {detail === null ? (
                <p className="text-sm text-[#786A58]">Loading…</p>
              ) : detailList.length === 0 ? (
                <p className="text-sm text-[#786A58]">Nothing here yet.</p>
              ) : (
                <div className="space-y-2">
                  {detailList.map((booking) => (
                    <div key={booking.id} className="rounded-xl border border-[#2B241E]/10 bg-white/40 px-4 py-3 text-sm">
                      <div className="mb-1 text-[#2B241E]">
                        {formatDate(booking.slot.date)} · {formatTime(booking.slot.start_time)}–{formatTime(booking.slot.end_time)}
                      </div>
                      <div className="text-[#2B241E]">{booking.customer_name}</div>
                      {booking.customer_phone && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-[#786A58]">
                          <Phone size={12} strokeWidth={1.5} /> {booking.customer_phone}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
