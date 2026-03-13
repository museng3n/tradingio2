import { apiClient } from '@/lib/api/client';

export interface SettingsResponse {
  success?: boolean;
  data?: Record<string, unknown>;
}

export async function getSettings(): Promise<SettingsResponse> {
  return apiClient.get<SettingsResponse>('/settings');
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
