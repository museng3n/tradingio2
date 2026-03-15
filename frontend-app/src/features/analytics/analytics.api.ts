import { apiClient } from '@/lib/api/client';

export interface AnalyticsSummaryResponse {
  totalPositions: number;
  openPositions: number;
  closedPositions: number;
  winnerCount: number;
  loserCount: number;
  winRate: number;
  totalProfit: number;
  todayProfit: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  maxDrawdownPercent: number | null;
  maxDrawdownAmount: number | null;
  avgHoldDurationMs: number | null;
  currentStreak: number;
  bestStreak: number;
  avgRiskReward: number | null;
  avgRiskRewardEligibleRowCount: number;
  avgRiskRewardExcludedRowCount: number;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummaryResponse> {
  return apiClient.get<AnalyticsSummaryResponse>('/analytics/summary');
}
