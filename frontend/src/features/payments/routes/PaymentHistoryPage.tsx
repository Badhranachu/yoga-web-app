import { useEffect, useState } from 'react';
import { FormError } from '@/shared/ui';
import { extractErrorMessage } from '@/shared/lib/apiErrors';
import { paymentsApi } from '../api/paymentsApi';
import { PaymentHistoryList } from '../components/PaymentHistoryList';
import type { PaymentTransaction } from '../types';

// Member-facing full payment history — every subscription purchase/renewal
// and single-slot payment, with receipt downloads. Separate from the
// Subscription page so members can find past payments without wading
// through the purchase/renew UI.
export const PaymentHistoryPage = () => {
  const [payments, setPayments] = useState<PaymentTransaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const history = await paymentsApi.getHistory();
        setPayments(history.results);
      } catch (err) {
        setError(extractErrorMessage(err, 'Could not load your payment history.'));
      }
    };
    void load();
  }, []);

  return (
    <div className="max-w-2xl">
      <h2 className="font-serif text-2xl text-[#2B241E] mb-2">Payment History</h2>
      <p className="text-[#786A58] text-sm mb-8">Every subscription and single-slot payment you've made.</p>

      <FormError message={error} />

      {payments === null ? (
        <p className="text-sm text-[#786A58]">Loading…</p>
      ) : (
        <PaymentHistoryList payments={payments} />
      )}
    </div>
  );
};
