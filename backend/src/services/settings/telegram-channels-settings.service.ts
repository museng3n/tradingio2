import type { ISelectedChannel } from '../../models/User';
import { AppError } from '../../utils/errors';

export interface TelegramChannelsSettingsResponse {
  data: {
    selectedChannels: ISelectedChannel[];
  };
}

interface TelegramChannelsSettingsRequestBody {
  selectedChannels?: unknown;
  [key: string]: unknown;
}

interface TelegramChannelRecord {
  id?: unknown;
  title?: unknown;
  username?: unknown;
  [key: string]: unknown;
}

const ALLOWED_TOP_LEVEL_KEYS = ['selectedChannels'] as const;
const ALLOWED_CHANNEL_KEYS = ['id', 'title', 'username'] as const;

export class TelegramChannelsSettingsService {
  getDefaultSettings(): ISelectedChannel[] {
    return [];
  }

  normalizeForResponse(
    selectedChannels?: ISelectedChannel[] | null
  ): TelegramChannelsSettingsResponse {
    const effectiveSettings = selectedChannels
      ? this.normalizeForPersistence(selectedChannels)
      : this.getDefaultSettings();

    return {
      data: {
        selectedChannels: effectiveSettings.map((channel) => ({
          id: channel.id,
          title: channel.title,
          ...(channel.username ? { username: channel.username } : {}),
        })),
      },
    };
  }

  validateAndNormalizeInput(body: unknown): ISelectedChannel[] {
    if (!this.isRecord(body)) {
      throw new AppError(
        'Telegram channels settings payload must be an object',
        400
      );
    }

    this.assertUnknownKeys(
      body,
      ALLOWED_TOP_LEVEL_KEYS,
      'Telegram channels settings'
    );

    const { selectedChannels } = body as TelegramChannelsSettingsRequestBody;

    if (!Array.isArray(selectedChannels)) {
      throw new AppError('selectedChannels must be an array', 400);
    }

    return this.normalizeChannelArray(selectedChannels, true);
  }

  normalizeForPersistence(selectedChannels: ISelectedChannel[]): ISelectedChannel[] {
    return this.normalizeChannelArray(selectedChannels, false);
  }

  private normalizeChannelArray(
    selectedChannels: unknown[],
    strict: boolean
  ): ISelectedChannel[] {
    const normalizedChannels: ISelectedChannel[] = [];
    const seenChannelIds = new Set<string>();

    selectedChannels.forEach((channel, index) => {
      if (!this.isRecord(channel)) {
        throw new AppError(`selectedChannels[${index}] must be an object`, 400);
      }

      if (strict) {
        this.assertUnknownKeys(
          channel,
          ALLOWED_CHANNEL_KEYS,
          `selectedChannels[${index}]`
        );
      }

      const {
        id,
        title,
        username,
      } = channel as TelegramChannelRecord;

      if (typeof id !== 'string') {
        throw new AppError(`selectedChannels[${index}].id must be a string`, 400);
      }

      if (typeof title !== 'string') {
        throw new AppError(`selectedChannels[${index}].title must be a string`, 400);
      }

      const normalizedId = id.trim();
      const normalizedTitle = title.trim();

      if (normalizedId.length === 0) {
        throw new AppError(`selectedChannels[${index}].id must not be empty`, 400);
      }

      if (normalizedTitle.length === 0) {
        throw new AppError(`selectedChannels[${index}].title must not be empty`, 400);
      }

      if (seenChannelIds.has(normalizedId)) {
        throw new AppError(`selectedChannels[${index}].id must be unique`, 400);
      }

      let normalizedUsername: string | undefined;

      if (username !== undefined) {
        if (typeof username !== 'string') {
          throw new AppError(
            `selectedChannels[${index}].username must be a string when provided`,
            400
          );
        }

        const trimmedUsername = username.trim();

        if (trimmedUsername.length > 0) {
          normalizedUsername = trimmedUsername;
        }
      }

      seenChannelIds.add(normalizedId);
      normalizedChannels.push({
        id: normalizedId,
        title: normalizedTitle,
        ...(normalizedUsername ? { username: normalizedUsername } : {}),
      });
    });

    return normalizedChannels;
  }

  private assertUnknownKeys<T extends readonly string[]>(
    value: Record<string, unknown>,
    allowedKeys: T,
    path: string
  ): void {
    const allowed = new Set<string>(allowedKeys);

    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) {
        throw new AppError(`Unknown field ${path}.${key}`, 400);
      }
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

export default new TelegramChannelsSettingsService();
