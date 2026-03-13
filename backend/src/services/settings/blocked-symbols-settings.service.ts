import type { IBlockedSymbolsSettings } from '../../models/User';
import { AppError } from '../../utils/errors';

export interface BlockedSymbolsSettingsResponse {
  data: {
    symbols: string[];
  };
}

interface BlockedSymbolsSettingsRequestBody {
  symbols?: unknown;
  [key: string]: unknown;
}

const ALLOWED_TOP_LEVEL_KEYS = ['symbols'] as const;

export const DEFAULT_BLOCKED_SYMBOLS_SETTINGS: IBlockedSymbolsSettings = {
  symbols: [],
};

export class BlockedSymbolsSettingsService {
  getDefaultSettings(): IBlockedSymbolsSettings {
    return { symbols: [] };
  }

  normalizeForResponse(
    settings?: IBlockedSymbolsSettings | null
  ): BlockedSymbolsSettingsResponse {
    const effectiveSettings = settings
      ? this.normalizeForPersistence(settings)
      : this.getDefaultSettings();

    return {
      data: {
        symbols: [...effectiveSettings.symbols],
      },
    };
  }

  validateAndNormalizeInput(body: unknown): IBlockedSymbolsSettings {
    if (!this.isRecord(body)) {
      throw new AppError(
        'Blocked symbols settings payload must be an object',
        400
      );
    }

    this.assertUnknownKeys(body, ALLOWED_TOP_LEVEL_KEYS, 'Blocked symbols settings');

    const { symbols } = body as BlockedSymbolsSettingsRequestBody;

    if (!Array.isArray(symbols)) {
      throw new AppError('symbols must be an array', 400);
    }

    const normalizedSymbols: string[] = [];
    const seenSymbols = new Set<string>();

    symbols.forEach((symbol, index) => {
      if (typeof symbol !== 'string') {
        throw new AppError(`symbols[${index}] must be a string`, 400);
      }

      const normalizedSymbol = this.normalizeSymbol(symbol);

      if (normalizedSymbol.length === 0) {
        throw new AppError(`symbols[${index}] must not be empty`, 400);
      }

      if (seenSymbols.has(normalizedSymbol)) {
        throw new AppError(`symbols[${index}] must be unique`, 400);
      }

      seenSymbols.add(normalizedSymbol);
      normalizedSymbols.push(normalizedSymbol);
    });

    return {
      symbols: normalizedSymbols,
    };
  }

  normalizeForPersistence(
    settings: IBlockedSymbolsSettings
  ): IBlockedSymbolsSettings {
    const normalizedSymbols: string[] = [];
    const seenSymbols = new Set<string>();

    settings.symbols.forEach((symbol) => {
      if (typeof symbol !== 'string') {
        return;
      }

      const normalizedSymbol = this.normalizeSymbol(symbol);

      if (normalizedSymbol.length === 0 || seenSymbols.has(normalizedSymbol)) {
        return;
      }

      seenSymbols.add(normalizedSymbol);
      normalizedSymbols.push(normalizedSymbol);
    });

    return {
      symbols: normalizedSymbols,
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

  private normalizeSymbol(value: string): string {
    return value.trim().toUpperCase();
  }
}

export default new BlockedSymbolsSettingsService();
