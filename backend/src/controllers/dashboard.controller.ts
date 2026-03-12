import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import Position from '../models/Position';
import Signal from '../models/Signal';

export class DashboardController {
  /**
   * Get dashboard statistics
   */
  async getStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      // Get position stats
      const [openPositions, closedPositions, totalSignals, activeSignals] = await Promise.all([
        Position.countDocuments({ userId, status: 'OPEN' }),
        Position.find({ userId, status: 'CLOSED' }),
        Signal.countDocuments({ userId }),
        Signal.countDocuments({ userId, status: 'ACTIVE' })
      ]);

      // Calculate profit/loss from closed positions
      const totalProfit = closedPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0);
      const wonTrades = closedPositions.filter(p => p.profitLoss > 0).length;
      const lostTrades = closedPositions.filter(p => p.profitLoss < 0).length;
      const winRate = closedPositions.length > 0
        ? (wonTrades / closedPositions.length) * 100
        : 0;

      // Get today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayPositions = closedPositions.filter(p =>
        p.closedAt && new Date(p.closedAt) >= today
      );
      const todayProfit = todayPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0);

      res.json({
        success: true,
        data: {
          positions: {
            open: openPositions,
            closed: closedPositions.length,
            total: openPositions + closedPositions.length
          },
          signals: {
            total: totalSignals,
            active: activeSignals
          },
          performance: {
            totalProfit: Math.round(totalProfit * 100) / 100,
            todayProfit: Math.round(todayProfit * 100) / 100,
            winRate: Math.round(winRate * 100) / 100,
            wonTrades,
            lostTrades
          },
          // Account balance would come from MT5 connection
          account: {
            balance: 0,
            equity: 0,
            margin: 0,
            freeMargin: 0
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new DashboardController();
