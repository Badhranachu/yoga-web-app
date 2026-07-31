export type { ApiSuccess, ApiError } from '@/shared/types/api';

export type UserRole = 'admin' | 'user';

export type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = AuthTokens & {
  user: User;
};

export type RegisterPayload = {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  token: string;
  new_password: string;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
};

