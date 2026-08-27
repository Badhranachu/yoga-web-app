import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button, TextField, FormError, FormSuccess } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { paymentsApi } from '../api/paymentsApi';

export type SingleSlotPriceCardProps = {
  price: number;
  onUpdated: (price: number) => void;
};

// Admin control for the pay-per-slot price — what a user without an active
// subscription (or with zero sessions remaining) pays for one visit.
// Read-only by default; Edit reveals the form, matching SubscriptionPlanCard.
export const SingleSlotPriceCard = ({ price, onUpdated }: SingleSlotPriceCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(price));
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = () => {
    setValue(String(price));
    setError(null);
    setSuccessMessage(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMessage(null);

    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
      setError('Enter a valid, non-negative price.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await paymentsApi.updateSingleSlotPrice(parsed);
      onUpdated(result.single_slot_price);
      setSuccessMessage('Single slot price updated.');
      setIsEditing(false);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel bg-white/40 rounded-3xl p-6 md:p-8 border border-white/50">
      <div className="mb-1 flex items-start justify-between gap-4">
        <h3 className="font-serif text-xl text-[#2B241E]">Single Slot Price</h3>
        {!isEditing && (
          <button
            type="button"
            onClick={startEditing}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#2B241E]/15 px-3 py-1.5 text-xs uppercase tracking-widest text-[#786A58] hover:text-[#2B241E]"
          >
            <Pencil size={14} strokeWidth={1.5} />
            Edit
          </button>
        )}
      </div>
      <p className="mb-6 text-sm text-[#786A58]">
        What a member pays for one visit without an active subscription — e.g. once their sessions run out.
      </p>

      <FormError message={error} />
      <FormSuccess message={successMessage} />

      {isEditing ? (
        <div className="flex items-end gap-4">
          <TextField
            label="Price (AED)"
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="!w-32"
          />
          <Button type="button" variant="primary" className="!py-3" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Update'}
          </Button>
          <Button type="button" variant="outline" className="!py-3" onClick={cancelEditing} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      ) : (
        <div>
          <div className="mb-1 text-xs uppercase tracking-widest text-[#786A58]">Price (AED)</div>
          <div className="text-lg text-[#2B241E]">{price}</div>
        </div>
      )}
    </div>
  );
};
