import { useEffect, useState } from 'react';
import { FormError } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { classesApi } from '../api/classesApi';
import { HorizonSettingsCard } from '../components/HorizonSettingsCard';
import { TimetableDayRow } from '../components/TimetableDayRow';
import type { TimetableConfig, TimetableConfigUpdatePayload, Weekday } from '../types';

// Admin timetable configuration: per-weekday working hours + slot duration,
// and the slot-generation horizon. Admins never create daily slots
// directly — the backend derives them from this configuration.
export const ClassesPage = () => {
  const [days, setDays] = useState<TimetableConfig[] | null>(null);
  const [horizonDays, setHorizonDays] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [timetable, horizon] = await Promise.all([
          classesApi.getTimetable(),
          classesApi.getHorizonSettings(),
        ]);
        setDays(timetable);
        setHorizonDays(horizon.horizon_days);
      } catch (err) {
        setLoadError(extractErrorMessage(err, 'Could not load the timetable.'));
      }
    };
    void load();
  }, []);

  const handleSaveDay = async (weekday: Weekday, payload: TimetableConfigUpdatePayload) => {
    const updated = await classesApi.updateTimetableDay(weekday, payload);
    setDays((current) => (current ? current.map((d) => (d.weekday === weekday ? updated : d)) : current));
  };

  return (
    <div className="max-w-4xl">
      <h2 className="font-serif text-2xl text-[#2B241E] mb-2">Timetable</h2>
      <p className="text-[#786A58] text-sm mb-8">
        Set working hours, slot length, and an optional daily rest time per weekday. Bookable slots are generated
        automatically — you never create them by hand, and none are generated inside the rest window. Changing a
        day only regenerates that day's future, unbooked slots.
      </p>

      <FormError message={loadError} />

      {days && (
        <div className="glass-panel bg-white/40 rounded-3xl p-6 md:p-8 border border-white/50 mb-8">
          <div className="hidden sm:grid grid-cols-12 gap-4 pb-3 text-xs uppercase tracking-widest text-[#786A58]">
            <div className="col-span-2">Day</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Start</div>
            <div className="col-span-2">End</div>
            <div className="col-span-2">Duration (min)</div>
            <div className="col-span-2" />
          </div>
          {days.map((day) => (
            <TimetableDayRow key={day.weekday} config={day} onSave={handleSaveDay} />
          ))}
        </div>
      )}

      {horizonDays !== null && (
        <HorizonSettingsCard horizonDays={horizonDays} onUpdated={setHorizonDays} />
      )}
    </div>
  );
};
