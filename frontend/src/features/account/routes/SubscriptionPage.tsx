import { useEffect, useState } from 'react';
import { Button, FormError, FormSuccess } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { paymentsApi } from '@/features/payments/api/paymentsApi';
import { openRazorpayCheckout } from '@/features/payments/lib/razorpay';
import { PaymentHistoryList } from '@/features/payments/components/PaymentHistoryList';
import { SubscriptionStartDateDialog } from '@/features/payments/components/SubscriptionStartDateDialog';
import { tokenStorage } from '@/features/auth/lib/tokenStorage';
import { notifySessionBalanceChanged } from '@/shared/lib/sessionBalanceBus';
import type {
  PaymentTransaction,
  PaymentType,
  SubscriptionPlan,
  SubscriptionStartDateOptions,
  UserSubscription,
  VerifyPaymentAction,
} from '@/features/payments/types';

const formatDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

// Member subscription management: current balance, purchase, and renew.
// Pay-per-slot happens from Book a Class instead (where a specific slot is
// actually chosen) — this page only covers the subscription surface.
export const SubscriptionPage = () => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [hasPreviousSubscription, setHasPreviousSubscription] = useState(false);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDateOptions, setStartDateOptions] = useState<SubscriptionStartDateOptions | null>(null);
  const [pendingAction, setPendingAction] = useState<VerifyPaymentAction | null>(null);

  const loadAll = async () => {
    try {
      const [sub, historyStatus, planData, history] = await Promise.all([
        paymentsApi.getMySubscription(),
        paymentsApi.getMySubscriptionHistoryStatus(),
        paymentsApi.getPlan(),
        paymentsApi.getHistory(),
      ]);
      setSubscription(sub);
      setHasPreviousSubscription(historyStatus.has_previous_subscription);
      setPlan(planData);
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

  const payViaRazorpay = async (
    paymentType: PaymentType,
    action: VerifyPaymentAction,
    description: string,
    startDate?: string,
  ) => {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const order = await paymentsApi.createOrder(paymentType);
      await openRazorpayCheckout({
        keyId: order.key_id,
        amount: order.amount,
        currency: order.currency,
        orderId: order.order_id,
        description,
        prefillEmail: tokenStorage.getUser()?.email,
        onDismiss: () => setIsSubmitting(false),
        onSuccess: (checkoutResponse) => {
          void (async () => {
            try {
              const result = await paymentsApi.verifyPayment({
                action,
                razorpay_order_id: checkoutResponse.razorpay_order_id,
                razorpay_payment_id: checkoutResponse.razorpay_payment_id,
                razorpay_signature: checkoutResponse.razorpay_signature,
                start_date: startDate,
              });
              // Reload everything from the server rather than patching local
              // state — the subscription/payments the API returns here can
              // be stale relative to what a fresh GET would show (e.g. a
              // renewal is scheduled, not immediately active).
              await loadAll();
              notifySessionBalanceChanged();
              setSuccessMessage(`Payment successful. Receipt ${result.payment.receipt.receipt_number}.`);
            } catch (err) {
              setError(extractErrorMessage(err, 'Payment verification failed.'));
            } finally {
              setIsSubmitting(false);
            }
          })();
        },
      });
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not start the payment.'));
      setIsSubmitting(false);
    }
  };

  const openStartDateDialog = async (action: VerifyPaymentAction) => {
    setError(null);
    setSuccessMessage(null);
    try {
      const options = await paymentsApi.getSubscriptionStartDateOptions();
      setPendingAction(action);
      setStartDateOptions(options);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load available start dates.'));
    }
  };

  const handlePurchase = () => openStartDateDialog('purchase');
  const handleRenew = () => openStartDateDialog('renew');

  const handleConfirmStartDate = (startDate: string) => {
    if (!pendingAction) return;
    const action = pendingAction;
    setStartDateOptions(null);
    setPendingAction(null);
    const description = action === 'renew' ? 'Subscription Renewal' : 'Monthly Subscription';
    void payViaRazorpay('subscription', action, description, startDate);
  };

  if (isLoading) {
    return <p className="text-sm text-[#786A58]">Loading…</p>;
  }

  const isUsable = subscription !== null;

  return (
    <div className="w-full max-w-2xl">
      <h2 className="font-serif text-2xl text-[#2B241E] mb-2">Subscription</h2>
      <p className="text-[#786A58] text-sm mb-8">
        Manage your membership and session balance.
      </p>

      <FormError message={error} />
      <FormSuccess message={successMessage} />

      <div className="glass-panel bg-white/40 rounded-3xl p-6 md:p-8 border border-white/50 mb-8">
        {isUsable ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
              <h3 className="font-serif text-xl text-[#2B241E]">Active Membership</h3>
              <span className="text-xs uppercase tracking-widest text-[#D8B46A]">{subscription.status}</span>
            </div>
            <div className="grid grid-cols-1 gap-6 text-sm mb-6 sm:grid-cols-2">
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
            <h3 className="font-serif text-xl text-[#2B241E] mb-1">No Active Subscription</h3>
            <p className="text-sm text-[#786A58] mb-6">
              {hasPreviousSubscription
                ? 'Your subscription has ended or your sessions are used up. Renew to keep booking classes, or pay per visit from Book a Class.'
                : 'Purchase a monthly membership to start booking classes, or pay per visit from Book a Class instead.'}
            </p>

            {plan && (
              <div className="mb-6 flex items-baseline gap-2">
                <span className="font-serif text-3xl text-[#2B241E]">{plan.monthly_price}</span>
                <span className="text-sm text-[#786A58]">AED / month — {plan.included_sessions} sessions</span>
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              {hasPreviousSubscription ? (
                <Button type="button" variant="primary" onClick={handleRenew} disabled={isSubmitting}>
                  {isSubmitting ? 'Processing…' : 'Renew Subscription'}
                </Button>
              ) : (
                <Button type="button" variant="primary" onClick={handlePurchase} disabled={isSubmitting}>
                  {isSubmitting ? 'Processing…' : 'Purchase Subscription'}
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-8">
        <h3 className="font-serif text-xl text-[#2B241E] mb-3">Recent Payments</h3>
        <PaymentHistoryList payments={payments.slice(0, 5)} />
      </div>

      {startDateOptions && (
        <SubscriptionStartDateDialog
          options={startDateOptions}
          isSubmitting={isSubmitting}
          onConfirm={handleConfirmStartDate}
          onCancel={() => {
            setStartDateOptions(null);
            setPendingAction(null);
          }}
        />
      )}
    </div>
  );
};
