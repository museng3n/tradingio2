import type {
  ITPStrategyOpenTPConfigSetting,
  ITPStrategySettings,
  ITPStrategyTemplateSetting,
} from '../../models/User';
import { AppError } from '../../utils/errors';

export interface TPStrategySettingsResponse {
  data: {
    mode: 'template' | 'strategy' | 'opentp';
    templates: Array<{
      tpCount: number;
      percentages: number[];
      enabled: boolean;
    }>;
    strategyType: 'equal' | 'weighted' | 'custom';
    customPercentages: number[];
    openTPConfig: {
      scenario: 'with_fixed' | 'only_open';
      action: 'reminder' | 'autoclose' | null;
      targetPips: number | null;
      securityPips: number | null;
      closePips: number | null;
    };
  };
}

interface TPStrategySettingsRequestBody {
  mode?: unknown;
  templates?: unknown;
  strategyType?: unknown;
  customPercentages?: unknown;
  openTPConfig?: unknown;
  [key: string]: unknown;
}

interface TPStrategyTemplateRequestBody {
  tpCount?: unknown;
  percentages?: unknown;
  enabled?: unknown;
  [key: string]: unknown;
}

interface TPStrategyOpenTPConfigRequestBody {
  scenario?: unknown;
  action?: unknown;
  targetPips?: unknown;
  securityPips?: unknown;
  closePips?: unknown;
  [key: string]: unknown;
}

const ALLOWED_TOP_LEVEL_KEYS = ['mode', 'templates', 'strategyType', 'customPercentages', 'openTPConfig'] as const;
const ALLOWED_TEMPLATE_KEYS = ['tpCount', 'percentages', 'enabled'] as const;
const ALLOWED_OPEN_TP_KEYS = ['scenario', 'action', 'targetPips', 'securityPips', 'closePips'] as const;

const CANONICAL_DEFAULT_TEMPLATES: ITPStrategyTemplateSetting[] = [
  { tpCount: 2, percentages: [50, 50], enabled: true },
  { tpCount: 3, percentages: [33, 33, 34], enabled: true },
  { tpCount: 4, percentages: [25, 25, 25, 25], enabled: true },
  { tpCount: 5, percentages: [20, 20, 20, 20, 20], enabled: true },
  { tpCount: 6, percentages: [20, 20, 20, 15, 15, 10], enabled: true },
];

export const DEFAULT_TP_STRATEGY_SETTINGS: ITPStrategySettings = {
  mode: 'template',
  templates: CANONICAL_DEFAULT_TEMPLATES,
  strategyType: 'equal',
  customPercentages: [],
  openTPConfig: {
    scenario: 'with_fixed',
    action: 'reminder',
    targetPips: 50,
  },
};

export class TPStrategySettingsService {
  getDefaultSettings(): ITPStrategySettings {
    return this.cloneSettings(DEFAULT_TP_STRATEGY_SETTINGS);
  }

  normalizeForResponse(
    settings?: ITPStrategySettings | null
  ): TPStrategySettingsResponse {
    const effectiveSettings = settings ? this.normalizeForPersistence(settings) : this.getDefaultSettings();

    return {
      data: {
        mode: effectiveSettings.mode,
        templates: effectiveSettings.templates.map((template) => ({
          tpCount: template.tpCount,
          percentages: [...template.percentages],
          enabled: template.enabled,
        })),
        strategyType: effectiveSettings.strategyType,
        customPercentages:
          effectiveSettings.strategyType === 'custom'
            ? [...effectiveSettings.customPercentages]
            : [],
        openTPConfig: {
          scenario: effectiveSettings.openTPConfig.scenario,
          action:
            effectiveSettings.openTPConfig.scenario === 'with_fixed'
              ? effectiveSettings.openTPConfig.action ?? null
              : null,
          targetPips:
            effectiveSettings.openTPConfig.scenario === 'with_fixed'
              ? effectiveSettings.openTPConfig.targetPips ?? null
              : null,
          securityPips:
            effectiveSettings.openTPConfig.scenario === 'only_open'
              ? effectiveSettings.openTPConfig.securityPips ?? null
              : null,
          closePips:
            effectiveSettings.openTPConfig.scenario === 'only_open'
              ? effectiveSettings.openTPConfig.closePips ?? null
              : null,
        },
      },
    };
  }

  validateAndNormalizeInput(body: unknown): ITPStrategySettings {
    if (!this.isRecord(body)) {
      throw new AppError('TP strategy settings payload must be an object', 400);
    }

    this.assertUnknownKeys(body, ALLOWED_TOP_LEVEL_KEYS, 'TP strategy settings');

    const {
      mode,
      templates,
      strategyType,
      customPercentages,
      openTPConfig,
    } = body as TPStrategySettingsRequestBody;

    if (!this.isMode(mode)) {
      throw new AppError('mode must be one of template, strategy, or opentp', 400);
    }

    const normalizedTemplates = this.validateTemplates(templates);

    if (!this.isStrategyType(strategyType)) {
      throw new AppError('strategyType must be one of equal, weighted, or custom', 400);
    }

    const normalizedCustomPercentages = this.validateCustomPercentages(customPercentages, strategyType);
    const normalizedOpenTPConfig = this.validateOpenTPConfig(openTPConfig);

    return {
      mode,
      templates: normalizedTemplates,
      strategyType,
      customPercentages: normalizedCustomPercentages,
      openTPConfig: normalizedOpenTPConfig,
    };
  }

  normalizeForPersistence(settings: ITPStrategySettings): ITPStrategySettings {
    return {
      mode: settings.mode,
      templates: settings.templates
        .map((template) => ({
          tpCount: template.tpCount,
          percentages: [...template.percentages],
          enabled: template.enabled,
        }))
        .sort((left, right) => left.tpCount - right.tpCount),
      strategyType: settings.strategyType,
      customPercentages:
        settings.strategyType === 'custom'
          ? [...settings.customPercentages]
          : [],
      openTPConfig: this.normalizeOpenTPConfig(settings.openTPConfig),
    };
  }

  private validateTemplates(templates: unknown): ITPStrategyTemplateSetting[] {
    if (!Array.isArray(templates) || templates.length === 0) {
      throw new AppError('templates must be a non-empty array', 400);
    }

    const seenTpCounts = new Set<number>();
    const normalizedTemplates = templates.map((template, index) => {
      if (!this.isRecord(template)) {
        throw new AppError(`templates[${index}] must be an object`, 400);
      }

      this.assertUnknownKeys(template, ALLOWED_TEMPLATE_KEYS, `templates[${index}]`);

      const { tpCount, percentages, enabled } = template as TPStrategyTemplateRequestBody;

      if (!this.isPositiveInteger(tpCount) || tpCount < 2) {
        throw new AppError(`templates[${index}].tpCount must be an integer greater than or equal to 2`, 400);
      }

      if (seenTpCounts.has(tpCount)) {
        throw new AppError(`templates[${index}].tpCount must be unique`, 400);
      }
      seenTpCounts.add(tpCount);

      if (!Array.isArray(percentages) || percentages.length !== tpCount) {
        throw new AppError(`templates[${index}].percentages length must match tpCount`, 400);
      }

      const normalizedPercentages = percentages.map((value, percentageIndex) => {
        const parsed = this.toFiniteNumber(value);
        if (parsed === null || parsed < 0) {
          throw new AppError(`templates[${index}].percentages[${percentageIndex}] must be a non-negative number`, 400);
        }
        return parsed;
      });

      this.assertPercentageTotal(
        normalizedPercentages,
        `templates[${index}].percentages`
      );

      if (typeof enabled !== 'boolean') {
        throw new AppError(`templates[${index}].enabled must be a boolean`, 400);
      }

      return {
        tpCount,
        percentages: normalizedPercentages,
        enabled,
      };
    });

    return normalizedTemplates.sort((left, right) => left.tpCount - right.tpCount);
  }

  private validateCustomPercentages(
    customPercentages: unknown,
    strategyType: 'equal' | 'weighted' | 'custom'
  ): number[] {
    if (!Array.isArray(customPercentages)) {
      throw new AppError('customPercentages must be an array', 400);
    }

    const normalized = customPercentages.map((value, index) => {
      const parsed = this.toFiniteNumber(value);
      if (parsed === null || parsed < 0) {
        throw new AppError(`customPercentages[${index}] must be a non-negative number`, 400);
      }
      return parsed;
    });

    if (strategyType === 'custom') {
      if (normalized.length === 0) {
        throw new AppError('customPercentages must not be empty when strategyType is custom', 400);
      }

      this.assertPercentageTotal(normalized, 'customPercentages');
      return normalized;
    }

    return [];
  }

  private validateOpenTPConfig(openTPConfig: unknown): ITPStrategyOpenTPConfigSetting {
    if (!this.isRecord(openTPConfig)) {
      throw new AppError('openTPConfig must be an object', 400);
    }

    this.assertUnknownKeys(openTPConfig, ALLOWED_OPEN_TP_KEYS, 'openTPConfig');

    const {
      scenario,
      action,
      targetPips,
      securityPips,
      closePips,
    } = openTPConfig as TPStrategyOpenTPConfigRequestBody;

    if (scenario !== 'with_fixed' && scenario !== 'only_open') {
      throw new AppError('openTPConfig.scenario must be with_fixed or only_open', 400);
    }

    if (scenario === 'with_fixed') {
      if (action !== 'reminder' && action !== 'autoclose') {
        throw new AppError('openTPConfig.action must be reminder or autoclose when scenario is with_fixed', 400);
      }

      const normalizedTargetPips = this.requirePositiveNumber(targetPips, 'openTPConfig.targetPips');

      return {
        scenario,
        action,
        targetPips: normalizedTargetPips,
      };
    }

    const normalizedSecurityPips = this.requirePositiveNumber(securityPips, 'openTPConfig.securityPips');
    const normalizedClosePips = this.requirePositiveNumber(closePips, 'openTPConfig.closePips');

    if (normalizedClosePips <= normalizedSecurityPips) {
      throw new AppError('openTPConfig.closePips must be greater than openTPConfig.securityPips', 400);
    }

    return {
      scenario,
      securityPips: normalizedSecurityPips,
      closePips: normalizedClosePips,
    };
  }

  private normalizeOpenTPConfig(
    config: ITPStrategyOpenTPConfigSetting
  ): ITPStrategyOpenTPConfigSetting {
    if (config.scenario === 'with_fixed') {
      return {
        scenario: 'with_fixed',
        action: config.action ?? 'reminder',
        targetPips: config.targetPips ?? 50,
      };
    }

    return {
      scenario: 'only_open',
      securityPips: config.securityPips ?? 30,
      closePips: config.closePips ?? 80,
    };
  }

  private assertPercentageTotal(values: number[], fieldName: string): void {
    const total = values.reduce((sum, value) => sum + value, 0);

    if (Math.abs(total - 100) > 0.01) {
      throw new AppError(`${fieldName} must sum to 100`, 400);
    }
  }

  private requirePositiveNumber(value: unknown, fieldName: string): number {
    const parsed = this.toFiniteNumber(value);

    if (parsed === null || parsed <= 0) {
      throw new AppError(`${fieldName} must be a positive number`, 400);
    }

    return parsed;
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

  private cloneSettings(settings: ITPStrategySettings): ITPStrategySettings {
    return {
      mode: settings.mode,
      templates: settings.templates.map((template) => ({
        tpCount: template.tpCount,
        percentages: [...template.percentages],
        enabled: template.enabled,
      })),
      strategyType: settings.strategyType,
      customPercentages: [...settings.customPercentages],
      openTPConfig: {
        ...settings.openTPConfig,
      },
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isPositiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value);
  }

  private isMode(value: unknown): value is 'template' | 'strategy' | 'opentp' {
    return value === 'template' || value === 'strategy' || value === 'opentp';
  }

  private isStrategyType(value: unknown): value is 'equal' | 'weighted' | 'custom' {
    return value === 'equal' || value === 'weighted' || value === 'custom';
  }

  private toFiniteNumber(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }

    return Math.round(value * 100) / 100;
  }
}

export default new TPStrategySettingsService();
