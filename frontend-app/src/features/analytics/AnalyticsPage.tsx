import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { JSX } from 'react';
import { useAppShellStore } from '@/features/auth/auth.store';
import {
  getAnalyticsSummary,
  getTPStatistics,
  type TPStatisticsGranularity,
  type TPStatisticsLevelSummary,
  type TPStatisticsResponse,
  type TPStatisticsSeries,
  type TPStatisticsSeriesPoint,
} from '@/features/analytics/analytics.api';

type TpFilterKey = 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5' | 'tp6';

const TP_LEVEL_FILTERS: Record<number, TpFilterKey> = {
  1: 'tp1',
  2: 'tp2',
  3: 'tp3',
  4: 'tp4',
  5: 'tp5',
  6: 'tp6',
};

const TP_LEVEL_COLORS: Record<number, string> = {
  1: '#3b82f6',
  2: '#10b981',
  3: '#f59e0b',
  4: '#8b5cf6',
  5: '#ef4444',
  6: '#06b6d4',
};

const TP_GRANULARITY_OPTIONS: Array<{
  value: TPStatisticsGranularity;
  label: string;
}> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const TP_CHART_WIDTH = 720;
const TP_CHART_HEIGHT = 300;
const TP_CHART_PADDING = {
  top: 20,
  right: 20,
  bottom: 36,
  left: 44,
};

const formatTradeCount = (value: number | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? String(value) : '-';

const formatWinLossSummary = (winnerCount: number | undefined, loserCount: number | undefined): string =>
  typeof winnerCount === 'number' && Number.isFinite(winnerCount) && typeof loserCount === 'number' && Number.isFinite(loserCount)
    ? `${winnerCount}W / ${loserCount}L`
    : '-W / -L';

const formatPercentage = (value: number | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : '-';

const formatNullablePercentage = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : 'N/A';

const formatRatio = (value: number | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '-';

const formatSignedCurrency = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'N/A';
  }

  const sign = value >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
};

const formatRiskReward = (value: number | null | undefined): string => {
  if (value === null) {
    return 'N/A';
  }

  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '-';
};

const formatHoldDuration = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'N/A';
  }

  const totalMinutes = Math.round(value / 60000);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  if (totalMinutes < 1440) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  return `${days}d ${hours}h`;
};

const formatNullablePips = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)} pips` : 'N/A';

const getToggleClassName = (active: boolean, activeClassName = 'bg-blue-600/20 text-blue-400 border-blue-600'): string => {
  if (active) {
    return `px-3 py-1.5 rounded-lg ${activeClassName} border-2 text-sm font-medium`;
  }

  return 'px-3 py-1.5 rounded-lg bg-gray-700 text-gray-400 border-2 border-gray-700 text-sm font-medium';
};

const getTPFilterKey = (level: number): TpFilterKey => TP_LEVEL_FILTERS[level];

const getCoverageStatusLabel = (status: 'full' | 'partial' | 'none'): string | null => {
  if (status === 'partial') {
    return 'Partial normalization coverage';
  }

  if (status === 'none') {
    return 'No verified normalization coverage';
  }

  return null;
};

const getCoverageToneClassName = (status: 'full' | 'partial' | 'none'): string => {
  if (status === 'partial') {
    return 'text-yellow-400';
  }

  if (status === 'none') {
    return 'text-gray-500';
  }

  return 'text-gray-500';
};

const getTPBannerMessage = (symbols: string[]): string => {
  if (symbols.length === 1) {
    return `${symbols[0]} normalization is not verified on your broker. Please enter the value of 1 pip/point for this symbol so TP statistics can be calculated accurately.`;
  }

  return `Normalization is not verified for: ${symbols.join(', ')}. Please enter the value of 1 pip/point for each symbol on your broker so TP statistics can be calculated accurately.`;
};

const getChartSeriesByLevel = (data: TPStatisticsResponse | undefined): Map<number, TPStatisticsSeries> =>
  new Map((data?.series ?? []).map((series) => [series.level, series]));

const getChartPoints = (series: TPStatisticsSeries[]): TPStatisticsSeriesPoint[] =>
  series.reduce<TPStatisticsSeriesPoint[]>(
    (longest, current) => (current.points.length > longest.length ? current.points : longest),
    []
  );

const getVisibleChartLabels = (points: TPStatisticsSeriesPoint[]): Array<{ index: number; label: string }> => {
  if (points.length <= 6) {
    return points.map((point, index) => ({ index, label: point.bucketLabel }));
  }

  const lastIndex = points.length - 1;
  const step = Math.max(1, Math.floor(lastIndex / 5));
  const labels: Array<{ index: number; label: string }> = [];

  for (let index = 0; index <= lastIndex; index += step) {
    labels.push({ index, label: points[index].bucketLabel });
  }

  if (labels[labels.length - 1]?.index !== lastIndex) {
    labels.push({ index: lastIndex, label: points[lastIndex].bucketLabel });
  }

  return labels;
};

const buildPolylinePath = (
  points: TPStatisticsSeriesPoint[],
  maxPips: number
): { path: string; circles: Array<{ x: number; y: number; key: string }> } => {
  if (points.length === 0 || maxPips <= 0) {
    return { path: '', circles: [] };
  }

  const innerWidth = TP_CHART_WIDTH - TP_CHART_PADDING.left - TP_CHART_PADDING.right;
  const innerHeight = TP_CHART_HEIGHT - TP_CHART_PADDING.top - TP_CHART_PADDING.bottom;

  const finitePoints = points
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => typeof point.totalHitPips === 'number' && Number.isFinite(point.totalHitPips));

  if (finitePoints.length === 0) {
    return { path: '', circles: [] };
  }

  const getX = (index: number): number =>
    TP_CHART_PADDING.left + ((points.length === 1 ? 0.5 : index / Math.max(points.length - 1, 1)) * innerWidth);
  const getY = (value: number): number =>
    TP_CHART_PADDING.top + innerHeight - ((value / maxPips) * innerHeight);

  const path = finitePoints
    .map(({ point, index }, pointIndex) => {
      const x = getX(index);
      const y = getY(point.totalHitPips as number);
      return `${pointIndex === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return {
    path,
    circles: finitePoints.map(({ point, index }) => ({
      key: `${point.bucketStart}-${index}`,
      x: getX(index),
      y: getY(point.totalHitPips as number),
    })),
  };
};

export function AnalyticsPage(): JSX.Element {
  const user = useAppShellStore((state) => state.user);
  const [filters, setFilters] = useState<Record<TpFilterKey, boolean>>({
    tp1: true,
    tp2: true,
    tp3: true,
    tp4: false,
    tp5: false,
    tp6: false,
  });
  const [tpGranularity, setTpGranularity] = useState<TPStatisticsGranularity>('daily');

  const { data } = useQuery({
    queryKey: ['analytics-summary', user?.id],
    queryFn: getAnalyticsSummary,
    enabled: user !== null,
  });
  const { data: tpStatistics } = useQuery({
    queryKey: ['analytics-tp-statistics', user?.id, tpGranularity],
    queryFn: () => getTPStatistics(tpGranularity),
    enabled: user !== null,
  });

  const totalTradesValue = formatTradeCount(data?.totalPositions);
  const winLossSummaryValue = formatWinLossSummary(data?.winnerCount, data?.loserCount);
  const winRateValue = formatPercentage(data?.winRate);
  const profitFactorValue = formatRatio(data?.profitFactor);
  const avgRiskRewardValue = formatRiskReward(data?.avgRiskReward);
  const netProfitValue = formatSignedCurrency(data?.totalProfit);
  const totalProfitValue = formatSignedCurrency(data?.totalWinningProfit);
  const totalLossValue = formatSignedCurrency(data?.totalLosingProfit);
  const largestWinValue = formatSignedCurrency(data?.largestWin);
  const largestLossValue = formatSignedCurrency(data?.largestLoss);
  const maxDrawdownPercentValue = formatNullablePercentage(data?.maxDrawdownPercent);
  const maxDrawdownAmountValue = formatSignedCurrency(data?.maxDrawdownAmount);
  const avgHoldDurationValue = formatHoldDuration(data?.avgHoldDurationMs);
  const sharpeRatioRaw = (data as { sharpeRatio?: unknown } | undefined)?.sharpeRatio;
  const sharpeRatioValue = typeof sharpeRatioRaw === 'number' && Number.isFinite(sharpeRatioRaw)
    ? sharpeRatioRaw.toFixed(2)
    : null;

  const tpSeriesByLevel = getChartSeriesByLevel(tpStatistics);
  const visibleSeries = (tpStatistics?.supportedLevels ?? [])
    .filter((level) => filters[getTPFilterKey(level)])
    .map((level) => tpSeriesByLevel.get(level))
    .filter((series): series is TPStatisticsSeries => series !== undefined);
  const chartPoints = getChartPoints(visibleSeries.length > 0 ? visibleSeries : tpStatistics?.series ?? []);
  const maxVisiblePips = Math.max(
    0,
    ...visibleSeries.flatMap((series) =>
      series.points
        .map((point) => point.totalHitPips)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    )
  );
  const chartMaxPips = maxVisiblePips > 0 ? maxVisiblePips : 1;
  const chartLabels = getVisibleChartLabels(chartPoints);
  const summaryByLevel = new Map((tpStatistics?.levelSummaries ?? []).map((summary) => [summary.level, summary]));
  const summaryCards = (tpStatistics?.summaryCardLevels ?? []).map((level) => summaryByLevel.get(level)).filter(
    (summary): summary is TPStatisticsLevelSummary => summary !== undefined
  );
  const unverifiedSymbolsInScope = tpStatistics?.unverifiedSymbolsInScope ?? [];
  const chartHasVisibleData = visibleSeries.some((series) =>
    series.points.some((point) => typeof point.totalHitPips === 'number' && Number.isFinite(point.totalHitPips))
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-muted">Detailed trading statistics and performance metrics</p>
      </div>

      <div className="card-dark rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-white">Trading Statistics</h3>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              TOTAL TRADES
            </div>
            <div className="text-3xl font-bold text-white mb-1">{totalTradesValue}</div>
            <div className="text-sm text-gray-500">{winLossSummaryValue}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              WIN RATE
            </div>
            <div className="text-3xl font-bold text-white">{winRateValue}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              PROFIT FACTOR
            </div>
            <div className="text-3xl font-bold text-white">{profitFactorValue}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              AVG RISK/REWARD
            </div>
            <div className="text-3xl font-bold text-white">{avgRiskRewardValue}</div>
          </div>
        </div>
      </div>

      <div className="card-dark rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-white">Profit &amp; Loss</h3>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              NET PROFIT
            </div>
            <div className="text-3xl font-bold text-green-400">{netProfitValue}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              TOTAL PROFIT
            </div>
            <div className="text-3xl font-bold text-green-400">{totalProfitValue}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              TOTAL LOSS
            </div>
            <div className="text-3xl font-bold text-red-400">{totalLossValue}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              SHARPE RATIO
            </div>
            <div className={sharpeRatioValue === null ? 'text-3xl font-bold text-gray-500' : 'text-3xl font-bold text-white'}>
              {sharpeRatioValue ?? 'N/A'}
            </div>
            {sharpeRatioValue === null ? <div className="text-xs text-gray-500 mt-1">Insufficient data</div> : null}
          </div>
        </div>
      </div>

      <div className="card-dark rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-white">Best &amp; Worst</h3>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              LARGEST WIN
            </div>
            <div className="text-3xl font-bold text-green-400">{largestWinValue}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              LARGEST LOSS
            </div>
            <div className="text-3xl font-bold text-red-400">{largestLossValue}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              MAX DRAWDOWN
            </div>
            <div className="text-3xl font-bold text-white">{maxDrawdownPercentValue}</div>
            <div className="text-sm text-gray-500">{maxDrawdownAmountValue}</div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              AVG HOLD TIME
            </div>
            <div className="text-3xl font-bold text-white">{avgHoldDurationValue}</div>
          </div>
        </div>
      </div>

      <div className="card-dark rounded-lg p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-white">TP Achievement Statistics</h3>
          </div>
        </div>

        {unverifiedSymbolsInScope.length > 0 ? (
          <div className="card-darker rounded-lg p-4 mb-6">
            <div className="text-sm text-yellow-400">
              {getTPBannerMessage(unverifiedSymbolsInScope)}
            </div>
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-sm font-medium text-gray-400 mb-3">Filter TPs:</div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((level) => {
                const filterKey = getTPFilterKey(level);
                return (
                  <button
                    key={level}
                    onClick={() => setFilters((current) => ({ ...current, [filterKey]: !current[filterKey] }))}
                    id={`filter-tp${level}`}
                    className={getToggleClassName(filters[filterKey])}
                  >
                    {`TP${level}`}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-[220px]">
            <div className="text-sm font-medium text-gray-400 mb-3">Time Filter:</div>
            <div className="flex flex-wrap gap-2 justify-end">
              {TP_GRANULARITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTpGranularity(option.value)}
                  className={getToggleClassName(tpGranularity === option.value, 'bg-blue-600/20 text-blue-400 border-blue-600')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card-darker rounded-lg p-6 mb-6">
          <div className="relative">
            <svg viewBox={`0 0 ${TP_CHART_WIDTH} ${TP_CHART_HEIGHT}`} className="w-full h-[300px]" role="img" aria-label="TP achievement chart">
              <line
                x1={TP_CHART_PADDING.left}
                y1={TP_CHART_PADDING.top}
                x2={TP_CHART_PADDING.left}
                y2={TP_CHART_HEIGHT - TP_CHART_PADDING.bottom}
                stroke="#374151"
                strokeWidth="2"
              />
              <line
                x1={TP_CHART_PADDING.left}
                y1={TP_CHART_HEIGHT - TP_CHART_PADDING.bottom}
                x2={TP_CHART_WIDTH - TP_CHART_PADDING.right}
                y2={TP_CHART_HEIGHT - TP_CHART_PADDING.bottom}
                stroke="#374151"
                strokeWidth="2"
              />

              {[0, 1, 2, 3, 4].map((tickIndex) => {
                const innerHeight = TP_CHART_HEIGHT - TP_CHART_PADDING.top - TP_CHART_PADDING.bottom;
                const y = TP_CHART_PADDING.top + ((innerHeight / 4) * tickIndex);
                const tickValue = (((4 - tickIndex) / 4) * chartMaxPips);

                return (
                  <g key={tickIndex}>
                    <line
                      x1={TP_CHART_PADDING.left}
                      y1={y}
                      x2={TP_CHART_WIDTH - TP_CHART_PADDING.right}
                      y2={y}
                      stroke="#1f2937"
                      strokeWidth="1"
                    />
                    <text x={TP_CHART_PADDING.left - 10} y={y + 4} textAnchor="end" fill="#6b7280" fontSize="11">
                      {tickValue.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {chartLabels.map(({ index, label }) => {
                const innerWidth = TP_CHART_WIDTH - TP_CHART_PADDING.left - TP_CHART_PADDING.right;
                const x = TP_CHART_PADDING.left + ((chartPoints.length === 1 ? 0.5 : index / Math.max(chartPoints.length - 1, 1)) * innerWidth);

                return (
                  <text
                    key={`${label}-${index}`}
                    x={x}
                    y={TP_CHART_HEIGHT - 12}
                    textAnchor="middle"
                    fill="#6b7280"
                    fontSize="11"
                  >
                    {label}
                  </text>
                );
              })}

              <text
                x={TP_CHART_PADDING.left}
                y={12}
                textAnchor="start"
                fill="#6b7280"
                fontSize="11"
              >
                Pips from Entry
              </text>

              {visibleSeries.map((series) => {
                const chartPath = buildPolylinePath(series.points, chartMaxPips);
                if (!chartPath.path) {
                  return null;
                }

                return (
                  <g key={series.level}>
                    <path
                      d={chartPath.path}
                      fill="none"
                      stroke={TP_LEVEL_COLORS[series.level]}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {chartPath.circles.map((circle) => (
                      <circle
                        key={circle.key}
                        cx={circle.x}
                        cy={circle.y}
                        r="4"
                        fill={TP_LEVEL_COLORS[series.level]}
                      />
                    ))}
                  </g>
                );
              })}
            </svg>

            {!chartHasVisibleData ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
                {tpStatistics?.insufficientHistoryReason === 'no_tp_hit_history'
                  ? 'No TP hit history yet'
                  : 'No verified TP pip history for the selected filters'}
              </div>
            ) : null}
          </div>
          <div className="text-center text-xs text-gray-500 mt-4">
            {tpGranularity === 'daily' ? 'Daily buckets' : tpGranularity === 'weekly' ? 'Weekly buckets' : 'Monthly buckets'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {summaryCards.map((summary) => {
            const coverageLabel = getCoverageStatusLabel(summary.pipsCoverageStatus);
            const cardOpacityClass = summary.pipsCoverageStatus === 'none' ? ' opacity-50' : '';

            return (
              <div key={summary.level} className={`card-darker rounded-lg p-4${cardOpacityClass}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TP_LEVEL_COLORS[summary.level] }}></div>
                    <span className="text-sm font-medium text-gray-300">{summary.label} Hit</span>
                  </div>
                  <span className={`text-sm font-bold ${summary.hitRatePercent !== null ? 'text-green-400' : 'text-gray-400'}`}>
                    {formatNullablePercentage(summary.hitRatePercent)}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white">{`${summary.hitCount} trades`}</div>
                <div className="text-xs text-gray-500 mt-1">{`Average: ${formatNullablePips(summary.averageHitPips)}`}</div>
                {coverageLabel ? (
                  <div className={`text-xs mt-1 ${getCoverageToneClassName(summary.pipsCoverageStatus)}`}>
                    {coverageLabel}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
