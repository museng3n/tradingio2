import mongoose from 'mongoose';
import os from 'os';
import User from '../../models/User';
import Position from '../../models/Position';
import Signal from '../../models/Signal';
import AuditLog from '../../models/AuditLog';
import { priceMonitorService } from '../trading';
import logger from '../../utils/logger';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  timestamp: Date;
  components: {
    database: ComponentHealth;
    priceMonitor: ComponentHealth;
    memory: ComponentHealth;
    cpu: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'critical';
  message: string;
  details?: Record<string, unknown>;
}

export interface SystemMetrics {
  users: {
    total: number;
    active: number;
    suspended: number;
    newToday: number;
    newThisWeek: number;
  };
  positions: {
    total: number;
    open: number;
    closedToday: number;
    totalProfit: number;
    todayProfit: number;
  };
  signals: {
    total: number;
    active: number;
    processedToday: number;
    successRate: number;
  };
  system: {
    memoryUsage: number;
    cpuLoad: number;
    uptime: number;
    activeConnections: number;
  };
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsToday: number;
  errorsByType: Array<{
    type: string;
    count: number;
    lastOccurrence: Date;
  }>;
  errorRate: number;
  recentErrors: Array<{
    action: string;
    error: string;
    userId?: string;
    timestamp: Date;
  }>;
}

export interface MT5ConnectionStatus {
  totalUsers: number;
  connectedUsers: number;
  disconnectedUsers: number;
  connectionRate: number;
  connections: Array<{
    userId: string;
    email: string;
    connected: boolean;
    lastActivity?: Date;
  }>;
}

export interface RealTimeMetrics {
  activePositions: number;
  monitoredPositions: number;
  openPnL: number;
  alertsToday: number;
  tpHitsToday: number;
  slHitsToday: number;
}

export class MonitoringService {
  private errorCache: Array<{
    action: string;
    error: string;
    userId?: string;
    timestamp: Date;
  }> = [];
  private readonly MAX_ERROR_CACHE = 100;

  /**
   * Get overall system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const [dbHealth, monitorHealth, memoryHealth, cpuHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkPriceMonitorHealth(),
      this.checkMemoryHealth(),
      this.checkCPUHealth()
    ]);

    // Determine overall status
    const components = { database: dbHealth, priceMonitor: monitorHealth, memory: memoryHealth, cpu: cpuHealth };
    const statuses = Object.values(components).map(c => c.status);

    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (statuses.includes('critical')) {
      overallStatus = 'critical';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      uptime: process.uptime(),
      timestamp: new Date(),
      components
    };
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    try {
      const state = mongoose.connection.readyState;
      const stateNames: Record<number, string> = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      if (state === 1) {
        // Test with a simple query
        await User.countDocuments().maxTimeMS(5000);
        return {
          status: 'healthy',
          message: 'Database connected and responsive',
          details: { state: stateNames[state] }
        };
      } else {
        return {
          status: 'critical',
          message: `Database ${stateNames[state] || 'unknown state'}`,
          details: { state: stateNames[state] }
        };
      }
    } catch (error) {
      return {
        status: 'critical',
        message: 'Database query failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check price monitor health
   */
  private checkPriceMonitorHealth(): ComponentHealth {
    try {
      const status = priceMonitorService.getStatus();

      if (status.isMonitoring || status.positionCount === 0) {
        return {
          status: 'healthy',
          message: status.isMonitoring
            ? `Monitoring ${status.positionCount} positions`
            : 'No positions to monitor',
          details: status
        };
      } else {
        return {
          status: 'degraded',
          message: 'Price monitor not running with open positions',
          details: status
        };
      }
    } catch (error) {
      return {
        status: 'critical',
        message: 'Price monitor check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check memory health
   */
  private checkMemoryHealth(): ComponentHealth {
    const used = process.memoryUsage();
    const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
    const usagePercent = (used.heapUsed / used.heapTotal) * 100;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    let message = `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`;

    if (usagePercent > 90) {
      status = 'critical';
      message = `Critical memory usage: ${message}`;
    } else if (usagePercent > 75) {
      status = 'degraded';
      message = `High memory usage: ${message}`;
    }

    return {
      status,
      message,
      details: {
        heapUsedMB,
        heapTotalMB,
        usagePercent: Math.round(usagePercent),
        rss: Math.round(used.rss / 1024 / 1024)
      }
    };
  }

  /**
   * Check CPU health
   */
  private checkCPUHealth(): ComponentHealth {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const cpuCount = cpus.length;
    const normalizedLoad = loadAvg[0] / cpuCount * 100;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    let message = `Load: ${loadAvg[0].toFixed(2)} (${normalizedLoad.toFixed(1)}% of ${cpuCount} cores)`;

    if (normalizedLoad > 90) {
      status = 'critical';
      message = `Critical CPU load: ${message}`;
    } else if (normalizedLoad > 70) {
      status = 'degraded';
      message = `High CPU load: ${message}`;
    }

    return {
      status,
      message,
      details: {
        cores: cpuCount,
        loadAverage: loadAvg,
        normalizedLoad: Math.round(normalizedLoad)
      }
    };
  }

  /**
   * Get comprehensive system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      newUsersToday,
      newUsersWeek,
      totalPositions,
      openPositions,
      closedToday,
      allClosedPositions,
      todayClosedPositions,
      totalSignals,
      activeSignals,
      processedToday,
      successfulSignals
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'suspended' }),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      Position.countDocuments(),
      Position.countDocuments({ status: 'OPEN' }),
      Position.countDocuments({ closedAt: { $gte: today } }),
      Position.find({ status: 'CLOSED' }),
      Position.find({ status: 'CLOSED', closedAt: { $gte: today } }),
      Signal.countDocuments(),
      Signal.countDocuments({ status: 'ACTIVE' }),
      Signal.countDocuments({ updatedAt: { $gte: today } }),
      Signal.countDocuments({ status: 'CLOSED' })
    ]);

    const totalProfit = allClosedPositions.reduce((sum, p) => sum + p.profitLoss, 0);
    const todayProfit = todayClosedPositions.reduce((sum, p) => sum + p.profitLoss, 0);
    const successRate = totalSignals > 0 ? (successfulSignals / totalSignals) * 100 : 0;

    const memUsage = process.memoryUsage();
    const loadAvg = os.loadavg();

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersWeek
      },
      positions: {
        total: totalPositions,
        open: openPositions,
        closedToday,
        totalProfit: Math.round(totalProfit * 100) / 100,
        todayProfit: Math.round(todayProfit * 100) / 100
      },
      signals: {
        total: totalSignals,
        active: activeSignals,
        processedToday,
        successRate: Math.round(successRate * 10) / 10
      },
      system: {
        memoryUsage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
        cpuLoad: Math.round(loadAvg[0] * 100) / 100,
        uptime: Math.round(process.uptime()),
        activeConnections: priceMonitorService.getStatus().positionCount
      }
    };
  }

  /**
   * Get error metrics
   */
  async getErrorMetrics(): Promise<ErrorMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get failed audit logs as error indicators
    const [totalErrors, errorsToday, errorsByAction] = await Promise.all([
      AuditLog.countDocuments({ success: false }),
      AuditLog.countDocuments({ success: false, createdAt: { $gte: today } }),
      AuditLog.aggregate([
        { $match: { success: false } },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            lastOccurrence: { $max: '$createdAt' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Get recent errors
    const recentErrorLogs = await AuditLog.find({ success: false })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const totalActions = await AuditLog.countDocuments({ createdAt: { $gte: today } });
    const errorRate = totalActions > 0 ? (errorsToday / totalActions) * 100 : 0;

    return {
      totalErrors,
      errorsToday,
      errorsByType: errorsByAction.map(e => ({
        type: e._id,
        count: e.count,
        lastOccurrence: e.lastOccurrence
      })),
      errorRate: Math.round(errorRate * 100) / 100,
      recentErrors: recentErrorLogs.map(e => ({
        action: e.action,
        error: e.errorMessage || 'Unknown error',
        userId: e.userId?.toString(),
        timestamp: e.createdAt
      }))
    };
  }

  /**
   * Get MT5 connection status for all users
   */
  async getMT5ConnectionStatus(): Promise<MT5ConnectionStatus> {
    const users = await User.find({ status: 'active' }).select('_id email').lean();

    // In a real implementation, we'd check actual MT5 connections
    // For now, we'll track based on recent position activity
    const recentActivity = new Date();
    recentActivity.setMinutes(recentActivity.getMinutes() - 30);

    const activeUserIds = await Position.distinct('userId', {
      status: 'OPEN',
      updatedAt: { $gte: recentActivity }
    });

    const connections = users.map(user => ({
      userId: user._id.toString(),
      email: user.email,
      connected: activeUserIds.some(id => id.toString() === user._id.toString()),
      lastActivity: undefined
    }));

    const connectedCount = connections.filter(c => c.connected).length;

    return {
      totalUsers: users.length,
      connectedUsers: connectedCount,
      disconnectedUsers: users.length - connectedCount,
      connectionRate: users.length > 0 ? Math.round((connectedCount / users.length) * 100) : 0,
      connections
    };
  }

  /**
   * Get real-time trading metrics
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [openPositions, todayAuditLogs] = await Promise.all([
      Position.find({ status: 'OPEN' }),
      AuditLog.find({
        createdAt: { $gte: today },
        action: { $in: ['TP_HIT', 'SL_HIT', 'SECURITY_ALERT'] }
      })
    ]);

    const monitorStatus = priceMonitorService.getStatus();
    const openPnL = openPositions.reduce((sum, p) => sum + p.profitLoss, 0);

    const tpHitsToday = todayAuditLogs.filter(l => l.action === 'TP_HIT').length;
    const slHitsToday = todayAuditLogs.filter(l => l.action === 'SL_HIT').length;
    const alertsToday = todayAuditLogs.filter(l => l.action === 'SECURITY_ALERT').length;

    return {
      activePositions: openPositions.length,
      monitoredPositions: monitorStatus.positionCount,
      openPnL: Math.round(openPnL * 100) / 100,
      alertsToday,
      tpHitsToday,
      slHitsToday
    };
  }

  /**
   * Log an error for tracking
   */
  logError(action: string, error: string, userId?: string): void {
    this.errorCache.push({
      action,
      error,
      userId,
      timestamp: new Date()
    });

    if (this.errorCache.length > this.MAX_ERROR_CACHE) {
      this.errorCache.shift();
    }
  }

  /**
   * Get cached errors
   */
  getCachedErrors(): Array<{ action: string; error: string; userId?: string; timestamp: Date }> {
    return [...this.errorCache].reverse();
  }
}

export default new MonitoringService();
