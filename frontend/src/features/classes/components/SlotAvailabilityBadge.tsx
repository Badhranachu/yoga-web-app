import type { SlotAvailability } from '../types';

const STYLES: Record<SlotAvailability, string> = {
  available: 'bg-[#D8B46A]/15 text-[#8a6f2e]',
  booked: 'bg-[#2B241E]/10 text-[#2B241E]',
  unavailable: 'bg-[#786A58]/10 text-[#786A58]',
  leave_conflict: 'bg-red-100 text-red-700',
};

const LABELS: Record<SlotAvailability, string> = {
  available: 'Available',
  booked: 'Booked',
  unavailable: 'Unavailable',
  leave_conflict: 'Leave Conflict',
};

export const SlotAvailabilityBadge = ({ availability }: { availability: SlotAvailability }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${STYLES[availability]}`}>
    {LABELS[availability]}
  </span>
);
