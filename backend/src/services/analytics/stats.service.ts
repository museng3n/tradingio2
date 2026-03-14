import Position from '../../models/Position';
import Signal from '../../models/Signal';
import tpStrategyService from '../trading/tp-strategy.service';
import logger from '../../utils/logger';

export interface DashboardSummary {
  totalPositions: number;
  openPositions: number;
  closedPositions: number;
  winRate: number;
  totalProfit: number;
  todayProfit: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  currentStreak: number;
  bestStreak: number;
  avgRiskReward: number | null;
  avgRiskRewardEligibleRowCount: number;
  avgRiskRewardExcludedRowCount: number;
}

export interface TPStatistics {
  totalClosed: number;
  tp1HitCount: number;
  tp1HitRate: number;
  tp2HitCount: number;
  tp2HitRate: number;
  tp3HitCount: number;
  tp3HitRate: number;
  tp4HitCount: number;
  tp4HitRate: number;
  slHitCount: number;
  slHitRate: number;
  chartData: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
}

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

      const avgProfit = winners.length > 0 ? totalWins / winners.length : 0;
      const avgLoss = losers.length > 0 ? totalLosses / losers.length : 0;
      const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

      const largestWin = winners.length > 0 ? Math.max(...winners.map(p => p.profitLoss)) : 0;
      const largestLoss = losers.length > 0 ? Math.min(...losers.map(p => p.profitLoss)) : 0;

      // Calculate streaks
      const { currentStreak, bestStreak } = this.calculateStreaks(closedPositions);
      const avgRiskRewardSummary = this.calculateAvgRiskReward(allPositions);

      return {
        totalPositions: allPositions.length,
        openPositions: openPositions.length,
        closedPositions: closedPositions.length,
        winRate: closedPositions.length > 0 ? (winners.length / closedPositions.length) * 100 : 0,
        totalProfit: Math.round(totalProfit * 100) / 100,
        todayProfit: Math.round(todayProfit * 100) / 100,
        avgProfit: Math.round(avgProfit * 100) / 100,
        avgLoss: Math.round(avgLoss * 100) / 100,
        profitFactor: profitFactor === Infinity ? 999 : Math.round(profitFactor * 100) / 100,
        largestWin: Math.round(largestWin * 100) / 100,
        largestLoss: Math.round(largestLoss * 100) / 100,
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
  async getTPStatistics(userId: string): Promise<TPStatistics> {
    try {
      const closedPositions = await Position.find({ userId, status: 'CLOSED' });
      const totalClosed = closedPositions.length;

      if (totalClosed === 0) {
        return {
          totalClosed: 0,
          tp1HitCount: 0,
          tp1HitRate: 0,
          tp2HitCount: 0,
          tp2HitRate: 0,
          tp3HitCount: 0,
          tp3HitRate: 0,
          tp4HitCount: 0,
          tp4HitRate: 0,
          slHitCount: 0,
          slHitRate: 0,
          chartData: []
        };
      }

      // Count TP hits
      let tp1HitCount = 0;
      let tp2HitCount = 0;
      let tp3HitCount = 0;
      let tp4HitCount = 0;
      let slHitCount = 0;

      for (const position of closedPositions) {
        const hitTPs = position.tps.filter(tp => tp.hit);

        if (hitTPs.length === 0 && position.closeReason === 'SL') {
          slHitCount++;
        } else {
          // Count which TPs were hit
          for (const tp of hitTPs) {
            switch (tp.level) {
              case 1: tp1HitCount++; break;
              case 2: tp2HitCount++; break;
              case 3: tp3HitCount++; break;
              case 4: tp4HitCount++; break;
            }
          }
        }
      }

      const tp1HitRate = (tp1HitCount / totalClosed) * 100;
      const tp2HitRate = (tp2HitCount / totalClosed) * 100;
      const tp3HitRate = (tp3HitCount / totalClosed) * 100;
      const tp4HitRate = (tp4HitCount / totalClosed) * 100;
      const slHitRate = (slHitCount / totalClosed) * 100;

      // Generate chart data
      const chartData = [
        { name: 'TP1', value: tp1HitCount, percentage: Math.round(tp1HitRate * 10) / 10 },
        { name: 'TP2', value: tp2HitCount, percentage: Math.round(tp2HitRate * 10) / 10 },
        { name: 'TP3', value: tp3HitCount, percentage: Math.round(tp3HitRate * 10) / 10 },
        { name: 'TP4', value: tp4HitCount, percentage: Math.round(tp4HitRate * 10) / 10 },
        { name: 'SL', value: slHitCount, percentage: Math.round(slHitRate * 10) / 10 }
      ];

      return {
        totalClosed,
        tp1HitCount,
        tp1HitRate: Math.round(tp1HitRate * 10) / 10,
        tp2HitCount,
        tp2HitRate: Math.round(tp2HitRate * 10) / 10,
        tp3HitCount,
        tp3HitRate: Math.round(tp3HitRate * 10) / 10,
        tp4HitCount,
        tp4HitRate: Math.round(tp4HitRate * 10) / 10,
        slHitCount,
        slHitRate: Math.round(slHitRate * 10) / 10,
        chartData
      };

    } catch (error) {
      logger.error('Error getting TP statistics:', error);
      throw error;
    }
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
