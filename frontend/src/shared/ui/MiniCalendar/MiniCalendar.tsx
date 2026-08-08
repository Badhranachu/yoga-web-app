import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type MiniCalendarProps = {
  selectedDate: string | null; // "YYYY-MM-DD"
  onSelectDate: (date: string) => void;
  /** Earliest selectable date, inclusive. Defaults to today. */
  minDate?: string;
  /** Latest selectable date, inclusive. Required — this component never scrolls past it. */
  maxDate: string;
  /** Dates (YYYY-MM-DD) to mark with a small dot indicator. */
  markedDates?: Set<string>;
  /**
   * Fires with the currently-visible month (once on mount, then again on
   * every prev/next navigation) — lets a caller lazy-load just that
   * month's data instead of fetching the whole [minDate, maxDate] window
   * up front.
   */
  onMonthChange?: (year: number, month: number) => void;
};

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const toDateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const parseDateKey = (key: string) => {
  // Convert each split segment individually rather than
  // `.split('-').map(Number)` — destructuring positions out of a
  // same-length-unknown array (what `.map(Number)` produces) types each
  // one as `number | undefined` under noUncheckedIndexedAccess. Number()
  // itself always returns `number` (never `undefined`), even when given
  // an out-of-bounds `undefined` string segment (Number(undefined) is
  // NaN) — so converting per-segment keeps everything typed as `number`
  // while still catching a malformed key via the NaN check below.
  const [yearPart, monthPart, dayPart] = key.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new Error(`Invalid date key "${key}" — expected "YYYY-MM-DD".`);
  }

  return new Date(year, month - 1, day);
};

// Month-grid calendar with a caller-supplied [minDate, maxDate] window —
// prev/next navigation disables at those boundaries so it's impossible to
// browse to a month with nothing selectable in it.
export const MiniCalendar = ({ selectedDate, onSelectDate, minDate, maxDate, markedDates, onMonthChange }: MiniCalendarProps) => {
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const effectiveMinDate = minDate ?? todayKey;

  const minMonthStart = useMemo(() => {
    const d = parseDateKey(effectiveMinDate);
    return new Date(d.getFullYear(), d.getMonth(), 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMinDate]);
  const maxMonthStart = useMemo(() => {
    const d = parseDateKey(maxDate);
    return new Date(d.getFullYear(), d.getMonth(), 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDate]);

  const [viewMonthStart, setViewMonthStart] = useState(minMonthStart);

  useEffect(() => {
    onMonthChange?.(viewMonthStart.getFullYear(), viewMonthStart.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonthStart]);

  const isAtEarliestMonth = viewMonthStart.getTime() <= minMonthStart.getTime();
  const isAtLatestMonth = viewMonthStart.getTime() >= maxMonthStart.getTime();

  const goToPreviousMonth = () => {
    if (isAtEarliestMonth) return;
    setViewMonthStart(new Date(viewMonthStart.getFullYear(), viewMonthStart.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    if (isAtLatestMonth) return;
    setViewMonthStart(new Date(viewMonthStart.getFullYear(), viewMonthStart.getMonth() + 1, 1));
  };

  const year = viewMonthStart.getFullYear();
  const month = viewMonthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-3xl border border-[#2B241E]/10 bg-white/40 p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={goToPreviousMonth}
          disabled={isAtEarliestMonth}
          aria-label="Previous month"
          className="rounded-full p-1.5 text-[#786A58] hover:text-[#2B241E] hover:bg-[#2B241E]/5 transition-colors disabled:opacity-25 disabled:pointer-events-none"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="font-serif text-lg text-[#2B241E]">
          {viewMonthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </div>
        <button
          type="button"
          onClick={goToNextMonth}
          disabled={isAtLatestMonth}
          aria-label="Next month"
          className="rounded-full p-1.5 text-[#786A58] hover:text-[#2B241E] hover:bg-[#2B241E]/5 transition-colors disabled:opacity-25 disabled:pointer-events-none"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-widest text-[#786A58] mb-2">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i}>{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const dateKey = toDateKey(year, month, day);
          const isOutOfRange = dateKey < effectiveMinDate || dateKey > maxDate;
          const isSelected = dateKey === selectedDate;
          const isToday = dateKey === todayKey;
          const isMarked = markedDates?.has(dateKey);

          return (
            <button
              key={dateKey}
              type="button"
              disabled={isOutOfRange}
              onClick={() => onSelectDate(dateKey)}
              className={`relative aspect-square rounded-xl text-sm transition-colors disabled:opacity-25 disabled:pointer-events-none
                ${isSelected ? 'bg-[#2B241E] text-white' : 'hover:bg-[#2B241E]/10 text-[#2B241E]'}
                ${isToday && !isSelected ? 'ring-1 ring-[#D8B46A]' : ''}`}
            >
              {day}
              {isMarked && !isSelected && (
                <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#D8B46A]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
