import { apiClient } from '@/lib/api/client';

export interface SecuredHistoryItem {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  securedAt: number;
  timeSecured: string;
  pipsToBE: number | null;
  reason: 'TP1_HIT';
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
}

export interface SecuredHistoryResponse {
  total: number;
  page: number;
  pages: number;
  positions: SecuredHistoryItem[];
}

export async function getSecuredSignalsHistory(): Promise<SecuredHistoryResponse> {
  return apiClient.get<SecuredHistoryResponse>('/positions/history');
}
