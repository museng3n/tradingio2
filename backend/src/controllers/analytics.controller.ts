import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import statsService from '../services/analytics/stats.service';
import reportsService from '../services/analytics/reports.service';
import { AppError } from '../utils/errors';
import type { TPStatisticsGranularity } from '../services/analytics/stats.service';

export class AnalyticsController {
  /**
   * Get dashboard summary statistics
   * GET /api/analytics/summary
   */
  async getSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const summary = await statsService.getDashboardSummary(userId);

      res.json(summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get TP statistics for achievement chart
   * GET /api/analytics/tp-statistics
   */
  async getTPStatistics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const granularity = (req.query.granularity as TPStatisticsGranularity | undefined) ?? 'daily';

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      if (!['daily', 'weekly', 'monthly'].includes(granularity)) {
        throw new AppError('Invalid granularity. Use daily, weekly, or monthly', 400);
      }

      const tpStats = await statsService.getTPStatistics(userId, granularity);

      res.json(tpStats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get profit chart data
   * GET /api/analytics/profit-chart?period=7d|30d|90d
   */
  async getProfitChart(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const period = (req.query.period as '7d' | '30d' | '90d') || '7d';

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      if (!['7d', '30d', '90d'].includes(period)) {
        throw new AppError('Invalid period. Use 7d, 30d, or 90d', 400);
      }

      const chartData = await statsService.getProfitChartData(userId, period);

      res.json(chartData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get performance breakdown by symbol
   * GET /api/analytics/performance-by-symbol
   */
  async getPerformanceBySymbol(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const performance = await statsService.getPerformanceBySymbol(userId);

      res.json({ symbols: performance });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get performance breakdown by time of day
   * GET /api/analytics/performance-by-time
   */
  async getPerformanceByTime(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const performance = await statsService.getPerformanceByTime(userId);

      res.json({ hours: performance });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get signal statistics
   * GET /api/analytics/signals
   */
  async getSignalStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      const signalStats = await statsService.getSignalStats(userId);

      res.json(signalStats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export positions to CSV
   * GET /api/analytics/export/positions?startDate=&endDate=
   */
  async exportPositions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const csvExport = await reportsService.exportPositionsCSV(userId, startDate, endDate);

      res.setHeader('Content-Type', csvExport.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${csvExport.filename}"`);
      res.send(csvExport.content);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export signals to CSV
   * GET /api/analytics/export/signals?startDate=&endDate=
   */
  async exportSignals(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const csvExport = await reportsService.exportSignalsCSV(userId, startDate, endDate);

      res.setHeader('Content-Type', csvExport.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${csvExport.filename}"`);
      res.send(csvExport.content);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate full report
   * GET /api/analytics/report?startDate=&endDate=
   */
  async generateReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const report = await reportsService.generateReport(userId, startDate, endDate);

      res.json(report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get daily summary
   * GET /api/analytics/daily-summary?date=YYYY-MM-DD
   */
  async getDailySummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const date = req.query.date ? new Date(req.query.date as string) : undefined;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const summary = await reportsService.getDailySummary(userId, date);

      res.json(summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get weekly summary
   * GET /api/analytics/weekly-summary
   */
  async getWeeklySummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const summary = await reportsService.getWeeklySummary(userId);

      res.json(summary);
    } catch (error) {
      next(error);
    }
  }
}

export default new AnalyticsController();
