import { apiClient } from '@/lib/api/client';

export interface DashboardStatsResponse {
  success?: boolean;
  data?: Record<string, unknown>;
}

export async function getDashboardStats(): Promise<DashboardStatsResponse> {
  return apiClient.get<DashboardStatsResponse>('/dashboard/stats');
}
