import {
  TelegramActivationOrchestrationService,
  type TelegramActivationUserSnapshot,
} from '../src/services/telegram/activation-orchestration.service';
import type {
  TelegramUploadedSessionAvailability,
  TelegramUploadedSessionDecryptionResult,
} from '../src/services/telegram/uploaded-session-custody.service';

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

  it('defers activation when prerequisites are satisfied but no runtime owner exists yet', () => {
    const service = new TelegramActivationOrchestrationService(
      new UploadedSessionCustodyServiceStub({
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      })
    );

    const result = service.attemptActivationRequest({
      user: createUser(),
    });

    expect(result).toEqual({
      accepted: false,
      deferred: true,
      code: 'RUNTIME_OWNER_UNAVAILABLE',
      message:
        'Telegram activation is deferred until a backend runtime owner is implemented',
      effectiveStatus: 'UPLOADED_NOT_ACTIVATED',
      selectedChannelsCount: 1,
      custody: {
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      },
      shouldPersistActivationRequestedAt: false,
    });
  });

  it('treats provisioning as already in progress', () => {
    const service = new TelegramActivationOrchestrationService(
      new UploadedSessionCustodyServiceStub({
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      })
    );

    const result = service.attemptActivationRequest({
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

  it('treats active runtime states as already active', () => {
    const service = new TelegramActivationOrchestrationService(
      new UploadedSessionCustodyServiceStub({
        hasEncryptedSession: true,
        canDecryptForRuntimeUse: true,
      })
    );

    const result = service.attemptActivationRequest({
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
});
