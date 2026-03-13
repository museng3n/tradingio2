import type { ISelectedChannel, TelegramRuntimeStatus } from '../../models/User';
import uploadedSessionCustodyService, {
  type TelegramUploadedSessionAvailability,
  type TelegramUploadedSessionDecryptionResult,
  type UploadedSessionCustodyService,
} from './uploaded-session-custody.service';

export type TelegramActivationReadinessCode =
  | 'READY_FOR_RUNTIME_OWNER'
  | 'MISSING_ENCRYPTED_SESSION'
  | 'MISSING_SELECTED_CHANNELS'
  | 'SESSION_NOT_DECRYPTABLE'
  | 'ALREADY_PROVISIONING'
  | 'ALREADY_ACTIVE'
  | 'SESSION_REQUIRES_REAUTH';

export type TelegramActivationRequestCode =
  | TelegramActivationReadinessCode
  | 'RUNTIME_OWNER_UNAVAILABLE';

export interface TelegramActivationUserSnapshot {
  telegramSession?: string;
  selectedChannels?: ISelectedChannel[] | null;
  telegramRuntimeStatus?: TelegramRuntimeStatus;
}

export interface TelegramActivationReadinessContext {
  user: TelegramActivationUserSnapshot;
  runtimeDecryptionKey?: string;
}

export interface TelegramActivationReadinessResult {
  ready: boolean;
  code: TelegramActivationReadinessCode;
  message: string;
  effectiveStatus: TelegramRuntimeStatus;
  selectedChannelsCount: number;
  custody: TelegramUploadedSessionAvailability;
}

export interface TelegramActivationRequestResult {
  accepted: boolean;
  deferred: boolean;
  code: TelegramActivationRequestCode;
  message: string;
  effectiveStatus: TelegramRuntimeStatus;
  selectedChannelsCount: number;
  custody: TelegramUploadedSessionAvailability;
  shouldPersistActivationRequestedAt: boolean;
}

interface UploadedSessionCustodyPort {
  getRuntimeDecryptionAvailability(
    user: Pick<TelegramActivationUserSnapshot, 'telegramSession'> | null | undefined
  ): TelegramUploadedSessionAvailability;
  decryptUserSessionForRuntimeUse(
    user: Pick<TelegramActivationUserSnapshot, 'telegramSession'> | null | undefined,
    apiKey: string
  ): TelegramUploadedSessionDecryptionResult;
}

export class TelegramActivationOrchestrationService {
  constructor(
    private readonly custodyService: UploadedSessionCustodyPort = uploadedSessionCustodyService as UploadedSessionCustodyService
  ) {}

  evaluateActivationReadiness(
    context: TelegramActivationReadinessContext
  ): TelegramActivationReadinessResult {
    const { user, runtimeDecryptionKey } = context;
    const custody = this.custodyService.getRuntimeDecryptionAvailability(user);
    const effectiveStatus = this.getEffectiveStatus(user, custody.hasEncryptedSession);
    const selectedChannelsCount = user.selectedChannels?.length ?? 0;

    if (effectiveStatus === 'PROVISIONING_RUNTIME') {
      return {
        ready: false,
        code: 'ALREADY_PROVISIONING',
        message: 'Telegram runtime activation is already provisioning',
        effectiveStatus,
        selectedChannelsCount,
        custody,
      };
    }

    if (
      effectiveStatus === 'MONITORING_ACTIVE' ||
      effectiveStatus === 'DEGRADED_RECONNECTING'
    ) {
      return {
        ready: false,
        code: 'ALREADY_ACTIVE',
        message: 'Telegram runtime is already active or reconnecting',
        effectiveStatus,
        selectedChannelsCount,
        custody,
      };
    }

    if (effectiveStatus === 'AUTH_INVALID_OR_SESSION_EXPIRED') {
      return {
        ready: false,
        code: 'SESSION_REQUIRES_REAUTH',
        message: 'Telegram session requires re-authentication before activation',
        effectiveStatus,
        selectedChannelsCount,
        custody,
      };
    }

    if (!custody.hasEncryptedSession) {
      return {
        ready: false,
        code: 'MISSING_ENCRYPTED_SESSION',
        message: 'Telegram activation requires an uploaded encrypted session',
        effectiveStatus,
        selectedChannelsCount,
        custody,
      };
    }

    if (selectedChannelsCount === 0) {
      return {
        ready: false,
        code: 'MISSING_SELECTED_CHANNELS',
        message: 'Telegram activation requires at least one selected channel',
        effectiveStatus,
        selectedChannelsCount,
        custody,
      };
    }

    if (runtimeDecryptionKey) {
      const decryptionResult = this.custodyService.decryptUserSessionForRuntimeUse(
        user,
        runtimeDecryptionKey
      );

      if (!decryptionResult.ok) {
        return {
          ready: false,
          code: 'SESSION_NOT_DECRYPTABLE',
          message:
            'Telegram activation cannot proceed because the uploaded session is not decryptable for runtime use',
          effectiveStatus,
          selectedChannelsCount,
          custody,
        };
      }
    }

    return {
      ready: true,
      code: 'READY_FOR_RUNTIME_OWNER',
      message:
        'Telegram activation prerequisites are satisfied for a future runtime owner',
      effectiveStatus,
      selectedChannelsCount,
      custody,
    };
  }

  attemptActivationRequest(
    context: TelegramActivationReadinessContext
  ): TelegramActivationRequestResult {
    const readiness = this.evaluateActivationReadiness(context);

    if (!readiness.ready) {
      return {
        accepted: false,
        deferred: false,
        code: readiness.code,
        message: readiness.message,
        effectiveStatus: readiness.effectiveStatus,
        selectedChannelsCount: readiness.selectedChannelsCount,
        custody: readiness.custody,
        shouldPersistActivationRequestedAt: false,
      };
    }

    return {
      accepted: false,
      deferred: true,
      code: 'RUNTIME_OWNER_UNAVAILABLE',
      message:
        'Telegram activation is deferred until a backend runtime owner is implemented',
      effectiveStatus: readiness.effectiveStatus,
      selectedChannelsCount: readiness.selectedChannelsCount,
      custody: readiness.custody,
      shouldPersistActivationRequestedAt: false,
    };
  }

  private getEffectiveStatus(
    user: TelegramActivationUserSnapshot,
    hasEncryptedSession: boolean
  ): TelegramRuntimeStatus {
    return (
      user.telegramRuntimeStatus ??
      (hasEncryptedSession ? 'UPLOADED_NOT_ACTIVATED' : 'DISCONNECTED')
    );
  }
}

export default new TelegramActivationOrchestrationService();
