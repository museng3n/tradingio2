import logger from '../../utils/logger';

export interface TPLevel {
  level: number;
  price: number | 'OPEN';
  percentage: number;
}

export type StrategyMode = 'template' | 'strategy' | 'opentp';
export type StrategyType = 'equal' | 'weighted' | 'custom';

export interface TPTemplate {
  tpCount: number;
  percentages: number[];
  enabled: boolean;
}

export interface TPStrategy {
  mode: StrategyMode;
  templates?: TPTemplate[];
  strategyType?: StrategyType;
  customPercentages?: number[];
  openTPConfig?: OpenTPConfig;
}

export interface OpenTPConfig {
  scenario: 'with_fixed' | 'only_open';
  securityPips?: number;  // Move SL to entry after this many pips
  targetPips?: number;    // Target pips for OPEN TP
  action?: 'reminder' | 'autoclose';
}

export interface CalculatedTP {
  level: number;
  price: number | 'OPEN';
  percentage: number;
  lotSize: number;
}

// Default templates based on TP count
const DEFAULT_TEMPLATES: TPTemplate[] = [
  { tpCount: 2, percentages: [50, 50], enabled: true },
  { tpCount: 3, percentages: [33, 33, 34], enabled: true },
  { tpCount: 4, percentages: [25, 25, 25, 25], enabled: true },
  { tpCount: 5, percentages: [20, 20, 20, 20, 20], enabled: true },
  { tpCount: 6, percentages: [17, 17, 17, 17, 16, 16], enabled: true }
];

// Weighted strategy percentages
const WEIGHTED_PERCENTAGES: Record<number, number[]> = {
  2: [60, 40],
  3: [50, 30, 20],
  4: [40, 30, 20, 10],
  5: [35, 25, 20, 12, 8],
  6: [30, 25, 20, 12, 8, 5]
};

export class TPStrategyService {
  /**
   * Calculate TP distribution based on strategy
   */
  calculateTPDistribution(
    tpPrices: (number | string)[],
    totalLotSize: number,
    strategy: TPStrategy
  ): CalculatedTP[] {
    const tpCount = tpPrices.length;

    if (tpCount === 0) {
      return [];
    }

    let percentages: number[];

    switch (strategy.mode) {
      case 'template':
        percentages = this.getTemplatePercentages(tpCount, strategy.templates);
        break;

      case 'strategy':
        percentages = this.getStrategyPercentages(tpCount, strategy.strategyType || 'equal', strategy.customPercentages);
        break;

      case 'opentp':
        percentages = this.getOpenTPPercentages(tpPrices, strategy.openTPConfig);
        break;

      default:
        percentages = this.getEqualPercentages(tpCount);
    }

    // Ensure percentages sum to 100
    const total = percentages.reduce((sum, p) => sum + p, 0);
    if (Math.abs(total - 100) > 0.01) {
      logger.warn(`TP percentages don't sum to 100 (${total}), normalizing`);
      percentages = percentages.map(p => (p / total) * 100);
    }

    // Calculate lot sizes
    const result: CalculatedTP[] = tpPrices.map((price, index) => {
      const percentage = percentages[index] || 0;
      const lotSize = Math.round((totalLotSize * percentage / 100) * 100) / 100;

      return {
        level: index + 1,
        price: typeof price === 'string' ? 'OPEN' : price,
        percentage,
        lotSize: Math.max(0.01, lotSize)  // Minimum lot size
      };
    });

    // Adjust for rounding errors in lot sizes
    this.adjustLotSizes(result, totalLotSize);

    return result;
  }

  /**
   * Get percentages from template based on TP count
   */
  private getTemplatePercentages(tpCount: number, templates?: TPTemplate[]): number[] {
    const effectiveTemplates = templates || DEFAULT_TEMPLATES;

    const template = effectiveTemplates.find(t => t.tpCount === tpCount && t.enabled);

    if (template) {
      return [...template.percentages];
    }

    // Fallback to equal distribution
    return this.getEqualPercentages(tpCount);
  }

  /**
   * Get percentages based on strategy type
   */
  private getStrategyPercentages(
    tpCount: number,
    strategyType: StrategyType,
    customPercentages?: number[]
  ): number[] {
    switch (strategyType) {
      case 'equal':
        return this.getEqualPercentages(tpCount);

      case 'weighted':
        return WEIGHTED_PERCENTAGES[tpCount] || this.getEqualPercentages(tpCount);

      case 'custom':
        if (customPercentages && customPercentages.length >= tpCount) {
          return customPercentages.slice(0, tpCount);
        }
        return this.getEqualPercentages(tpCount);

      default:
        return this.getEqualPercentages(tpCount);
    }
  }

  /**
   * Get percentages for signals with OPEN TP
   */
  private getOpenTPPercentages(tpPrices: (number | string)[], config?: OpenTPConfig): number[] {
    const fixedTPs = tpPrices.filter(p => typeof p === 'number');
    const hasOpenTP = tpPrices.some(p => p === 'OPEN');

    if (!hasOpenTP) {
      // No open TP, use equal distribution
      return this.getEqualPercentages(tpPrices.length);
    }

    const scenario = config?.scenario || 'with_fixed';

    if (scenario === 'only_open' || fixedTPs.length === 0) {
      // All position for open TP
      return tpPrices.map((_, i) => i === tpPrices.length - 1 ? 100 : 0);
    }

    // with_fixed: distribute among fixed TPs, leave portion for OPEN
    const fixedCount = fixedTPs.length;
    const openTPPercentage = 20;  // Reserve 20% for OPEN TP
    const fixedPercentage = (100 - openTPPercentage) / fixedCount;

    return tpPrices.map((p) => {
      if (p === 'OPEN') {
        return openTPPercentage;
      }
      return fixedPercentage;
    });
  }

  /**
   * Get equal distribution percentages
   */
  private getEqualPercentages(count: number): number[] {
    if (count === 0) return [];

    const basePercentage = Math.floor(100 / count);
    const remainder = 100 - (basePercentage * count);

    const percentages = Array(count).fill(basePercentage);

    // Distribute remainder
    for (let i = 0; i < remainder; i++) {
      percentages[i]++;
    }

    return percentages;
  }

  /**
   * Adjust lot sizes to match total exactly
   */
  private adjustLotSizes(tps: CalculatedTP[], totalLotSize: number): void {
    const currentTotal = tps.reduce((sum, tp) => sum + tp.lotSize, 0);
    const diff = totalLotSize - currentTotal;

    if (Math.abs(diff) < 0.01) {
      return;
    }

    // Add/subtract difference to the largest TP
    const largestTP = tps.reduce((max, tp) => tp.lotSize > max.lotSize ? tp : max, tps[0]);
    largestTP.lotSize = Math.round((largestTP.lotSize + diff) * 100) / 100;
  }

  /**
   * Get default templates
   */
  getDefaultTemplates(): TPTemplate[] {
    return [...DEFAULT_TEMPLATES];
  }

  /**
   * Create custom template
   */
  createCustomTemplate(tpCount: number, percentages: number[]): TPTemplate | null {
    if (percentages.length !== tpCount) {
      return null;
    }

    const total = percentages.reduce((sum, p) => sum + p, 0);
    if (Math.abs(total - 100) > 0.01) {
      return null;
    }

    return {
      tpCount,
      percentages,
      enabled: true
    };
  }

  /**
   * Validate TP prices for a signal
   */
  validateTPPrices(
    tpPrices: (number | string)[],
    entryPrice: number,
    type: 'BUY' | 'SELL'
  ): { valid: boolean; error?: string } {
    if (tpPrices.length === 0) {
      return { valid: false, error: 'At least one take profit is required' };
    }

    const numericTPs = tpPrices.filter((p): p is number => typeof p === 'number');

    for (const tp of numericTPs) {
      if (type === 'BUY' && tp <= entryPrice) {
        return { valid: false, error: 'BUY take profits must be above entry price' };
      }
      if (type === 'SELL' && tp >= entryPrice) {
        return { valid: false, error: 'SELL take profits must be below entry price' };
      }
    }

    // Check TP order (should be in ascending/descending order)
    for (let i = 1; i < numericTPs.length; i++) {
      if (type === 'BUY' && numericTPs[i] <= numericTPs[i - 1]) {
        return { valid: false, error: 'BUY take profits should be in ascending order' };
      }
      if (type === 'SELL' && numericTPs[i] >= numericTPs[i - 1]) {
        return { valid: false, error: 'SELL take profits should be in descending order' };
      }
    }

    return { valid: true };
  }

  /**
   * Calculate pips between two prices
   */
  calculatePips(price1: number, price2: number, symbol: string): number {
    const diff = Math.abs(price1 - price2);
    const pipValue = this.getPipValue(symbol);
    return Math.round(diff / pipValue);
  }

  /**
   * Get pip value for a symbol
   */
  private getPipValue(symbol: string): number {
    const upperSymbol = symbol.toUpperCase();

    if (upperSymbol.includes('JPY')) {
      return 0.01;
    }
    if (upperSymbol.includes('XAU')) {
      return 0.1;
    }
    if (upperSymbol.includes('BTC')) {
      return 1;
    }

    return 0.0001;  // Standard forex
  }
}

export default new TPStrategyService();
