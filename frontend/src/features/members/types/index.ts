export type UserProfile = {
  id: number;
  username: string | null;
  email: string;
  role: string;
  created_at: string;
};

export type CreateMemberPayload = {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
};
