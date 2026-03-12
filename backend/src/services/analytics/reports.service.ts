import Position from '../../models/Position';
import Signal from '../../models/Signal';
import statsService from './stats.service';
import logger from '../../utils/logger';

export interface PositionExport {
  id: string;
  symbol: string;
  type: string;
  entryPrice: number;
  closePrice: number | null;
  lotSize: number;
  profitLoss: number;
  status: string;
  openedAt: string;
  closedAt: string | null;
  sl: number;
  tpsHit: number;
  totalTps: number;
}

export interface ReportData {
  generatedAt: string;
  period: {
    from: string;
    to: string;
  };
  summary: {
    totalTrades: number;
    winRate: number;
    totalProfit: number;
    avgProfit: number;
    profitFactor: number;
  };
  positions: PositionExport[];
}

export interface CSVExport {
  filename: string;
  content: string;
  mimeType: string;
}

export class ReportsService {
  /**
   * Export positions to CSV format
   */
  async exportPositionsCSV(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CSVExport> {
    try {
      const positions = await this.getPositionsForExport(userId, startDate, endDate);

      // CSV Headers
      const headers = [
        'ID',
        'Symbol',
        'Type',
        'Entry Price',
        'Close Price',
        'Lot Size',
        'Profit/Loss',
        'Status',
        'Opened At',
        'Closed At',
        'Stop Loss',
        'TPs Hit',
        'Total TPs'
      ].join(',');

      // CSV Rows
      const rows = positions.map(p => [
        p.id,
        p.symbol,
        p.type,
        p.entryPrice,
        p.closePrice || '',
        p.lotSize,
        p.profitLoss,
        p.status,
        p.openedAt,
        p.closedAt || '',
        p.sl,
        p.tpsHit,
        p.totalTps
      ].join(','));

      const content = [headers, ...rows].join('\n');
      const dateStr = new Date().toISOString().split('T')[0];

      return {
        filename: `positions_export_${dateStr}.csv`,
        content,
        mimeType: 'text/csv'
      };

    } catch (error) {
      logger.error('Error exporting positions to CSV:', error);
      throw error;
    }
  }

  /**
   * Export signals to CSV format
   */
  async exportSignalsCSV(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CSVExport> {
    try {
      const filter: Record<string, unknown> = {};
      if (userId) {
        filter.userId = userId;
      }
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
          (filter.createdAt as Record<string, Date>).$gte = startDate;
        }
        if (endDate) {
          (filter.createdAt as Record<string, Date>).$lte = endDate;
        }
      }

      const signals = await Signal.find(filter).sort({ createdAt: -1 });

      // CSV Headers
      const headers = [
        'ID',
        'Symbol',
        'Type',
        'Entry',
        'SL',
        'TP1',
        'TP2',
        'TP3',
        'TP4',
        'Status',
        'Source',
        'Created At'
      ].join(',');

      // CSV Rows
      const rows = signals.map(s => [
        s._id.toString(),
        s.symbol,
        s.type,
        s.entry,
        s.sl,
        s.tps[0] || '',
        s.tps[1] || '',
        s.tps[2] || '',
        s.tps[3] || '',
        s.status,
        s.source || 'manual',
        s.createdAt.toISOString()
      ].join(','));

      const content = [headers, ...rows].join('\n');
      const dateStr = new Date().toISOString().split('T')[0];

      return {
        filename: `signals_export_${dateStr}.csv`,
        content,
        mimeType: 'text/csv'
      };

    } catch (error) {
      logger.error('Error exporting signals to CSV:', error);
      throw error;
    }
  }

  /**
   * Generate full report data (for PDF or detailed view)
   */
  async generateReport(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ReportData> {
    try {
      const positions = await this.getPositionsForExport(userId, startDate, endDate);
      const closedPositions = positions.filter(p => p.status === 'CLOSED');

      const winners = closedPositions.filter(p => p.profitLoss > 0);
      const losers = closedPositions.filter(p => p.profitLoss < 0);

      const totalProfit = closedPositions.reduce((sum, p) => sum + p.profitLoss, 0);
      const totalWins = winners.reduce((sum, p) => sum + p.profitLoss, 0);
      const totalLosses = Math.abs(losers.reduce((sum, p) => sum + p.profitLoss, 0));

      const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

      return {
        generatedAt: new Date().toISOString(),
        period: {
          from: startDate?.toISOString() || 'all-time',
          to: endDate?.toISOString() || new Date().toISOString()
        },
        summary: {
          totalTrades: closedPositions.length,
          winRate: closedPositions.length > 0
            ? Math.round((winners.length / closedPositions.length) * 100 * 10) / 10
            : 0,
          totalProfit: Math.round(totalProfit * 100) / 100,
          avgProfit: closedPositions.length > 0
            ? Math.round((totalProfit / closedPositions.length) * 100) / 100
            : 0,
          profitFactor: Math.round(profitFactor * 100) / 100
        },
        positions
      };

    } catch (error) {
      logger.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Generate daily summary report
   */
  async getDailySummary(userId: string, date?: Date): Promise<{
    date: string;
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    profit: number;
    positions: PositionExport[];
  }> {
    try {
      const targetDate = date || new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const positions = await this.getPositionsForExport(userId, startOfDay, endOfDay);
      const closedPositions = positions.filter(p => p.status === 'CLOSED');

      const wins = closedPositions.filter(p => p.profitLoss > 0).length;
      const losses = closedPositions.filter(p => p.profitLoss < 0).length;
      const profit = closedPositions.reduce((sum, p) => sum + p.profitLoss, 0);

      return {
        date: targetDate.toISOString().split('T')[0],
        trades: closedPositions.length,
        wins,
        losses,
        winRate: closedPositions.length > 0
          ? Math.round((wins / closedPositions.length) * 100 * 10) / 10
          : 0,
        profit: Math.round(profit * 100) / 100,
        positions
      };

    } catch (error) {
      logger.error('Error getting daily summary:', error);
      throw error;
    }
  }

  /**
   * Generate weekly summary report
   */
  async getWeeklySummary(userId: string): Promise<{
    week: { from: string; to: string };
    dailyBreakdown: Array<{
      date: string;
      trades: number;
      profit: number;
    }>;
    totals: {
      trades: number;
      wins: number;
      winRate: number;
      profit: number;
    };
  }> {
    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const positions = await this.getPositionsForExport(userId, startOfWeek, endOfWeek);
      const closedPositions = positions.filter(p => p.status === 'CLOSED');

      // Group by day
      const dailyBreakdown: Array<{ date: string; trades: number; profit: number }> = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const dayPositions = closedPositions.filter(p => {
          if (!p.closedAt) return false;
          return p.closedAt.startsWith(dateStr);
        });

        dailyBreakdown.push({
          date: dateStr,
          trades: dayPositions.length,
          profit: Math.round(dayPositions.reduce((sum, p) => sum + p.profitLoss, 0) * 100) / 100
        });
      }

      const wins = closedPositions.filter(p => p.profitLoss > 0).length;

      return {
        week: {
          from: startOfWeek.toISOString().split('T')[0],
          to: endOfWeek.toISOString().split('T')[0]
        },
        dailyBreakdown,
        totals: {
          trades: closedPositions.length,
          wins,
          winRate: closedPositions.length > 0
            ? Math.round((wins / closedPositions.length) * 100 * 10) / 10
            : 0,
          profit: Math.round(closedPositions.reduce((sum, p) => sum + p.profitLoss, 0) * 100) / 100
        }
      };

    } catch (error) {
      logger.error('Error getting weekly summary:', error);
      throw error;
    }
  }

  /**
   * Get positions formatted for export
   */
  private async getPositionsForExport(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PositionExport[]> {
    const filter: Record<string, unknown> = { userId };

    if (startDate || endDate) {
      filter.openedAt = {};
      if (startDate) {
        (filter.openedAt as Record<string, Date>).$gte = startDate;
      }
      if (endDate) {
        (filter.openedAt as Record<string, Date>).$lte = endDate;
      }
    }

    const positions = await Position.find(filter).sort({ openedAt: -1 });

    return positions.map(p => ({
      id: p._id.toString(),
      symbol: p.symbol,
      type: p.type,
      entryPrice: p.entryPrice,
      closePrice: p.closePrice || null,
      lotSize: p.lotSize,
      profitLoss: Math.round(p.profitLoss * 100) / 100,
      status: p.status,
      openedAt: p.openedAt.toISOString(),
      closedAt: p.closedAt?.toISOString() || null,
      sl: p.sl,
      tpsHit: p.tps.filter(tp => tp.hit).length,
      totalTps: p.tps.length
    }));
  }
}

export default new ReportsService();
