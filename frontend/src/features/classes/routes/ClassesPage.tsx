import { useEffect, useState } from 'react';
import { FormError } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { classesApi } from '../api/classesApi';
import { HorizonSettingsCard } from '../components/HorizonSettingsCard';
import { TimetableDayRow } from '../components/TimetableDayRow';
import { UpcomingSlotsList } from '../components/UpcomingSlotsList';
import { AddLeaveForm } from '../components/AddLeaveForm';
import { LeaveHistoryTable } from '../components/LeaveHistoryTable';
import type { Leave, TimetableConfig, TimetableConfigUpdatePayload, Weekday } from '../types';

// Admin timetable configuration: per-weekday working hours + slot duration,
// the slot-generation horizon, and leave management. Admins never create
// daily slots directly — the backend derives them from this configuration,
// and blocks (never deletes) slots that fall on a leave date.
export const ClassesPage = () => {
  const [days, setDays] = useState<TimetableConfig[] | null>(null);
  const [horizonDays, setHorizonDays] = useState<number | null>(null);
  const [leaves, setLeaves] = useState<Leave[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [timetable, horizon, leaveHistory] = await Promise.all([
          classesApi.getTimetable(),
          classesApi.getHorizonSettings(),
          classesApi.getLeaves(),
        ]);
        setDays(timetable);
        setHorizonDays(horizon.horizon_days);
        setLeaves(leaveHistory.results);
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

  const handleLeaveAdded = (leave: Leave) => {
    setLeaves((current) => (current ? [leave, ...current] : [leave]));
  };

  const handleLeaveDeleted = (id: number) => {
    setLeaves((current) => (current ? current.filter((l) => l.id !== id) : current));
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

      <h2 className="font-serif text-2xl text-[#2B241E] mt-12 mb-2">Leave</h2>
      <p className="text-[#786A58] text-sm mb-8">
        Block dates from bookings — holidays, closures, or maintenance. No slot can be booked on a leave date.
      </p>

      <div className="grid md:grid-cols-2 gap-8 items-start mb-8">
        <AddLeaveForm onAdded={handleLeaveAdded} />
        {leaves && <LeaveHistoryTable leaves={leaves} onDeleted={handleLeaveDeleted} />}
      </div>

      <UpcomingSlotsList />
    </div>
  );
};
