import { Response, NextFunction } from 'express';
import User, { type ISelectedChannel, type TelegramRuntimeStatus } from '../models/User';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../utils/errors';

interface TelegramRuntimeStatusResponse {
  data: {
    status: TelegramRuntimeStatus;
    statusUpdatedAt: string | null;
    sessionUploadedAt: string | null;
    activationRequestedAt: string | null;
    selectedChannels: Array<{
      id: string;
      title: string;
      username?: string;
    }>;
  };
}

const toIsoString = (value?: Date | null): string | null =>
  value ? value.toISOString() : null;

const mapSelectedChannels = (
  channels?: ISelectedChannel[] | null
): TelegramRuntimeStatusResponse['data']['selectedChannels'] =>
  (channels ?? []).map((channel) => ({
    id: channel.id,
    title: channel.title,
    ...(channel.username ? { username: channel.username } : {}),
  }));

export class TelegramController {
  async getRuntimeStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User ID required', 400);
      }

      const user = await User.findById(userId).select(
        [
          'telegramRuntimeStatus',
          'telegramRuntimeStatusUpdatedAt',
          'telegramSessionUploadedAt',
          'telegramActivationRequestedAt',
          'selectedChannels',
          'telegramSession',
          'telegramConnectedAt',
          'updatedAt',
        ].join(' ')
      );

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const status: TelegramRuntimeStatus =
        user.telegramRuntimeStatus ??
        (user.telegramSession ? 'UPLOADED_NOT_ACTIVATED' : 'DISCONNECTED');

      const statusUpdatedAt =
        user.telegramRuntimeStatusUpdatedAt ??
        user.telegramSessionUploadedAt ??
        user.telegramConnectedAt ??
        user.updatedAt ??
        null;

      res.json({
        data: {
          status,
          statusUpdatedAt: toIsoString(statusUpdatedAt),
          sessionUploadedAt: toIsoString(user.telegramSessionUploadedAt ?? null),
          activationRequestedAt: toIsoString(
            user.telegramActivationRequestedAt ?? null
          ),
          selectedChannels: mapSelectedChannels(user.selectedChannels),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TelegramController();
