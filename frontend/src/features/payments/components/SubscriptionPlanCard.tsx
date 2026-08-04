import { useState } from 'react';
import { Button, TextField, FormError, FormSuccess } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { paymentsApi } from '../api/paymentsApi';
import type { SubscriptionPlan } from '../types';

export type SubscriptionPlanCardProps = {
  plan: SubscriptionPlan;
  onUpdated: (plan: SubscriptionPlan) => void;
};

// Admin control for the studio's single subscription offering: monthly
// price and included sessions (default 30). Same edit-in-place pattern as
// classes_app.TimetableConfig — there is only ever one plan.
export const SubscriptionPlanCard = ({ plan, onUpdated }: SubscriptionPlanCardProps) => {
  const [monthlyPrice, setMonthlyPrice] = useState(plan.monthly_price);
  const [includedSessions, setIncludedSessions] = useState(String(plan.included_sessions));
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      const updated = await paymentsApi.updatePlan({
        monthly_price: monthlyPrice,
        included_sessions: Number(includedSessions),
      });
      onUpdated(updated);
      setSuccessMessage('Subscription plan updated.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not update the plan.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel bg-white/40 rounded-3xl p-6 md:p-8 border border-white/50">
      <h3 className="font-serif text-xl text-[#2B241E] mb-1">Subscription Plan</h3>
      <p className="text-sm text-[#786A58] mb-6">
        The studio's monthly membership. Members purchase this plan for a set number of sessions per cycle.
      </p>

      <FormError message={error} />
      <FormSuccess message={successMessage} />

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <TextField
          label="Monthly Price (INR)"
          type="number"
          min="0"
          step="0.01"
          value={monthlyPrice}
          onChange={(e) => setMonthlyPrice(e.target.value)}
        />
        <TextField
          label="Included Sessions"
          type="number"
          min="1"
          value={includedSessions}
          onChange={(e) => setIncludedSessions(e.target.value)}
        />
      </div>

      <Button type="button" variant="primary" onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving…' : 'Save Plan'}
      </Button>
    </div>
  );
};
