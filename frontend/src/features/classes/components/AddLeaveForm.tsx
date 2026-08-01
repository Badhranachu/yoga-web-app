import { useState, type FormEvent } from 'react';
import { Button, TextField, FormError, FormSuccess } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { classesApi } from '../api/classesApi';
import type { Leave } from '../types';

export type AddLeaveFormProps = {
  onAdded: (leave: Leave) => void;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

// Admin-only: declares a studio closure over a date range. No slot may be
// booked on these dates — see backend apps.classes_app.services.apply_leave,
// which blocks (never deletes) the affected slots.
export const AddLeaveForm = ({ onAdded }: AddLeaveFormProps) => {
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const leave = await classesApi.addLeave({ start_date: startDate, end_date: endDate, reason });
      onAdded(leave);
      setSuccessMessage('Leave added. Affected slots are now unavailable.');
      setReason('');
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not add this leave.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel bg-white/40 rounded-3xl p-6 md:p-8 border border-white/50">
      <h3 className="font-serif text-xl text-[#2B241E] mb-1">Add Leave</h3>
      <p className="text-sm text-[#786A58] mb-6">
        Block a date range from bookings — e.g. a holiday or studio closure. No slot in this range can be booked.
      </p>

      <FormError message={error} />
      <FormSuccess message={successMessage} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Start Date"
            type="date"
            name="startDate"
            min={todayIso()}
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <TextField
            label="End Date"
            type="date"
            name="endDate"
            min={startDate}
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <TextField
          label="Reason (optional)"
          name="reason"
          placeholder="e.g. Public holiday"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add Leave'}
        </Button>
      </form>
    </div>
  );
};
