import { apiClient } from '@/shared/lib/apiClient';
import type { ApiSuccess } from '@/shared/types/api';
import type {
  CreateLeavePayload,
  Leave,
  PaginatedResponse,
  ResyncResult,
  Slot,
  SlotGenerationSettings,
  TimetableConfig,
  TimetableConfigUpdatePayload,
  Weekday,
} from '../types';

export type SlotListParams = {
  date_from?: string;
  date_to?: string;
  page?: number;
};

export type LeaveListParams = {
  page?: number;
};

// Thin wrapper around the timetable endpoints (backend/apps/classes_app).
// Unwraps the { success, data, message } envelope so callers work with
// plain payloads.
export const classesApi = {
  getTimetable: async (): Promise<TimetableConfig[]> => {
    const { data } = await apiClient.get<ApiSuccess<TimetableConfig[]>>('/classes/timetable/');
    return data.data;
  },

  updateTimetableDay: async (weekday: Weekday, payload: TimetableConfigUpdatePayload): Promise<TimetableConfig> => {
    const { data } = await apiClient.patch<ApiSuccess<TimetableConfig>>(`/classes/timetable/${weekday}/`, payload);
    return data.data;
  },

  getHorizonSettings: async (): Promise<SlotGenerationSettings> => {
    const { data } = await apiClient.get<ApiSuccess<SlotGenerationSettings>>('/classes/timetable/settings/horizon/');
    return data.data;
  },

  updateHorizon: async (horizonDays: number): Promise<{ horizon_days: number; slots_created: number }> => {
    const { data } = await apiClient.put<ApiSuccess<{ horizon_days: number; slots_created: number }>>(
      '/classes/timetable/settings/horizon/',
      { horizon_days: horizonDays },
    );
    return data.data;
  },

  resyncSlots: async (): Promise<ResyncResult> => {
    const { data } = await apiClient.post<ApiSuccess<ResyncResult>>('/classes/timetable/resync/');
    return data.data;
  },

  getSlots: async (params: SlotListParams = {}): Promise<PaginatedResponse<Slot>> => {
    const { data } = await apiClient.get<PaginatedResponse<Slot>>('/classes/slots/', { params });
    return data;
  },

  getLeaves: async (params: LeaveListParams = {}): Promise<PaginatedResponse<Leave>> => {
    const { data } = await apiClient.get<PaginatedResponse<Leave>>('/classes/leaves/', { params });
    return data;
  },

  addLeave: async (payload: CreateLeavePayload): Promise<Leave> => {
    const { data } = await apiClient.post<ApiSuccess<Leave>>('/classes/leaves/', payload);
    return data.data;
  },

  deleteLeave: async (id: number): Promise<void> => {
    await apiClient.delete(`/classes/leaves/${id}/`);
  },
};
