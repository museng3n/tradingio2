import { apiClient } from '@/lib/api/client';

export interface AnalyticsResponse {
  success?: boolean;
  data?: Record<string, unknown>;
}

export async function getPerformanceAnalytics(): Promise<AnalyticsResponse> {
  return apiClient.get<AnalyticsResponse>('/analytics/performance');
}
