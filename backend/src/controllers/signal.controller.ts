import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import Signal from '../models/Signal';
import { AppError } from '../utils/errors';

export class SignalController {
  /**
   * Get all signals for the authenticated user
   */
  async getSignals(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

      const [signals, total] = await Promise.all([
        Signal.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Signal.countDocuments(filter)
      ]);

      res.json({
        total,
        page,
        pages: Math.ceil(total / limit),
        signals
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent signals (for dashboard)
   */
  async getRecentSignals(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const limit = parseInt(req.query.limit as string) || 5;

      const signals = await Signal.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);

      res.json(signals);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a specific signal by ID
   */
  async getSignalById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { signalId } = req.params;

      const signal = await Signal.findOne({ _id: signalId, userId });

      if (!signal) {
        throw new AppError('Signal not found', 404);
      }

      res.json(signal);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a signal
   */
  async cancelSignal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { signalId } = req.params;

      const signal = await Signal.findOne({ _id: signalId, userId });

      if (!signal) {
        throw new AppError('Signal not found', 404);
      }

      if (signal.status !== 'ACTIVE') {
        throw new AppError('Signal is not active', 400);
      }

      signal.status = 'CANCELLED';
      await signal.save();

      res.json({
        message: 'Signal cancelled successfully',
        signal
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get signal statistics
   */
  async getSignalStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      const [total, active, closed, cancelled] = await Promise.all([
        Signal.countDocuments({ userId }),
        Signal.countDocuments({ userId, status: 'ACTIVE' }),
        Signal.countDocuments({ userId, status: 'CLOSED' }),
        Signal.countDocuments({ userId, status: 'CANCELLED' })
      ]);

      // Get today's signals
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySignals = await Signal.countDocuments({
        userId,
        createdAt: { $gte: today }
      });

      // Get this week's signals
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekSignals = await Signal.countDocuments({
        userId,
        createdAt: { $gte: weekAgo }
      });

      res.json({
        total,
        active,
        closed,
        cancelled,
        todaySignals,
        weekSignals
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Manually create a signal (for testing)
   */
  async createManualSignal(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { symbol, type, entry, tps, sl } = req.body;

      // Validate
      if (!symbol || !type || !entry || !tps || !sl) {
        throw new AppError('Missing required fields', 400);
      }

      if (!['BUY', 'SELL'].includes(type.toUpperCase())) {
        throw new AppError('Invalid trade type', 400);
      }

      if (!Array.isArray(tps) || tps.length === 0) {
        throw new AppError('At least one take profit is required', 400);
      }

      const signal = await Signal.create({
        userId,
        symbol: symbol.toUpperCase(),
        type: type.toUpperCase(),
        entry,
        tps,
        sl,
        status: 'ACTIVE',
        channel: 'MANUAL'
      });

      res.status(201).json({
        message: 'Signal created successfully',
        signal
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new SignalController();
