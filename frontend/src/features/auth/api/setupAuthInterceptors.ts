import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '@/shared/lib/apiClient';
import { authApi } from './authApi';
import { tokenStorage } from '../lib/tokenStorage';

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available.');
  }
  const { access } = await authApi.refresh(refreshToken);
  tokenStorage.setAccessToken(access);
  return access;
}

/**
 * Wires the shared axios instance for authenticated requests:
 *  - attaches the current access token to every outgoing request
 *  - on a 401, transparently refreshes the access token once and retries
 *    the original request; concurrent 401s share a single refresh call
 *  - if the refresh itself fails, clears the session and delegates to
 *    onSessionExpired (AuthContext) so the app can redirect to /login
 *
 * Called once at app startup (see app/App.tsx). Kept in the auth feature,
 * not shared/lib, so the generic apiClient stays auth-agnostic.
 */
export function setupAuthInterceptors(onSessionExpired: () => void): void {
  apiClient.interceptors.request.use((config) => {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      config.headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RetriableRequestConfig | undefined;
      const isAuthEndpoint = originalRequest?.url?.includes('/auth/login/') || originalRequest?.url?.includes('/auth/refresh/');

      if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || isAuthEndpoint) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        refreshInFlight ??= refreshAccessToken().finally(() => {
          refreshInFlight = null;
        });
        const newAccessToken = await refreshInFlight;
        originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
        return apiClient(originalRequest);
      } catch (refreshError) {
        tokenStorage.clear();
        onSessionExpired();
        return Promise.reject(refreshError);
      }
    },
  );
}
