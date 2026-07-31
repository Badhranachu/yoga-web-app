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
  updated_at: string;
};

export type TimetableConfigUpdatePayload = Partial<
  Pick<TimetableConfig, 'is_open' | 'start_time' | 'end_time' | 'slot_duration_minutes'>
>;

export type Slot = {
  id: number;
  date: string; // "YYYY-MM-DD"
  start_time: string;
  end_time: string;
  weekday: Weekday;
  weekday_display: string;
  is_booked: boolean;
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
