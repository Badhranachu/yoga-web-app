import type { AuthTokens, User } from '../types';

// Persisted in localStorage so a page refresh or new tab keeps the session
// alive (rule: persistent login). Centralized here so nothing else in the
// app touches localStorage directly for auth state.
const ACCESS_KEY = 'ekam.auth.access';
const REFRESH_KEY = 'ekam.auth.refresh';
const USER_KEY = 'ekam.auth.user';

export const tokenStorage = {
  getAccessToken: (): string | null => localStorage.getItem(ACCESS_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_KEY),

  getUser: (): User | null => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  setSession: (tokens: AuthTokens, user: User): void => {
    localStorage.setItem(ACCESS_KEY, tokens.access);
    localStorage.setItem(REFRESH_KEY, tokens.refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  setAccessToken: (accessToken: string): void => {
    localStorage.setItem(ACCESS_KEY, accessToken);
  },

  clear: (): void => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
