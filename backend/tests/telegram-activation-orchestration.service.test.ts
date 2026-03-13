import {
  TelegramActivationOrchestrationService,
  type TelegramActivationUserSnapshot,
} from '../src/services/telegram/activation-orchestration.service';
import type {
  TelegramUploadedSessionAvailability,
  TelegramUploadedSessionDecryptionResult,
} from '../src/services/telegram/uploaded-session-custody.service';
import type { TelegramRuntimeOwnerStartResult } from '../src/services/telegram/runtime-owner.service';

class UploadedSessionCustodyServiceStub {
  constructor(
    private readonly availability: TelegramUploadedSessionAvailability,
    private readonly decryptionResult?: TelegramUploadedSessionDecryptionResult
  ) {}

  getRuntimeDecryptionAvailability(): TelegramUploadedSessionAvailability {
    return this.availability;
  }

  decryptUserSessionForRuntimeUse(): TelegramUploadedSessionDecryptionResult {
    return (
      this.decryptionResult ?? {
        ok: true,
        sessionString: 'test-session',
      }
    );
  }
}

class TelegramRuntimeOwnerStub {
  constructor(
    private readonly result: TelegramRuntimeOwnerStartResult = {
      accepted: true,
      code: 'STARTED',
      message: 'Telegram runtime is now owned in-process',
      status: 'MONITORING_ACTIVE',
      state: {
        userId: 'user-1',
        status: 'MONITORING_ACTIVE',
        hasLiveHandle: true,
        selectedChannelsCount: 1,
        startedAt: new Date('2026-03-13T00:00:00.000Z').toISOString(),
      },
    }
  ) {}

  async startRuntime(): Promise<TelegramRuntimeOwnerStartResult> {
    return this.result;
  }
}

const createUser = (
  overrides: Partial<TelegramActivationUserSnapshot> = {}
): TelegramActivationUserSnapshot => ({
  telegramSession: 'encrypted-session',
  selectedChannels: [{ id: '123', title: 'Gold Signals VIP', username: 'gold' }],
  telegramRuntimeStatus: 'UPLOADED_NOT_ACTIVATED',
  ...overrides,
});

describe('TelegramActivationOrchestrationService', () => {
  it('reports missing session when encrypted session is absent', () => {
    const service = new TelegramActivationOrchestrationService(
      new UploadedSessionCustodyServiceStub({
        hasEncryptedSession: false,
        canDecryptForRuntimeUse: false,
      })
    );

    const result = service.evaluateActivationReadiness({
      userId: 'user-1',
      user: createUser({ telegramSession: undefined }),
    });

    expect(result).toEqual({
      ready: false,
      code: 'MISSING_ENCRYPTED_SESSION',
      message: 'Telegram activation requires an uploaded encrypted session',
      effectiveStatus: 'UPLOADED_NOT_ACTIVATED',
      selectedChannelsCount: 1,
      custody: {
        hasEncryptedSession: false,
        canDecryptForRuntimeUse: false,
      },
    });
  });

  it('reports missing selected channels', () => {
    const service = new TelegramActivationOrchestrationService(
      new UploadedSessionCustodyServiceStub({
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      })
    );

    const result = service.evaluateActivationReadiness({
      userId: 'user-1',
      user: createUser({ selectedChannels: [] }),
    });

    expect(result).toEqual({
      ready: false,
      code: 'MISSING_SELECTED_CHANNELS',
      message: 'Telegram activation requires at least one selected channel',
      effectiveStatus: 'UPLOADED_NOT_ACTIVATED',
      selectedChannelsCount: 0,
      custody: {
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      },
    });
  });

  it('reports undecryptable runtime eligibility failures through the custody boundary', () => {
    const service = new TelegramActivationOrchestrationService(
      new UploadedSessionCustodyServiceStub(
        {
          hasEncryptedSession: true,
          canDecryptForRuntimeUse: true,
        },
        {
          ok: false,
          code: 'DECRYPTION_FAILED',
          message: 'Uploaded Telegram session could not be decrypted',
        }
      )
    );

    const result = service.evaluateActivationReadiness({
      userId: 'user-1',
      user: createUser(),
      runtimeDecryptionKey: 'wrong-runtime-key',
    });

    expect(result).toEqual({
      ready: false,
      code: 'SESSION_NOT_DECRYPTABLE',
      message:
        'Telegram activation cannot proceed because the uploaded session is not decryptable for runtime use',
      effectiveStatus: 'UPLOADED_NOT_ACTIVATED',
      selectedChannelsCount: 1,
      custody: {
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      },
    });
  });

  it('starts activation when prerequisites are satisfied and runtime ownership succeeds', async () => {
    const service = new TelegramActivationOrchestrationService(
      new UploadedSessionCustodyServiceStub({
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      }),
      new TelegramRuntimeOwnerStub() as never
    );

    const result = await service.attemptActivationRequest({
      userId: 'user-1',
      user: createUser(),
    });

    expect(result).toEqual({
      accepted: true,
      deferred: false,
      code: 'STARTED',
      message: 'Telegram runtime is now owned in-process',
      effectiveStatus: 'MONITORING_ACTIVE',
      selectedChannelsCount: 1,
      custody: {
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      },
      shouldPersistActivationRequestedAt: true,
    });
  });

  it('treats provisioning as already in progress', async () => {
    const service = new TelegramActivationOrchestrationService(
      new UploadedSessionCustodyServiceStub({
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      }),
      new TelegramRuntimeOwnerStub() as never
    );

    const result = await service.attemptActivationRequest({
      userId: 'user-1',
      user: createUser({ telegramRuntimeStatus: 'PROVISIONING_RUNTIME' }),
    });

    expect(result).toEqual({
      accepted: false,
      deferred: false,
      code: 'ALREADY_PROVISIONING',
      message: 'Telegram runtime activation is already provisioning',
      effectiveStatus: 'PROVISIONING_RUNTIME',
      selectedChannelsCount: 1,
      custody: {
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      },
      shouldPersistActivationRequestedAt: false,
    });
  });

  it('treats active runtime states as already active', async () => {
    const service = new TelegramActivationOrchestrationService(
      new UploadedSessionCustodyServiceStub({
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      }),
      new TelegramRuntimeOwnerStub() as never
    );

    const result = await service.attemptActivationRequest({
      userId: 'user-1',
      user: createUser({ telegramRuntimeStatus: 'MONITORING_ACTIVE' }),
    });

    expect(result).toEqual({
      accepted: false,
      deferred: false,
      code: 'ALREADY_ACTIVE',
      message: 'Telegram runtime is already active or reconnecting',
      effectiveStatus: 'MONITORING_ACTIVE',
      selectedChannelsCount: 1,
      custody: {
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      },
      shouldPersistActivationRequestedAt: false,
    });
  });

  it('surfaces truthful runtime-owner failures after readiness passes', async () => {
    const service = new TelegramActivationOrchestrationService(
      new UploadedSessionCustodyServiceStub({
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      }),
      new TelegramRuntimeOwnerStub({
        accepted: false,
        code: 'RUNTIME_START_FAILED',
        message: 'Telegram runtime adapter is not implemented yet',
        status: 'DISCONNECTED',
        state: null,
      }) as never
    );

    const result = await service.attemptActivationRequest({
      userId: 'user-1',
      user: createUser(),
    });

    expect(result).toEqual({
      accepted: false,
      deferred: false,
      code: 'RUNTIME_START_FAILED',
      message: 'Telegram runtime adapter is not implemented yet',
      effectiveStatus: 'DISCONNECTED',
      selectedChannelsCount: 1,
      custody: {
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      },
      shouldPersistActivationRequestedAt: false,
    });
  });
});
