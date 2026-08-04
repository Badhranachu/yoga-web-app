export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Monday',
  1: 'Tuesday',
  2: 'Wednesday',
  3: 'Thursday',
  4: 'Friday',
  5: 'Saturday',
  6: 'Sunday',
};

export type TimetableConfig = {
  id: number;
  weekday: Weekday;
  weekday_display: string;
  is_open: boolean;
  start_time: string; // "HH:MM:SS"
  end_time: string;
  slot_duration_minutes: number;
  break_start_time: string | null;
  break_end_time: string | null;
  updated_at: string;
};

export type TimetableConfigUpdatePayload = Partial<
  Pick<
    TimetableConfig,
    'is_open' | 'start_time' | 'end_time' | 'slot_duration_minutes' | 'break_start_time' | 'break_end_time'
  >
>;

export type SlotAvailability = 'available' | 'unavailable' | 'booked' | 'leave_conflict';

export type Slot = {
  id: number;
  date: string; // "YYYY-MM-DD"
  start_time: string;
  end_time: string;
  weekday: Weekday;
  weekday_display: string;
  is_booked: boolean;
  availability: SlotAvailability;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type SlotGenerationSettings = {
  horizon_days: number;
};

export type ResyncResult = {
  deleted: number;
  created: number;
};

export type Leave = {
  id: number;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;
  reason: string;
  created_by_email: string | null;
  is_past: boolean;
  created_at: string;
};

export type CreateLeavePayload = {
  start_date: string;
  end_date: string;
  reason?: string;
};
