import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import User from '../models/User';
import Position from '../models/Position';
import Signal from '../models/Signal';
import AuditLog from '../models/AuditLog';
import monitoringService from '../services/admin/monitoring.service';
import userManagementService from '../services/admin/user-management.service';
import { AppError } from '../utils/errors';

export class AdminController {
  // ==================== USER MANAGEMENT ====================

  /**
   * Get all users with filters and stats
   * GET /api/admin/users
   */
  async getAllUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        status: req.query.status as 'active' | 'suspended' | 'pending',
        role: req.query.role as 'user' | 'admin',
        search: req.query.search as string,
        sortBy: req.query.sortBy as 'createdAt' | 'lastLogin' | 'email' | 'profit',
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const result = await userManagementService.getUsers(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get detailed user information
   * GET /api/admin/users/:userId
   */
  async getUserDetails(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      const userDetail = await userManagementService.getUserDetail(userId);

      if (!userDetail) {
        throw new AppError('User not found', 404);
      }

      res.json(userDetail);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user trading history
   * GET /api/admin/users/:userId/history
   */
  async getUserHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const history = await userManagementService.getUserTradingHistory(userId, page, limit);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Suspend a user
   * POST /api/admin/users/:userId/suspend
   */
  async suspendUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const adminId = req.user?.userId;

      if (!adminId) {
        throw new AppError('Admin ID required', 400);
      }

      const success = await userManagementService.suspendUser(userId, adminId, reason);

      if (!success) {
        throw new AppError('User not found', 404);
      }

      res.json({ message: 'User suspended successfully', userId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Activate a user
   * POST /api/admin/users/:userId/activate
   */
  async activateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const adminId = req.user?.userId;

      if (!adminId) {
        throw new AppError('Admin ID required', 400);
      }

      const success = await userManagementService.activateUser(userId, adminId);

      if (!success) {
        throw new AppError('User not found', 404);
      }

      res.json({ message: 'User activated successfully', userId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a user
   * DELETE /api/admin/users/:userId
   */
  async deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const adminId = req.user?.userId;

      if (!adminId) {
        throw new AppError('Admin ID required', 400);
      }

      const success = await userManagementService.deleteUser(userId, adminId);

      if (!success) {
        throw new AppError('User not found', 404);
      }

      res.json({ message: 'User deleted successfully', userId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset user password
   * POST /api/admin/users/:userId/reset-password
   */
  async resetUserPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const adminId = req.user?.userId;

      if (!adminId) {
        throw new AppError('Admin ID required', 400);
      }

      const tempPassword = await userManagementService.resetUserPassword(userId, adminId);

      res.json({
        message: 'Password reset successfully',
        temporaryPassword: tempPassword,
        note: 'User should change this password immediately after login'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable user 2FA
   * POST /api/admin/users/:userId/disable-2fa
   */
  async disableUser2FA(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const adminId = req.user?.userId;

      if (!adminId) {
        throw new AppError('Admin ID required', 400);
      }

      const success = await userManagementService.disable2FA(userId, adminId);

      if (!success) {
        throw new AppError('User not found', 404);
      }

      res.json({ message: '2FA disabled successfully', userId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk suspend users
   * POST /api/admin/users/bulk-suspend
   */
  async bulkSuspend(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userIds, reason } = req.body;
      const adminId = req.user?.userId;

      if (!adminId) {
        throw new AppError('Admin ID required', 400);
      }

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new AppError('User IDs array required', 400);
      }

      const result = await userManagementService.bulkSuspend(userIds, adminId, reason);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Compare user performance
   * POST /api/admin/users/compare
   */
  async compareUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length < 2) {
        throw new AppError('At least 2 user IDs required', 400);
      }

      const comparison = await userManagementService.compareUserPerformance(userIds);
      res.json({ comparison });
    } catch (error) {
      next(error);
    }
  }

  // ==================== SYSTEM MONITORING ====================

  /**
   * Get system health status
   * GET /api/admin/system/health
   */
  async getSystemHealth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await monitoringService.getSystemHealth();
      res.json(health);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get comprehensive system metrics
   * GET /api/admin/system/metrics
   */
  async getSystemMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await monitoringService.getSystemMetrics();
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get system statistics (legacy endpoint)
   * GET /api/admin/stats
   */
  async getSystemStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        totalUsers,
        activeUsers,
        totalPositions,
        openPositions,
        totalSignals,
        activeSignals
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        Position.countDocuments(),
        Position.countDocuments({ status: 'OPEN' }),
        Signal.countDocuments(),
        Signal.countDocuments({ status: 'ACTIVE' })
      ]);

      const closedPositions = await Position.find({ status: 'CLOSED' });
      const systemProfit = closedPositions.reduce((sum, p) => sum + p.profitLoss, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayPositions, todaySignals] = await Promise.all([
        Position.countDocuments({ openedAt: { $gte: today } }),
        Signal.countDocuments({ createdAt: { $gte: today } })
      ]);

      res.json({
        users: {
          total: totalUsers,
          activeLastWeek: activeUsers
        },
        positions: {
          total: totalPositions,
          open: openPositions,
          closed: closedPositions.length,
          todayOpened: todayPositions
        },
        signals: {
          total: totalSignals,
          active: activeSignals,
          todayReceived: todaySignals
        },
        financial: {
          systemProfit: Math.round(systemProfit * 100) / 100,
          avgProfitPerTrade: closedPositions.length > 0
            ? Math.round((systemProfit / closedPositions.length) * 100) / 100
            : 0
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get error metrics
   * GET /api/admin/system/errors
   */
  async getErrorMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = await monitoringService.getErrorMetrics();
      res.json(errors);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get MT5 connection status
   * GET /api/admin/system/mt5-status
   */
  async getMT5Status(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await monitoringService.getMT5ConnectionStatus();
      res.json(status);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get real-time trading metrics
   * GET /api/admin/system/realtime
   */
  async getRealTimeMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await monitoringService.getRealTimeMetrics();
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }

  // ==================== AUDIT LOGS ====================

  /**
   * Get audit logs with filters
   * GET /api/admin/audit-logs
   */
  async getAuditLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const filter: Record<string, unknown> = {};

      if (req.query.userId) {
        filter.userId = req.query.userId;
      }
      if (req.query.action) {
        filter.action = { $regex: req.query.action, $options: 'i' };
      }
      if (req.query.resourceType) {
        filter.resourceType = req.query.resourceType;
      }
      if (req.query.startDate || req.query.endDate) {
        filter.createdAt = {};
        if (req.query.startDate) {
          (filter.createdAt as Record<string, Date>).$gte = new Date(req.query.startDate as string);
        }
        if (req.query.endDate) {
          (filter.createdAt as Record<string, Date>).$lte = new Date(req.query.endDate as string);
        }
      }
      if (req.query.success !== undefined) {
        filter.success = req.query.success === 'true';
      }
      if (req.query.search) {
        filter.$or = [
          { action: { $regex: req.query.search, $options: 'i' } },
          { 'details.error': { $regex: req.query.search, $options: 'i' } }
        ];
      }

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'email')
          .lean(),
        AuditLog.countDocuments(filter)
      ]);

      res.json({
        total,
        page,
        pages: Math.ceil(total / limit),
        logs
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export audit logs to CSV
   * GET /api/admin/audit-logs/export
   */
  async exportAuditLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter: Record<string, unknown> = {};

      if (req.query.userId) {
        filter.userId = req.query.userId;
      }
      if (req.query.startDate || req.query.endDate) {
        filter.createdAt = {};
        if (req.query.startDate) {
          (filter.createdAt as Record<string, Date>).$gte = new Date(req.query.startDate as string);
        }
        if (req.query.endDate) {
          (filter.createdAt as Record<string, Date>).$lte = new Date(req.query.endDate as string);
        }
      }

      const logs = await AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .populate('userId', 'email')
        .lean();

      // Generate CSV
      const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Success', 'IP Address', 'Details'];
      const rows = logs.map(log => [
        log.createdAt.toISOString(),
        (log.userId as { email?: string })?.email || 'system',
        log.action,
        log.resourceType || '',
        log.resourceId || '',
        log.success ? 'Yes' : 'No',
        log.ipAddress || '',
        JSON.stringify(log.details || {})
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      const dateStr = new Date().toISOString().split('T')[0];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${dateStr}.csv"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get security events
   * GET /api/admin/audit-logs/security
   */
  async getSecurityEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const securityActions = [
        'LOGIN_FAILED',
        'ACCOUNT_LOCKED',
        'USER_SUSPENDED',
        'PASSWORD_RESET',
        'USER_PASSWORD_RESET',
        '2FA_ENABLED',
        '2FA_DISABLED',
        'USER_2FA_DISABLED',
        'SUSPICIOUS_ACTIVITY',
        'TP_HIT',
        'SL_HIT',
        'SECURITY_ALERT'
      ];

      const [logs, total] = await Promise.all([
        AuditLog.find({ action: { $in: securityActions } })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'email')
          .lean(),
        AuditLog.countDocuments({ action: { $in: securityActions } })
      ]);

      res.json({
        total,
        page,
        pages: Math.ceil(total / limit),
        logs
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADVANCED ANALYTICS ====================

  /**
   * Get system-wide profit tracking
   * GET /api/admin/analytics/profit
   */
  async getSystemProfit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period as string) || '30d';
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const closedPositions = await Position.find({
        status: 'CLOSED',
        closedAt: { $gte: startDate }
      }).sort({ closedAt: 1 });

      // Group by day
      const dailyData = new Map<string, { profit: number; trades: number; users: Set<string> }>();

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dailyData.set(dateStr, { profit: 0, trades: 0, users: new Set() });
      }

      for (const position of closedPositions) {
        if (position.closedAt) {
          const dateStr = position.closedAt.toISOString().split('T')[0];
          const existing = dailyData.get(dateStr);
          if (existing) {
            existing.profit += position.profitLoss;
            existing.trades++;
            existing.users.add(position.userId.toString());
          }
        }
      }

      const chartData = Array.from(dailyData.entries()).map(([date, data]) => ({
        date,
        profit: Math.round(data.profit * 100) / 100,
        trades: data.trades,
        activeUsers: data.users.size
      }));

      const totalProfit = closedPositions.reduce((sum, p) => sum + p.profitLoss, 0);
      const uniqueUsers = new Set(closedPositions.map(p => p.userId.toString())).size;

      res.json({
        period,
        chartData,
        summary: {
          totalProfit: Math.round(totalProfit * 100) / 100,
          totalTrades: closedPositions.length,
          activeUsers: uniqueUsers,
          avgProfitPerTrade: closedPositions.length > 0
            ? Math.round((totalProfit / closedPositions.length) * 100) / 100
            : 0
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get signal success rates
   * GET /api/admin/analytics/signals
   */
  async getSignalAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const [totalSignals, signals] = await Promise.all([
        Signal.countDocuments(),
        Signal.find().lean()
      ]);

      const byStatus = {
        active: signals.filter(s => s.status === 'ACTIVE').length,
        closed: signals.filter(s => s.status === 'CLOSED').length,
        expired: signals.filter(s => s.status === 'EXPIRED').length
      };

      const bySource: Record<string, number> = {};
      signals.forEach(s => {
        const source = s.source || 'manual';
        bySource[source] = (bySource[source] || 0) + 1;
      });

      // Get positions created from signals
      const positionsFromSignals = await Position.find({
        signalId: { $exists: true, $ne: null }
      }).lean();

      const successfulPositions = positionsFromSignals.filter(p =>
        p.status === 'CLOSED' && p.profitLoss > 0
      ).length;

      const successRate = positionsFromSignals.length > 0
        ? (successfulPositions / positionsFromSignals.length) * 100
        : 0;

      res.json({
        totalSignals,
        byStatus,
        bySource: Object.entries(bySource).map(([source, count]) => ({ source, count })),
        execution: {
          executed: positionsFromSignals.length,
          successful: successfulPositions,
          successRate: Math.round(successRate * 10) / 10
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get risk metrics dashboard
   * GET /api/admin/analytics/risk
   */
  async getRiskDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const openPositions = await Position.find({ status: 'OPEN' }).lean();

      // Calculate system-wide risk metrics
      const totalExposure = openPositions.reduce((sum, p) => sum + (p.lotSize * p.entryPrice), 0);
      const totalUnrealizedPnL = openPositions.reduce((sum, p) => sum + p.profitLoss, 0);

      // Group by symbol
      const bySymbol: Record<string, { count: number; exposure: number; pnl: number }> = {};
      openPositions.forEach(p => {
        if (!bySymbol[p.symbol]) {
          bySymbol[p.symbol] = { count: 0, exposure: 0, pnl: 0 };
        }
        bySymbol[p.symbol].count++;
        bySymbol[p.symbol].exposure += p.lotSize * p.entryPrice;
        bySymbol[p.symbol].pnl += p.profitLoss;
      });

      // Get positions at risk (negative PnL)
      const atRiskPositions = openPositions.filter(p => p.profitLoss < 0);
      const atRiskValue = Math.abs(atRiskPositions.reduce((sum, p) => sum + p.profitLoss, 0));

      // Get positions with SL secured
      const securedPositions = openPositions.filter(p => p.slSecured);

      res.json({
        openPositions: openPositions.length,
        totalExposure: Math.round(totalExposure * 100) / 100,
        totalUnrealizedPnL: Math.round(totalUnrealizedPnL * 100) / 100,
        atRisk: {
          count: atRiskPositions.length,
          value: Math.round(atRiskValue * 100) / 100
        },
        secured: {
          count: securedPositions.length,
          percentage: openPositions.length > 0
            ? Math.round((securedPositions.length / openPositions.length) * 100)
            : 0
        },
        bySymbol: Object.entries(bySymbol).map(([symbol, data]) => ({
          symbol,
          positions: data.count,
          exposure: Math.round(data.exposure * 100) / 100,
          pnl: Math.round(data.pnl * 100) / 100
        })).sort((a, b) => b.exposure - a.exposure)
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();
