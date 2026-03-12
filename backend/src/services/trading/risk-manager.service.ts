import { getConnectionService } from '../mt5/connection.service';
import Position from '../../models/Position';
import logger from '../../utils/logger';

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  details?: Record<string, unknown>;
}

export interface RiskLimits {
  maxPositionSizePercent: number;  // Max % of account per position
  maxDailyLossPercent: number;     // Max daily loss as % of starting balance
  maxOpenPositions: number;         // Maximum concurrent open positions
  minStopLoss: boolean;            // Require stop loss
  maxLotSize: number;              // Maximum lot size
  minLotSize: number;              // Minimum lot size
}

export class RiskManagerService {
  private defaultLimits: RiskLimits = {
    maxPositionSizePercent: parseFloat(process.env.MAX_POSITION_SIZE_PERCENT || '2'),
    maxDailyLossPercent: parseFloat(process.env.MAX_DAILY_LOSS_PERCENT || '5'),
    maxOpenPositions: parseInt(process.env.MAX_OPEN_POSITIONS || '10'),
    minStopLoss: true,
    maxLotSize: 10,
    minLotSize: 0.01
  };

  /**
   * Perform all risk checks before opening a position
   */
  async validateNewPosition(
    userId: string,
    symbol: string,
    type: 'BUY' | 'SELL',
    lotSize: number,
    entryPrice: number,
    sl: number,
    limits?: Partial<RiskLimits>
  ): Promise<RiskCheckResult> {
    const effectiveLimits = { ...this.defaultLimits, ...limits };

    // Check 1: Stop loss is mandatory
    if (effectiveLimits.minStopLoss && (!sl || sl <= 0)) {
      return {
        allowed: false,
        reason: 'Stop loss is mandatory for all positions'
      };
    }

    // Check 2: Validate stop loss direction
    if (type === 'BUY' && sl >= entryPrice) {
      return {
        allowed: false,
        reason: 'Stop loss must be below entry price for BUY orders'
      };
    }
    if (type === 'SELL' && sl <= entryPrice) {
      return {
        allowed: false,
        reason: 'Stop loss must be above entry price for SELL orders'
      };
    }

    // Check 3: Lot size limits
    if (lotSize < effectiveLimits.minLotSize) {
      return {
        allowed: false,
        reason: `Lot size below minimum (${effectiveLimits.minLotSize})`
      };
    }
    if (lotSize > effectiveLimits.maxLotSize) {
      return {
        allowed: false,
        reason: `Lot size above maximum (${effectiveLimits.maxLotSize})`
      };
    }

    // Check 4: Maximum open positions
    const openPositionsCheck = await this.checkMaxOpenPositions(userId, effectiveLimits.maxOpenPositions);
    if (!openPositionsCheck.allowed) {
      return openPositionsCheck;
    }

    // Check 5: Account balance check
    const balanceCheck = await this.checkAccountBalance(userId, lotSize, entryPrice, symbol);
    if (!balanceCheck.allowed) {
      return balanceCheck;
    }

    // Check 6: Position size as % of account
    const positionSizeCheck = await this.checkPositionSize(
      userId,
      lotSize,
      entryPrice,
      sl,
      effectiveLimits.maxPositionSizePercent
    );
    if (!positionSizeCheck.allowed) {
      return positionSizeCheck;
    }

    // Check 7: Daily loss limit
    const dailyLossCheck = await this.checkDailyLossLimit(userId, effectiveLimits.maxDailyLossPercent);
    if (!dailyLossCheck.allowed) {
      return dailyLossCheck;
    }

    logger.info(`Risk check passed for ${userId}: ${type} ${lotSize} ${symbol}`);

    return {
      allowed: true,
      details: {
        lotSize,
        symbol,
        type,
        checksPerformed: [
          'stopLoss',
          'lotSize',
          'maxPositions',
          'balance',
          'positionSize',
          'dailyLoss'
        ]
      }
    };
  }

  /**
   * Check maximum open positions
   */
  async checkMaxOpenPositions(userId: string, maxPositions: number): Promise<RiskCheckResult> {
    const openCount = await Position.countDocuments({ userId, status: 'OPEN' });

    if (openCount >= maxPositions) {
      return {
        allowed: false,
        reason: `Maximum open positions reached (${maxPositions})`,
        details: { currentOpen: openCount, max: maxPositions }
      };
    }

    return { allowed: true, details: { currentOpen: openCount, max: maxPositions } };
  }

  /**
   * Check account balance is sufficient
   */
  async checkAccountBalance(
    userId: string,
    lotSize: number,
    price: number,
    symbol: string
  ): Promise<RiskCheckResult> {
    const connection = getConnectionService(userId);
    const accountInfo = await connection.getAccountInfo();

    if (!accountInfo) {
      return {
        allowed: false,
        reason: 'Unable to get account information'
      };
    }

    // Calculate required margin (simplified)
    const symbolInfo = await connection.getSymbolInfo(symbol);
    const contractSize = symbolInfo?.contractSize || 100000;
    const requiredMargin = (lotSize * contractSize * price) / accountInfo.leverage;

    if (requiredMargin > accountInfo.freeMargin) {
      return {
        allowed: false,
        reason: 'Insufficient free margin',
        details: {
          requiredMargin,
          freeMargin: accountInfo.freeMargin,
          leverage: accountInfo.leverage
        }
      };
    }

    return {
      allowed: true,
      details: {
        requiredMargin,
        freeMargin: accountInfo.freeMargin
      }
    };
  }

  /**
   * Check position size as percentage of account
   */
  async checkPositionSize(
    userId: string,
    lotSize: number,
    entryPrice: number,
    sl: number,
    maxPercent: number
  ): Promise<RiskCheckResult> {
    const connection = getConnectionService(userId);
    const accountInfo = await connection.getAccountInfo();

    if (!accountInfo) {
      return {
        allowed: false,
        reason: 'Unable to get account information'
      };
    }

    // Calculate maximum loss at stop loss
    const priceDiff = Math.abs(entryPrice - sl);
    const maxLoss = priceDiff * lotSize * 100000; // Assuming forex, adjust for other instruments

    const percentOfAccount = (maxLoss / accountInfo.balance) * 100;

    if (percentOfAccount > maxPercent) {
      return {
        allowed: false,
        reason: `Position risk (${percentOfAccount.toFixed(2)}%) exceeds maximum (${maxPercent}%)`,
        details: {
          maxLoss,
          balance: accountInfo.balance,
          percentOfAccount,
          maxPercent
        }
      };
    }

    return {
      allowed: true,
      details: {
        maxLoss,
        percentOfAccount,
        maxPercent
      }
    };
  }

  /**
   * Check daily loss limit
   */
  async checkDailyLossLimit(userId: string, maxDailyLossPercent: number): Promise<RiskCheckResult> {
    const connection = getConnectionService(userId);
    const accountInfo = await connection.getAccountInfo();

    if (!accountInfo) {
      return {
        allowed: false,
        reason: 'Unable to get account information'
      };
    }

    // Get today's closed positions
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayClosedPositions = await Position.find({
      userId,
      status: 'CLOSED',
      closedAt: { $gte: today }
    });

    // Calculate today's realized P&L
    const todayPnL = todayClosedPositions.reduce((sum, p) => sum + p.profitLoss, 0);

    // Get unrealized P&L from open positions
    const openPositions = await Position.find({ userId, status: 'OPEN' });
    const unrealizedPnL = openPositions.reduce((sum, p) => sum + p.profitLoss, 0);

    const totalDailyPnL = todayPnL + unrealizedPnL;
    const dailyLossPercent = (Math.abs(Math.min(0, totalDailyPnL)) / accountInfo.balance) * 100;

    if (dailyLossPercent >= maxDailyLossPercent) {
      return {
        allowed: false,
        reason: `Daily loss limit reached (${dailyLossPercent.toFixed(2)}% of ${maxDailyLossPercent}%)`,
        details: {
          todayPnL,
          unrealizedPnL,
          totalDailyPnL,
          dailyLossPercent,
          maxDailyLossPercent
        }
      };
    }

    return {
      allowed: true,
      details: {
        todayPnL,
        unrealizedPnL,
        dailyLossPercent,
        maxDailyLossPercent
      }
    };
  }

  /**
   * Calculate optimal lot size based on risk percentage
   */
  async calculateLotSize(
    userId: string,
    entryPrice: number,
    sl: number,
    riskPercent: number = 1
  ): Promise<number | null> {
    const connection = getConnectionService(userId);
    const accountInfo = await connection.getAccountInfo();

    if (!accountInfo) {
      return null;
    }

    // Calculate risk amount
    const riskAmount = accountInfo.balance * (riskPercent / 100);

    // Calculate pip value
    const priceDiff = Math.abs(entryPrice - sl);

    // Calculate lot size (simplified for forex)
    const lotSize = riskAmount / (priceDiff * 100000);

    // Round to 2 decimal places and clamp to limits
    const roundedLotSize = Math.round(lotSize * 100) / 100;
    return Math.max(this.defaultLimits.minLotSize, Math.min(this.defaultLimits.maxLotSize, roundedLotSize));
  }

  /**
   * Get current risk metrics for user
   */
  async getRiskMetrics(userId: string): Promise<Record<string, unknown>> {
    const connection = getConnectionService(userId);
    const accountInfo = await connection.getAccountInfo();

    const openPositions = await Position.countDocuments({ userId, status: 'OPEN' });

    // Today's P&L
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayClosed = await Position.find({
      userId,
      status: 'CLOSED',
      closedAt: { $gte: today }
    });
    const todayPnL = todayClosed.reduce((sum, p) => sum + p.profitLoss, 0);

    // Unrealized P&L
    const openPos = await Position.find({ userId, status: 'OPEN' });
    const unrealizedPnL = openPos.reduce((sum, p) => sum + p.profitLoss, 0);

    return {
      accountBalance: accountInfo?.balance || 0,
      accountEquity: accountInfo?.equity || 0,
      freeMargin: accountInfo?.freeMargin || 0,
      marginLevel: accountInfo?.marginLevel || 0,
      openPositions,
      maxOpenPositions: this.defaultLimits.maxOpenPositions,
      todayPnL,
      unrealizedPnL,
      totalDailyPnL: todayPnL + unrealizedPnL,
      dailyLossLimit: this.defaultLimits.maxDailyLossPercent,
      maxPositionSizePercent: this.defaultLimits.maxPositionSizePercent
    };
  }
}

export default new RiskManagerService();
