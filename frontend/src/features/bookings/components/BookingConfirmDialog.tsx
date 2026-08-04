import { useState } from 'react';
import { useBodyScrollLock } from '@/shared/lib/useBodyScrollLock';
import type { Slot } from '@/features/classes/types';

export type BookingConfirmDialogProps = {
  slot: Slot;
  isBooking: boolean;
  onConfirm: () => void;
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
  new Date(`1970-01-01T${isoTime}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

// Two-step confirmation for members with an active, usable subscription:
// no payment is taken (already covered by their plan), but booking still
// requires confirming twice before the slot is reserved.
export const BookingConfirmDialog = ({ slot, isBooking, onConfirm, onCancel }: BookingConfirmDialogProps) => {
  useBodyScrollLock();
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B241E]/45 px-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-confirm-title"
        className="w-full max-w-md rounded-3xl border border-white/60 bg-[#F5EFE5] p-7 shadow-2xl"
      >
        <h3 id="booking-confirm-title" className="font-serif text-2xl text-[#2B241E]">
          {step === 1 ? 'Confirm Booking' : 'Please Confirm Again'}
        </h3>
        <p className="mt-2 text-sm text-[#786A58]">
          {step === 1
            ? 'This session will be deducted from your active subscription once attended.'
            : 'Are you sure? This will reserve the slot below.'}
        </p>

        <div className="mt-6 rounded-2xl border border-[#2B241E]/10 bg-white/35 p-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-[#786A58]">Date:</div>
              <div className="mt-1 text-[#2B241E]">{formatDate(slot.date)}</div>
            </div>
            <div>
              <div className="text-xs text-[#786A58]">Time:</div>
              <div className="mt-1 text-[#2B241E]">
                {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBooking}
            className="rounded-full px-4 py-2 text-xs uppercase tracking-widest text-[#786A58] transition-colors hover:text-[#2B241E] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={step === 1 ? () => setStep(2) : onConfirm}
            disabled={isBooking}
            className="rounded-full bg-[#2B241E] px-5 py-2 text-xs uppercase tracking-widest text-white transition-colors hover:bg-[#D8B46A] disabled:opacity-40"
          >
            {isBooking ? 'Booking…' : step === 1 ? 'Confirm' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
};
