import { useState } from 'react';
import { Pencil } from 'lucide-react';
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
// classes_app.TimetableConfig — there is only ever one plan. Read-only by
// default so the current values can't be bumped by accident; Edit reveals
// the form.
export const SubscriptionPlanCard = ({ plan, onUpdated }: SubscriptionPlanCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState(plan.monthly_price);
  const [includedSessions, setIncludedSessions] = useState(String(plan.included_sessions));
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = () => {
    setMonthlyPrice(plan.monthly_price);
    setIncludedSessions(String(plan.included_sessions));
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
    setIsSaving(true);

    try {
      const updated = await paymentsApi.updatePlan({
        monthly_price: monthlyPrice,
        included_sessions: Number(includedSessions),
      });
      onUpdated(updated);
      setSuccessMessage('Subscription plan updated.');
      setIsEditing(false);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not update the plan.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel bg-white/40 rounded-3xl p-6 md:p-8 border border-white/50">
      <div className="mb-1 flex items-start justify-between gap-4">
        <h3 className="font-serif text-xl text-[#2B241E]">Subscription Plan</h3>
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
        The studio's monthly membership. Members purchase this plan for a set number of sessions per cycle.
      </p>

      <FormError message={error} />
      <FormSuccess message={successMessage} />

      {isEditing ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
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

          <div className="flex gap-3">
            <Button type="button" variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save Plan'}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelEditing} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-[#786A58]">Monthly Price (INR)</div>
            <div className="text-lg text-[#2B241E]">{plan.monthly_price}</div>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-widest text-[#786A58]">Included Sessions</div>
            <div className="text-lg text-[#2B241E]">{plan.included_sessions}</div>
          </div>
        </div>
      )}
    </div>
  );
};
