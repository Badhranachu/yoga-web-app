import { useState } from 'react';
import { Button, TextField, FormError, FormSuccess } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { paymentsApi } from '../api/paymentsApi';

export type SingleSlotPriceCardProps = {
  price: number;
  onUpdated: (price: number) => void;
};

// Admin control for the pay-per-slot price — what a user without an active
// subscription (or with zero sessions remaining) pays for one visit.
export const SingleSlotPriceCard = ({ price, onUpdated }: SingleSlotPriceCardProps) => {
  const [value, setValue] = useState(String(price));
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel bg-white/40 rounded-3xl p-6 md:p-8 border border-white/50">
      <h3 className="font-serif text-xl text-[#2B241E] mb-1">Single Slot Price</h3>
      <p className="text-sm text-[#786A58] mb-6">
        What a member pays for one visit without an active subscription — e.g. once their sessions run out.
      </p>

      <FormError message={error} />
      <FormSuccess message={successMessage} />

      <div className="flex items-end gap-4">
        <TextField
          label="Price (INR)"
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
      </div>
    </div>
  );
};
