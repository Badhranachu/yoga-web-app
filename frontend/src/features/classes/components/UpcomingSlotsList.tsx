import { useEffect, useState } from 'react';
import { FormError } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { classesApi } from '../api/classesApi';
import type { Slot } from '../types';

const PREVIEW_COUNT = 14;

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

const formatTime = (isoTime: string) =>
  new Date(`1970-01-01T${isoTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

// Read-only confirmation that generation is actually producing slots.
// No booking action here — that's a later phase.
export const UpcomingSlotsList = () => {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await classesApi.getSlots({ page: 1 });
        setSlots(response.results.slice(0, PREVIEW_COUNT));
      } catch (err) {
        setError(extractErrorMessage(err, 'Could not load upcoming slots.'));
      }
    };
    void load();
  }, []);

  return (
    <div className="glass-panel bg-white/40 rounded-3xl p-6 md:p-8 border border-white/50 mt-8">
      <h3 className="font-serif text-xl text-[#2B241E] mb-1">Upcoming Slots</h3>
      <p className="text-sm text-[#786A58] mb-6">
        A preview of the next {PREVIEW_COUNT} system-generated slots, confirming the timetable is producing
        bookable windows correctly.
      </p>

      <FormError message={error} />

      {slots && slots.length === 0 && <p className="text-sm text-[#786A58]">No upcoming slots yet.</p>}

      {slots && slots.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {slots.map((slot) => (
            <div key={slot.id} className="rounded-xl border border-[#2B241E]/10 px-4 py-3 text-sm">
              <div className="text-[#2B241E] font-medium">{formatDate(slot.date)}</div>
              <div className="text-[#786A58]">
                {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
