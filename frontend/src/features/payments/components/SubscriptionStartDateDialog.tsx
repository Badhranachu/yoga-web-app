import { useMemo, useState } from 'react';
import { MiniCalendar } from '@/shared/ui';
import { useBodyScrollLock } from '@/shared/lib/useBodyScrollLock';
import type { SubscriptionStartDateOptions } from '../types';

export type SubscriptionStartDateDialogProps = {
  options: SubscriptionStartDateOptions;
  isSubmitting: boolean;
  onConfirm: (startDate: string) => void;
  onCancel: () => void;
};

const formatDate = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

const addDays = (dateKey: string, days: number) => {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Shown before a Razorpay subscription purchase/renewal: lets the member
// pick when the new cycle should start. For a renewal, the current
// subscription's end date is shown so it's clear the existing one keeps
// working normally until then — the picker only allows dates after it.
export const SubscriptionStartDateDialog = ({ options, isSubmitting, onConfirm, onCancel }: SubscriptionStartDateDialogProps) => {
  useBodyScrollLock();
  const [selectedDate, setSelectedDate] = useState<string | null>(options.earliest);

  const expiryPreview = useMemo(
    () => (selectedDate ? addDays(selectedDate, 30) : null),
    [selectedDate],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B241E]/45 px-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-date-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/60 bg-[#F5EFE5] p-7 shadow-2xl"
      >
        <h3 id="start-date-title" className="font-serif text-2xl text-[#2B241E]">
          {options.action === 'renew' ? 'Choose Activation Date' : 'Choose Start Date'}
        </h3>

        {options.action === 'renew' && options.current_subscription_end_date && (
          <div className="mt-3 rounded-2xl border border-[#2B241E]/10 bg-white/40 p-4 text-sm">
            <p className="text-[#786A58]">
              Current subscription ends on <span className="text-[#2B241E]">{formatDate(options.current_subscription_end_date)}</span>.
              It will remain active until then.
            </p>
            <p className="mt-2 text-[#786A58]">Please select the activation date for your renewed subscription.</p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 text-xs text-[#786A58] sm:grid-cols-2">
          <div>
            <div className="uppercase tracking-widest">Earliest</div>
            <div className="mt-1 text-sm text-[#2B241E]">{formatDate(options.earliest)}</div>
          </div>
          <div>
            <div className="uppercase tracking-widest">Latest</div>
            <div className="mt-1 text-sm text-[#2B241E]">{formatDate(options.latest)}</div>
          </div>
        </div>

        <div className="mt-5">
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            minDate={options.earliest}
            maxDate={options.latest}
          />
        </div>

        {selectedDate && expiryPreview && (
          <p className="mt-4 text-sm text-[#786A58]">
            Your subscription will run <span className="text-[#2B241E]">{formatDate(selectedDate)}</span> –{' '}
            <span className="text-[#2B241E]">{formatDate(expiryPreview)}</span>.
          </p>
        )}

        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-full px-4 py-2 text-xs uppercase tracking-widest text-[#786A58] transition-colors hover:text-[#2B241E] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => selectedDate && onConfirm(selectedDate)}
            disabled={isSubmitting || !selectedDate}
            className="rounded-full bg-[#2B241E] px-5 py-2 text-xs uppercase tracking-widest text-white transition-colors hover:bg-[#D8B46A] disabled:opacity-40"
          >
            {isSubmitting ? 'Processing…' : 'Continue to Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};
