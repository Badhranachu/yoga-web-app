import type { ReactNode } from 'react';

export const UserDashboardPanel = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-beige bg-cream p-5 shadow-sm">
    <h3 className="font-serif text-xl text-dark">{title}</h3>
    <div className="mt-4">{children}</div>
  </section>
);
