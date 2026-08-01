import { useEffect, useState } from 'react';
import { Button, FormError, FormSuccess } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { paymentsApi } from '@/features/payments/api/paymentsApi';
import type { PaymentTransaction, SubscriptionPlan, UserSubscription } from '@/features/payments/types';

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

// Member subscription management: current balance, purchase, renew, and
// pay-per-slot when sessions run out. Actual booking/attendance deduction
// happens elsewhere (the future Bookings module) — this page only covers
// the purchase/renew/balance surface of the Subscription Module.
export const SubscriptionPage = () => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [slotPrice, setSlotPrice] = useState<number | null>(null);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAll = async () => {
    try {
      const [sub, planData, priceData, history] = await Promise.all([
        paymentsApi.getMySubscription(),
        paymentsApi.getPlan(),
        paymentsApi.getSingleSlotPrice(),
        paymentsApi.getHistory(),
      ]);
      setSubscription(sub);
      setPlan(planData);
      setSlotPrice(priceData.single_slot_price);
      setPayments(history.results);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load subscription details.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePurchase = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const result = await paymentsApi.purchaseSubscription();
      setSubscription(result.subscription ?? null);
      setPayments((current) => [result.payment, ...current]);
      setSuccessMessage(`Subscription purchased. Receipt ${result.payment.receipt.receipt_number}.`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not purchase a subscription.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenew = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const result = await paymentsApi.renewSubscription();
      setSubscription(result.subscription ?? null);
      setPayments((current) => [result.payment, ...current]);
      setSuccessMessage(`Subscription renewed. Receipt ${result.payment.receipt.receipt_number}.`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not renew your subscription.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayPerSlot = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const result = await paymentsApi.payPerSlot();
      setPayments((current) => [result.payment, ...current]);
      setSuccessMessage(`Single slot purchased. Receipt ${result.payment.receipt.receipt_number}.`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not complete the purchase.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-[#786A58]">Loading…</p>;
  }

  const isUsable = subscription !== null;
  const needsAttention = !isUsable; // no usable subscription: exhausted, expired, cancelled, or never purchased

  return (
    <div className="max-w-2xl">
      <h2 className="font-serif text-2xl text-[#2B241E] mb-2">Subscription</h2>
      <p className="text-[#786A58] text-sm mb-8">
        Manage your membership and session balance.
      </p>

      <FormError message={error} />
      <FormSuccess message={successMessage} />

      <div className="glass-panel bg-white/40 rounded-3xl p-6 md:p-8 border border-white/50 mb-8">
        {isUsable ? (
          <>
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-serif text-xl text-[#2B241E]">Active Membership</h3>
              <span className="text-xs uppercase tracking-widest text-[#D8B46A]">{subscription.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-6 text-sm mb-6">
              <div>
                <div className="text-[#786A58] mb-1">Sessions Remaining</div>
                <div className="text-3xl font-serif text-[#2B241E]">
                  {subscription.sessions_remaining}
                  <span className="text-base text-[#786A58]"> / {subscription.sessions_included}</span>
                </div>
              </div>
              <div>
                <div className="text-[#786A58] mb-1">Cycle</div>
                <div className="text-[#2B241E]">
                  {formatDate(subscription.start_date)} – {formatDate(subscription.end_date)}
                </div>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={handleRenew} disabled={isSubmitting}>
              {isSubmitting ? 'Processing…' : 'Renew Early'}
            </Button>
          </>
        ) : (
          <>
            <h3 className="font-serif text-xl text-[#2B241E] mb-2">No Active Subscription</h3>
            <p className="text-sm text-[#786A58] mb-6">
              {subscription === null
                ? 'Purchase a monthly membership to start booking classes, or pay per visit instead.'
                : "Your sessions are used up. Renew your subscription, or pay per visit."}
            </p>

            {plan && (
              <div className="mb-6 text-sm text-[#2B241E]">
                <span className="font-serif text-2xl">{plan.monthly_price}</span>
                <span className="text-[#786A58]"> AED / month — {plan.included_sessions} sessions</span>
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              <Button type="button" variant="primary" onClick={handlePurchase} disabled={isSubmitting}>
                {isSubmitting ? 'Processing…' : 'Purchase Subscription'}
              </Button>
              <Button type="button" variant="outline" onClick={handleRenew} disabled={isSubmitting}>
                {isSubmitting ? 'Processing…' : 'Renew Subscription'}
              </Button>
            </div>
          </>
        )}
      </div>

      {needsAttention && slotPrice !== null && (
        <div className="glass-panel bg-white/40 rounded-3xl p-6 md:p-8 border border-white/50">
          <h3 className="font-serif text-xl text-[#2B241E] mb-1">Pay Per Slot</h3>
          <p className="text-sm text-[#786A58] mb-6">
            Prefer not to subscribe? Pay {slotPrice} AED for a single visit, no membership required.
          </p>
          <Button type="button" variant="outline" onClick={handlePayPerSlot} disabled={isSubmitting}>
            {isSubmitting ? 'Processing…' : `Pay ${slotPrice} AED for One Slot`}
          </Button>
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-serif text-xl text-[#2B241E] mb-3">Payment History</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-[#786A58]">No payments yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#2B241E]/10 px-4 py-3 text-sm">
                <div>
                  <div className="text-[#2B241E]">{payment.receipt.receipt_number}</div>
                  <div className="text-[#786A58]">{payment.payment_type === 'subscription' ? 'Monthly Subscription' : 'Single Slot'} · {payment.amount} {payment.currency}</div>
                </div>
                <button type="button" onClick={() => void paymentsApi.downloadReceipt(payment.receipt.id)} className="text-xs uppercase tracking-widest text-[#786A58] hover:text-[#D8B46A]">
                  Receipt
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
