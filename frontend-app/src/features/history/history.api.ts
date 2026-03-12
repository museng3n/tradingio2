import { apiClient } from '@/lib/api/client';

export interface HistoryResponse {
  success?: boolean;
  data?: unknown[];
}

export async function getTradeHistory(): Promise<HistoryResponse> {
  return apiClient.get<HistoryResponse>('/history/trades');
}
