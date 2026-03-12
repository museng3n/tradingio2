import { apiClient } from '@/lib/api/client';

export interface PositionsResponse {
  success?: boolean;
  data?: unknown[];
}

export async function getOpenPositions(): Promise<PositionsResponse> {
  return apiClient.get<PositionsResponse>('/positions/open');
}
