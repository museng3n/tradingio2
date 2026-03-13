import type { IPositionSecuritySettings } from '../../models/User';
import { AppError } from '../../utils/errors';

export interface PositionSecuritySettingsResponse {
  data: {
    moveSlToBreakeven: boolean;
    securePositionAfter: 'TP1' | 'TP2' | 'TP3' | 'CUSTOM_PIPS';
    customPips: number | null;
  };
}

interface PositionSecuritySettingsRequestBody {
  moveSlToBreakeven?: unknown;
  securePositionAfter?: unknown;
  customPips?: unknown;
  [key: string]: unknown;
}

const ALLOWED_TOP_LEVEL_KEYS = [
  'moveSlToBreakeven',
  'securePositionAfter',
  'customPips',
] as const;

const ALLOWED_SECURE_POSITION_AFTER_VALUES = [
  'TP1',
  'TP2',
  'TP3',
  'CUSTOM_PIPS',
] as const;

export const DEFAULT_POSITION_SECURITY_SETTINGS: IPositionSecuritySettings = {
  moveSlToBreakeven: true,
  securePositionAfter: 'TP1',
  customPips: null,
};

export class PositionSecuritySettingsService {
  getDefaultSettings(): IPositionSecuritySettings {
    return { ...DEFAULT_POSITION_SECURITY_SETTINGS };
  }

  normalizeForResponse(
    settings?: IPositionSecuritySettings | null
  ): PositionSecuritySettingsResponse {
    const effectiveSettings = settings
      ? this.normalizeForPersistence(settings)
      : this.getDefaultSettings();

    return {
      data: {
        moveSlToBreakeven: effectiveSettings.moveSlToBreakeven,
        securePositionAfter: effectiveSettings.securePositionAfter,
        customPips: effectiveSettings.customPips,
      },
    };
  }

  validateAndNormalizeInput(body: unknown): IPositionSecuritySettings {
    if (!this.isRecord(body)) {
      throw new AppError(
        'Position security settings payload must be an object',
        400
      );
    }

    this.assertUnknownKeys(body, ALLOWED_TOP_LEVEL_KEYS, 'Position security settings');

    const {
      moveSlToBreakeven,
      securePositionAfter,
      customPips,
    } = body as PositionSecuritySettingsRequestBody;

    if (typeof moveSlToBreakeven !== 'boolean') {
      throw new AppError('moveSlToBreakeven must be a boolean', 400);
    }

    if (!this.isSecurePositionAfterValue(securePositionAfter)) {
      throw new AppError(
        'securePositionAfter must be one of TP1, TP2, TP3, or CUSTOM_PIPS',
        400
      );
    }

    if (securePositionAfter === 'CUSTOM_PIPS') {
      const normalizedCustomPips = this.requirePositiveNumber(
        customPips,
        'customPips'
      );

      return {
        moveSlToBreakeven,
        securePositionAfter,
        customPips: normalizedCustomPips,
      };
    }

    if (customPips !== null) {
      throw new AppError(
        'customPips must be null when securePositionAfter is TP1, TP2, or TP3',
        400
      );
    }

    return {
      moveSlToBreakeven,
      securePositionAfter,
      customPips: null,
    };
  }

  normalizeForPersistence(
    settings: IPositionSecuritySettings
  ): IPositionSecuritySettings {
    return {
      moveSlToBreakeven: settings.moveSlToBreakeven,
      securePositionAfter: settings.securePositionAfter,
      customPips:
        settings.securePositionAfter === 'CUSTOM_PIPS'
          ? this.normalizePositiveNumber(settings.customPips)
          : null,
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

  private isSecurePositionAfterValue(
    value: unknown
  ): value is IPositionSecuritySettings['securePositionAfter'] {
    return (
      typeof value === 'string' &&
      (ALLOWED_SECURE_POSITION_AFTER_VALUES as readonly string[]).includes(value)
    );
  }

  private requirePositiveNumber(value: unknown, fieldName: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new AppError(`${fieldName} must be a finite number`, 400);
    }

    if (value <= 0) {
      throw new AppError(`${fieldName} must be greater than 0`, 400);
    }

    return Math.round(value * 100) / 100;
  }

  private normalizePositiveNumber(value: number | null): number | null {
    if (value === null) {
      return null;
    }

    return Math.round(value * 100) / 100;
  }
}

export default new PositionSecuritySettingsService();
