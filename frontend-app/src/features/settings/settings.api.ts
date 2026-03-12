import { apiClient } from '@/lib/api/client';

export interface SettingsResponse {
  success?: boolean;
  data?: Record<string, unknown>;
}

export async function getSettings(): Promise<SettingsResponse> {
  return apiClient.get<SettingsResponse>('/settings');
}
