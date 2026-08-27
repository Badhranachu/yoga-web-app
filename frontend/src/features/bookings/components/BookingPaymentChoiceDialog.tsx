import { useBodyScrollLock } from '@/shared/lib/useBodyScrollLock';
import type { Slot } from '@/features/classes/types';
import type { SubscriptionPlan } from '@/features/payments/types';

export type BookingPaymentChoiceDialogProps = {
  slot: Slot;
  slotPrice: number;
  plan: SubscriptionPlan | null;
  isProcessing: boolean;
  onChooseSlot: () => void;
  onChooseSubscription: () => void;
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

// Shown when a member with no usable subscription taps Book: lets them
// choose between paying once for this single slot, or subscribing to the
// monthly plan (usually far cheaper per-session) before the slot is
// reserved. Neither option books anything until its own payment succeeds.
export const BookingPaymentChoiceDialog = ({
  slot,
  slotPrice,
  plan,
  isProcessing,
  onChooseSlot,
  onChooseSubscription,
  onCancel,
}: BookingPaymentChoiceDialogProps) => {
  useBodyScrollLock();
  const perSessionMonthly = plan ? Number(plan.monthly_price) / plan.included_sessions : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B241E]/45 px-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-payment-choice-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/60 bg-[#F5EFE5] p-7 shadow-2xl"
      >
        <h3 id="booking-payment-choice-title" className="font-serif text-2xl text-[#2B241E]">
          Choose How to Pay
        </h3>
        <p className="mt-2 text-sm text-[#786A58]">
          You don't have an active subscription. Pay once for this class, or subscribe monthly for better value.
        </p>

        <div className="mt-4 rounded-2xl border border-[#2B241E]/10 bg-white/35 p-4 text-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#2B241E]/10 bg-white/40 p-5 flex flex-col">
            <div className="text-xs uppercase tracking-widest text-[#786A58]">Drop-In</div>
            <div className="mt-2 font-serif text-3xl text-[#2B241E]">
              {slotPrice}
              <span className="text-sm text-[#786A58]"> AED / class</span>
            </div>
            <p className="mt-2 text-xs text-[#786A58] flex-1">Pay once for just this slot, no commitment.</p>
            <button
              type="button"
              onClick={onChooseSlot}
              disabled={isProcessing}
              className="mt-4 rounded-full px-4 py-2.5 text-xs uppercase tracking-widest border border-[#2B241E]/20 text-[#2B241E] hover:border-[#D8B46A] hover:text-[#D8B46A] transition-colors disabled:opacity-40"
            >
              {isProcessing ? 'Processing…' : `Pay ${slotPrice} AED for This Slot`}
            </button>
          </div>

          {plan && (
            <div className="rounded-2xl border border-[#2B241E] bg-[#2B241E] p-5 flex flex-col text-white">
              <div className="text-xs uppercase tracking-widest text-[#D8B46A]">Monthly Plan · Most Popular</div>
              <div className="mt-2 font-serif text-3xl">
                {plan.monthly_price}
                <span className="text-sm text-white/70"> AED / month</span>
              </div>
              <p className="mt-2 text-xs text-white/70 flex-1">
                {plan.included_sessions} sessions this cycle
                {perSessionMonthly !== null && ` — about ${perSessionMonthly.toFixed(0)} AED/class`}. Books this
                slot immediately once active.
              </p>
              <button
                type="button"
                onClick={onChooseSubscription}
                disabled={isProcessing}
                className="mt-4 rounded-full px-4 py-2.5 text-xs uppercase tracking-widest bg-[#D8B46A] text-[#2B241E] hover:bg-white transition-colors disabled:opacity-40"
              >
                {isProcessing ? 'Processing…' : 'Start Monthly Subscription'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-full px-4 py-2 text-xs uppercase tracking-widest text-[#786A58] transition-colors hover:text-[#2B241E] disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
