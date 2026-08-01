import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { FormError } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { classesApi } from '../api/classesApi';
import type { Leave } from '../types';

export type LeaveHistoryTableProps = {
  leaves: Leave[];
  onDeleted: (id: number) => void;
};

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

// Full leave history — past and future. Past leave is permanent history and
// has no delete action (enforced again server-side regardless of the UI).
export const LeaveHistoryTable = ({ leaves, onDeleted }: LeaveHistoryTableProps) => {
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (leave: Leave) => {
    setError(null);
    setDeletingId(leave.id);
    try {
      await classesApi.deleteLeave(leave.id);
      onDeleted(leave.id);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not delete this leave.'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="glass-panel bg-white/40 rounded-3xl p-6 md:p-8 border border-white/50">
      <h3 className="font-serif text-xl text-[#2B241E] mb-1">Leave History</h3>
      <p className="text-sm text-[#786A58] mb-6">
        Every leave ever added. Past leave is kept permanently and cannot be removed.
      </p>

      <FormError message={error} />

      {leaves.length === 0 && <p className="text-sm text-[#786A58]">No leave has been recorded yet.</p>}

      {leaves.length > 0 && (
        <div className="space-y-2">
          {leaves.map((leave) => (
            <div
              key={leave.id}
              className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${
                leave.is_past ? 'border-[#2B241E]/10 opacity-60' : 'border-[#2B241E]/10'
              }`}
            >
              <div>
                <div className="text-[#2B241E] font-medium">
                  {formatDate(leave.start_date)}
                  {leave.end_date !== leave.start_date && <> – {formatDate(leave.end_date)}</>}
                  {leave.is_past && <span className="ml-2 text-xs uppercase tracking-widest text-[#786A58]">Past</span>}
                </div>
                {leave.reason && <div className="text-[#786A58]">{leave.reason}</div>}
              </div>

              {!leave.is_past && (
                <button
                  onClick={() => handleDelete(leave)}
                  disabled={deletingId === leave.id}
                  aria-label="Delete leave"
                  className="text-[#786A58] hover:text-red-600 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={18} strokeWidth={1.5} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
