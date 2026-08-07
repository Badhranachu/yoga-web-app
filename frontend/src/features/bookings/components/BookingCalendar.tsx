import { useMemo } from 'react';
import { MiniCalendar } from '@/shared/ui';

export type BookingCalendarProps = {
  selectedDate: string | null; // "YYYY-MM-DD"
  onSelectDate: (date: string) => void;
  /** Dates (YYYY-MM-DD) that have at least one available slot, for a dot indicator. */
  datesWithAvailability?: Set<string>;
};

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Thin wrapper around the shared MiniCalendar, restricted to "this month"
// and "next month" only — members can only book within that window, so
// there is nothing useful past next month and no reason to navigate further.
export const BookingCalendar = ({ selectedDate, onSelectDate, datesWithAvailability }: BookingCalendarProps) => {
  const maxDate = useMemo(() => {
    const today = new Date();
    return toDateKey(new Date(today.getFullYear(), today.getMonth() + 2, 0));
  }, []);

  return (
    <MiniCalendar
      selectedDate={selectedDate}
      onSelectDate={onSelectDate}
      maxDate={maxDate}
      markedDates={datesWithAvailability}
    />
  );
};
