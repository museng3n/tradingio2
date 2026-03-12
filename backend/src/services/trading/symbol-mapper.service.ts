import mongoose from 'mongoose';
import logger from '../../utils/logger';

// Broker profile symbol mappings
const BROKER_PROFILES: Record<string, Record<string, string>> = {
  xm: {
    'XAUUSD': 'GOLD',
    'XAGUSD': 'SILVER',
    'USOIL': 'OIL',
    'DJ30': 'US30',
    'NAS100': 'USTEC',
    'SP500': 'US500',
    'GER40': 'GER40Cash'
  },
  icmarkets: {
    'XAUUSD': 'XAUUSD',
    'XAGUSD': 'XAGUSD',
    'USOIL': 'XTIUSD',
    'DJ30': 'US30',
    'NAS100': 'USTEC',
    'SP500': 'US500'
  },
  exness: {
    'XAUUSD': 'XAUUSDm',
    'XAGUSD': 'XAGUSDm',
    'USOIL': 'USOILm',
    'DJ30': 'US30m',
    'NAS100': 'USTECm'
  },
  pepperstone: {
    'XAUUSD': 'XAUUSD',
    'XAGUSD': 'XAGUSD',
    'USOIL': 'XTIUSD',
    'DJ30': 'US30',
    'NAS100': 'NAS100'
  },
  fxpro: {
    'XAUUSD': 'GOLD',
    'XAGUSD': 'SILVER',
    'USOIL': 'WTI',
    'DJ30': '#DJ30',
    'NAS100': '#NDX100'
  }
};

// In-memory cache for user symbol mappings
const userMappingsCache: Map<string, Record<string, string>> = new Map();

// Symbol Mapping Schema (embedded in User settings or separate collection)
interface SymbolMappingDoc {
  userId: mongoose.Types.ObjectId;
  brokerProfile?: string;
  customMappings: Record<string, string>;
  unknownHandling: 'ask' | 'use' | 'skip';
  caseSensitive: boolean;
  autoSuggest: boolean;
  updatedAt: Date;
}

export class SymbolMapperService {
  /**
   * Map a signal symbol to broker symbol
   */
  async mapSymbol(symbol: string, userId?: string): Promise<string> {
    const normalizedSymbol = symbol.toUpperCase().trim();

    // If no user, return as-is
    if (!userId) {
      return normalizedSymbol;
    }

    try {
      // Get user's mapping settings
      const userMappings = await this.getUserMappings(userId);

      // Check custom mappings first
      if (userMappings.customMappings[normalizedSymbol]) {
        return userMappings.customMappings[normalizedSymbol];
      }

      // Check broker profile mappings
      if (userMappings.brokerProfile && BROKER_PROFILES[userMappings.brokerProfile]) {
        const brokerMapping = BROKER_PROFILES[userMappings.brokerProfile][normalizedSymbol];
        if (brokerMapping) {
          return brokerMapping;
        }
      }

      // No mapping found, return original
      return normalizedSymbol;
    } catch (error) {
      logger.error('Error mapping symbol:', error);
      return normalizedSymbol;
    }
  }

  /**
   * Get user's symbol mappings
   */
  async getUserMappings(userId: string): Promise<{
    brokerProfile?: string;
    customMappings: Record<string, string>;
    unknownHandling: 'ask' | 'use' | 'skip';
  }> {
    // Check cache first
    const cached = userMappingsCache.get(userId);
    if (cached) {
      return {
        brokerProfile: undefined,
        customMappings: cached,
        unknownHandling: 'use'
      };
    }

    // Default mappings
    return {
      brokerProfile: undefined,
      customMappings: {},
      unknownHandling: 'use'
    };
  }

  /**
   * Set user's broker profile
   */
  async setBrokerProfile(userId: string, broker: string): Promise<boolean> {
    if (!BROKER_PROFILES[broker]) {
      return false;
    }

    // In production, this would update the database
    // For now, update cache
    const currentMappings = userMappingsCache.get(userId) || {};
    const brokerMappings = BROKER_PROFILES[broker];

    userMappingsCache.set(userId, {
      ...currentMappings,
      ...brokerMappings
    });

    logger.info(`Broker profile set for user ${userId}: ${broker}`);
    return true;
  }

  /**
   * Add custom symbol mapping
   */
  async addCustomMapping(
    userId: string,
    signalSymbol: string,
    brokerSymbol: string
  ): Promise<boolean> {
    const normalizedSignal = signalSymbol.toUpperCase().trim();
    const normalizedBroker = brokerSymbol.trim();

    const currentMappings = userMappingsCache.get(userId) || {};
    currentMappings[normalizedSignal] = normalizedBroker;
    userMappingsCache.set(userId, currentMappings);

    logger.info(`Custom mapping added for user ${userId}: ${normalizedSignal} -> ${normalizedBroker}`);
    return true;
  }

  /**
   * Remove custom symbol mapping
   */
  async removeCustomMapping(userId: string, signalSymbol: string): Promise<boolean> {
    const normalizedSignal = signalSymbol.toUpperCase().trim();

    const currentMappings = userMappingsCache.get(userId) || {};
    if (currentMappings[normalizedSignal]) {
      delete currentMappings[normalizedSignal];
      userMappingsCache.set(userId, currentMappings);
      logger.info(`Custom mapping removed for user ${userId}: ${normalizedSignal}`);
      return true;
    }

    return false;
  }

  /**
   * Get all user mappings
   */
  async getAllMappings(userId: string): Promise<Record<string, string>> {
    return userMappingsCache.get(userId) || {};
  }

  /**
   * Import mappings from JSON
   */
  async importMappings(userId: string, mappings: Record<string, string>): Promise<number> {
    const currentMappings = userMappingsCache.get(userId) || {};
    let count = 0;

    for (const [signal, broker] of Object.entries(mappings)) {
      const normalizedSignal = signal.toUpperCase().trim();
      currentMappings[normalizedSignal] = broker.trim();
      count++;
    }

    userMappingsCache.set(userId, currentMappings);
    logger.info(`Imported ${count} mappings for user ${userId}`);
    return count;
  }

  /**
   * Export mappings to JSON
   */
  async exportMappings(userId: string): Promise<Record<string, string>> {
    return userMappingsCache.get(userId) || {};
  }

  /**
   * Clear all user mappings
   */
  async clearMappings(userId: string): Promise<void> {
    userMappingsCache.delete(userId);
    logger.info(`Mappings cleared for user ${userId}`);
  }

  /**
   * Get available broker profiles
   */
  getBrokerProfiles(): string[] {
    return Object.keys(BROKER_PROFILES);
  }

  /**
   * Get broker profile mappings
   */
  getBrokerProfileMappings(broker: string): Record<string, string> | null {
    return BROKER_PROFILES[broker] || null;
  }

  /**
   * Suggest symbol mapping based on common patterns
   */
  suggestMapping(symbol: string): string[] {
    const suggestions: string[] = [];
    const normalizedSymbol = symbol.toUpperCase().trim();

    // Check all broker profiles for this symbol
    for (const [broker, mappings] of Object.entries(BROKER_PROFILES)) {
      if (mappings[normalizedSymbol]) {
        suggestions.push(mappings[normalizedSymbol]);
      }
    }

    // Remove duplicates
    return [...new Set(suggestions)];
  }
}

export default new SymbolMapperService();
