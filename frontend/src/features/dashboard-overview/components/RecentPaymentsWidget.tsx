import type { DashboardPayment } from '../types';

export const RecentPaymentsWidget = ({ payments }: { payments: DashboardPayment[] }) => (
  <section className="rounded-2xl border border-beige bg-cream p-5 shadow-sm">
    <h3 className="font-serif text-xl text-dark">Recent Payments</h3>
    <div className="mt-4 divide-y divide-beige">
      {payments.length === 0 && <p className="py-3 text-sm text-brown">No payments yet.</p>}
      {payments.map((payment) => (
        <div key={payment.transaction_id} className="flex items-center justify-between gap-4 py-3 text-sm">
          <div className="min-w-0"><p className="truncate text-dark">{payment.user_email}</p><p className="text-xs text-brown">{payment.payment_type}</p></div>
          <div className="text-right"><p className="text-dark">{payment.currency} {payment.amount}</p><p className="text-xs text-brown">{payment.status}</p></div>
        </div>
      ))}
    </div>
  </section>
);
