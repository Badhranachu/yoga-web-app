import { useEffect, useState } from 'react';
import { Activity, CalendarDays, CalendarOff, CreditCard, DollarSign, HeartPulse, Layers, Users, UserCheck, UserX, WalletCards } from 'lucide-react';
import { dashboardApi } from '../api/dashboardApi';
import { DashboardMetricCard } from '../components/DashboardMetricCard';
import { DashboardTrendChart } from '../components/DashboardTrendChart';
import { RecentBookingsWidget } from '../components/RecentBookingsWidget';
import { RecentPaymentsWidget } from '../components/RecentPaymentsWidget';
import type { DashboardOverview } from '../types';

const money = (amount: string) => `AED ${amount}`;

export const OverviewPage = () => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.getOverview().then(setOverview).catch(() => setError('Dashboard data could not be loaded.'));
  }, []);

  if (error) return <p className="rounded-xl border border-beige bg-cream p-5 text-sm text-brown">{error}</p>;
  if (!overview) return <p className="text-sm text-brown">Loading dashboard…</p>;

  const { metrics, trends } = overview;
  const cards = [
    ['Today’s Bookings', metrics.todays_bookings, CalendarDays], ['Today’s Revenue', money(metrics.todays_revenue), DollarSign],
    ['Monthly Revenue', money(metrics.monthly_revenue), WalletCards], ['Total Revenue', money(metrics.total_revenue), CreditCard],
    ['Registered Users', metrics.registered_users, Users], ['Active Subscriptions', metrics.active_subscriptions, UserCheck],
    ['Expired Subscriptions', metrics.expired_subscriptions, UserX], ['Booked Slots', metrics.booked_slots, Layers],
    ['Available Slots', metrics.available_slots, Activity], ['Transfer Requests', metrics.transfer_requests, HeartPulse],
    ['Upcoming Leaves', metrics.upcoming_leaves, CalendarOff],
  ] as const;

  return (
    <div className="space-y-8">
      <div><h2 className="font-serif text-3xl text-dark">Dashboard</h2><p className="mt-1 text-sm text-brown">A live view of studio activity and revenue.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, icon]) => <DashboardMetricCard key={label} label={label} value={value} icon={icon} />)}</div>
      <div className="grid gap-5 xl:grid-cols-3"><DashboardTrendChart title="Revenue Trend" points={trends.revenue} currency /><DashboardTrendChart title="Booking Trend" points={trends.bookings} /><DashboardTrendChart title="Subscription Trend" points={trends.subscriptions} /></div>
      <div className="grid gap-5 xl:grid-cols-2"><RecentPaymentsWidget payments={overview.recent_payments} /><RecentBookingsWidget bookings={overview.recent_bookings} /></div>
    </div>
  );
};
