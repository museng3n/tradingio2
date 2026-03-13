import { apiClient } from '@/lib/api/client';

export interface SettingsResponse {
  success?: boolean;
  data?: Record<string, unknown>;
}

export async function getSettings(): Promise<SettingsResponse> {
  return apiClient.get<SettingsResponse>('/settings');
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
