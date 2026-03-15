import { apiClient } from '@/lib/api/client';

export interface AnalyticsSummaryResponse {
  totalPositions: number;
  openPositions: number;
  closedPositions: number;
  winnerCount: number;
  loserCount: number;
  winRate: number;
  totalProfit: number;
  totalWinningProfit: number;
  totalLosingProfit: number;
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

export type TPStatisticsGranularity = 'daily' | 'weekly' | 'monthly';

export interface TPStatisticsLevelSummary {
  level: number;
  label: string;
  configuredClosedPositionCount: number;
  hitCount: number;
  hitRatePercent: number | null;
  totalHitPips: number | null;
  averageHitPips: number | null;
  pipsCoverageCount: number;
  pipsCoverageStatus: 'full' | 'partial' | 'none';
  unverifiedSymbols?: string[];
}

export interface TPStatisticsSeriesPoint {
  bucketStart: string;
  bucketLabel: string;
  configuredClosedPositionCount: number;
  hitCount: number;
  totalHitPips: number | null;
  pipsCoverageCount: number;
  pipsCoverageStatus: 'full' | 'partial' | 'none';
  unverifiedSymbols?: string[];
}

export interface TPStatisticsSeries {
  level: number;
  label: string;
  points: TPStatisticsSeriesPoint[];
}

export interface TPStatisticsResponse {
  supportedLevels: number[];
  summaryCardLevels: number[];
  granularity: TPStatisticsGranularity;
  historyStartAt: string | null;
  hasSufficientHistory: boolean;
  insufficientHistoryReason: 'no_tp_hit_history' | 'sparse_history' | null;
  levelSummaries: TPStatisticsLevelSummary[];
  series: TPStatisticsSeries[];
  unverifiedSymbolsInScope?: string[];
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummaryResponse> {
  return apiClient.get<AnalyticsSummaryResponse>('/analytics/summary');
}

export async function getTPStatistics(
  granularity: TPStatisticsGranularity
): Promise<TPStatisticsResponse> {
  return apiClient.get<TPStatisticsResponse>(
    `/analytics/tp-statistics?granularity=${granularity}`
  );
}
