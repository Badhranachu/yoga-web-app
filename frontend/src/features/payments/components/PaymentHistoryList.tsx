import { paymentsApi } from '../api/paymentsApi';
import type { PaymentTransaction } from '../types';

export type PaymentHistoryListProps = {
  payments: PaymentTransaction[];
};

// Shared payment history list — used on the Subscription page (as a
// summary) and the dedicated Payment History page (as the full record).
export const PaymentHistoryList = ({ payments }: PaymentHistoryListProps) => {
  if (payments.length === 0) {
    return <p className="text-sm text-[#786A58]">No payments yet.</p>;
  }

  return (
    <div className="space-y-2">
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="flex items-center justify-between gap-4 rounded-xl border border-[#2B241E]/10 px-4 py-3 text-sm"
        >
          <div>
            <div className="text-[#2B241E]">{payment.receipt.receipt_number}</div>
            <div className="text-[#786A58]">
              {payment.payment_type === 'subscription' ? 'Monthly Subscription' : 'Single Slot'} · {payment.amount}{' '}
              {payment.currency}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void paymentsApi.downloadReceipt(payment.receipt.id)}
            className="text-xs uppercase tracking-widest text-[#786A58] hover:text-[#D8B46A]"
          >
            Receipt
          </button>
        </div>
      ))}
    </div>
  );
};
