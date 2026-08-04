import type { AuthTokens, User } from '../types';

// Stored in sessionStorage so each browser tab keeps its own auth session.
// That allows an admin tab and a member tab to stay signed in separately in
// the same browser, while still surviving refreshes inside that tab.
const ACCESS_KEY = 'ekam.auth.access';
const REFRESH_KEY = 'ekam.auth.refresh';
const USER_KEY = 'ekam.auth.user';

export const tokenStorage = {
  getAccessToken: (): string | null => sessionStorage.getItem(ACCESS_KEY),
  getRefreshToken: (): string | null => sessionStorage.getItem(REFRESH_KEY),

  getUser: (): User | null => {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  setSession: (tokens: AuthTokens, user: User): void => {
    sessionStorage.setItem(ACCESS_KEY, tokens.access);
    sessionStorage.setItem(REFRESH_KEY, tokens.refresh);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  setAccessToken: (accessToken: string): void => {
    sessionStorage.setItem(ACCESS_KEY, accessToken);
  },

  clear: (): void => {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(USER_KEY);
  },
};
