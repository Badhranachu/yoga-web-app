import { useBodyScrollLock } from '@/shared/lib/useBodyScrollLock';
import type { Slot } from '@/features/classes/types';

export type BookingConflictDialogProps = {
  suggestedSlot: Slot;
  isAccepting: boolean;
  onAccept: () => void;
  onCancel: () => void;
};

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const formatTime = (isoTime: string) =>
  new Date(`1970-01-01T${isoTime}`).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

export const BookingConflictDialog = ({
  suggestedSlot,
  isAccepting,
  onAccept,
  onCancel,
}: BookingConflictDialogProps) => {
  useBodyScrollLock();
  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B241E]/45 px-4" role="presentation">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-conflict-title"
      className="w-full max-w-md rounded-3xl border border-white/60 bg-[#F5EFE5] p-7 shadow-2xl"
    >
      <h3 id="booking-conflict-title" className="font-serif text-2xl text-[#2B241E]">
        Requested Slot Unavailable
      </h3>
      <p className="mt-2 text-sm text-[#786A58]">
        The requested slot was just booked. Would you like to reserve the next available slot instead?
      </p>

      <div className="mt-6 rounded-2xl border border-[#2B241E]/10 bg-white/35 p-4 text-sm">
        <div className="text-xs uppercase tracking-widest text-[#786A58]">Suggested Slot</div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[#786A58]">Date:</div>
            <div className="mt-1 text-[#2B241E]">{formatDate(suggestedSlot.date)}</div>
          </div>
          <div>
            <div className="text-xs text-[#786A58]">Time:</div>
            <div className="mt-1 text-[#2B241E]">
              {formatTime(suggestedSlot.start_time)} – {formatTime(suggestedSlot.end_time)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-7 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isAccepting}
          className="rounded-full px-4 py-2 text-xs uppercase tracking-widest text-[#786A58] transition-colors hover:text-[#2B241E] disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={isAccepting}
          className="rounded-full bg-[#2B241E] px-5 py-2 text-xs uppercase tracking-widest text-white transition-colors hover:bg-[#D8B46A] disabled:opacity-40"
        >
          {isAccepting ? 'Booking…' : 'Accept'}
        </button>
      </div>
    </div>
  </div>
  );
};
