import { useState } from 'react';
import { Button, FormError, FormSuccess } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { classesApi } from '../api/classesApi';

export type HorizonSettingsCardProps = {
  horizonDays: number;
  onUpdated: (newHorizonDays: number) => void;
};

const MIN_HORIZON = 7;
const MAX_HORIZON = 365;

// Admin control for how many days ahead slots are auto-generated. Backed by
// apps.core.StudioSetting — nothing about this value is hardcoded.
export const HorizonSettingsCard = ({ horizonDays, onUpdated }: HorizonSettingsCardProps) => {
  const [value, setValue] = useState(String(horizonDays));
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setError(null);
    setSuccessMessage(null);

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < MIN_HORIZON || parsed > MAX_HORIZON) {
      setError(`Horizon must be a whole number between ${MIN_HORIZON} and ${MAX_HORIZON} days.`);
      return;
    }

    setIsSaving(true);
    try {
      const result = await classesApi.updateHorizon(parsed);
      onUpdated(result.horizon_days);
      setSuccessMessage(
        result.slots_created > 0
          ? `Horizon updated. ${result.slots_created} new slot(s) generated.`
          : 'Horizon updated. No new slots were needed.',
      );
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel bg-white/40 rounded-3xl p-6 md:p-8 border border-white/50">
      <h3 className="font-serif text-xl text-[#2B241E] mb-1">Slot Generation Horizon</h3>
      <p className="text-sm text-[#786A58] mb-6">
        How many days ahead bookable slots are automatically generated ({MIN_HORIZON}–{MAX_HORIZON} days).
      </p>

      <FormError message={error} />
      <FormSuccess message={successMessage} />

      <div className="flex items-end gap-4">
        <div>
          <label htmlFor="horizonDays" className="block text-xs uppercase tracking-widest text-[#786A58] mb-2">
            Days Ahead
          </label>
          <input
            id="horizonDays"
            type="number"
            min={MIN_HORIZON}
            max={MAX_HORIZON}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-32 bg-transparent border-b border-[#2B241E]/20 py-2 text-[#2B241E] focus:outline-none focus:border-[#D8B46A] transition-colors"
          />
        </div>
        <Button type="button" variant="primary" className="!py-3" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Update'}
        </Button>
      </div>
    </div>
  );
};
