import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { bookingsApi } from '@/features/bookings/api/bookingsApi';
import type { InstructorStats } from '@/features/bookings/types';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { FormError } from '@/shared/ui';

const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <div className="rounded-xl border border-[#2B241E]/10 bg-white/40 px-4 py-3">
    <p className="text-xs uppercase tracking-widest text-[#786A58]">{label}</p>
    <p className="mt-1 font-serif text-2xl text-[#2B241E]">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-[#786A58]">{sub}</p>}
  </div>
);

// Instructor's own performance overview — hours worked and class counts,
// today / this month / all-time (see backend services.get_instructor_stats).
export const InstructorOverviewPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<InstructorStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setStats(await bookingsApi.getInstructorStats());
      } catch (err) {
        setError(extractErrorMessage(err, 'Could not load your overview.'));
      }
    };
    void load();
  }, []);

  return (
    <div className="max-w-3xl">
      <h2 className="mb-2 font-serif text-2xl text-[#2B241E]">
        Welcome{user?.first_name ? `, ${user.first_name}` : ''}
      </h2>
      <p className="mb-8 text-sm text-[#786A58]">
        Your instructor overview — hours worked and class activity.
      </p>

      <FormError message={error} />

      {stats === null ? (
        <p className="text-sm text-[#786A58]">Loading…</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h3 className="mb-3 font-serif text-xl text-[#2B241E]">Hours Worked</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Today" value={`${stats.hours_worked.today}h`} />
              <StatCard label="This Month" value={`${stats.hours_worked.month}h`} />
              <StatCard label="Total" value={`${stats.hours_worked.total}h`} />
            </div>
            <p className="mt-2 text-xs text-[#786A58]">
              Counts every class whose time has passed, whether or not it was marked attended.
            </p>
          </section>

          <section>
            <h3 className="mb-3 font-serif text-xl text-[#2B241E]">Attended</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Today" value={stats.attended.today} />
              <StatCard label="This Month" value={stats.attended.month} />
              <StatCard label="Total" value={stats.attended.total} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-serif text-xl text-[#2B241E]">Passed & Not Attempted</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Today" value={stats.expired_unattempted.today} />
              <StatCard label="This Month" value={stats.expired_unattempted.month} />
              <StatCard label="Total" value={stats.expired_unattempted.total} />
            </div>
            <p className="mt-2 text-xs text-[#786A58]">
              Classes whose time has passed but were never marked attended.
            </p>
          </section>

          <section>
            <h3 className="mb-3 font-serif text-xl text-[#2B241E]">Class Totals</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Today's Total" value={stats.classes_today_total} sub="All assigned classes today" />
              <StatCard label="This Month's Total" value={stats.classes_month_total} sub="All assigned classes this month" />
              <StatCard label="Upcoming" value={stats.upcoming_count} sub="Not yet started" />
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
