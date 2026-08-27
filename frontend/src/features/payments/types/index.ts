export type SubscriptionPlan = {
  id: number;
  monthly_price: string; // decimal as string, e.g. "1200.00"
  included_sessions: number;
  is_active: boolean;
  updated_at: string;
};

export type SubscriptionPlanUpdatePayload = Partial<
  Pick<SubscriptionPlan, 'monthly_price' | 'included_sessions' | 'is_active'>
>;

export type SubscriptionStatus = 'scheduled' | 'active' | 'expired' | 'exhausted' | 'cancelled';

export type UserSubscription = {
  id: number;
  user_email: string;
  status: SubscriptionStatus;
  sessions_included: number;
  sessions_remaining: number;
  price_paid: string;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;
  is_expired: boolean;
  has_sessions: boolean;
  created_at: string;
};

export type SlotPurchase = {
  id: number;
  price_paid: string;
  created_at: string;
};

export type PaymentType = 'subscription' | 'single_slot';
export type PaymentStatus = 'pending' | 'successful' | 'failed' | 'refunded';

export type Receipt = {
  id: number;
  receipt_number: string;
  user_name: string;
  user_email: string;
  payment_type: PaymentType;
  amount: string;
  currency: string;
  payment_date: string;
  status: PaymentStatus;
};

export type PaymentTransaction = {
  id: number;
  transaction_id: string;
  provider: string;
  provider_transaction_id: string;
  user_email: string;
  payment_type: PaymentType;
  amount: string;
  currency: string;
  status: PaymentStatus;
  subscription_id: number | null;
  slot_purchase_id: number | null;
  receipt: Receipt;
  created_at: string;
};

export type PaymentActionResponse = {
  subscription?: UserSubscription;
  purchase?: SlotPurchase;
  payment: PaymentTransaction;
};

export type RevenueSummary = {
  currency: string;
  total_revenue: string;
  transaction_count: number;
  by_type: Record<PaymentType, { total: string; count: number }>;
};

export type SingleSlotPrice = {
  single_slot_price: number;
};

export type PaymentOrder = {
  order_id: string;
  amount: number; // paise
  currency: string;
  key_id: string;
  payment_type: PaymentType;
};

export type VerifyPaymentAction = 'purchase' | 'renew' | 'slot';

export type VerifyPaymentPayload = {
  action: VerifyPaymentAction;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  start_date?: string | null; // "YYYY-MM-DD" — required for 'renew', optional for 'purchase'
};

export type PublicPricing = {
  monthly_price: string | null;
  included_sessions: number | null;
  single_slot_price: string;
  currency: string;
};

export type SubscriptionStartDateOptions = {
  action: 'purchase' | 'renew';
  current_subscription_end_date: string | null; // "YYYY-MM-DD", set only when action === 'renew'
  earliest: string; // "YYYY-MM-DD"
  latest: string; // "YYYY-MM-DD"
};
