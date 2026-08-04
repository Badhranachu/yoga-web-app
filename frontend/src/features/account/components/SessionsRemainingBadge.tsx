import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { paymentsApi } from '@/features/payments/api/paymentsApi';

// Shows the member's live session balance next to the notification bell,
// so it's visible from anywhere in the account area, not just the
// Subscription page. Member-facing only — admins have no session balance.
export const SessionsRemainingBadge = () => {
  const [sessionsRemaining, setSessionsRemaining] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const subscription = await paymentsApi.getMySubscription();
        if (!cancelled) setSessionsRemaining(subscription?.sessions_remaining ?? 0);
      } catch {
        if (!cancelled) setSessionsRemaining(null);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (sessionsRemaining === null) return null;

  return (
    <div
      className="flex items-center gap-1.5 rounded-full border border-[#2B241E]/10 bg-white/40 px-3 py-1.5 text-xs text-[#2B241E]"
      title="Sessions remaining on your active subscription"
    >
      <CalendarDays size={14} className="text-[#D8B46A]" />
      <span>{sessionsRemaining} left</span>
    </div>
  );
};
