import Position from '../../models/Position';
import Signal from '../../models/Signal';
import User from '../../models/User';
import AccountValueSnapshot from '../../models/AccountValueSnapshot';
import tpStrategyService from '../trading/tp-strategy.service';
import logger from '../../utils/logger';

export interface DashboardSummary {
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

export interface TPStatistics {
  supportedLevels: number[];
  summaryCardLevels: number[];
  granularity: TPStatisticsGranularity;
  historyStartAt: string | null;
  hasSufficientHistory: boolean;
  insufficientHistoryReason: 'no_tp_hit_history' | 'sparse_history' | null;
  levelSummaries: TPLevelSummary[];
  series: TPLevelSeries[];
  unverifiedSymbolsInScope?: string[];
}

export type TPStatisticsGranularity = 'daily' | 'weekly' | 'monthly';

export interface TPLevelSummary {
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

export interface TPSeriesPoint {
  bucketStart: string;
  bucketLabel: string;
  configuredClosedPositionCount: number;
  hitCount: number;
  totalHitPips: number | null;
  pipsCoverageCount: number;
  pipsCoverageStatus: 'full' | 'partial' | 'none';
  unverifiedSymbols?: string[];
}

export interface TPLevelSeries {
  level: number;
  label: string;
  points: TPSeriesPoint[];
}

interface SupportedTPHitAnalysis {
  pips: number | null;
  unverifiedSymbol: string | null;
}

const SUPPORTED_TP_LEVELS = [1, 2, 3, 4, 5, 6] as const;
const SUMMARY_CARD_LEVELS = [1, 2, 3, 4] as const;

export interface ProfitChartData {
  period: '7d' | '30d' | '90d';
  data: Array<{
    date: string;
    profit: number;
    cumulative: number;
    trades: number;
  }>;
  summary: {
    totalProfit: number;
    avgDailyProfit: number;
    bestDay: { date: string; profit: number };
    worstDay: { date: string; profit: number };
    profitableDays: number;
    totalDays: number;
  };
}

export interface PerformanceBySymbol {
  symbol: string;
  totalTrades: number;
  winRate: number;
  totalProfit: number;
  avgProfit: number;
}

export interface PerformanceByTime {
  hour: number;
  trades: number;
  winRate: number;
  avgProfit: number;
}

export class StatsService {
  /**
   * Get dashboard summary statistics
   */
  async getDashboardSummary(userId: string): Promise<DashboardSummary> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all positions for user
      const [allPositions, todayPositions] = await Promise.all([
        Position.find({ userId }),
        Position.find({ userId, closedAt: { $gte: today } })
      ]);

      const openPositions = allPositions.filter(p => p.status === 'OPEN');
      const closedPositions = allPositions.filter(p => p.status === 'CLOSED');
      const winners = closedPositions.filter(p => p.profitLoss > 0);
      const losers = closedPositions.filter(p => p.profitLoss < 0);

      // Calculate metrics
      const totalProfit = closedPositions.reduce((sum, p) => sum + p.profitLoss, 0);
      const todayProfit = todayPositions.reduce((sum, p) => sum + p.profitLoss, 0);

      const totalWins = winners.reduce((sum, p) => sum + p.profitLoss, 0);
      const totalLosses = Math.abs(losers.reduce((sum, p) => sum + p.profitLoss, 0));
      const totalLosingProfit = losers.reduce((sum, p) => sum + p.profitLoss, 0);

      const avgProfit = winners.length > 0 ? totalWins / winners.length : 0;
      const avgLoss = losers.length > 0 ? totalLosses / losers.length : 0;
      const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

      const largestWin = winners.length > 0 ? Math.max(...winners.map(p => p.profitLoss)) : 0;
      const largestLoss = losers.length > 0 ? Math.min(...losers.map(p => p.profitLoss)) : 0;

      // Calculate streaks
      const { currentStreak, bestStreak } = this.calculateStreaks(closedPositions);
      const avgRiskRewardSummary = this.calculateAvgRiskReward(allPositions);
      const maxDrawdownSummary = await this.calculateMaxDrawdown(userId);
      const avgHoldDurationMs = this.calculateAvgHoldDurationMs(closedPositions);

      return {
        totalPositions: allPositions.length,
        openPositions: openPositions.length,
        closedPositions: closedPositions.length,
        winnerCount: winners.length,
        loserCount: losers.length,
        winRate: closedPositions.length > 0 ? (winners.length / closedPositions.length) * 100 : 0,
        totalProfit: Math.round(totalProfit * 100) / 100,
        totalWinningProfit: Math.round(totalWins * 100) / 100,
        totalLosingProfit: Math.round(totalLosingProfit * 100) / 100,
        todayProfit: Math.round(todayProfit * 100) / 100,
        avgProfit: Math.round(avgProfit * 100) / 100,
        avgLoss: Math.round(avgLoss * 100) / 100,
        profitFactor: profitFactor === Infinity ? 999 : Math.round(profitFactor * 100) / 100,
        largestWin: Math.round(largestWin * 100) / 100,
        largestLoss: Math.round(largestLoss * 100) / 100,
        maxDrawdownPercent: maxDrawdownSummary.maxDrawdownPercent,
        maxDrawdownAmount: maxDrawdownSummary.maxDrawdownAmount,
        avgHoldDurationMs,
        currentStreak,
        bestStreak,
        avgRiskReward: avgRiskRewardSummary.avgRiskReward,
        avgRiskRewardEligibleRowCount: avgRiskRewardSummary.eligibleRowCount,
        avgRiskRewardExcludedRowCount: avgRiskRewardSummary.excludedRowCount
      };

    } catch (error) {
      logger.error('Error getting dashboard summary:', error);
      throw error;
    }
  }

  private async calculateMaxDrawdown(userId: string): Promise<{
    maxDrawdownPercent: number | null;
    maxDrawdownAmount: number | null;
  }> {
    const user = await User.findById(userId).select('mt5Credentials.account mt5Credentials.server').lean();
    const account = user?.mt5Credentials?.account;
    const server = user?.mt5Credentials?.server;

    if (!account || !server) {
      return {
        maxDrawdownPercent: null,
        maxDrawdownAmount: null
      };
    }

    const snapshots = await AccountValueSnapshot.find({
      userId,
      mt5Account: account,
      mt5Server: server
    })
      .sort({ observedAt: 1 })
      .select('equity observedAt')
      .lean();

    const validSnapshots = snapshots.filter((snapshot) =>
      typeof snapshot.equity === 'number' && Number.isFinite(snapshot.equity) && snapshot.equity > 0
    );

    if (validSnapshots.length < 2) {
      return {
        maxDrawdownPercent: null,
        maxDrawdownAmount: null
      };
    }

    let peakEquity = validSnapshots[0].equity;
    let maxDrawdownAmount = 0;
    let maxDrawdownPercent = 0;

    for (const snapshot of validSnapshots.slice(1)) {
      if (snapshot.equity > peakEquity) {
        peakEquity = snapshot.equity;
        continue;
      }

      const drawdownAmount = peakEquity - snapshot.equity;
      const drawdownPercent = (drawdownAmount / peakEquity) * 100;

      if (drawdownAmount > maxDrawdownAmount) {
        maxDrawdownAmount = drawdownAmount;
        maxDrawdownPercent = drawdownPercent;
      }
    }

    return {
      maxDrawdownPercent: Math.round(maxDrawdownPercent * 100) / 100,
      maxDrawdownAmount: Math.round(maxDrawdownAmount * 100) / 100
    };
  }

  private calculateAvgHoldDurationMs(positions: Array<{
    status: string;
    openedAt?: Date;
    closedAt?: Date;
  }>): number | null {
    const eligibleDurations = positions
      .filter((position) =>
        position.status === 'CLOSED'
        && position.openedAt instanceof Date
        && position.closedAt instanceof Date
        && position.closedAt.getTime() >= position.openedAt.getTime()
      )
      .map((position) => position.closedAt!.getTime() - position.openedAt!.getTime());

    if (eligibleDurations.length === 0) {
      return null;
    }

    const totalDurationMs = eligibleDurations.reduce((sum, duration) => sum + duration, 0);
    return Math.round(totalDurationMs / eligibleDurations.length);
  }

  private calculateAvgRiskReward(
    positions: Array<{
      symbol: string;
      entryPrice: number;
      sl: number;
      tpPlanning?: {
        originalPlan?: {
          plannedTps: Array<{
            level: number;
            targetPrice: number | null;
            percentage: number;
            isExactTarget: boolean;
          }>;
          provenance: {
            usedFallback: boolean;
            normalizedPercentages: boolean;
          };
        };
      };
    }>
  ): {
    avgRiskReward: number | null;
    eligibleRowCount: number;
    excludedRowCount: number;
  } {
    const eligibleRatios: number[] = [];

    for (const position of positions) {
      const rowRiskReward = this.calculatePositionRiskReward(position);
      if (rowRiskReward !== null) {
        eligibleRatios.push(rowRiskReward);
      }
    }

    if (eligibleRatios.length === 0) {
      return {
        avgRiskReward: null,
        eligibleRowCount: 0,
        excludedRowCount: positions.length
      };
    }

    const totalRiskReward = eligibleRatios.reduce((sum, value) => sum + value, 0);

    return {
      avgRiskReward: Math.round((totalRiskReward / eligibleRatios.length) * 100) / 100,
      eligibleRowCount: eligibleRatios.length,
      excludedRowCount: positions.length - eligibleRatios.length
    };
  }

  private calculatePositionRiskReward(position: {
    symbol: string;
    entryPrice: number;
    sl: number;
    tpPlanning?: {
      originalPlan?: {
        plannedTps: Array<{
          level: number;
          targetPrice: number | null;
          percentage: number;
          isExactTarget: boolean;
        }>;
        provenance: {
          usedFallback: boolean;
          normalizedPercentages: boolean;
        };
      };
    };
  }): number | null {
    const originalPlan = position.tpPlanning?.originalPlan;
    if (!originalPlan) {
      return null;
    }

    if (typeof position.symbol !== 'string' || position.symbol.trim().length === 0) {
      return null;
    }

    if (!this.isFinitePositiveNumber(position.entryPrice) || !this.isFinitePositiveNumber(position.sl)) {
      return null;
    }

    if (!originalPlan.provenance || originalPlan.provenance.usedFallback || originalPlan.provenance.normalizedPercentages) {
      return null;
    }

    const plannedTps = originalPlan.plannedTps;
    if (!Array.isArray(plannedTps) || plannedTps.length === 0) {
      return null;
    }

    let totalPercentage = 0;
    let weightedRewardPips = 0;

    for (const plannedTp of plannedTps) {
      if (!this.isEligiblePlannedTp(plannedTp)) {
        return null;
      }

      totalPercentage += plannedTp.percentage;

      const rewardPips = tpStrategyService.calculatePips(
        position.entryPrice,
        plannedTp.targetPrice,
        position.symbol
      );

      weightedRewardPips += rewardPips * (plannedTp.percentage / 100);
    }

    if (Math.abs(totalPercentage - 100) > 0.01) {
      return null;
    }

    const riskPips = tpStrategyService.calculatePips(position.entryPrice, position.sl, position.symbol);
    if (!Number.isFinite(riskPips) || riskPips <= 0) {
      return null;
    }

    const rowRiskReward = weightedRewardPips / riskPips;
    if (!Number.isFinite(rowRiskReward)) {
      return null;
    }

    return rowRiskReward;
  }

  private isEligiblePlannedTp(plannedTp: {
    level: number;
    targetPrice: number | null;
    percentage: number;
    isExactTarget: boolean;
  }): plannedTp is {
    level: number;
    targetPrice: number;
    percentage: number;
    isExactTarget: true;
  } {
    return Number.isFinite(plannedTp.level)
      && this.isFinitePositiveNumber(plannedTp.targetPrice)
      && this.isFinitePositiveNumber(plannedTp.percentage)
      && plannedTp.isExactTarget === true;
  }

  private isFinitePositiveNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }

  /**
   * Get TP statistics for achievement chart
   */
  async getTPStatistics(userId: string, granularity: TPStatisticsGranularity = 'daily'): Promise<TPStatistics> {
    try {
      const closedPositions = await Position.find({ userId, status: 'CLOSED' })
        .select('status type symbol entryPrice closedAt tps.level tps.price tps.hit tps.hitAt')
        .lean();

      const levelSummaries = SUPPORTED_TP_LEVELS.map((level) =>
        this.buildTPLevelSummary(closedPositions, level)
      );
      const hitEventDates = closedPositions.flatMap((position) => this.getSupportedHitEventDates(position));
      const historyStartDate = hitEventDates.length > 0
        ? new Date(Math.min(...hitEventDates.map((date) => date.getTime())))
        : null;
      const series = this.buildTPSeries(closedPositions, granularity, historyStartDate);
      const nonEmptyHitBuckets = new Set(
        series.flatMap((levelSeries) =>
          levelSeries.points
            .filter((point) => point.hitCount > 0)
            .map((point) => point.bucketStart)
        )
      );

      return {
        supportedLevels: [...SUPPORTED_TP_LEVELS],
        summaryCardLevels: [...SUMMARY_CARD_LEVELS],
        granularity,
        historyStartAt: historyStartDate?.toISOString() ?? null,
        hasSufficientHistory: nonEmptyHitBuckets.size >= 2,
        insufficientHistoryReason: historyStartDate === null
          ? 'no_tp_hit_history'
          : nonEmptyHitBuckets.size >= 2
            ? null
            : 'sparse_history',
        levelSummaries,
        series,
        unverifiedSymbolsInScope: this.getUnverifiedSymbolsInScope(closedPositions)
      };

    } catch (error) {
      logger.error('Error getting TP statistics:', error);
      throw error;
    }
  }

  private buildTPLevelSummary(
    positions: Array<{
      type: 'BUY' | 'SELL';
      symbol: string;
      entryPrice: number;
      tps: Array<{
        level: number;
        price: number;
        hit: boolean;
        hitAt?: Date;
      }>;
      closedAt?: Date;
    }>,
    level: number
  ): TPLevelSummary {
    const configuredPositions = positions
      .map((position) => ({ position, tp: this.getSupportedTP(position, level) }))
      .filter((entry): entry is typeof entry & {
        tp: { level: number; price: number; hit: boolean; hitAt?: Date };
      } => entry.tp !== null);

    const hitEntries = configuredPositions.filter((entry) => entry.tp.hit);
    const hitAnalyses = hitEntries.map((entry) => this.analyzeSupportedHitPips(entry.position, entry.tp));
    const coveredPips = hitAnalyses
      .map((entry) => entry.pips)
      .filter((value): value is number => value !== null);
    const unverifiedSymbols = this.getUniqueUnverifiedSymbols(hitAnalyses);

    return {
      level,
      label: `TP${level}`,
      configuredClosedPositionCount: configuredPositions.length,
      hitCount: hitEntries.length,
      hitRatePercent: configuredPositions.length > 0
        ? Math.round((hitEntries.length / configuredPositions.length) * 10000) / 100
        : null,
      totalHitPips: coveredPips.length > 0
        ? Math.round(coveredPips.reduce((sum, value) => sum + value, 0) * 100) / 100
        : null,
      averageHitPips: coveredPips.length > 0
        ? Math.round((coveredPips.reduce((sum, value) => sum + value, 0) / coveredPips.length) * 100) / 100
        : null,
      pipsCoverageCount: coveredPips.length,
      pipsCoverageStatus: this.getPipsCoverageStatus(hitEntries.length, coveredPips.length),
      unverifiedSymbols: unverifiedSymbols.length > 0 ? unverifiedSymbols : undefined
    };
  }

  private buildTPSeries(
    positions: Array<{
      type: 'BUY' | 'SELL';
      symbol: string;
      entryPrice: number;
      tps: Array<{
        level: number;
        price: number;
        hit: boolean;
        hitAt?: Date;
      }>;
      closedAt?: Date;
    }>,
    granularity: TPStatisticsGranularity,
    historyStartDate: Date | null
  ): TPLevelSeries[] {
    if (historyStartDate === null) {
      return SUPPORTED_TP_LEVELS.map((level) => ({
        level,
        label: `TP${level}`,
        points: []
      }));
    }

    const timelineEnd = this.getLatestRelevantTPEventDate(positions) ?? historyStartDate;
    const buckets = this.buildTimeBuckets(historyStartDate, timelineEnd, granularity);

    return SUPPORTED_TP_LEVELS.map((level) => ({
      level,
      label: `TP${level}`,
      points: buckets.map((bucketStart) => {
        const configuredEntries = positions
          .map((position) => ({ position, tp: this.getSupportedTP(position, level) }))
          .filter((entry): entry is typeof entry & {
            tp: { level: number; price: number; hit: boolean; hitAt?: Date };
          } => entry.tp !== null)
          .filter((entry) => {
            const eventAt = this.getTPEventAt(entry.position.closedAt, entry.tp.hitAt, entry.tp.hit);
            return eventAt !== null && this.getBucketStart(eventAt, granularity).getTime() === bucketStart.getTime();
          });

        const hitEntries = configuredEntries.filter((entry) => entry.tp.hit);
        const hitAnalyses = hitEntries.map((entry) => this.analyzeSupportedHitPips(entry.position, entry.tp));
        const coveredPips = hitAnalyses
          .map((entry) => entry.pips)
          .filter((value): value is number => value !== null);
        const unverifiedSymbols = this.getUniqueUnverifiedSymbols(hitAnalyses);

        return {
          bucketStart: bucketStart.toISOString(),
          bucketLabel: this.formatBucketLabel(bucketStart, granularity),
          configuredClosedPositionCount: configuredEntries.length,
          hitCount: hitEntries.length,
          totalHitPips: coveredPips.length > 0
            ? Math.round(coveredPips.reduce((sum, value) => sum + value, 0) * 100) / 100
            : null,
          pipsCoverageCount: coveredPips.length,
          pipsCoverageStatus: this.getPipsCoverageStatus(hitEntries.length, coveredPips.length),
          unverifiedSymbols: unverifiedSymbols.length > 0 ? unverifiedSymbols : undefined
        };
      })
    }));
  }

  private getSupportedHitEventDates(position: {
    tps: Array<{ level: number; hit: boolean; hitAt?: Date }>;
    closedAt?: Date;
  }): Date[] {
    return position.tps
      .filter((tp) => SUPPORTED_TP_LEVELS.includes(tp.level as (typeof SUPPORTED_TP_LEVELS)[number]) && tp.hit)
      .map((tp) => this.getTPEventAt(position.closedAt, tp.hitAt, true))
      .filter((date): date is Date => date instanceof Date);
  }

  private getLatestRelevantTPEventDate(positions: Array<{
    tps: Array<{ level: number; hit: boolean; hitAt?: Date }>;
    closedAt?: Date;
  }>): Date | null {
    const dates = positions.flatMap((position) =>
      position.tps
        .filter((tp) => SUPPORTED_TP_LEVELS.includes(tp.level as (typeof SUPPORTED_TP_LEVELS)[number]))
        .map((tp) => this.getTPEventAt(position.closedAt, tp.hitAt, tp.hit))
        .filter((date): date is Date => date instanceof Date)
    );

    return dates.length > 0
      ? new Date(Math.max(...dates.map((date) => date.getTime())))
      : null;
  }

  private getSupportedTP(
    position: {
      tps: Array<{
        level: number;
        price: number;
        hit: boolean;
        hitAt?: Date;
      }>;
    },
    level: number
  ): {
    level: number;
    price: number;
    hit: boolean;
    hitAt?: Date;
  } | null {
    if (!SUPPORTED_TP_LEVELS.includes(level as (typeof SUPPORTED_TP_LEVELS)[number])) {
      return null;
    }

    return position.tps.find((tp) => tp.level === level) ?? null;
  }

  private analyzeSupportedHitPips(
    position: {
      type: 'BUY' | 'SELL';
      symbol: string;
      entryPrice: number;
    },
    tp: {
      price: number;
      hit: boolean;
    }
  ): SupportedTPHitAnalysis {
    if (!tp.hit) {
      return { pips: null, unverifiedSymbol: null };
    }

    if (!this.isSupportedPipSymbol(position.symbol)) {
      return { pips: null, unverifiedSymbol: position.symbol.toUpperCase() };
    }

    if (!this.isFinitePositiveNumber(position.entryPrice) || !this.isFinitePositiveNumber(tp.price)) {
      return { pips: null, unverifiedSymbol: null };
    }

    if (position.type === 'BUY' && tp.price <= position.entryPrice) {
      return { pips: null, unverifiedSymbol: null };
    }

    if (position.type === 'SELL' && tp.price >= position.entryPrice) {
      return { pips: null, unverifiedSymbol: null };
    }

    const pips = tpStrategyService.calculatePips(position.entryPrice, tp.price, position.symbol);
    return {
      pips: Number.isFinite(pips) && pips > 0 ? pips : null,
      unverifiedSymbol: null
    };
  }

  private isSupportedPipSymbol(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();

    if (upperSymbol.includes('XAU') || upperSymbol.includes('BTC')) {
      return true;
    }

    return /^[A-Z]{6}$/.test(upperSymbol);
  }

  private getUnverifiedSymbolsInScope(positions: Array<{
    type: 'BUY' | 'SELL';
    symbol: string;
    entryPrice: number;
    tps: Array<{
      level: number;
      price: number;
      hit: boolean;
      hitAt?: Date;
    }>;
    closedAt?: Date;
  }>): string[] | undefined {
    const unverifiedSymbols = new Set<string>();

    for (const level of SUPPORTED_TP_LEVELS) {
      const hitAnalyses = positions
        .map((position) => ({ position, tp: this.getSupportedTP(position, level) }))
        .filter((entry): entry is typeof entry & {
          tp: { level: number; price: number; hit: boolean; hitAt?: Date };
        } => entry.tp !== null && entry.tp.hit)
        .map((entry) => this.analyzeSupportedHitPips(entry.position, entry.tp));

      for (const symbol of this.getUniqueUnverifiedSymbols(hitAnalyses)) {
        unverifiedSymbols.add(symbol);
      }
    }

    return unverifiedSymbols.size > 0 ? [...unverifiedSymbols].sort() : undefined;
  }

  private getUniqueUnverifiedSymbols(hitAnalyses: SupportedTPHitAnalysis[]): string[] {
    const symbols = new Set<string>();

    for (const entry of hitAnalyses) {
      if (entry.unverifiedSymbol) {
        symbols.add(entry.unverifiedSymbol);
      }
    }

    return [...symbols].sort();
  }

  private getTPEventAt(closedAt: Date | undefined, hitAt: Date | undefined, hit: boolean): Date | null {
    if (hit && hitAt instanceof Date) {
      return hitAt;
    }

    return closedAt instanceof Date ? closedAt : null;
  }

  private getPipsCoverageStatus(hitCount: number, pipsCoverageCount: number): 'full' | 'partial' | 'none' {
    if (hitCount === 0 || pipsCoverageCount === 0) {
      return 'none';
    }

    return hitCount === pipsCoverageCount ? 'full' : 'partial';
  }

  private buildTimeBuckets(startDate: Date, endDate: Date, granularity: TPStatisticsGranularity): Date[] {
    const buckets: Date[] = [];
    let current = this.getBucketStart(startDate, granularity);
    const finalBucket = this.getBucketStart(endDate, granularity);

    while (current.getTime() <= finalBucket.getTime()) {
      buckets.push(new Date(current));
      current = this.getNextBucketStart(current, granularity);
    }

    return buckets;
  }

  private getBucketStart(date: Date, granularity: TPStatisticsGranularity): Date {
    const bucket = new Date(date);

    if (granularity === 'daily') {
      bucket.setUTCHours(0, 0, 0, 0);
      return bucket;
    }

    if (granularity === 'weekly') {
      bucket.setUTCHours(0, 0, 0, 0);
      const day = bucket.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      bucket.setUTCDate(bucket.getUTCDate() + diff);
      return bucket;
    }

    bucket.setUTCDate(1);
    bucket.setUTCHours(0, 0, 0, 0);
    return bucket;
  }

  private getNextBucketStart(bucketStart: Date, granularity: TPStatisticsGranularity): Date {
    const next = new Date(bucketStart);

    if (granularity === 'daily') {
      next.setUTCDate(next.getUTCDate() + 1);
      return next;
    }

    if (granularity === 'weekly') {
      next.setUTCDate(next.getUTCDate() + 7);
      return next;
    }

    next.setUTCMonth(next.getUTCMonth() + 1);
    return next;
  }

  private formatBucketLabel(bucketStart: Date, granularity: TPStatisticsGranularity): string {
    if (granularity === 'monthly') {
      return bucketStart.toISOString().slice(0, 7);
    }

    return bucketStart.toISOString().slice(0, 10);
  }

  /**
   * Get profit chart data for specified period
   */
  async getProfitChartData(userId: string, period: '7d' | '30d' | '90d'): Promise<ProfitChartData> {
    try {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const closedPositions = await Position.find({
        userId,
        status: 'CLOSED',
        closedAt: { $gte: startDate }
      }).sort({ closedAt: 1 });

      // Group by date
      const dailyData = new Map<string, { profit: number; trades: number }>();

      // Initialize all days
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dailyData.set(dateStr, { profit: 0, trades: 0 });
      }

      // Aggregate profits by day
      for (const position of closedPositions) {
        if (position.closedAt) {
          const dateStr = position.closedAt.toISOString().split('T')[0];
          const existing = dailyData.get(dateStr) || { profit: 0, trades: 0 };
          existing.profit += position.profitLoss;
          existing.trades += 1;
          dailyData.set(dateStr, existing);
        }
      }

      // Convert to array and calculate cumulative
      let cumulative = 0;
      const data: ProfitChartData['data'] = [];
      let bestDay = { date: '', profit: -Infinity };
      let worstDay = { date: '', profit: Infinity };
      let profitableDays = 0;

      for (const [date, { profit, trades }] of dailyData) {
        cumulative += profit;
        data.push({
          date,
          profit: Math.round(profit * 100) / 100,
          cumulative: Math.round(cumulative * 100) / 100,
          trades
        });

        if (profit > bestDay.profit) {
          bestDay = { date, profit };
        }
        if (profit < worstDay.profit) {
          worstDay = { date, profit };
        }
        if (profit > 0) {
          profitableDays++;
        }
      }

      const totalProfit = closedPositions.reduce((sum, p) => sum + p.profitLoss, 0);
      const avgDailyProfit = data.length > 0 ? totalProfit / data.length : 0;

      return {
        period,
        data,
        summary: {
          totalProfit: Math.round(totalProfit * 100) / 100,
          avgDailyProfit: Math.round(avgDailyProfit * 100) / 100,
          bestDay: {
            date: bestDay.date,
            profit: Math.round(bestDay.profit * 100) / 100
          },
          worstDay: {
            date: worstDay.date,
            profit: Math.round(worstDay.profit * 100) / 100
          },
          profitableDays,
          totalDays: data.length
        }
      };

    } catch (error) {
      logger.error('Error getting profit chart data:', error);
      throw error;
    }
  }

  /**
   * Get performance breakdown by symbol
   */
  async getPerformanceBySymbol(userId: string): Promise<PerformanceBySymbol[]> {
    try {
      const closedPositions = await Position.find({ userId, status: 'CLOSED' });

      const symbolStats = new Map<string, {
        totalTrades: number;
        wins: number;
        totalProfit: number;
      }>();

      for (const position of closedPositions) {
        const existing = symbolStats.get(position.symbol) || {
          totalTrades: 0,
          wins: 0,
          totalProfit: 0
        };

        existing.totalTrades++;
        existing.totalProfit += position.profitLoss;
        if (position.profitLoss > 0) {
          existing.wins++;
        }

        symbolStats.set(position.symbol, existing);
      }

      const result: PerformanceBySymbol[] = [];
      for (const [symbol, stats] of symbolStats) {
        result.push({
          symbol,
          totalTrades: stats.totalTrades,
          winRate: Math.round((stats.wins / stats.totalTrades) * 100 * 10) / 10,
          totalProfit: Math.round(stats.totalProfit * 100) / 100,
          avgProfit: Math.round((stats.totalProfit / stats.totalTrades) * 100) / 100
        });
      }

      // Sort by total profit descending
      return result.sort((a, b) => b.totalProfit - a.totalProfit);

    } catch (error) {
      logger.error('Error getting performance by symbol:', error);
      throw error;
    }
  }

  /**
   * Get performance breakdown by hour of day
   */
  async getPerformanceByTime(userId: string): Promise<PerformanceByTime[]> {
    try {
      const closedPositions = await Position.find({ userId, status: 'CLOSED' });

      const hourStats = new Map<number, {
        trades: number;
        wins: number;
        totalProfit: number;
      }>();

      // Initialize all hours
      for (let i = 0; i < 24; i++) {
        hourStats.set(i, { trades: 0, wins: 0, totalProfit: 0 });
      }

      for (const position of closedPositions) {
        const hour = position.openedAt.getHours();
        const existing = hourStats.get(hour)!;

        existing.trades++;
        existing.totalProfit += position.profitLoss;
        if (position.profitLoss > 0) {
          existing.wins++;
        }
      }

      const result: PerformanceByTime[] = [];
      for (const [hour, stats] of hourStats) {
        result.push({
          hour,
          trades: stats.trades,
          winRate: stats.trades > 0 ? Math.round((stats.wins / stats.trades) * 100 * 10) / 10 : 0,
          avgProfit: stats.trades > 0 ? Math.round((stats.totalProfit / stats.trades) * 100) / 100 : 0
        });
      }

      return result;

    } catch (error) {
      logger.error('Error getting performance by time:', error);
      throw error;
    }
  }

  /**
   * Get signal statistics
   */
  async getSignalStats(userId?: string): Promise<{
    totalSignals: number;
    activeSignals: number;
    executedSignals: number;
    expiredSignals: number;
    avgTPsPerSignal: number;
  }> {
    try {
      const filter: Record<string, unknown> = {};
      if (userId) {
        filter.userId = userId;
      }

      const signals = await Signal.find(filter);

      const activeSignals = signals.filter(s => s.status === 'ACTIVE').length;
      const executedSignals = signals.filter(s => s.status === 'CLOSED').length;
      const expiredSignals = signals.filter(s => s.status === 'EXPIRED').length;

      const totalTPs = signals.reduce((sum, s) => sum + s.tps.length, 0);
      const avgTPsPerSignal = signals.length > 0 ? totalTPs / signals.length : 0;

      return {
        totalSignals: signals.length,
        activeSignals,
        executedSignals,
        expiredSignals,
        avgTPsPerSignal: Math.round(avgTPsPerSignal * 10) / 10
      };

    } catch (error) {
      logger.error('Error getting signal stats:', error);
      throw error;
    }
  }

  /**
   * Calculate winning/losing streaks
   */
  private calculateStreaks(positions: Array<{ profitLoss: number; closedAt?: Date }>): {
    currentStreak: number;
    bestStreak: number;
  } {
    if (positions.length === 0) {
      return { currentStreak: 0, bestStreak: 0 };
    }

    // Sort by closed date
    const sorted = [...positions]
      .filter(p => p.closedAt)
      .sort((a, b) => a.closedAt!.getTime() - b.closedAt!.getTime());

    let currentStreak = 0;
    let bestStreak = 0;
    let lastWin = true;

    for (const position of sorted) {
      const isWin = position.profitLoss > 0;

      if (isWin === lastWin) {
        currentStreak = isWin ? currentStreak + 1 : currentStreak - 1;
      } else {
        currentStreak = isWin ? 1 : -1;
        lastWin = isWin;
      }

      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
    }

    return { currentStreak, bestStreak };
  }
}

export default new StatsService();
