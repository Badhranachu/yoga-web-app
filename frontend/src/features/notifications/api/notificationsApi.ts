import { apiClient } from '@/shared/lib/apiClient';
import type { ApiSuccess } from '@/shared/types/api';
import type { PaginatedResponse } from '@/features/classes/types';
import type { Notification } from '../types';

export const notificationsApi = {
  getNotifications: async (unread = false): Promise<PaginatedResponse<Notification>> => {
    const { data } = await apiClient.get<PaginatedResponse<Notification>>('/notifications/', {
      params: unread ? { unread: true } : undefined,
    });
    return data;
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get<ApiSuccess<{ unread_count: number }>>('/notifications/unread-count/');
    return data.data.unread_count;
  },

  markRead: async (id: number): Promise<Notification> => {
    const { data } = await apiClient.post<ApiSuccess<Notification>>(`/notifications/${id}/read/`);
    return data.data;
  },

  markAllRead: async (): Promise<number> => {
    const { data } = await apiClient.post<ApiSuccess<{ marked_read: number }>>('/notifications/mark-all-read/');
    return data.data.marked_read;
  },
};
