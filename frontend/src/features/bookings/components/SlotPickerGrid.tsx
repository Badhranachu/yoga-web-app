import { SlotAvailabilityBadge } from '@/features/classes/components/SlotAvailabilityBadge';
import type { Slot } from '@/features/classes/types';

export type SlotPickerGridProps = {
  slots: Slot[];
  bookingSlotId: number | null;
  onBook: (slot: Slot) => void;
};

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

const formatTime = (isoTime: string) =>
  new Date(`1970-01-01T${isoTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

// Grid of bookable slots. Only "available" slots get a Book button — every
// other state (booked, unavailable, leave_conflict) is still shown, never
// hidden, matching "booked slots remain visible."
export const SlotPickerGrid = ({ slots, bookingSlotId, onBook }: SlotPickerGridProps) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
    {slots.map((slot) => {
      const isAvailable = slot.availability === 'available';
      const isBookingThis = bookingSlotId === slot.id;

      return (
        <div key={slot.id} className="rounded-xl border border-[#2B241E]/10 px-4 py-3 text-sm flex flex-col gap-2">
          <div>
            <div className="text-[#2B241E] font-medium">{formatDate(slot.date)}</div>
            <div className="text-[#786A58]">
              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
            </div>
          </div>
          <SlotAvailabilityBadge availability={slot.availability} />
          {isAvailable && (
            <button
              onClick={() => onBook(slot)}
              disabled={bookingSlotId !== null}
              className="mt-1 px-3 py-1.5 rounded-full text-xs uppercase tracking-widest bg-[#2B241E] text-white hover:bg-[#D8B46A] transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              {isBookingThis ? 'Booking…' : 'Book'}
            </button>
          )}
        </div>
      );
    })}
  </div>
);
