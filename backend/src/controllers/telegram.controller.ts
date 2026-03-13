import { Response, NextFunction } from 'express';
import User, { type ISelectedChannel, type TelegramRuntimeStatus } from '../models/User';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../utils/errors';
import telegramActivationOrchestrationService, {
  type TelegramActivationOrchestrationService,
  type TelegramActivationRequestResult,
} from '../services/telegram/activation-orchestration.service';
import telegramRuntimeOwnerService, {
  type TelegramRuntimeOwnerService,
  type TelegramRuntimeOwnerStopResult,
} from '../services/telegram/runtime-owner.service';

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

interface TelegramActivationResponse {
  data: TelegramActivationRequestResult & {
    activationRequestedAt: string | null;
  };
}

interface TelegramStopResponse {
  data: TelegramRuntimeOwnerStopResult;
}

interface TelegramUserSnapshot {
  telegramRuntimeStatus?: TelegramRuntimeStatus;
  telegramRuntimeStatusUpdatedAt?: Date | null;
  telegramSessionUploadedAt?: Date | null;
  telegramActivationRequestedAt?: Date | null;
  selectedChannels?: ISelectedChannel[] | null;
  telegramSession?: string;
  telegramConnectedAt?: Date | null;
  updatedAt?: Date | null;
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
  constructor(
    private readonly activationOrchestration: Pick<
      TelegramActivationOrchestrationService,
      'attemptActivationRequest'
    > = telegramActivationOrchestrationService,
    private readonly runtimeOwner: Pick<TelegramRuntimeOwnerService, 'stopRuntime'> = telegramRuntimeOwnerService
  ) {}

  async getRuntimeStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await this.findTelegramUserSnapshot(
        this.requireUserId(req),
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

  async startRuntime(
    req: AuthRequest,
    res: Response<TelegramActivationResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = this.requireUserId(req);
      const runtimeDecryptionKey = this.requireRuntimeDecryptionKey(req);
      const user = await this.findTelegramUserSnapshot(
        userId,
        ['telegramSession', 'selectedChannels', 'telegramRuntimeStatus'].join(' ')
      );

      const result = await this.activationOrchestration.attemptActivationRequest({
        userId,
        runtimeDecryptionKey,
        user: {
          telegramSession: user.telegramSession,
          selectedChannels: user.selectedChannels,
          telegramRuntimeStatus: user.telegramRuntimeStatus,
        },
      });

      const activationRequestedAt = result.shouldPersistActivationRequestedAt
        ? await this.persistActivationRequestedAt(userId)
        : null;

      res.json({
        data: {
          ...result,
          activationRequestedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async stopRuntime(
    req: AuthRequest,
    res: Response<TelegramStopResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await this.runtimeOwner.stopRuntime(this.requireUserId(req));

      res.json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  private requireUserId(req: AuthRequest): string {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('User ID required', 400);
    }

    return userId;
  }

  private requireRuntimeDecryptionKey(req: AuthRequest): string {
    const value = req.body?.runtimeDecryptionKey;

    if (typeof value !== 'string' || value.length === 0) {
      throw new AppError('Runtime decryption key required', 400);
    }

    return value;
  }

  private async findTelegramUserSnapshot(
    userId: string,
    fields: string
  ): Promise<TelegramUserSnapshot> {
    const user = await User.findById(userId).select(fields);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user as TelegramUserSnapshot;
  }

  private async persistActivationRequestedAt(userId: string): Promise<string | null> {
    const activationRequestedAt = new Date();
    await User.findByIdAndUpdate(userId, {
      $set: {
        telegramActivationRequestedAt: activationRequestedAt,
      },
    });

    return activationRequestedAt.toISOString();
  }
}

export default new TelegramController();
