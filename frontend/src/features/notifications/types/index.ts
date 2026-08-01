export type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'transfer_request'
  | 'transfer_approved'
  | 'transfer_rejected'
  | 'reschedule_request'
  | 'reschedule_approved'
  | 'reschedule_rejected'
  | 'subscription_purchased'
  | 'subscription_renewed'
  | 'subscription_expired'
  | 'payment_successful';

export type Notification = {
  id: number;
  notification_type: NotificationType;
  notification_type_label: string;
  channel: 'in_app';
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  related_type: string;
  related_id: string;
  action_url: string;
  created_at: string;
};
