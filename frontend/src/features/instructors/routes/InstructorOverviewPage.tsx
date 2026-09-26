import { useEffect, useState } from 'react';
import { CalendarCheck2, CalendarDays, CalendarX2, Clock } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { bookingsApi } from '@/features/bookings/api/bookingsApi';
import type { InstructorStats } from '@/features/bookings/types';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { FormError } from '@/shared/ui';
import { AttendanceDonutChart } from '../components/AttendanceDonutChart';
import { StatBarRow } from '../components/StatBarRow';

const HeroStat = ({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string | number }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-[#2B241E]/10 bg-white/40 px-4 py-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D8B46A]/15">
      <Icon size={18} className="text-[#D8B46A]" strokeWidth={1.75} />
    </span>
    <div className="min-w-0">
      <p className="font-serif text-xl leading-tight text-[#2B241E]">{value}</p>
      <p className="truncate text-[11px] uppercase tracking-widest text-[#786A58]">{label}</p>
    </div>
  </div>
);

const Card = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-[#2B241E]/10 bg-white/40 p-5 sm:p-6">
    <h3 className="mb-4 font-serif text-lg text-[#2B241E]">{title}</h3>
    {children}
    {subtitle && <p className="mt-4 text-xs text-[#786A58]">{subtitle}</p>}
  </section>
);

// Instructor's own performance overview — hours worked and class activity
// (see backend services.get_instructor_stats). Redesigned around a donut
// (all-time class split: attended / not-attended / upcoming — three fixed
// categories, never a generated hue) plus bar-row comparisons for the
// today/month/total buckets, instead of a wall of identical stat tiles.
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
      <p className="mb-6 text-sm text-[#786A58]">Your instructor overview — hours worked and class activity.</p>

      <FormError message={error} />

      {stats === null ? (
        <p className="text-sm text-[#786A58]">Loading…</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroStat icon={Clock} label="Hours Today" value={`${stats.hours_worked.today}h`} />
            <HeroStat icon={CalendarDays} label="Classes Today" value={stats.classes_today_total} />
            <HeroStat icon={CalendarCheck2} label="Attended Total" value={stats.attended.total} />
            <HeroStat icon={CalendarX2} label="Missed Total" value={stats.expired_unattempted.total} />
          </div>

          <Card title="All-Time Class Status" subtitle="Every class ever assigned to you, split by outcome.">
            <AttendanceDonutChart
              centerLabel="Classes"
              centerValue={stats.attended.total + stats.expired_unattempted.total + stats.upcoming_count}
              segments={[
                { label: 'Attended', value: stats.attended.total, color: 'var(--gold-dark)' },
                { label: 'Not Attended', value: stats.expired_unattempted.total, color: '#C1544C' },
                { label: 'Upcoming', value: stats.upcoming_count, color: 'var(--brown)' },
              ]}
            />
          </Card>

          <Card title="Hours Worked" subtitle="Counts every class whose time has passed, whether or not it was marked attended.">
            <StatBarRow
              bars={[
                { label: 'Today', value: stats.hours_worked.today, display: `${stats.hours_worked.today}h` },
                { label: 'Month', value: stats.hours_worked.month, display: `${stats.hours_worked.month}h` },
                { label: 'Total', value: stats.hours_worked.total, display: `${stats.hours_worked.total}h` },
              ]}
            />
          </Card>

          <Card title="Attended">
            <StatBarRow
              bars={[
                { label: 'Today', value: stats.attended.today, display: String(stats.attended.today) },
                { label: 'Month', value: stats.attended.month, display: String(stats.attended.month) },
                { label: 'Total', value: stats.attended.total, display: String(stats.attended.total) },
              ]}
            />
          </Card>

          <Card title="Not Attended" subtitle="Classes whose time has passed but were never marked attended.">
            <StatBarRow
              color="#C1544C"
              bars={[
                { label: 'Today', value: stats.expired_unattempted.today, display: String(stats.expired_unattempted.today) },
                { label: 'Month', value: stats.expired_unattempted.month, display: String(stats.expired_unattempted.month) },
                { label: 'Total', value: stats.expired_unattempted.total, display: String(stats.expired_unattempted.total) },
              ]}
            />
          </Card>

          <Card title="Class Totals">
            <StatBarRow
              color="var(--brown)"
              bars={[
                { label: 'Today', value: stats.classes_today_total, display: String(stats.classes_today_total) },
                { label: 'Month', value: stats.classes_month_total, display: String(stats.classes_month_total) },
                { label: 'Upcoming', value: stats.upcoming_count, display: String(stats.upcoming_count) },
              ]}
            />
          </Card>
        </div>
      )}
    </div>
  );
};
