import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import Position from '../models/Position';
import Signal from '../models/Signal';
import { getConnectionService } from '../services/mt5/connection.service';

export class DashboardController {
  /**
   * Get dashboard statistics
   */
  async getStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get position stats
      const [openPositions, closedPositions, totalSignals, activeSignals, accountInfo] = await Promise.all([
        Position.find({ userId, status: 'OPEN' }),
        Position.find({ userId, status: 'CLOSED' }),
        Signal.countDocuments({ userId }),
        Signal.countDocuments({ userId, status: 'ACTIVE' }),
        getConnectionService(userId!).getAccountInfo()
      ]);

      // Calculate profit/loss from closed positions
      const totalProfit = closedPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0);
      const openProfitLoss = openPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0);
      const wonTrades = closedPositions.filter(p => p.profitLoss > 0).length;
      const lostTrades = closedPositions.filter(p => p.profitLoss < 0).length;
      const winRate = closedPositions.length > 0
        ? (wonTrades / closedPositions.length) * 100
        : 0;

      // Get today's stats
      const todayPositions = closedPositions.filter(p =>
        p.closedAt && new Date(p.closedAt) >= today && new Date(p.closedAt) <= now
      );
      const todayProfit = todayPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0);

      const weekPositions = closedPositions.filter(p =>
        p.closedAt && new Date(p.closedAt) >= startOfWeek && new Date(p.closedAt) <= now
      );
      const weekProfitLoss = weekPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0);

      const monthPositions = closedPositions.filter(p =>
        p.closedAt && new Date(p.closedAt) >= startOfMonth && new Date(p.closedAt) <= now
      );
      const monthProfitLoss = monthPositions.reduce((sum, p) => sum + (p.profitLoss || 0), 0);

      res.json({
        success: true,
        data: {
          positions: {
            open: openPositions.length,
            closed: closedPositions.length,
            total: openPositions.length + closedPositions.length
          },
          signals: {
            total: totalSignals,
            active: activeSignals
          },
          performance: {
            totalProfit: Math.round(totalProfit * 100) / 100,
            todayProfit: Math.round(todayProfit * 100) / 100,
            openProfitLoss: Math.round(openProfitLoss * 100) / 100,
            weekProfitLoss: Math.round(weekProfitLoss * 100) / 100,
            monthProfitLoss: Math.round(monthProfitLoss * 100) / 100,
            winRate: Math.round(winRate * 100) / 100,
            wonTrades,
            lostTrades
          },
          // Account balance would come from MT5 connection
          account: {
            balance: 0,
            equity: 0,
            margin: 0,
            freeMargin: 0,
            marginLevel: accountInfo?.marginLevel ?? 0
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new DashboardController();
