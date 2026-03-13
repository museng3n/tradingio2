import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import Position from '../models/Position';
import executorService from '../services/trading/executor.service';
import riskManagerService from '../services/trading/risk-manager.service';
import tpStrategyService from '../services/trading/tp-strategy.service';
import { getConnectionService } from '../services/mt5/connection.service';
import userHistoryService from '../services/history/user-history.service';
import { AppError } from '../utils/errors';

export class PositionController {
  /**
   * Get all positions for the authenticated user
   */
  async getPositions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      const skip = (page - 1) * limit;

      const filter: Record<string, unknown> = { userId };
      if (status) {
        filter.status = status.toUpperCase();
      }

      const [positions, total] = await Promise.all([
        Position.find(filter)
          .sort({ openedAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('signalId', 'symbol type entry'),
        Position.countDocuments(filter)
      ]);

      // Update current prices for open positions
      if (!status || status.toUpperCase() === 'OPEN') {
        const connection = getConnectionService(userId!);
        for (const position of positions) {
          if (position.status === 'OPEN') {
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
        }
      }

      res.json({
        total,
        page,
        pages: Math.ceil(total / limit),
        positions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get only open positions for the authenticated user
   */
  async getOpenPositions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      const positions = await Position.find({ userId, status: 'OPEN' })
        .sort({ openedAt: -1 })
        .populate('signalId', 'symbol type entry');

      res.json({
        success: true,
        data: positions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get secured position history for the authenticated user
   */
  async getPositionHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const history = await userHistoryService.getSecuredSignalsHistory(userId, page, limit);
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific position by ID
   */
  async getPositionById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { positionId } = req.params;

      const position = await executorService.getPositionWithCurrentPrice(positionId, userId!);

      if (!position) {
        throw new AppError('Position not found', 404);
      }

      res.json(position);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Open a new position from a signal
   */
  async openPosition(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { signalId, lotSize, tpStrategy } = req.body;

      if (!signalId) {
        throw new AppError('Signal ID is required', 400);
      }

      if (!lotSize || lotSize <= 0) {
        throw new AppError('Valid lot size is required', 400);
      }

      const result = await executorService.executeSignal({
        signalId,
        userId: userId!,
        lotSize,
        tpStrategy
      });

      if (!result.success) {
        throw new AppError(result.error || 'Failed to open position', 400);
      }

      res.status(201).json({
        message: 'Position opened successfully',
        positionId: result.positionId,
        details: result.details
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Modify a position (SL/TP)
   */
  async modifyPosition(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { positionId } = req.params;
      const { sl, tps } = req.body;

      if (sl === undefined && (!tps || tps.length === 0)) {
        throw new AppError('SL or TPs must be provided', 400);
      }

      const result = await executorService.modifyPosition({
        positionId,
        userId: userId!,
        sl,
        tps
      });

      if (!result.success) {
        throw new AppError(result.error || 'Failed to modify position', 400);
      }

      res.json({
        message: 'Position modified successfully',
        positionId
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Close a position (full or partial)
   */
  async closePosition(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { positionId } = req.params;
      const { percentage = 100 } = req.body;

      if (percentage <= 0 || percentage > 100) {
        throw new AppError('Percentage must be between 1 and 100', 400);
      }

      const result = await executorService.closePosition({
        positionId,
        userId: userId!,
        percentage
      });

      if (!result.success) {
        throw new AppError(result.error || 'Failed to close position', 400);
      }

      res.json({
        message: percentage >= 100 ? 'Position closed successfully' : 'Position partially closed',
        positionId,
        details: result.details
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Close all positions
   */
  async closeAllPositions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      const result = await executorService.closeAllPositions(userId!);

      res.json({
        message: `Closed ${result.closed} positions`,
        closed: result.closed,
        errors: result.errors
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get position statistics
   */
  async getPositionStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      const [total, open, closed, won, lost] = await Promise.all([
        Position.countDocuments({ userId }),
        Position.countDocuments({ userId, status: 'OPEN' }),
        Position.countDocuments({ userId, status: 'CLOSED' }),
        Position.countDocuments({ userId, status: 'CLOSED', profitLoss: { $gt: 0 } }),
        Position.countDocuments({ userId, status: 'CLOSED', profitLoss: { $lt: 0 } })
      ]);

      // Calculate total profit
      const closedPositions = await Position.find({ userId, status: 'CLOSED' });
      const totalProfit = closedPositions.reduce((sum, p) => sum + p.profitLoss, 0);
      const avgProfit = closedPositions.length > 0 ? totalProfit / closedPositions.length : 0;

      const winRate = closed > 0 ? (won / closed) * 100 : 0;

      res.json({
        total,
        open,
        closed,
        won,
        lost,
        winRate: Math.round(winRate * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        avgProfit: Math.round(avgProfit * 100) / 100
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get risk metrics
   */
  async getRiskMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const metrics = await riskManagerService.getRiskMetrics(userId!);
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate recommended lot size
   */
  async calculateLotSize(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { entryPrice, sl, riskPercent = 1 } = req.body;

      if (!entryPrice || !sl) {
        throw new AppError('Entry price and SL are required', 400);
      }

      const lotSize = await riskManagerService.calculateLotSize(
        userId!,
        parseFloat(entryPrice),
        parseFloat(sl),
        parseFloat(riskPercent)
      );

      if (lotSize === null) {
        throw new AppError('Unable to calculate lot size', 400);
      }

      res.json({
        recommendedLotSize: lotSize,
        riskPercent,
        entryPrice,
        sl
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get TP templates
   */
  async getTPTemplates(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const templates = tpStrategyService.getDefaultTemplates();
      res.json({ templates });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Preview TP distribution
   */
  async previewTPDistribution(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tpPrices, lotSize, strategy } = req.body;

      if (!tpPrices || !Array.isArray(tpPrices) || tpPrices.length === 0) {
        throw new AppError('TP prices array is required', 400);
      }

      if (!lotSize || lotSize <= 0) {
        throw new AppError('Valid lot size is required', 400);
      }

      const distribution = tpStrategyService.calculateTPDistribution(
        tpPrices,
        lotSize,
        strategy || { mode: 'template' }
      );

      res.json({ distribution });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Connect to MT5
   */
  async connectMT5(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { account, password, server } = req.body;

      if (!account || !password || !server) {
        throw new AppError('Account, password, and server are required', 400);
      }

      const connection = getConnectionService(userId!);
      const success = await connection.connect({ account, password, server }, userId!);

      if (!success) {
        throw new AppError('Failed to connect to MT5', 400);
      }

      res.json({
        message: 'Connected to MT5 successfully',
        status: 'connected'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disconnect from MT5
   */
  async disconnectMT5(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const connection = getConnectionService(userId!);
      await connection.disconnect();

      res.json({
        message: 'Disconnected from MT5',
        status: 'disconnected'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get MT5 connection status
   */
  async getMT5Status(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const connection = getConnectionService(userId!);
      const accountInfo = await connection.getAccountInfo();

      res.json({
        connected: connection.isConnected(),
        status: connection.getStatus(),
        account: accountInfo
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PositionController();
