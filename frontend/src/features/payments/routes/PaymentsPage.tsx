import { useEffect, useState } from 'react';
import { FormError } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { paymentsApi } from '../api/paymentsApi';
import { SubscriptionPlanCard } from '../components/SubscriptionPlanCard';
import { SingleSlotPriceCard } from '../components/SingleSlotPriceCard';
import type { PaymentTransaction, RevenueSummary, SubscriptionPlan } from '../types';

// Admin subscription configuration: the studio's monthly plan (price +
// included sessions) and the pay-per-slot price. Invoicing/payment history
// is a later phase — this page only covers what the Subscription Module
// requires: the two pricing levers an admin sets.
export const PaymentsPage = () => {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [slotPrice, setSlotPrice] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [planData, priceData, history, revenueData] = await Promise.all([
          paymentsApi.getPlan(),
          paymentsApi.getSingleSlotPrice(),
          paymentsApi.getHistory(),
          paymentsApi.getRevenue(),
        ]);
        setPlan(planData);
        setSlotPrice(priceData.single_slot_price);
        setPayments(history.results);
        setRevenue(revenueData);
      } catch (err) {
        setLoadError(extractErrorMessage(err, 'Could not load subscription settings.'));
      }
    };
    void load();
  }, []);

  return (
    <div className="max-w-3xl">
      <h2 className="font-serif text-2xl text-[#2B241E] mb-2">Subscriptions & Pricing</h2>
      <p className="text-[#786A58] text-sm mb-8">
        Configure the studio's membership plan and single-slot pricing. Changes apply to future purchases and
        renewals — existing subscriptions keep the price and session count they were bought at.
      </p>

      <FormError message={loadError} />

      <div className="space-y-8">
        {revenue && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#2B241E]/10 bg-white/35 p-4">
              <div className="text-xs uppercase tracking-widest text-[#786A58]">Revenue</div>
              <div className="mt-2 font-serif text-2xl text-[#2B241E]">{revenue.total_revenue} {revenue.currency}</div>
            </div>
            <div className="rounded-2xl border border-[#2B241E]/10 bg-white/35 p-4">
              <div className="text-xs uppercase tracking-widest text-[#786A58]">Successful Payments</div>
              <div className="mt-2 font-serif text-2xl text-[#2B241E]">{revenue.transaction_count}</div>
            </div>
            <div className="rounded-2xl border border-[#2B241E]/10 bg-white/35 p-4">
              <div className="text-xs uppercase tracking-widest text-[#786A58]">Subscriptions</div>
              <div className="mt-2 font-serif text-2xl text-[#2B241E]">{revenue.by_type.subscription?.total ?? '0'} {revenue.currency}</div>
            </div>
          </div>
        )}
        {plan && <SubscriptionPlanCard plan={plan} onUpdated={setPlan} />}
        {slotPrice !== null && <SingleSlotPriceCard price={slotPrice} onUpdated={setSlotPrice} />}

        <div>
          <h3 className="font-serif text-xl text-[#2B241E] mb-3">Payment History</h3>
          <div className="space-y-2">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#2B241E]/10 px-4 py-3 text-sm">
                <div>
                  <div className="text-[#2B241E]">{payment.user_email} · {payment.receipt.receipt_number}</div>
                  <div className="text-[#786A58]">{payment.amount} {payment.currency} · {payment.status}</div>
                </div>
                <button type="button" onClick={() => void paymentsApi.downloadReceipt(payment.receipt.id)} className="text-xs uppercase tracking-widest text-[#786A58] hover:text-[#D8B46A]">
                  Receipt
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
