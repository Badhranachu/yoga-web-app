import { isAxiosError } from 'axios';
import type { ApiError } from '@/shared/types/api';

// Flattens the backend's error envelope (apps.core.exceptions) into a single
// human-readable string, for any feature's form-error banner.
export function extractErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!isAxiosError(error)) return fallback;

  const data = error.response?.data as ApiError | undefined;
  if (!data?.errors) return fallback;

  if (typeof data.errors === 'string') return data.errors;

  const messages = Object.values(data.errors).flat();
  return messages.length > 0 ? messages.join(' ') : fallback;
}
