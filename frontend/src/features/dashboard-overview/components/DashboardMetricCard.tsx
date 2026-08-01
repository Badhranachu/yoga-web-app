import type { LucideIcon } from 'lucide-react';

type Props = { label: string; value: string | number; icon: LucideIcon };

export const DashboardMetricCard = ({ label, value, icon: Icon }: Props) => (
  <article className="rounded-2xl border border-beige bg-cream p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brown">{label}</p>
      <Icon size={19} strokeWidth={1.7} className="text-gold-dark" aria-hidden="true" />
    </div>
    <p className="mt-4 font-serif text-3xl text-dark">{value}</p>
  </article>
);
