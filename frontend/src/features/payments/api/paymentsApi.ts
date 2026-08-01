import { apiClient } from '@/shared/lib/apiClient';
import type { ApiSuccess } from '@/shared/types/api';
import type {
  PaymentActionResponse,
  PaymentTransaction,
  RevenueSummary,
  SingleSlotPrice,
  SubscriptionPlan,
  SubscriptionPlanUpdatePayload,
  UserSubscription,
} from '../types';
import type { PaginatedResponse } from '@/features/classes/types';

// Thin wrapper around the subscription endpoints (backend/apps/payments).
// Unwraps the { success, data, message } envelope so callers work with
// plain payloads.
export const paymentsApi = {
  getPlan: async (): Promise<SubscriptionPlan | null> => {
    const { data } = await apiClient.get<ApiSuccess<SubscriptionPlan | null>>('/payments/subscription-plan/');
    return data.data;
  },

  updatePlan: async (payload: SubscriptionPlanUpdatePayload): Promise<SubscriptionPlan> => {
    const { data } = await apiClient.patch<ApiSuccess<SubscriptionPlan>>('/payments/subscription-plan/', payload);
    return data.data;
  },

  getSingleSlotPrice: async (): Promise<SingleSlotPrice> => {
    const { data } = await apiClient.get<ApiSuccess<SingleSlotPrice>>('/payments/settings/single-slot-price/');
    return data.data;
  },

  updateSingleSlotPrice: async (price: number): Promise<SingleSlotPrice> => {
    const { data } = await apiClient.put<ApiSuccess<SingleSlotPrice>>('/payments/settings/single-slot-price/', {
      single_slot_price: price,
    });
    return data.data;
  },

  getMySubscription: async (): Promise<UserSubscription | null> => {
    const { data } = await apiClient.get<ApiSuccess<UserSubscription | null>>('/payments/subscriptions/me/');
    return data.data;
  },

  purchaseSubscription: async (): Promise<PaymentActionResponse> => {
    const { data } = await apiClient.post<ApiSuccess<PaymentActionResponse>>('/payments/subscriptions/purchase/');
    return data.data;
  },

  renewSubscription: async (): Promise<PaymentActionResponse> => {
    const { data } = await apiClient.post<ApiSuccess<PaymentActionResponse>>('/payments/subscriptions/renew/');
    return data.data;
  },

  payPerSlot: async (): Promise<PaymentActionResponse> => {
    const { data } = await apiClient.post<ApiSuccess<PaymentActionResponse>>('/payments/slot-purchases/');
    return data.data;
  },

  getHistory: async (): Promise<PaginatedResponse<PaymentTransaction>> => {
    const { data } = await apiClient.get<PaginatedResponse<PaymentTransaction>>('/payments/history/');
    return data;
  },

  getRevenue: async (): Promise<RevenueSummary> => {
    const { data } = await apiClient.get<ApiSuccess<RevenueSummary>>('/payments/revenue/');
    return data.data;
  },

  downloadReceipt: async (receiptId: number): Promise<void> => {
    const response = await apiClient.get(`/payments/receipts/${receiptId}/download/`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `receipt-${receiptId}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  },
};
