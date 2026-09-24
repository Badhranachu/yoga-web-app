import { apiClient } from '@/shared/lib/apiClient';
import type { ApiSuccess } from '@/shared/types/api';
import type { AdminAccount, CreateAdminPayload, UpdateAdminPayload } from '../types/admin';

export const adminsApi = {
  list: async (): Promise<AdminAccount[]> => {
    const { data } = await apiClient.get<ApiSuccess<AdminAccount[]>>('/auth/admins/');
    return data.data;
  },
  create: async (payload: CreateAdminPayload): Promise<AdminAccount> => {
    const { data } = await apiClient.post<ApiSuccess<AdminAccount>>('/auth/admins/', payload);
    return data.data;
  },
  update: async (id: number, payload: UpdateAdminPayload): Promise<AdminAccount> => {
    const { data } = await apiClient.patch<ApiSuccess<AdminAccount>>(`/auth/admins/${id}/`, payload);
    return data.data;
  },
  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/auth/admins/${id}/`);
  },
};
