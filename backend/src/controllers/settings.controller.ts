import { Response, NextFunction } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middlewares/auth.middleware';
import blockedSymbolsSettingsService from '../services/settings/blocked-symbols-settings.service';
import positionSecuritySettingsService from '../services/settings/position-security-settings.service';
import riskManagementSettingsService from '../services/settings/risk-management-settings.service';
import tpStrategySettingsService from '../services/settings/tp-strategy-settings.service';
import { AppError } from '../utils/errors';

export class SettingsController {
  async getBlockedSymbolsSettings(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const user = await User.findById(userId).select('blockedSymbolsSettings');

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json(
        blockedSymbolsSettingsService.normalizeForResponse(
          user.blockedSymbolsSettings
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async updateBlockedSymbolsSettings(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const normalizedSettings =
        blockedSymbolsSettingsService.validateAndNormalizeInput(req.body);

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            blockedSymbolsSettings:
              blockedSymbolsSettingsService.normalizeForPersistence(
                normalizedSettings
              ),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).select('blockedSymbolsSettings');

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json(
        blockedSymbolsSettingsService.normalizeForResponse(
          user.blockedSymbolsSettings
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async getPositionSecuritySettings(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const user = await User.findById(userId).select('positionSecuritySettings');

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json(
        positionSecuritySettingsService.normalizeForResponse(
          user.positionSecuritySettings
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async updatePositionSecuritySettings(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const normalizedSettings =
        positionSecuritySettingsService.validateAndNormalizeInput(req.body);

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            positionSecuritySettings:
              positionSecuritySettingsService.normalizeForPersistence(
                normalizedSettings
              ),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).select('positionSecuritySettings');

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json(
        positionSecuritySettingsService.normalizeForResponse(
          user.positionSecuritySettings
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async getRiskManagementSettings(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const user = await User.findById(userId).select('riskManagementSettings');

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json(
        riskManagementSettingsService.normalizeForResponse(user.riskManagementSettings)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateRiskManagementSettings(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const normalizedSettings =
        riskManagementSettingsService.validateAndNormalizeInput(req.body);

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            riskManagementSettings:
              riskManagementSettingsService.normalizeForPersistence(
                normalizedSettings
              ),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).select('riskManagementSettings');

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json(
        riskManagementSettingsService.normalizeForResponse(user.riskManagementSettings)
      );
    } catch (error) {
      next(error);
    }
  }

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
