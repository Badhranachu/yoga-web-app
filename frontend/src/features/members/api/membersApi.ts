import { apiClient } from '@/shared/lib/apiClient';
import type { ApiSuccess } from '@/shared/types/api';
import type { CreateMemberPayload, UpdateMemberPayload, UserProfile } from '../types';

export const membersApi = {
  list: async (): Promise<UserProfile[]> => {
    const { data } = await apiClient.get<ApiSuccess<UserProfile[]>>('/members/');
    return data.data;
  },
  create: async (payload: CreateMemberPayload): Promise<UserProfile> => {
    const { data } = await apiClient.post<ApiSuccess<UserProfile>>('/members/', payload);
    return data.data;
  },
  update: async (id: number, payload: UpdateMemberPayload): Promise<UserProfile> => {
    const { data } = await apiClient.patch<ApiSuccess<UserProfile>>(`/members/${id}/`, payload);
    return data.data;
  },
  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/members/${id}/`);
  },
};
