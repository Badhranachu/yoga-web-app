import { useBodyScrollLock } from '@/shared/lib/useBodyScrollLock';
import type { Booking } from '../types';
import type { Slot } from '@/features/classes/types';

export type BookingChangeDialogProps = {
  booking: Booking;
  requestedSlot: Slot | null;
  availableSlots?: Slot[];
  isSubmitting: boolean;
  title: string;
  onSlotChange?: (slotId: number) => void;
  onAccept: () => void;
  onReject: () => void;
};

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

const formatTime = (isoTime: string) =>
  new Date(`1970-01-01T${isoTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const SlotSummary = ({ label, slot }: { label: string; slot: Slot | null }) => (
  <div>
    <div className="text-xs uppercase tracking-widest text-[#786A58]">{label}</div>
    {slot ? (
      <>
        <div className="mt-1 text-[#2B241E]">{formatDate(slot.date)}</div>
        <div className="text-sm text-[#786A58]">
          {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
        </div>
      </>
    ) : (
      <div className="mt-1 text-sm text-[#786A58]">No slot selected</div>
    )}
  </div>
);

export const BookingChangeDialog = ({
  booking,
  requestedSlot,
  availableSlots = [],
  isSubmitting,
  title,
  onSlotChange,
  onAccept,
  onReject,
}: BookingChangeDialogProps) => {
  useBodyScrollLock();
  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B241E]/45 px-4" role="presentation">
    <div role="dialog" aria-modal="true" aria-labelledby="booking-change-title" className="w-full max-w-md rounded-3xl border border-white/60 bg-[#F5EFE5] p-7 shadow-2xl">
      <h3 id="booking-change-title" className="font-serif text-2xl text-[#2B241E]">{title}</h3>
      <div className="mt-6 grid gap-5 rounded-2xl border border-[#2B241E]/10 bg-white/35 p-4 sm:grid-cols-2">
        <SlotSummary label="Current Slot" slot={booking.slot} />
        <SlotSummary label="Requested Slot" slot={requestedSlot} />
      </div>

      {availableSlots.length > 0 && onSlotChange && (
        <label className="mt-5 block text-sm text-[#786A58]">
          Requested Slot
          <select
            value={requestedSlot?.id ?? ''}
            onChange={(event) => onSlotChange(Number(event.target.value))}
            disabled={isSubmitting}
            className="mt-2 w-full rounded-xl border border-[#2B241E]/15 bg-white/60 px-3 py-2 text-[#2B241E] outline-none"
          >
            <option value="" disabled>Select an available slot</option>
            {availableSlots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {formatDate(slot.date)} · {formatTime(slot.start_time)}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-7 flex justify-end gap-3">
        <button type="button" onClick={onReject} disabled={isSubmitting} className="rounded-full px-4 py-2 text-xs uppercase tracking-widest text-[#786A58] transition-colors hover:text-red-600 disabled:opacity-40">
          Reject
        </button>
        <button type="button" onClick={onAccept} disabled={isSubmitting || requestedSlot === null} className="rounded-full bg-[#2B241E] px-5 py-2 text-xs uppercase tracking-widest text-white transition-colors hover:bg-[#D8B46A] disabled:opacity-40">
          {isSubmitting ? 'Saving…' : 'Accept'}
        </button>
      </div>
    </div>
  </div>
  );
};
