import { apiClient } from '@/shared/lib/apiClient';
import type { ApiSuccess } from '@/shared/types/api';
import type { PaginatedResponse } from '@/features/classes/types';
import type { CreateInstructorPayload, InstructorProfile } from '../types';
import type { CreateInstructorLeavePayload, InstructorLeave } from '../types/leave';

export const instructorsApi = {
  list: async (): Promise<InstructorProfile[]> => {
    const { data } = await apiClient.get<ApiSuccess<InstructorProfile[]>>('/instructors/');
    return data.data;
  },
  create: async (payload: CreateInstructorPayload): Promise<InstructorProfile> => {
    const { data } = await apiClient.post<ApiSuccess<InstructorProfile>>('/instructors/', payload);
    return data.data;
  },

  getLeaves: async (): Promise<PaginatedResponse<InstructorLeave>> => {
    const { data } = await apiClient.get<PaginatedResponse<InstructorLeave>>('/instructors/leaves/');
    return data;
  },

  addLeave: async (payload: CreateInstructorLeavePayload): Promise<InstructorLeave> => {
    const { data } = await apiClient.post<ApiSuccess<InstructorLeave>>('/instructors/leaves/', payload);
    return data.data;
  },

  deleteLeave: async (id: number): Promise<void> => {
    await apiClient.delete(`/instructors/leaves/${id}/`);
  },
};
