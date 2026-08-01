import type { Slot } from '@/features/classes/types';

export type BookingStatus = 'booked' | 'cancelled' | 'attended';

export type Booking = {
  id: number;
  slot: Slot;
  user_email: string;
  status: BookingStatus;
  cancelled_at: string | null;
  attended_at: string | null;
  created_at: string;
};

export type CreateBookingPayload = {
  slot_id: number;
};

export type BookingConflictData = {
  suggested_slot: Slot | null;
};

export type BookingChangeRequestType = 'transfer' | 'reschedule';
export type BookingChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export type BookingChangeRequest = {
  id: number;
  request_type: BookingChangeRequestType;
  status: BookingChangeRequestStatus;
  booking: Booking;
  requested_by_email: string;
  reviewed_by_email: string | null;
  current_slot: Slot | null;
  requested_slot: Slot | null;
  current_date: string;
  current_start_time: string;
  current_end_time: string;
  requested_date: string;
  requested_start_time: string;
  requested_end_time: string;
  decision_reason: string;
  notification_sent_at: string | null;
  created_at: string;
  reviewed_at: string | null;
};
