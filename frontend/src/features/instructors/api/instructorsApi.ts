import { apiClient } from '@/shared/lib/apiClient';
import type { ApiSuccess } from '@/shared/types/api';
import type { PaginatedResponse } from '@/features/classes/types';
import type { CreateInstructorPayload, InstructorProfile, PublicInstructor, UpdateInstructorPayload } from '../types';
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

  // Multipart so a photo file can travel alongside the toggle in one request.
  update: async (id: number, payload: UpdateInstructorPayload): Promise<InstructorProfile> => {
    const formData = new FormData();
    if (payload.username !== undefined) formData.append('username', payload.username);
    if (payload.email !== undefined) formData.append('email', payload.email);
    if (payload.age !== undefined && payload.age !== null) formData.append('age', String(payload.age));
    if (payload.password) formData.append('password', payload.password);
    if (payload.photo) formData.append('photo', payload.photo);
    if (payload.bio !== undefined) formData.append('bio', payload.bio);
    if (payload.show_on_homepage !== undefined) formData.append('show_on_homepage', String(payload.show_on_homepage));
    const { data } = await apiClient.patch<ApiSuccess<InstructorProfile>>(`/instructors/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  listPublic: async (): Promise<PublicInstructor[]> => {
    const { data } = await apiClient.get<ApiSuccess<PublicInstructor[]>>('/instructors/public/');
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
