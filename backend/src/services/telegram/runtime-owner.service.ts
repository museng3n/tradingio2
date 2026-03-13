import User, {
  type ISelectedChannel,
  type TelegramRuntimeStatus,
} from '../../models/User';
import uploadedSessionCustodyService, {
  type TelegramUploadedSessionDecryptionResult,
  type UploadedSessionCustodyService,
} from './uploaded-session-custody.service';
import logger from '../../utils/logger';
import pythonTelegramRuntimeAdapter, {
  PythonTelegramRuntimeAdapter,
} from './python-runtime.adapter';

export interface TelegramRuntimeOwnerUserRecord {
  id: string;
  telegramSession?: string;
  selectedChannels?: ISelectedChannel[] | null;
  telegramRuntimeStatus?: TelegramRuntimeStatus;
}

export interface TelegramRuntimeHandle {
  stop(): Promise<void>;
  onUnexpectedExit?(handler: () => void): void;
}

export type TelegramRuntimeAdapterStartResult =
  | {
      ok: true;
      handle: TelegramRuntimeHandle;
    }
  | {
      ok: false;
      code: 'UNAVAILABLE' | 'AUTH_INVALID' | 'START_FAILED';
      message: string;
    };

export interface TelegramRuntimeAdapter {
  start(params: {
    userId: string;
    sessionString: string;
    selectedChannels: ISelectedChannel[];
  }): Promise<TelegramRuntimeAdapterStartResult>;
}

export interface TelegramRuntimeOwnerState {
  userId: string;
  status: TelegramRuntimeStatus;
  hasLiveHandle: boolean;
  selectedChannelsCount: number;
  startedAt: string | null;
}

export type TelegramRuntimeOwnerStartCode =
  | 'STARTED'
  | 'ALREADY_ACTIVE'
  | 'USER_NOT_FOUND'
  | 'MISSING_ENCRYPTED_SESSION'
  | 'MISSING_SELECTED_CHANNELS'
  | 'SESSION_NOT_DECRYPTABLE'
  | 'SESSION_REQUIRES_REAUTH'
  | 'RUNTIME_START_FAILED';

export interface TelegramRuntimeOwnerStartResult {
  accepted: boolean;
  code: TelegramRuntimeOwnerStartCode;
  message: string;
  status: TelegramRuntimeStatus;
  state: TelegramRuntimeOwnerState | null;
}

export interface TelegramRuntimeOwnerStopResult {
  stopped: boolean;
  code: 'STOPPED' | 'ALREADY_STOPPED' | 'USER_NOT_FOUND';
  message: string;
  status: TelegramRuntimeStatus | null;
}

export interface TelegramRuntimeOwnerInspectResult {
  found: boolean;
  state: TelegramRuntimeOwnerState | null;
}

interface RuntimeUserStore {
  findById(userId: string): Promise<TelegramRuntimeOwnerUserRecord | null>;
  updateRuntimeStatus(
    userId: string,
    status: TelegramRuntimeStatus
  ): Promise<TelegramRuntimeOwnerUserRecord | null>;
}

interface UploadedSessionCustodyPort {
  decryptUserSessionForRuntimeUse(
    user: Pick<TelegramRuntimeOwnerUserRecord, 'telegramSession'> | null | undefined,
    apiKey: string
  ): TelegramUploadedSessionDecryptionResult;
}

class MongoRuntimeUserStore implements RuntimeUserStore {
  async findById(userId: string): Promise<TelegramRuntimeOwnerUserRecord | null> {
    const user = await User.findById(userId).select(
      ['telegramSession', 'selectedChannels', 'telegramRuntimeStatus'].join(' ')
    );

    if (!user) {
      return null;
    }

    return {
      id: user._id.toString(),
      telegramSession: user.telegramSession,
      selectedChannels: user.selectedChannels,
      telegramRuntimeStatus: user.telegramRuntimeStatus,
    };
  }

  async updateRuntimeStatus(
    userId: string,
    status: TelegramRuntimeStatus
  ): Promise<TelegramRuntimeOwnerUserRecord | null> {
    const now = new Date();
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          telegramRuntimeStatus: status,
          telegramRuntimeStatusUpdatedAt: now,
        },
      },
      {
        new: true,
        fields: ['telegramSession', 'selectedChannels', 'telegramRuntimeStatus'].join(' '),
      }
    );

    if (!user) {
      return null;
    }

    return {
      id: user._id.toString(),
      telegramSession: user.telegramSession,
      selectedChannels: user.selectedChannels,
      telegramRuntimeStatus: user.telegramRuntimeStatus,
    };
  }
}

interface RuntimeRegistryEntry {
  handle: TelegramRuntimeHandle;
  startedAt: Date;
  selectedChannelsCount: number;
}

export class TelegramRuntimeOwnerService {
  private readonly registry = new Map<string, RuntimeRegistryEntry>();

  constructor(
    private readonly userStore: RuntimeUserStore = new MongoRuntimeUserStore(),
    private readonly custodyService: UploadedSessionCustodyPort = uploadedSessionCustodyService as UploadedSessionCustodyService,
    private readonly runtimeAdapter: TelegramRuntimeAdapter = pythonTelegramRuntimeAdapter as PythonTelegramRuntimeAdapter
  ) {}

  async startRuntime(params: {
    userId: string;
    runtimeDecryptionKey: string;
    user?: TelegramRuntimeOwnerUserRecord;
  }): Promise<TelegramRuntimeOwnerStartResult> {
    const user = params.user ?? (await this.userStore.findById(params.userId));

    if (!user) {
      return {
        accepted: false,
        code: 'USER_NOT_FOUND',
        message: 'User not found for Telegram runtime ownership',
        status: 'DISCONNECTED',
        state: null,
      };
    }

    const existingRuntime = this.registry.get(user.id);
    if (existingRuntime) {
      return {
        accepted: true,
        code: 'ALREADY_ACTIVE',
        message: 'Telegram runtime is already owned in-process',
        status: 'MONITORING_ACTIVE',
        state: this.toRuntimeState(user.id, 'MONITORING_ACTIVE', existingRuntime),
      };
    }

    const selectedChannels = user.selectedChannels ?? [];
    if (!user.telegramSession) {
      return {
        accepted: false,
        code: 'MISSING_ENCRYPTED_SESSION',
        message: 'Telegram runtime start requires an uploaded encrypted session',
        status: 'DISCONNECTED',
        state: null,
      };
    }

    if (selectedChannels.length === 0) {
      return {
        accepted: false,
        code: 'MISSING_SELECTED_CHANNELS',
        message: 'Telegram runtime start requires at least one selected channel',
        status: 'DISCONNECTED',
        state: null,
      };
    }

    await this.userStore.updateRuntimeStatus(user.id, 'PROVISIONING_RUNTIME');

    const decryptionResult = this.custodyService.decryptUserSessionForRuntimeUse(
      user,
      params.runtimeDecryptionKey
    );

    if (!decryptionResult.ok) {
      await this.userStore.updateRuntimeStatus(user.id, 'DISCONNECTED');

      return {
        accepted: false,
        code: 'SESSION_NOT_DECRYPTABLE',
        message:
          'Telegram runtime start cannot proceed because the uploaded session is not decryptable for runtime use',
        status: 'DISCONNECTED',
        state: null,
      };
    }

    const adapterResult = await this.runtimeAdapter.start({
      userId: user.id,
      sessionString: decryptionResult.sessionString,
      selectedChannels,
    });

    if (!adapterResult.ok) {
      const status =
        adapterResult.code === 'AUTH_INVALID'
          ? 'AUTH_INVALID_OR_SESSION_EXPIRED'
          : 'DISCONNECTED';

      await this.userStore.updateRuntimeStatus(user.id, status);

      return {
        accepted: false,
        code:
          adapterResult.code === 'AUTH_INVALID'
            ? 'SESSION_REQUIRES_REAUTH'
            : 'RUNTIME_START_FAILED',
        message: adapterResult.message,
        status,
        state: null,
      };
    }

    const runtimeEntry: RuntimeRegistryEntry = {
      handle: adapterResult.handle,
      startedAt: new Date(),
      selectedChannelsCount: selectedChannels.length,
    };

    this.registry.set(user.id, runtimeEntry);
    adapterResult.handle.onUnexpectedExit?.(() => {
      void this.handleUnexpectedRuntimeExit(user.id, runtimeEntry);
    });
    await this.userStore.updateRuntimeStatus(user.id, 'MONITORING_ACTIVE');

    return {
      accepted: true,
      code: 'STARTED',
      message: 'Telegram runtime is now owned in-process',
      status: 'MONITORING_ACTIVE',
      state: this.toRuntimeState(user.id, 'MONITORING_ACTIVE', runtimeEntry),
    };
  }

  async stopRuntime(userId: string): Promise<TelegramRuntimeOwnerStopResult> {
    const user = await this.userStore.findById(userId);

    if (!user) {
      return {
        stopped: false,
        code: 'USER_NOT_FOUND',
        message: 'User not found for Telegram runtime stop',
        status: null,
      };
    }

    const existingRuntime = this.registry.get(userId);
    if (!existingRuntime) {
      if (user.telegramRuntimeStatus !== 'DISCONNECTED') {
        await this.userStore.updateRuntimeStatus(userId, 'DISCONNECTED');
      }

      return {
        stopped: false,
        code: 'ALREADY_STOPPED',
        message: 'Telegram runtime is not currently owned in-process',
        status: 'DISCONNECTED',
      };
    }

    await existingRuntime.handle.stop();
    this.registry.delete(userId);
    await this.userStore.updateRuntimeStatus(userId, 'DISCONNECTED');

    return {
      stopped: true,
      code: 'STOPPED',
      message: 'Telegram runtime ownership released',
      status: 'DISCONNECTED',
    };
  }

  async inspectRuntime(userId: string): Promise<TelegramRuntimeOwnerInspectResult> {
    const existingRuntime = this.registry.get(userId);

    if (!existingRuntime) {
      return {
        found: false,
        state: null,
      };
    }

    return {
      found: true,
      state: this.toRuntimeState(userId, 'MONITORING_ACTIVE', existingRuntime),
    };
  }

  private toRuntimeState(
    userId: string,
    status: TelegramRuntimeStatus,
    runtime: RuntimeRegistryEntry
  ): TelegramRuntimeOwnerState {
    return {
      userId,
      status,
      hasLiveHandle: true,
      selectedChannelsCount: runtime.selectedChannelsCount,
      startedAt: runtime.startedAt.toISOString(),
    };
  }

  private async handleUnexpectedRuntimeExit(
    userId: string,
    runtimeEntry: RuntimeRegistryEntry
  ): Promise<void> {
    const currentRuntime = this.registry.get(userId);
    if (currentRuntime !== runtimeEntry) {
      return;
    }

    this.registry.delete(userId);

    try {
      await this.userStore.updateRuntimeStatus(userId, 'DISCONNECTED');
    } catch (error) {
      logger.error(
        `Failed to persist DISCONNECTED after unexpected Telegram runtime exit for user ${userId}: ${
          (error as Error).message
        }`
      );
    }
  }
}

export default new TelegramRuntimeOwnerService();
