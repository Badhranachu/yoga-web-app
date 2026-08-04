import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

export type TimePickerProps = {
  value: string; // "HH:MM", 24h
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  stepMinutes?: number;
};

const formatDisplay = (value: string) => {
  if (!value) return '';
  const [hourStr, minuteStr] = value.split(':');
  const hour = Number(hourStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(displayHour).padStart(2, '0')}:${minuteStr} ${period}`;
};

const buildOptions = (stepMinutes: number) => {
  const options: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    options.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }
  return options;
};

// Tap-to-open dropdown of selectable time options, replacing the native
// <input type="time"> picker (which renders the OS/browser's own UI and
// can't be styled). Keeps the same "HH:MM" 24h value contract so callers
// don't need to change how they store or submit the value.
export const TimePicker = ({ value, onChange, disabled, placeholder, stepMinutes = 30 }: TimePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = buildOptions(stepMinutes);

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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        className="w-full flex items-center justify-between gap-2 bg-transparent border-b border-[#2B241E]/20 py-2 text-sm text-[#2B241E] focus:outline-none hover:border-[#D8B46A] transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        <span className={value ? '' : 'text-[#786A58]'}>{value ? formatDisplay(value) : placeholder || 'Select'}</span>
        <Clock size={15} className="text-[#786A58] shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 max-h-56 w-full min-w-[140px] overflow-y-auto rounded-2xl border border-[#2B241E]/10 bg-[#F5EFE5] shadow-xl">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-[#D8B46A]/20 ${
                option === value ? 'bg-[#D8B46A]/30 text-[#2B241E]' : 'text-[#2B241E]/80'
              }`}
            >
              {formatDisplay(option)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
