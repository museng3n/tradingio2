import { apiClient } from '@/lib/api/client';

export interface DashboardStats {
  positions: {
    open: number;
    closed: number;
    total: number;
  };
  signals: {
    total: number;
    active: number;
  };
  performance: {
    totalProfit: number;
    todayProfit: number;
    winRate: number;
    wonTrades: number;
    lostTrades: number;
  };
  account: {
    balance: number;
    equity: number;
    margin: number;
    freeMargin: number;
  };
}

export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
}

export async function getDashboardStats(): Promise<DashboardStatsResponse> {
  return apiClient.get<DashboardStatsResponse>('/dashboard/stats');
}
