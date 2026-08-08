import { apiClient } from '@/shared/lib/apiClient';
import type { ApiSuccess } from '@/shared/types/api';
import type { AdminAccount, CreateAdminPayload } from '../types/admin';

export const adminsApi = {
  list: async (): Promise<AdminAccount[]> => {
    const { data } = await apiClient.get<ApiSuccess<AdminAccount[]>>('/auth/admins/');
    return data.data;
  },
  create: async (payload: CreateAdminPayload): Promise<AdminAccount> => {
    const { data } = await apiClient.post<ApiSuccess<AdminAccount>>('/auth/admins/', payload);
    return data.data;
  },
};
