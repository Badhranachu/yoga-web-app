import axios from 'axios';

// Single shared Axios instance for all feature API modules.
// Base URL is proxied to the Django backend in dev (see vite.config.ts) and
// should point at the real API origin via VITE_API_BASE_URL in production.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
