import type { LucideIcon } from 'lucide-react';

type Props = { label: string; value: string | number; icon: LucideIcon; detail?: string };

export const UserDashboardCard = ({ label, value, icon: Icon, detail }: Props) => (
  <article className="rounded-2xl border border-beige bg-cream p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brown">{label}</p>
      <Icon size={19} strokeWidth={1.7} className="text-gold-dark" aria-hidden="true" />
    </div>
    <p className="mt-4 font-serif text-2xl text-dark">{value}</p>
    {detail && <p className="mt-1 text-xs text-brown">{detail}</p>}
  </article>
);
