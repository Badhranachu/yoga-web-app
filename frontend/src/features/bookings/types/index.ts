import type { Slot } from '@/features/classes/types';

export type BookingStatus = 'booked' | 'attended';

export type Booking = {
  id: number;
  slot: Slot;
  user_email: string;
  status: BookingStatus;
  attended_at: string | null;
  created_at: string;
  instructor_id: number | null;
  instructor_name: string | null;
};

// Assigned to the requesting instructor — includes customer contact
// details, unlike the plain member-facing Booking type.
export type InstructorBooking = {
  id: number;
  slot: Slot;
  status: BookingStatus;
  attended_at: string | null;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
};

export type CreateBookingPayload = {
  slot_id: number;
};

export type BookingConflictData = {
  suggested_slot: Slot | null;
};

export type InstructorStatBucket = {
  today: number;
  month: number;
  total: number;
};

export type InstructorStats = {
  hours_worked: InstructorStatBucket;
  attended: InstructorStatBucket;
  expired_unattempted: InstructorStatBucket;
  classes_today_total: number;
  classes_month_total: number;
  upcoming_count: number;
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
