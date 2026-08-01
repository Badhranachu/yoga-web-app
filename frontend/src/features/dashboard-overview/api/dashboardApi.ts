import { apiClient } from '@/shared/lib/apiClient';
import type { ApiSuccess } from '@/shared/types/api';
import type { DashboardOverview } from '../types';

export const dashboardApi = {
  getOverview: async (): Promise<DashboardOverview> => {
    const { data } = await apiClient.get<ApiSuccess<DashboardOverview>>('/dashboard/overview/');
    return data.data;
  },
};
