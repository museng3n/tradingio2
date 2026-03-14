import mongoose from 'mongoose';
import { getConnectionService } from '../mt5/connection.service';
import mt5OrderService, { OrderResult } from '../mt5/order.service';
import riskManagerService from './risk-manager.service';
import tpStrategyService, { TPStrategy, CalculatedTP } from './tp-strategy.service';
import priceMonitorService from './price-monitor.service';
import Signal, { ISignal } from '../../models/Signal';
import Position from '../../models/Position';
import AuditLog from '../../models/AuditLog';
import { websocketService } from '../../websocket/server';
import logger from '../../utils/logger';

export interface ExecutionRequest {
  signalId: string;
  userId: string;
  lotSize: number;
  tpStrategy?: TPStrategy;
  confirmExecution?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  positionId?: string;
  tickets?: number[];
  error?: string;
  details?: Record<string, unknown>;
}

export interface PositionModifyRequest {
  positionId: string;
  userId: string;
  sl?: number;
  tps?: number[];
}

export interface PositionCloseRequest {
  positionId: string;
  userId: string;
  percentage?: number;  // 100 for full, or partial percentage
}

export class ExecutorService {
  /**
   * Execute a signal (open position)
   */
  async executeSignal(request: ExecutionRequest): Promise<ExecutionResult> {
    const { signalId, userId, lotSize, tpStrategy } = request;

    try {
      // Get signal
      const signal = await Signal.findById(signalId);
      if (!signal) {
        return { success: false, error: 'Signal not found' };
      }

      if (signal.status !== 'ACTIVE') {
        return { success: false, error: 'Signal is not active' };
      }

      // Check MT5 connection
      const connection = getConnectionService(userId);
      if (!connection.isConnected()) {
        return { success: false, error: 'Not connected to MT5' };
      }

      // Get current price
      const price = await connection.getPrice(signal.symbol);
      if (!price) {
        return { success: false, error: 'Unable to get current price' };
      }

      const entryPrice = signal.type === 'BUY' ? price.ask : price.bid;

      // Perform risk checks
      const riskCheck = await riskManagerService.validateNewPosition(
        userId,
        signal.symbol,
        signal.type,
        lotSize,
        entryPrice,
        signal.sl
      );

      if (!riskCheck.allowed) {
        await this.logExecution(userId, signalId, false, riskCheck.reason || 'Risk check failed');
        return { success: false, error: riskCheck.reason, details: riskCheck.details };
      }

      // Calculate TP distribution
      const strategy: TPStrategy = tpStrategy || { mode: 'template' };
      const strategySource = tpStrategy ? 'request' : 'executor_default';
      const { distribution: tpDistribution, metadata: tpDistributionMetadata } = tpStrategyService.calculateTPDistributionWithMetadata(
        signal.tps,
        lotSize,
        strategy
      );

      // Create position in database first
      const position = await Position.create({
        userId,
        signalId: signal._id,
        symbol: signal.symbol,
        type: signal.type,
        entryPrice,
        currentPrice: entryPrice,
        lotSize,
        profitLoss: 0,
        profitLossPercentage: 0,
        tps: tpDistribution.map(tp => ({
          level: tp.level,
          price: typeof tp.price === 'number' ? tp.price : 0,
          percentage: tp.percentage,
          hit: false
        })),
        sl: signal.sl,
        tpPlanning: {
          originalPlan: {
            plannedTps: tpDistribution.map(tp => ({
              level: tp.level,
              targetPrice: typeof tp.price === 'number' ? tp.price : null,
              percentage: tp.percentage,
              isExactTarget: typeof tp.price === 'number'
            })),
            provenance: {
              strategySource,
              mode: tpDistributionMetadata.mode,
              strategyType: tpDistributionMetadata.strategyType,
              usedFallback: tpDistributionMetadata.usedFallback,
              normalizedPercentages: tpDistributionMetadata.normalizedPercentages
            }
          },
          wasModifiedAfterOpen: false
        },
        securityApplied: false,
        status: 'OPEN',
        openedAt: new Date()
      });

      // Execute order on MT5
      const orderResult = await mt5OrderService.openOrder(userId, {
        symbol: signal.symbol,
        type: signal.type,
        volume: lotSize,
        sl: signal.sl,
        comment: `Signal:${signalId}`
      });

      if (!orderResult.success) {
        // Rollback database position
        await Position.findByIdAndDelete(position._id);
        await this.logExecution(userId, signalId, false, orderResult.error || 'Order failed');
        return { success: false, error: orderResult.error };
      }

      // Update position with MT5 ticket
      position.entryPrice = orderResult.openPrice || entryPrice;
      await position.save();

      // Update signal status
      signal.status = 'CLOSED';
      await signal.save();

      // Log successful execution
      await this.logExecution(userId, signalId, true, undefined, {
        positionId: position._id.toString(),
        ticket: orderResult.ticket,
        entryPrice: orderResult.openPrice,
        lotSize
      });

      // Emit WebSocket event
      websocketService.sendToUser(userId, 'position_opened', {
        id: position._id.toString(),
        symbol: position.symbol,
        type: position.type,
        entryPrice: position.entryPrice,
        lotSize: position.lotSize,
        sl: position.sl,
        tps: position.tps
      });

      // Start price monitoring for the new position
      await priceMonitorService.startMonitoring(position._id.toString());

      logger.info(`Signal executed: ${signal.symbol} ${signal.type} @ ${orderResult.openPrice}, Position: ${position._id}`);

      return {
        success: true,
        positionId: position._id.toString(),
        tickets: [orderResult.ticket!],
        details: {
          entryPrice: orderResult.openPrice,
          lotSize,
          tpDistribution
        }
      };

    } catch (error) {
      logger.error('Error executing signal:', error);
      await this.logExecution(userId, signalId, false, 'Internal error');
      return { success: false, error: 'Internal error executing signal' };
    }
  }

  /**
   * Modify an existing position
   */
  async modifyPosition(request: PositionModifyRequest): Promise<ExecutionResult> {
    const { positionId, userId, sl, tps } = request;

    try {
      const position = await Position.findOne({ _id: positionId, userId });
      if (!position) {
        return { success: false, error: 'Position not found' };
      }

      if (position.status !== 'OPEN') {
        return { success: false, error: 'Position is not open' };
      }

      // Validate new SL if provided
      if (sl !== undefined) {
        if (position.type === 'BUY' && sl >= position.currentPrice) {
          return { success: false, error: 'Stop loss must be below current price for BUY' };
        }
        if (position.type === 'SELL' && sl <= position.currentPrice) {
          return { success: false, error: 'Stop loss must be above current price for SELL' };
        }
        position.sl = sl;
      }

      // Update TPs if provided
      if (tps && tps.length > 0) {
        const validation = tpStrategyService.validateTPPrices(tps, position.entryPrice, position.type);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        position.tps = tps.map((price, index) => ({
          level: index + 1,
          price,
          percentage: position.tps[index]?.percentage || Math.floor(100 / tps.length),
          hit: position.tps[index]?.hit || false,
          hitAt: position.tps[index]?.hitAt
        }));
      }

      if (!position.tpPlanning) {
        position.tpPlanning = { wasModifiedAfterOpen: true };
      } else {
        position.tpPlanning.wasModifiedAfterOpen = true;
      }

      await position.save();

      // Log modification
      await AuditLog.create({
        userId,
        action: 'POSITION_MODIFIED',
        resource: 'position',
        resourceId: positionId,
        details: { sl, tps },
        success: true
      });

      // Emit WebSocket event
      websocketService.emitPositionUpdate({
        id: position._id.toString(),
        currentPrice: position.currentPrice,
        profitLoss: position.profitLoss,
        profitLossPercentage: position.profitLossPercentage
      }, userId);

      logger.info(`Position modified: ${positionId}, SL: ${sl}, TPs: ${tps?.join(', ')}`);

      return { success: true, positionId };

    } catch (error) {
      logger.error('Error modifying position:', error);
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Close a position (full or partial)
   */
  async closePosition(request: PositionCloseRequest): Promise<ExecutionResult> {
    const { positionId, userId, percentage = 100 } = request;

    try {
      const position = await Position.findOne({ _id: positionId, userId });
      if (!position) {
        return { success: false, error: 'Position not found' };
      }

      if (position.status !== 'OPEN') {
        return { success: false, error: 'Position is not open' };
      }

      const connection = getConnectionService(userId);
      if (!connection.isConnected()) {
        return { success: false, error: 'Not connected to MT5' };
      }

      // Get current price
      const price = await connection.getPrice(position.symbol);
      if (!price) {
        return { success: false, error: 'Unable to get current price' };
      }

      const closePrice = position.type === 'BUY' ? price.bid : price.ask;

      // Calculate lot size to close
      const closeVolume = percentage === 100
        ? position.lotSize
        : Math.round((position.lotSize * percentage / 100) * 100) / 100;

      // Calculate profit/loss
      const priceDiff = position.type === 'BUY'
        ? closePrice - position.entryPrice
        : position.entryPrice - closePrice;

      const profit = priceDiff * closeVolume * 100000;  // Simplified for forex

      if (percentage >= 100) {
        // Full close
        position.status = 'CLOSED';
        position.closeReason = 'MANUAL';
        position.closedAt = new Date();
        position.profitLoss = profit;
        position.currentPrice = closePrice;

        // Stop price monitoring
        priceMonitorService.stopMonitoring(positionId);
      } else {
        // Partial close - reduce lot size
        position.lotSize = Math.round((position.lotSize - closeVolume) * 100) / 100;
        position.profitLoss += profit;
      }

      await position.save();

      // Log close
      await AuditLog.create({
        userId,
        action: percentage >= 100 ? 'POSITION_CLOSED' : 'POSITION_PARTIAL_CLOSE',
        resource: 'position',
        resourceId: positionId,
        details: {
          closePrice,
          closeVolume,
          profit,
          percentage
        },
        success: true
      });

      // Emit WebSocket event
      if (percentage >= 100) {
        websocketService.emitPositionClosed({
          positionId,
          closePrice,
          profitLoss: profit,
          reason: 'MANUAL'
        }, userId);
      } else {
        websocketService.emitPositionUpdate({
          id: positionId,
          currentPrice: closePrice,
          profitLoss: position.profitLoss,
          profitLossPercentage: position.profitLossPercentage
        }, userId);
      }

      logger.info(`Position closed: ${positionId}, ${percentage}% @ ${closePrice}, Profit: ${profit.toFixed(2)}`);

      return {
        success: true,
        positionId,
        details: {
          closePrice,
          closeVolume,
          profit,
          remainingLotSize: percentage >= 100 ? 0 : position.lotSize
        }
      };

    } catch (error) {
      logger.error('Error closing position:', error);
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Close all positions for a user
   */
  async closeAllPositions(userId: string): Promise<{ closed: number; errors: number }> {
    const positions = await Position.find({ userId, status: 'OPEN' });

    let closed = 0;
    let errors = 0;

    for (const position of positions) {
      const result = await this.closePosition({
        positionId: position._id.toString(),
        userId,
        percentage: 100
      });

      if (result.success) {
        closed++;
      } else {
        errors++;
      }
    }

    return { closed, errors };
  }

  /**
   * Get position details with current price
   */
  async getPositionWithCurrentPrice(positionId: string, userId: string): Promise<unknown> {
    const position = await Position.findOne({ _id: positionId, userId });
    if (!position) {
      return null;
    }

    if (position.status === 'OPEN') {
      const connection = getConnectionService(userId);
      const price = await connection.getPrice(position.symbol);

      if (price) {
        const currentPrice = position.type === 'BUY' ? price.bid : price.ask;
        const priceDiff = position.type === 'BUY'
          ? currentPrice - position.entryPrice
          : position.entryPrice - currentPrice;

        position.currentPrice = currentPrice;
        position.profitLoss = priceDiff * position.lotSize * 100000;
        position.profitLossPercentage = (priceDiff / position.entryPrice) * 100;
      }
    }

    return position.toObject();
  }

  /**
   * Log execution attempt
   */
  private async logExecution(
    userId: string,
    signalId: string,
    success: boolean,
    error?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      await AuditLog.create({
        userId,
        action: success ? 'SIGNAL_EXECUTED' : 'SIGNAL_EXECUTION_FAILED',
        resource: 'signal',
        resourceId: signalId,
        details,
        success,
        errorMessage: error
      });
    } catch (err) {
      logger.error('Error logging execution:', err);
    }
  }
}

export default new ExecutorService();
