import { isAxiosError } from 'axios';
import { apiClient } from '@/shared/lib/apiClient';
import type { ApiError, ApiSuccess } from '@/shared/types/api';
import type { PaginatedResponse, Slot } from '@/features/classes/types';
import type {
  Booking,
  BookingChangeRequest,
  BookingConflictData,
  CreateBookingPayload,
  InstructorBooking,
  InstructorStats,
} from '../types';

export type BookingListParams = {
  page?: number;
};

export type EffectiveBookingStatus = 'booked' | 'attended' | 'expired';

export type BookingHistoryParams = {
  page?: number;
  status?: EffectiveBookingStatus;
  date_from?: string;
  date_to?: string;
};

export type BookingChangeRequestPayload = {
  booking_id: number;
  slot_id: number;
};

export const getSuggestedSlotFromConflict = (error: unknown): Slot | null => {
  if (!isAxiosError<ApiError<BookingConflictData>>(error) || error.response?.status !== 409) {
    return null;
  }

  return error.response.data.data?.suggested_slot ?? null;
};

// Thin wrapper around the booking endpoints (backend/apps/bookings).
// Unwraps the { success, data, message } envelope so callers work with
// plain payloads.
export const bookingsApi = {
  createBooking: async (payload: CreateBookingPayload): Promise<Booking> => {
    const { data } = await apiClient.post<ApiSuccess<Booking>>('/bookings/', payload);
    return data.data;
  },

  getMyBookings: async (params: BookingListParams = {}): Promise<PaginatedResponse<Booking>> => {
    const { data } = await apiClient.get<PaginatedResponse<Booking>>('/bookings/me/', { params });
    return data;
  },

  getMyBookingHistory: async (params: BookingHistoryParams = {}): Promise<PaginatedResponse<Booking>> => {
    const { data } = await apiClient.get<PaginatedResponse<Booking>>('/bookings/me/history/', { params });
    return data;
  },

  getAllBookings: async (params: BookingListParams = {}): Promise<PaginatedResponse<Booking>> => {
    const { data } = await apiClient.get<PaginatedResponse<Booking>>('/bookings/admin/', { params });
    return data;
  },

  getInstructorBookings: async (params: BookingListParams = {}): Promise<PaginatedResponse<InstructorBooking>> => {
    const { data } = await apiClient.get<PaginatedResponse<InstructorBooking>>('/bookings/instructor/me/', { params });
    return data;
  },

  reassignInstructor: async (id: number, instructorId: number | null): Promise<Booking> => {
    const { data } = await apiClient.post<ApiSuccess<Booking>>(`/bookings/${id}/reassign-instructor/`, {
      instructor_id: instructorId,
    });
    return data.data;
  },

  markAttended: async (id: number): Promise<Booking> => {
    const { data } = await apiClient.post<ApiSuccess<Booking>>(`/bookings/${id}/attend/`);
    return data.data;
  },

  revertAttended: async (id: number): Promise<Booking> => {
    const { data } = await apiClient.post<ApiSuccess<Booking>>(`/bookings/${id}/revert-attend/`);
    return data.data;
  },

  // Instructor self-service — only valid within a short window around the
  // slot's start time (see backend services.instructor_mark_attended).
  instructorMarkAttended: async (id: number): Promise<InstructorBooking> => {
    const { data } = await apiClient.post<ApiSuccess<InstructorBooking>>(`/bookings/${id}/instructor-attend/`);
    return data.data;
  },

  getInstructorStats: async (): Promise<InstructorStats> => {
    const { data } = await apiClient.get<ApiSuccess<InstructorStats>>('/bookings/instructor/stats/');
    return data.data;
  },

  createTransferRequest: async (payload: BookingChangeRequestPayload): Promise<BookingChangeRequest> => {
    const { data } = await apiClient.post<ApiSuccess<BookingChangeRequest>>('/bookings/transfer-requests/', payload);
    return data.data;
  },

  // Instant, member-initiated — no admin approval, unlike
  // createTransferRequest (admin-initiated, still needs the member to
  // accept it via approveChangeRequest).
  selfReschedule: async (payload: BookingChangeRequestPayload): Promise<Booking> => {
    const { data } = await apiClient.post<ApiSuccess<Booking>>('/bookings/reschedule/', payload);
    return data.data;
  },

  getMyChangeRequests: async (): Promise<PaginatedResponse<BookingChangeRequest>> => {
    const { data } = await apiClient.get<PaginatedResponse<BookingChangeRequest>>('/bookings/requests/me/');
    return data;
  },

  getAdminChangeRequests: async (): Promise<PaginatedResponse<BookingChangeRequest>> => {
    const { data } = await apiClient.get<PaginatedResponse<BookingChangeRequest>>('/bookings/requests/admin/');
    return data;
  },

  approveChangeRequest: async (id: number): Promise<BookingChangeRequest> => {
    const { data } = await apiClient.post<ApiSuccess<BookingChangeRequest>>(`/bookings/requests/${id}/approve/`);
    return data.data;
  },

  rejectChangeRequest: async (id: number, reason?: string): Promise<BookingChangeRequest> => {
    const { data } = await apiClient.post<ApiSuccess<BookingChangeRequest>>(`/bookings/requests/${id}/reject/`, { reason });
    return data.data;
  },
};
