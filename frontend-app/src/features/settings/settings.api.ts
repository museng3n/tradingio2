import { apiClient } from '@/lib/api/client';

export interface SettingsResponse {
  success?: boolean;
  data?: Record<string, unknown>;
}

export async function getSettings(): Promise<SettingsResponse> {
  return apiClient.get<SettingsResponse>('/settings');
}

export interface TelegramSelectedChannel {
  id: string;
  title: string;
  username?: string;
}

export interface TelegramChannelsSettingsRequest {
  selectedChannels: TelegramSelectedChannel[];
}

export interface TelegramChannelsSettingsResponse {
  data: {
    selectedChannels: TelegramSelectedChannel[];
  };
}

export type TelegramRuntimeStatus =
  | 'UPLOADED_NOT_ACTIVATED'
  | 'PROVISIONING_RUNTIME'
  | 'MONITORING_ACTIVE'
  | 'DEGRADED_RECONNECTING'
  | 'DISCONNECTED'
  | 'AUTH_INVALID_OR_SESSION_EXPIRED';

export interface TelegramRuntimeStatusResponse {
  data: {
    status: TelegramRuntimeStatus;
    statusUpdatedAt: string | null;
    sessionUploadedAt: string | null;
    activationRequestedAt: string | null;
    selectedChannels: TelegramSelectedChannel[];
  };
}

export interface TelegramRuntimeActivationRequest {
  runtimeDecryptionKey: string;
}

export interface TelegramRuntimeActivationResponse {
  data: {
    accepted: boolean;
    deferred: boolean;
    code:
      | 'READY_FOR_RUNTIME_OWNER'
      | 'MISSING_ENCRYPTED_SESSION'
      | 'MISSING_SELECTED_CHANNELS'
      | 'SESSION_NOT_DECRYPTABLE'
      | 'ALREADY_PROVISIONING'
      | 'ALREADY_ACTIVE'
      | 'SESSION_REQUIRES_REAUTH'
      | 'STARTED'
      | 'RUNTIME_START_FAILED'
      | 'USER_NOT_FOUND';
    message: string;
    effectiveStatus: TelegramRuntimeStatus;
    selectedChannelsCount: number;
    custody: {
      hasEncryptedSession: boolean;
      canDecryptForRuntimeUse: boolean;
    };
    activationRequestedAt: string | null;
  };
}

export interface TelegramRuntimeStopResponse {
  data: {
    stopped: boolean;
    code: 'STOPPED' | 'ALREADY_STOPPED' | 'USER_NOT_FOUND';
    message: string;
    status: TelegramRuntimeStatus | null;
  };
}

export async function getTelegramChannelsSettings(): Promise<TelegramChannelsSettingsResponse> {
  return apiClient.get<TelegramChannelsSettingsResponse>(
    '/settings/telegram-channels'
  );
}

export async function getTelegramRuntimeStatus(): Promise<TelegramRuntimeStatusResponse> {
  return apiClient.get<TelegramRuntimeStatusResponse>('/telegram/runtime-status');
}

export async function activateTelegramRuntime(
  request: TelegramRuntimeActivationRequest
): Promise<TelegramRuntimeActivationResponse> {
  return apiClient.post<TelegramRuntimeActivationResponse>(
    '/telegram/activate',
    request
  );
}

export async function stopTelegramRuntime(): Promise<TelegramRuntimeStopResponse> {
  return apiClient.post<TelegramRuntimeStopResponse>('/telegram/stop', {});
}

export async function updateTelegramChannelsSettings(
  request: TelegramChannelsSettingsRequest
): Promise<TelegramChannelsSettingsResponse> {
  return apiClient.put<TelegramChannelsSettingsResponse>(
    '/settings/telegram-channels',
    request
  );
}

export interface BlockedSymbolsSettingsRequest {
  symbols: string[];
}

export interface BlockedSymbolsSettingsResponse {
  data: {
    symbols: string[];
  };
}

export async function getBlockedSymbolsSettings(): Promise<BlockedSymbolsSettingsResponse> {
  return apiClient.get<BlockedSymbolsSettingsResponse>('/settings/blocked-symbols');
}

export async function updateBlockedSymbolsSettings(
  request: BlockedSymbolsSettingsRequest
): Promise<BlockedSymbolsSettingsResponse> {
  return apiClient.put<BlockedSymbolsSettingsResponse>(
    '/settings/blocked-symbols',
    request
  );
}

export type PositionSecuritySecurePositionAfter =
  | 'TP1'
  | 'TP2'
  | 'TP3'
  | 'CUSTOM_PIPS';

export interface PositionSecuritySettingsRequest {
  moveSlToBreakeven: boolean;
  securePositionAfter: PositionSecuritySecurePositionAfter;
  customPips: number | null;
}

export interface PositionSecuritySettingsResponse {
  data: {
    moveSlToBreakeven: boolean;
    securePositionAfter: PositionSecuritySecurePositionAfter;
    customPips: number | null;
  };
}

export async function getPositionSecuritySettings(): Promise<PositionSecuritySettingsResponse> {
  return apiClient.get<PositionSecuritySettingsResponse>(
    '/settings/position-security'
  );
}

export async function updatePositionSecuritySettings(
  request: PositionSecuritySettingsRequest
): Promise<PositionSecuritySettingsResponse> {
  return apiClient.put<PositionSecuritySettingsResponse>(
    '/settings/position-security',
    request
  );
}

export interface RiskManagementSettingsRequest {
  defaultLotSize: number;
  maxRiskPerTradePercent: number;
  maxOpenPositions: number;
  autoTrading: boolean;
}

export interface RiskManagementSettingsResponse {
  data: {
    defaultLotSize: number;
    maxRiskPerTradePercent: number;
    maxOpenPositions: number;
    autoTrading: boolean;
  };
}

export async function getRiskManagementSettings(): Promise<RiskManagementSettingsResponse> {
  return apiClient.get<RiskManagementSettingsResponse>('/settings/risk-management');
}

export async function updateRiskManagementSettings(
  request: RiskManagementSettingsRequest
): Promise<RiskManagementSettingsResponse> {
  return apiClient.put<RiskManagementSettingsResponse>(
    '/settings/risk-management',
    request
  );
}

export type TPStrategyMode = 'template' | 'strategy' | 'opentp';
export type TPStrategyType = 'equal' | 'weighted' | 'custom';
export type OpenTPScenario = 'with_fixed' | 'only_open';
export type OpenTPAction = 'reminder' | 'autoclose';

export interface TPStrategyTemplate {
  tpCount: number;
  percentages: number[];
  enabled: boolean;
}

export interface TPStrategySettingsRequest {
  mode: TPStrategyMode;
  templates: TPStrategyTemplate[];
  strategyType: TPStrategyType;
  customPercentages: number[];
  openTPConfig: {
    scenario: OpenTPScenario;
    action?: OpenTPAction;
    targetPips?: number;
    securityPips?: number;
    closePips?: number;
  };
}

export interface TPStrategySettingsResponse {
  data: {
    mode: TPStrategyMode;
    templates: TPStrategyTemplate[];
    strategyType: TPStrategyType;
    customPercentages: number[];
    openTPConfig: {
      scenario: OpenTPScenario;
      action: OpenTPAction | null;
      targetPips: number | null;
      securityPips: number | null;
      closePips: number | null;
    };
  };
}

export async function getTPStrategySettings(): Promise<TPStrategySettingsResponse> {
  return apiClient.get<TPStrategySettingsResponse>('/settings/tp-strategy');
}

export async function updateTPStrategySettings(
  request: TPStrategySettingsRequest
): Promise<TPStrategySettingsResponse> {
  return apiClient.put<TPStrategySettingsResponse>('/settings/tp-strategy', request);
}
