export type InstructorLeave = {
  id: number;
  instructor: number;
  instructor_name: string;
  instructor_email: string;
  date: string; // "YYYY-MM-DD"
  slot_ids: number[];
  is_full_day: boolean;
  reason: string;
  created_by_email: string | null;
  is_past: boolean;
  created_at: string;
};

export type CreateInstructorLeavePayload = {
  instructor: number;
  date: string;
  slot_ids?: number[];
  reason?: string;
};
