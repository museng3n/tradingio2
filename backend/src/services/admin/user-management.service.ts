import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User, { IUser } from '../../models/User';
import Position from '../../models/Position';
import Signal from '../../models/Signal';
import AuditLog from '../../models/AuditLog';
import logger from '../../utils/logger';

export interface UserListItem {
  id: string;
  email: string;
  role: string;
  status: string;
  twoFactorEnabled: boolean;
  createdAt: Date;
  lastLogin?: Date;
  stats: {
    totalPositions: number;
    openPositions: number;
    totalProfit: number;
    winRate: number;
  };
}

export interface UserDetail extends UserListItem {
  tradingHistory: {
    positions: number;
    signals: number;
    profitLoss: number;
    bestTrade: number;
    worstTrade: number;
    avgTrade: number;
  };
  recentActivity: Array<{
    action: string;
    timestamp: Date;
    details?: Record<string, unknown>;
  }>;
  riskMetrics: {
    maxDrawdown: number;
    avgPositionSize: number;
    riskPerTrade: number;
  };
}

export interface UserFilters {
  status?: 'active' | 'suspended' | 'pending';
  role?: 'user' | 'admin';
  search?: string;
  sortBy?: 'createdAt' | 'lastLogin' | 'email' | 'profit';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface BulkActionResult {
  success: number;
  failed: number;
  errors: Array<{ userId: string; error: string }>;
}

export class UserManagementService {
  /**
   * Get paginated list of users with stats
   */
  async getUsers(filters: UserFilters = {}): Promise<{
    users: UserListItem[];
    total: number;
    page: number;
    pages: number;
  }> {
    const {
      status,
      role,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = filters;

    const query: Record<string, unknown> = {};

    if (status) {
      query.status = status;
    }
    if (role) {
      query.role = role;
    }
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -twoFactorSecret -refreshTokens')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    // Get stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const stats = await this.getUserQuickStats(user._id.toString());
        return {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          status: user.status,
          twoFactorEnabled: user.twoFactorEnabled,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          stats
        };
      })
    );

    return {
      users: usersWithStats,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Get quick stats for a user
   */
  private async getUserQuickStats(userId: string): Promise<{
    totalPositions: number;
    openPositions: number;
    totalProfit: number;
    winRate: number;
  }> {
    const [totalPositions, openPositions, closedPositions] = await Promise.all([
      Position.countDocuments({ userId }),
      Position.countDocuments({ userId, status: 'OPEN' }),
      Position.find({ userId, status: 'CLOSED' }).lean()
    ]);

    const totalProfit = closedPositions.reduce((sum, p) => sum + p.profitLoss, 0);
    const wins = closedPositions.filter(p => p.profitLoss > 0).length;
    const winRate = closedPositions.length > 0 ? (wins / closedPositions.length) * 100 : 0;

    return {
      totalPositions,
      openPositions,
      totalProfit: Math.round(totalProfit * 100) / 100,
      winRate: Math.round(winRate * 10) / 10
    };
  }

  /**
   * Get detailed user information
   */
  async getUserDetail(userId: string): Promise<UserDetail | null> {
    const user = await User.findById(userId)
      .select('-password -twoFactorSecret -refreshTokens')
      .lean();

    if (!user) {
      return null;
    }

    const [positions, signals, recentLogs] = await Promise.all([
      Position.find({ userId }).lean(),
      Signal.countDocuments({ userId }),
      AuditLog.find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    const closedPositions = positions.filter(p => p.status === 'CLOSED');
    const openPositions = positions.filter(p => p.status === 'OPEN');

    // Calculate trading history
    const profitLoss = closedPositions.reduce((sum, p) => sum + p.profitLoss, 0);
    const profits = closedPositions.map(p => p.profitLoss);
    const bestTrade = profits.length > 0 ? Math.max(...profits) : 0;
    const worstTrade = profits.length > 0 ? Math.min(...profits) : 0;
    const avgTrade = closedPositions.length > 0 ? profitLoss / closedPositions.length : 0;

    // Calculate win rate for stats
    const wins = closedPositions.filter(p => p.profitLoss > 0).length;
    const winRate = closedPositions.length > 0 ? (wins / closedPositions.length) * 100 : 0;

    // Calculate risk metrics
    const lotSizes = positions.map(p => p.lotSize);
    const avgPositionSize = lotSizes.length > 0
      ? lotSizes.reduce((a, b) => a + b, 0) / lotSizes.length
      : 0;

    // Calculate max drawdown (simplified)
    let maxDrawdown = 0;
    let peak = 0;
    let cumulative = 0;
    for (const p of closedPositions.sort((a, b) =>
      (a.closedAt?.getTime() || 0) - (b.closedAt?.getTime() || 0)
    )) {
      cumulative += p.profitLoss;
      if (cumulative > peak) {
        peak = cumulative;
      }
      const drawdown = peak - cumulative;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      stats: {
        totalPositions: positions.length,
        openPositions: openPositions.length,
        totalProfit: Math.round(profitLoss * 100) / 100,
        winRate: Math.round(winRate * 10) / 10
      },
      tradingHistory: {
        positions: positions.length,
        signals,
        profitLoss: Math.round(profitLoss * 100) / 100,
        bestTrade: Math.round(bestTrade * 100) / 100,
        worstTrade: Math.round(worstTrade * 100) / 100,
        avgTrade: Math.round(avgTrade * 100) / 100
      },
      recentActivity: recentLogs.map(log => ({
        action: log.action,
        timestamp: log.createdAt,
        details: log.details
      })),
      riskMetrics: {
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        avgPositionSize: Math.round(avgPositionSize * 100) / 100,
        riskPerTrade: 2 // Default risk percentage
      }
    };
  }

  /**
   * Suspend a user
   */
  async suspendUser(userId: string, adminId: string, reason?: string): Promise<boolean> {
    const user = await User.findById(userId);

    if (!user) {
      return false;
    }

    if (user.role === 'ADMIN') {
      throw new Error('Cannot suspend admin users');
    }

    user.status = 'SUSPENDED';
    await user.save();

    // Log the action
    await AuditLog.create({
      userId: adminId,
      action: 'USER_SUSPENDED',
      resourceType: 'user',
      resourceId: userId,
      details: { targetUser: user.email, reason },
      ipAddress: 'admin-action',
      userAgent: 'admin-panel'
    });

    logger.info(`User ${user.email} suspended by admin ${adminId}`, { reason });

    return true;
  }

  /**
   * Activate a user
   */
  async activateUser(userId: string, adminId: string): Promise<boolean> {
    const user = await User.findById(userId);

    if (!user) {
      return false;
    }

    user.status = 'ACTIVE';
    await user.save();

    await AuditLog.create({
      userId: adminId,
      action: 'USER_ACTIVATED',
      resourceType: 'user',
      resourceId: userId,
      details: { targetUser: user.email },
      ipAddress: 'admin-action',
      userAgent: 'admin-panel'
    });

    logger.info(`User ${user.email} activated by admin ${adminId}`);

    return true;
  }

  /**
   * Delete a user and all their data
   */
  async deleteUser(userId: string, adminId: string): Promise<boolean> {
    const user = await User.findById(userId);

    if (!user) {
      return false;
    }

    if (user.role === 'ADMIN') {
      throw new Error('Cannot delete admin users');
    }

    // Delete all user data
    await Promise.all([
      Position.deleteMany({ userId }),
      Signal.deleteMany({ userId }),
      AuditLog.deleteMany({ userId })
    ]);

    // Delete the user
    await User.findByIdAndDelete(userId);

    // Log the deletion (use admin's ID since user is deleted)
    await AuditLog.create({
      userId: adminId,
      action: 'USER_DELETED',
      resourceType: 'user',
      resourceId: userId,
      details: { deletedEmail: user.email },
      ipAddress: 'admin-action',
      userAgent: 'admin-panel'
    });

    logger.info(`User ${user.email} deleted by admin ${adminId}`);

    return true;
  }

  /**
   * Reset user password
   */
  async resetUserPassword(userId: string, adminId: string): Promise<string> {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    user.password = hashedPassword;
    await user.save();

    await AuditLog.create({
      userId: adminId,
      action: 'USER_PASSWORD_RESET',
      resourceType: 'user',
      resourceId: userId,
      details: { targetUser: user.email },
      ipAddress: 'admin-action',
      userAgent: 'admin-panel'
    });

    logger.info(`Password reset for user ${user.email} by admin ${adminId}`);

    return tempPassword;
  }

  /**
   * Disable 2FA for a user
   */
  async disable2FA(userId: string, adminId: string): Promise<boolean> {
    const user = await User.findById(userId);

    if (!user) {
      return false;
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    await AuditLog.create({
      userId: adminId,
      action: 'USER_2FA_DISABLED',
      resourceType: 'user',
      resourceId: userId,
      details: { targetUser: user.email },
      ipAddress: 'admin-action',
      userAgent: 'admin-panel'
    });

    logger.info(`2FA disabled for user ${user.email} by admin ${adminId}`);

    return true;
  }

  /**
   * Bulk suspend users
   */
  async bulkSuspend(userIds: string[], adminId: string, reason?: string): Promise<BulkActionResult> {
    const result: BulkActionResult = { success: 0, failed: 0, errors: [] };

    for (const userId of userIds) {
      try {
        const success = await this.suspendUser(userId, adminId, reason);
        if (success) {
          result.success++;
        } else {
          result.failed++;
          result.errors.push({ userId, error: 'User not found' });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  /**
   * Get user trading history
   */
  async getUserTradingHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    positions: Array<{
      id: string;
      symbol: string;
      type: string;
      entryPrice: number;
      closePrice?: number;
      profitLoss: number;
      status: string;
      openedAt: Date;
      closedAt?: Date;
    }>;
    total: number;
    page: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const [positions, total] = await Promise.all([
      Position.find({ userId })
        .sort({ openedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Position.countDocuments({ userId })
    ]);

    return {
      positions: positions.map(p => ({
        id: p._id.toString(),
        symbol: p.symbol,
        type: p.type,
        entryPrice: p.entryPrice,
        closePrice: p.closePrice,
        profitLoss: Math.round(p.profitLoss * 100) / 100,
        status: p.status,
        openedAt: p.openedAt,
        closedAt: p.closedAt
      })),
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Compare user performance
   */
  async compareUserPerformance(userIds: string[]): Promise<Array<{
    userId: string;
    email: string;
    totalTrades: number;
    winRate: number;
    totalProfit: number;
    avgProfit: number;
    profitFactor: number;
  }>> {
    const results = await Promise.all(
      userIds.map(async (userId) => {
        const user = await User.findById(userId).select('email').lean();
        const positions = await Position.find({ userId, status: 'CLOSED' }).lean();

        if (!user) {
          return null;
        }

        const wins = positions.filter(p => p.profitLoss > 0);
        const losses = positions.filter(p => p.profitLoss < 0);

        const totalProfit = positions.reduce((sum, p) => sum + p.profitLoss, 0);
        const totalWins = wins.reduce((sum, p) => sum + p.profitLoss, 0);
        const totalLosses = Math.abs(losses.reduce((sum, p) => sum + p.profitLoss, 0));

        return {
          userId,
          email: user.email,
          totalTrades: positions.length,
          winRate: positions.length > 0 ? Math.round((wins.length / positions.length) * 100 * 10) / 10 : 0,
          totalProfit: Math.round(totalProfit * 100) / 100,
          avgProfit: positions.length > 0 ? Math.round((totalProfit / positions.length) * 100) / 100 : 0,
          profitFactor: totalLosses > 0 ? Math.round((totalWins / totalLosses) * 100) / 100 : totalWins > 0 ? 999 : 0
        };
      })
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  }
}

export default new UserManagementService();
