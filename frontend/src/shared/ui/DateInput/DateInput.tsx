import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { formatDate, MONTH_NAMES } from '@/shared/lib/date';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

export type DateInputProps = {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  min?: string;
  markDate?: string; // e.g. a range's start date, dotted when shown in a paired "To" calendar
};

// Themed month-grid calendar, replacing the browser's native <input
// type="date"> popover (which can't be restyled to match the site and
// always opens on today's month rather than the field's current value).
export const DateInput = ({ value, onChange, min, markDate }: DateInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = new Date(`${value}T00:00:00`);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  useEffect(() => {
    if (isOpen) {
      const current = new Date(`${value}T00:00:00`);
      setViewYear(current.getFullYear());
      setViewMonth(current.getMonth());
    }
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const minDate = min ? new Date(`${min}T00:00:00`) : null;
  const marked = markDate ? new Date(`${markDate}T00:00:00`) : null;
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth);

  const pick = (day: number) => {
    const iso = `${String(viewYear).padStart(4, '0')}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(iso);
    setIsOpen(false);
  };

  const changeMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#2B241E]/15 bg-white/60 px-3 py-2 text-[#2B241E] outline-none"
      >
        <span>{formatDate(value)}</span>
        <CalendarDays size={16} strokeWidth={1.5} className="text-[#786A58]" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-[#2B241E]/10 bg-[#F5EFE5] p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-full px-2 py-1 text-[#786A58] hover:bg-[#2B241E]/10 hover:text-[#2B241E]"
            >
              ‹
            </button>
            <span className="font-serif text-sm text-[#2B241E]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-full px-2 py-1 text-[#786A58] hover:bg-[#2B241E]/10 hover:text-[#2B241E]"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 px-1 pb-1 text-center text-[10px] uppercase tracking-widest text-[#786A58]">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 px-1">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
              const cellDate = new Date(viewYear, viewMonth, day);
              const isDisabled = minDate !== null && cellDate < minDate;
              const isSelected =
                viewYear === selected.getFullYear() && viewMonth === selected.getMonth() && day === selected.getDate();
              const isMarked =
                marked !== null && viewYear === marked.getFullYear() && viewMonth === marked.getMonth() && day === marked.getDate();
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => pick(day)}
                  className={`relative rounded-full py-1.5 text-sm transition-colors ${
                    isSelected
                      ? 'bg-[#2B241E] text-white'
                      : isDisabled
                        ? 'cursor-not-allowed text-[#2B241E]/25'
                        : 'text-[#2B241E] hover:bg-[#D8B46A]/40'
                  }`}
                >
                  {day}
                  {isMarked && (
                    <span
                      className={`absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-[#D8B46A]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
