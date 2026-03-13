import crypto from 'crypto';
import {
  TelegramRuntimeOwnerService,
  type TelegramRuntimeAdapter,
  type TelegramRuntimeAdapterStartResult,
  type TelegramRuntimeOwnerUserRecord,
} from '../src/services/telegram/runtime-owner.service';
import uploadedSessionCustodyService from '../src/services/telegram/uploaded-session-custody.service';

const encryptLikeConnector = (sessionString: string, apiKey: string): string => {
  const salt = crypto.randomBytes(32);
  const nonce = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(apiKey, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(sessionString, 'utf8')),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [salt, nonce, ciphertext, tag]
    .map((part) => part.toString('base64'))
    .join(':');
};

class RuntimeUserStoreStub {
  public readonly updates: string[] = [];

  constructor(
    private readonly users: Map<string, TelegramRuntimeOwnerUserRecord>
  ) {}

  async findById(userId: string): Promise<TelegramRuntimeOwnerUserRecord | null> {
    return this.users.get(userId) ?? null;
  }

  async updateRuntimeStatus(
    userId: string,
    status: TelegramRuntimeOwnerUserRecord['telegramRuntimeStatus']
  ): Promise<TelegramRuntimeOwnerUserRecord | null> {
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }

    user.telegramRuntimeStatus = status;
    this.updates.push(status ?? 'UNKNOWN');
    return user;
  }
}

class RuntimeAdapterStub implements TelegramRuntimeAdapter {
  public stopCalls = 0;

  constructor(
    private readonly result: TelegramRuntimeAdapterStartResult = {
      ok: true,
      handle: {
        stop: async () => {
          this.stopCalls += 1;
        },
      },
    }
  ) {}

  async start(): Promise<TelegramRuntimeAdapterStartResult> {
    return this.result;
  }
}

const createUser = (
  overrides: Partial<TelegramRuntimeOwnerUserRecord> = {}
): TelegramRuntimeOwnerUserRecord => ({
  id: 'user-1',
  telegramSession: encryptLikeConnector(
    '1AgAOMTQ5LjE1NC4xNjcuNTABu4runtime-session',
    'runtime-api-key'
  ),
  selectedChannels: [{ id: '123', title: 'Gold Signals VIP', username: 'gold' }],
  telegramRuntimeStatus: 'UPLOADED_NOT_ACTIVATED',
  ...overrides,
});

describe('TelegramRuntimeOwnerService', () => {
  it('owns a live runtime handle in-process and persists truthful active status', async () => {
    const userStore = new RuntimeUserStoreStub(
      new Map([[ 'user-1', createUser() ]])
    );
    const adapter = new RuntimeAdapterStub();
    const service = new TelegramRuntimeOwnerService(
      userStore as never,
      uploadedSessionCustodyService,
      adapter
    );

    const result = await service.startRuntime({
      userId: 'user-1',
      runtimeDecryptionKey: 'runtime-api-key',
    });

    expect(result.accepted).toBe(true);
    expect(result.code).toBe('STARTED');
    expect(result.status).toBe('MONITORING_ACTIVE');
    expect(result.state?.hasLiveHandle).toBe(true);
    expect(userStore.updates).toEqual(['PROVISIONING_RUNTIME', 'MONITORING_ACTIVE']);

    const inspection = await service.inspectRuntime('user-1');
    expect(inspection.found).toBe(true);
    expect(inspection.state?.status).toBe('MONITORING_ACTIVE');
  });

  it('falls back to disconnected when no real runtime adapter is available', async () => {
    const userStore = new RuntimeUserStoreStub(
      new Map([[ 'user-1', createUser() ]])
    );
    const adapter = new RuntimeAdapterStub({
      ok: false,
      code: 'UNAVAILABLE',
      message: 'Telegram runtime adapter is not implemented yet',
    });
    const service = new TelegramRuntimeOwnerService(
      userStore as never,
      uploadedSessionCustodyService,
      adapter
    );

    const result = await service.startRuntime({
      userId: 'user-1',
      runtimeDecryptionKey: 'runtime-api-key',
    });

    expect(result).toEqual({
      accepted: false,
      code: 'RUNTIME_START_FAILED',
      message: 'Telegram runtime adapter is not implemented yet',
      status: 'DISCONNECTED',
      state: null,
    });
    expect(userStore.updates).toEqual(['PROVISIONING_RUNTIME', 'DISCONNECTED']);
  });

  it('marks session re-authentication only on explicit auth-invalid evidence', async () => {
    const userStore = new RuntimeUserStoreStub(
      new Map([[ 'user-1', createUser() ]])
    );
    const adapter = new RuntimeAdapterStub({
      ok: false,
      code: 'AUTH_INVALID',
      message: 'Telegram session is no longer authorized',
    });
    const service = new TelegramRuntimeOwnerService(
      userStore as never,
      uploadedSessionCustodyService,
      adapter
    );

    const result = await service.startRuntime({
      userId: 'user-1',
      runtimeDecryptionKey: 'runtime-api-key',
    });

    expect(result).toEqual({
      accepted: false,
      code: 'SESSION_REQUIRES_REAUTH',
      message: 'Telegram session is no longer authorized',
      status: 'AUTH_INVALID_OR_SESSION_EXPIRED',
      state: null,
    });
    expect(userStore.updates).toEqual([
      'PROVISIONING_RUNTIME',
      'AUTH_INVALID_OR_SESSION_EXPIRED',
    ]);
  });

  it('releases owned handles and persists disconnected on stop', async () => {
    const userStore = new RuntimeUserStoreStub(
      new Map([[ 'user-1', createUser() ]])
    );
    const adapter = new RuntimeAdapterStub();
    const service = new TelegramRuntimeOwnerService(
      userStore as never,
      uploadedSessionCustodyService,
      adapter
    );

    await service.startRuntime({
      userId: 'user-1',
      runtimeDecryptionKey: 'runtime-api-key',
    });

    const stopResult = await service.stopRuntime('user-1');

    expect(stopResult).toEqual({
      stopped: true,
      code: 'STOPPED',
      message: 'Telegram runtime ownership released',
      status: 'DISCONNECTED',
    });
    expect(adapter.stopCalls).toBe(1);
    expect(userStore.updates).toEqual([
      'PROVISIONING_RUNTIME',
      'MONITORING_ACTIVE',
      'DISCONNECTED',
    ]);
  });

  it('keeps runtime ownership truthful when handle stop fails', async () => {
    const userStore = new RuntimeUserStoreStub(
      new Map([[ 'user-1', createUser() ]])
    );
    const adapter = new RuntimeAdapterStub({
      ok: true,
      handle: {
        stop: async () => {
          adapter.stopCalls += 1;
          throw new Error('stop failed');
        },
      },
    });
    const service = new TelegramRuntimeOwnerService(
      userStore as never,
      uploadedSessionCustodyService,
      adapter
    );

    await service.startRuntime({
      userId: 'user-1',
      runtimeDecryptionKey: 'runtime-api-key',
    });

    await expect(service.stopRuntime('user-1')).rejects.toThrow('stop failed');

    const inspection = await service.inspectRuntime('user-1');
    expect(inspection.found).toBe(true);
    expect(inspection.state?.status).toBe('MONITORING_ACTIVE');
    expect(adapter.stopCalls).toBe(1);
    expect(userStore.updates).toEqual([
      'PROVISIONING_RUNTIME',
      'MONITORING_ACTIVE',
    ]);
  });
});
