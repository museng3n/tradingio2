import { Response, NextFunction } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middlewares/auth.middleware';
import tpStrategySettingsService from '../services/settings/tp-strategy-settings.service';
import { AppError } from '../utils/errors';

export class SettingsController {
  async getTPStrategySettings(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const user = await User.findById(userId).select('tpStrategySettings');

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json(
        tpStrategySettingsService.normalizeForResponse(user.tpStrategySettings)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateTPStrategySettings(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const normalizedSettings = tpStrategySettingsService.validateAndNormalizeInput(req.body);

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            tpStrategySettings: tpStrategySettingsService.normalizeForPersistence(normalizedSettings),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).select('tpStrategySettings');

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json(
        tpStrategySettingsService.normalizeForResponse(user.tpStrategySettings)
      );
    } catch (error) {
      next(error);
    }
  }
}

export default new SettingsController();
