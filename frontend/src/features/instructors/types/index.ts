export type InstructorProfile = {
  id: number;
  username: string | null;
  email: string;
  age: number | null;
  role: string;
  created_at: string;
};

export type CreateInstructorPayload = {
  username: string;
  email: string;
  age?: number | null;
  password: string;
  password_confirm: string;
};
