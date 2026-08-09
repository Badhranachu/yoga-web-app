import { apiClient } from '@/shared/lib/apiClient';
import type {
  ApiSuccess,
  AuthTokens,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RequestEmailChangePayload,
  ResetPasswordPayload,
  User,
  VerifyEmailChangePayload,
} from '../types';

// Thin wrapper around the accounts endpoints (backend/apps/accounts).
// Unwraps the { success, data, message } envelope so callers work with
// plain payloads.
export const authApi = {
  register: async (payload: RegisterPayload): Promise<User> => {
    const { data } = await apiClient.post<ApiSuccess<User>>('/auth/register/', payload);
    return data.data;
  },

  requestRegistrationOtp: async (email: string): Promise<void> => {
    await apiClient.post('/auth/registration-otp/request/', { email });
  },

  verifyRegistrationOtp: async (email: string, otpCode: string): Promise<void> => {
    await apiClient.post('/auth/registration-otp/verify/', { email, otp_code: otpCode });
  },

  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await apiClient.post<ApiSuccess<LoginResponse>>('/auth/login/', payload);
    return data.data;
  },

  refresh: async (refreshToken: string): Promise<AuthTokens> => {
    const { data } = await apiClient.post<ApiSuccess<AuthTokens>>('/auth/refresh/', { refresh: refreshToken });
    return data.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout/', { refresh: refreshToken });
  },

  getProfile: async (): Promise<User> => {
    const { data } = await apiClient.get<ApiSuccess<User>>('/auth/profile/');
    return data.data;
  },

  updateProfile: async (
    payload: Partial<Pick<User, 'first_name' | 'last_name' | 'phone_number' | 'address' | 'age'>>,
  ): Promise<User> => {
    const { data } = await apiClient.patch<ApiSuccess<User>>('/auth/profile/', payload);
    return data.data;
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await apiClient.post('/auth/change-password/', payload);
  },

  requestEmailChange: async (payload: RequestEmailChangePayload): Promise<void> => {
    await apiClient.post('/auth/change-email/request/', payload);
  },

  verifyEmailChange: async (payload: VerifyEmailChangePayload): Promise<User> => {
    const { data } = await apiClient.post<ApiSuccess<User>>('/auth/change-email/verify/', payload);
    return data.data;
  },

  forgotPassword: async (payload: ForgotPasswordPayload): Promise<void> => {
    await apiClient.post('/auth/forgot-password/', payload);
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<void> => {
    await apiClient.post('/auth/reset-password/', payload);
  },
};
