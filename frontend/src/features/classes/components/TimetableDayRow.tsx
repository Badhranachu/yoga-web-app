import { useState } from 'react';
import { TimePicker, Toggle } from '@/shared/ui';
import type { TimetableConfig, TimetableConfigUpdatePayload } from '../types';

export type TimetableDayRowProps = {
  config: TimetableConfig;
  onSave: (weekday: TimetableConfig['weekday'], payload: TimetableConfigUpdatePayload) => Promise<void>;
};

const toInputTime = (value: string | null) => (value ? value.slice(0, 5) : ''); // "09:00:00" -> "09:00"

export const TimetableDayRow = ({ config, onSave }: TimetableDayRowProps) => {
  const [isOpen, setIsOpen] = useState(config.is_open);
  const [startTime, setStartTime] = useState(toInputTime(config.start_time));
  const [endTime, setEndTime] = useState(toInputTime(config.end_time));
  const [duration, setDuration] = useState(String(config.slot_duration_minutes));
  const [breakStart, setBreakStart] = useState(toInputTime(config.break_start_time));
  const [breakEnd, setBreakEnd] = useState(toInputTime(config.break_end_time));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    isOpen !== config.is_open ||
    startTime !== toInputTime(config.start_time) ||
    endTime !== toInputTime(config.end_time) ||
    duration !== String(config.slot_duration_minutes) ||
    breakStart !== toInputTime(config.break_start_time) ||
    breakEnd !== toInputTime(config.break_end_time);

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await onSave(config.weekday, {
        is_open: isOpen,
        start_time: startTime,
        end_time: endTime,
        slot_duration_minutes: Number(duration),
        break_start_time: breakStart || null,
        break_end_time: breakEnd || null,
      });
    } catch {
      setError('Could not save this day. Check the times and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="py-4 border-b border-[#2B241E]/10 last:border-b-0">
      <div className="grid grid-cols-12 items-center gap-4">
        <div className="col-span-12 sm:col-span-2 font-serif text-[#2B241E]">{config.weekday_display}</div>

        <div className="col-span-6 sm:col-span-2">
          <Toggle checked={isOpen} onChange={setIsOpen} label={isOpen ? 'Open' : 'Closed'} />
        </div>

        <div className="col-span-3 sm:col-span-2">
          <TimePicker disabled={!isOpen} value={startTime} onChange={setStartTime} />
        </div>

        <div className="col-span-3 sm:col-span-2">
          <TimePicker disabled={!isOpen} value={endTime} onChange={setEndTime} />
        </div>

        <div className="col-span-6 sm:col-span-2">
          <input
            type="number"
            min={5}
            max={480}
            step={5}
            disabled={!isOpen}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full bg-transparent border-b border-[#2B241E]/20 py-2 text-sm text-[#2B241E] focus:outline-none focus:border-[#D8B46A] transition-colors disabled:opacity-40"
          />
        </div>

        <div className="col-span-6 sm:col-span-2 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="px-4 py-2 rounded-full text-xs uppercase tracking-widest bg-[#2B241E] text-white hover:bg-[#D8B46A] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>

      <div className="grid grid-cols-12 items-center gap-4 mt-3">
        <div className="col-span-12 sm:col-span-2 text-xs uppercase tracking-widest text-[#786A58]">Rest Time</div>
        <div className="col-span-6 sm:col-span-2" />
        <div className="col-span-3 sm:col-span-2">
          <TimePicker disabled={!isOpen} value={breakStart} onChange={setBreakStart} placeholder="Break start" />
        </div>
        <div className="col-span-3 sm:col-span-2">
          <TimePicker disabled={!isOpen} value={breakEnd} onChange={setBreakEnd} placeholder="Break end" />
        </div>
        <div className="col-span-6 sm:col-span-4" />
      </div>
    </div>
  );
};
