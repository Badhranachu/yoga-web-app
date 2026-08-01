export type DashboardMetric = {
  todays_bookings: number;
  todays_revenue: string;
  monthly_revenue: string;
  total_revenue: string;
  registered_users: number;
  active_subscriptions: number;
  expired_subscriptions: number;
  booked_slots: number;
  available_slots: number;
  transfer_requests: number;
  upcoming_leaves: number;
};

export type TrendPoint = { date: string; label: string; value: string | number };

export type DashboardPayment = {
  transaction_id: string;
  user_email: string;
  payment_type: string;
  amount: string;
  currency: string;
  status: string;
  receipt_number: string | null;
  created_at: string;
};

export type DashboardBooking = {
  id: number;
  user_email: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
};

export type DashboardOverview = {
  metrics: DashboardMetric;
  recent_payments: DashboardPayment[];
  recent_bookings: DashboardBooking[];
  trends: { revenue: TrendPoint[]; bookings: TrendPoint[]; subscriptions: TrendPoint[] };
};
