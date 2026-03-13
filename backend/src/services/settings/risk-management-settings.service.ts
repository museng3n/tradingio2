import type { IRiskManagementSettings } from '../../models/User';
import { AppError } from '../../utils/errors';

export interface RiskManagementSettingsResponse {
  data: {
    defaultLotSize: number;
    maxRiskPerTradePercent: number;
    maxOpenPositions: number;
    autoTrading: boolean;
  };
}

interface RiskManagementSettingsRequestBody {
  defaultLotSize?: unknown;
  maxRiskPerTradePercent?: unknown;
  maxOpenPositions?: unknown;
  autoTrading?: unknown;
  [key: string]: unknown;
}

const ALLOWED_TOP_LEVEL_KEYS = [
  'defaultLotSize',
  'maxRiskPerTradePercent',
  'maxOpenPositions',
  'autoTrading',
] as const;

export const DEFAULT_RISK_MANAGEMENT_SETTINGS: IRiskManagementSettings = {
  defaultLotSize: 0.01,
  maxRiskPerTradePercent: 2,
  maxOpenPositions: 5,
  autoTrading: false,
};

export class RiskManagementSettingsService {
  getDefaultSettings(): IRiskManagementSettings {
    return { ...DEFAULT_RISK_MANAGEMENT_SETTINGS };
  }

  normalizeForResponse(
    settings?: IRiskManagementSettings | null
  ): RiskManagementSettingsResponse {
    const effectiveSettings = settings
      ? this.normalizeForPersistence(settings)
      : this.getDefaultSettings();

    return {
      data: {
        defaultLotSize: effectiveSettings.defaultLotSize,
        maxRiskPerTradePercent: effectiveSettings.maxRiskPerTradePercent,
        maxOpenPositions: effectiveSettings.maxOpenPositions,
        autoTrading: effectiveSettings.autoTrading,
      },
    };
  }

  validateAndNormalizeInput(body: unknown): IRiskManagementSettings {
    if (!this.isRecord(body)) {
      throw new AppError('Risk management settings payload must be an object', 400);
    }

    this.assertUnknownKeys(body, ALLOWED_TOP_LEVEL_KEYS, 'Risk management settings');

    const {
      defaultLotSize,
      maxRiskPerTradePercent,
      maxOpenPositions,
      autoTrading,
    } = body as RiskManagementSettingsRequestBody;

    const normalizedDefaultLotSize = this.requireFiniteNumber(
      defaultLotSize,
      'defaultLotSize'
    );

    if (normalizedDefaultLotSize < 0.01) {
      throw new AppError('defaultLotSize must be greater than or equal to 0.01', 400);
    }

    const normalizedMaxRiskPerTradePercent = this.requireFiniteNumber(
      maxRiskPerTradePercent,
      'maxRiskPerTradePercent'
    );

    if (
      normalizedMaxRiskPerTradePercent < 0.5 ||
      normalizedMaxRiskPerTradePercent > 10
    ) {
      throw new AppError(
        'maxRiskPerTradePercent must be between 0.5 and 10',
        400
      );
    }

    if (!this.isPositiveInteger(maxOpenPositions)) {
      throw new AppError('maxOpenPositions must be an integer greater than or equal to 1', 400);
    }

    if (typeof autoTrading !== 'boolean') {
      throw new AppError('autoTrading must be a boolean', 400);
    }

    return {
      defaultLotSize: normalizedDefaultLotSize,
      maxRiskPerTradePercent: normalizedMaxRiskPerTradePercent,
      maxOpenPositions,
      autoTrading,
    };
  }

  normalizeForPersistence(
    settings: IRiskManagementSettings
  ): IRiskManagementSettings {
    return {
      defaultLotSize: Math.round(settings.defaultLotSize * 100) / 100,
      maxRiskPerTradePercent:
        Math.round(settings.maxRiskPerTradePercent * 100) / 100,
      maxOpenPositions: settings.maxOpenPositions,
      autoTrading: settings.autoTrading,
    };
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

  private requireFiniteNumber(value: unknown, fieldName: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new AppError(`${fieldName} must be a finite number`, 400);
    }

    return Math.round(value * 100) / 100;
  }

  private isPositiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1;
  }
}

export default new RiskManagementSettingsService();
