import logger from '../../utils/logger';

export interface ParsedSignal {
  symbol: string;
  type: 'BUY' | 'SELL';
  entry: number;
  tps: (number | string)[];  // Can be numbers or "OPEN"
  sl: number;
  rawMessage: string;
}

export interface ParseError {
  type: 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'INCOMPLETE_SIGNAL';
  message: string;
  rawMessage: string;
}

export class SignalParserService {
  // Common symbol aliases
  private symbolAliases: Record<string, string> = {
    'GOLD': 'XAUUSD',
    'SILVER': 'XAGUSD',
    'OIL': 'USOIL',
    'CRUDE': 'USOIL',
    'US30': 'DJ30',
    'DOW': 'DJ30',
    'NASDAQ': 'NAS100',
    'NAS': 'NAS100',
    'SPX': 'SP500',
    'DAX': 'GER40',
    'GER30': 'GER40',
    'BTCUSDT': 'BTCUSD',
    'ETHUSDT': 'ETHUSD'
  };

  /**
   * Parse a signal message into structured format
   */
  parseSignal(message: string): ParsedSignal | ParseError {
    try {
      const rawMessage = message;
      const normalizedMessage = this.normalizeMessage(message);

      // Extract symbol
      const symbol = this.extractSymbol(normalizedMessage);
      if (!symbol) {
        return {
          type: 'PARSE_ERROR',
          message: 'Could not identify trading symbol',
          rawMessage
        };
      }

      // Extract trade type (BUY/SELL)
      const tradeType = this.extractTradeType(normalizedMessage);
      if (!tradeType) {
        return {
          type: 'PARSE_ERROR',
          message: 'Could not identify trade type (BUY/SELL)',
          rawMessage
        };
      }

      // Extract entry price
      const entry = this.extractEntry(normalizedMessage);
      if (entry === null) {
        return {
          type: 'INCOMPLETE_SIGNAL',
          message: 'Missing entry price',
          rawMessage
        };
      }

      // Extract take profits
      const tps = this.extractTPs(normalizedMessage);
      if (tps.length === 0) {
        return {
          type: 'INCOMPLETE_SIGNAL',
          message: 'Missing take profit levels',
          rawMessage
        };
      }

      // Extract stop loss
      const sl = this.extractSL(normalizedMessage);
      if (sl === null) {
        return {
          type: 'INCOMPLETE_SIGNAL',
          message: 'Missing stop loss',
          rawMessage
        };
      }

      // Validate signal
      const validationError = this.validateSignal(symbol, tradeType, entry, tps, sl);
      if (validationError) {
        return {
          type: 'VALIDATION_ERROR',
          message: validationError,
          rawMessage
        };
      }

      return {
        symbol: this.normalizeSymbol(symbol),
        type: tradeType,
        entry,
        tps,
        sl,
        rawMessage
      };
    } catch (error) {
      logger.error('Error parsing signal:', error);
      return {
        type: 'PARSE_ERROR',
        message: 'Unexpected error parsing signal',
        rawMessage: message
      };
    }
  }

  /**
   * Normalize message for easier parsing
   */
  private normalizeMessage(message: string): string {
    return message
      .toUpperCase()
      .replace(/[–—]/g, '-')  // Normalize dashes
      .replace(/\s+/g, ' ')   // Normalize whitespace
      .replace(/[@]/g, ' ')   // Remove @ symbols
      .replace(/[:\s]*[:]\s*/g, ': ')  // Normalize colons
      .trim();
  }

  /**
   * Normalize symbol to standard format
   */
  private normalizeSymbol(symbol: string): string {
    const upperSymbol = symbol.toUpperCase().trim();
    return this.symbolAliases[upperSymbol] || upperSymbol;
  }

  /**
   * Extract trading symbol from message
   */
  private extractSymbol(message: string): string | null {
    // Common forex pairs and symbols patterns
    const symbolPatterns = [
      // Forex pairs
      /\b([A-Z]{3}USD|USD[A-Z]{3}|[A-Z]{3}[A-Z]{3})\b/,
      // Gold/Silver
      /\b(XAUUSD|XAGUSD|GOLD|SILVER)\b/,
      // Indices
      /\b(US30|DJ30|DOW|NASDAQ|NAS100|SPX|SP500|DAX|GER30|GER40|UK100|FTSE)\b/,
      // Crypto
      /\b(BTCUSD|ETHUSD|BTCUSDT|ETHUSDT)\b/,
      // Oil
      /\b(USOIL|UKOIL|WTI|BRENT|OIL|CRUDE)\b/
    ];

    for (const pattern of symbolPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract trade type (BUY/SELL)
   */
  private extractTradeType(message: string): 'BUY' | 'SELL' | null {
    // Check for SELL first (more specific patterns)
    const sellPatterns = [
      /\bSELL\b/,
      /\bSHORT\b/,
      /\bS\s*E\s*L\s*L\b/
    ];

    for (const pattern of sellPatterns) {
      if (pattern.test(message)) {
        return 'SELL';
      }
    }

    // Check for BUY
    const buyPatterns = [
      /\bBUY\b/,
      /\bLONG\b/,
      /\bB\s*U\s*Y\b/
    ];

    for (const pattern of buyPatterns) {
      if (pattern.test(message)) {
        return 'BUY';
      }
    }

    return null;
  }

  /**
   * Extract entry price
   */
  private extractEntry(message: string): number | null {
    // Various entry patterns
    const entryPatterns = [
      /ENTRY\s*:?\s*(\d+\.?\d*)/i,
      /ENTER\s*:?\s*(\d+\.?\d*)/i,
      /@\s*(\d+\.?\d*)/,
      /BUY\s+(\d+\.?\d*)/,
      /SELL\s+(\d+\.?\d*)/,
      /PRICE\s*:?\s*(\d+\.?\d*)/i,
      /NOW\s*:?\s*(\d+\.?\d*)/i,
      /CMP\s*:?\s*(\d+\.?\d*)/i  // Current Market Price
    ];

    for (const pattern of entryPatterns) {
      const match = message.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
    }

    return null;
  }

  /**
   * Extract take profit levels
   */
  private extractTPs(message: string): (number | string)[] {
    const tps: (number | string)[] = [];

    // Pattern for TP with number: TP1: 2520, TP2: 2540, etc.
    const tpPatterns = [
      /TP\s*1\s*:?\s*(\d+\.?\d*|OPEN)/gi,
      /TP\s*2\s*:?\s*(\d+\.?\d*|OPEN)/gi,
      /TP\s*3\s*:?\s*(\d+\.?\d*|OPEN)/gi,
      /TP\s*4\s*:?\s*(\d+\.?\d*|OPEN)/gi,
      /TP\s*5\s*:?\s*(\d+\.?\d*|OPEN)/gi,
      /TP\s*6\s*:?\s*(\d+\.?\d*|OPEN)/gi
    ];

    for (const pattern of tpPatterns) {
      const match = message.match(pattern);
      if (match) {
        const value = match[1];
        if (value.toUpperCase() === 'OPEN') {
          tps.push('OPEN');
        } else {
          const numValue = parseFloat(value);
          if (!isNaN(numValue) && numValue > 0) {
            tps.push(numValue);
          }
        }
      }
    }

    // If no numbered TPs found, try generic TP patterns
    if (tps.length === 0) {
      const genericTpPattern = /TP\s*:?\s*(\d+\.?\d*)/gi;
      let match;
      while ((match = genericTpPattern.exec(message)) !== null) {
        const value = parseFloat(match[1]);
        if (!isNaN(value) && value > 0) {
          tps.push(value);
        }
      }
    }

    // Also check for "TAKE PROFIT" patterns
    if (tps.length === 0) {
      const takeProfitPattern = /TAKE\s*PROFIT\s*:?\s*(\d+\.?\d*)/gi;
      let match;
      while ((match = takeProfitPattern.exec(message)) !== null) {
        const value = parseFloat(match[1]);
        if (!isNaN(value) && value > 0) {
          tps.push(value);
        }
      }
    }

    return tps;
  }

  /**
   * Extract stop loss
   */
  private extractSL(message: string): number | null {
    const slPatterns = [
      /SL\s*:?\s*(\d+\.?\d*)/i,
      /STOP\s*LOSS\s*:?\s*(\d+\.?\d*)/i,
      /STOPLOSS\s*:?\s*(\d+\.?\d*)/i,
      /STOP\s*:?\s*(\d+\.?\d*)/i
    ];

    for (const pattern of slPatterns) {
      const match = message.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
    }

    return null;
  }

  /**
   * Validate parsed signal
   */
  private validateSignal(
    symbol: string,
    type: 'BUY' | 'SELL',
    entry: number,
    tps: (number | string)[],
    sl: number
  ): string | null {
    // Get numeric TPs for validation
    const numericTps = tps.filter((tp): tp is number => typeof tp === 'number');

    if (type === 'BUY') {
      // For BUY, SL should be below entry
      if (sl >= entry) {
        return 'For BUY signal, stop loss should be below entry price';
      }
      // For BUY, TPs should be above entry
      for (const tp of numericTps) {
        if (tp <= entry) {
          return 'For BUY signal, take profits should be above entry price';
        }
      }
    } else {
      // For SELL, SL should be above entry
      if (sl <= entry) {
        return 'For SELL signal, stop loss should be above entry price';
      }
      // For SELL, TPs should be below entry
      for (const tp of numericTps) {
        if (tp >= entry) {
          return 'For SELL signal, take profits should be below entry price';
        }
      }
    }

    return null;
  }

  /**
   * Check if a message looks like a trading signal
   */
  isLikelySignal(message: string): boolean {
    const normalized = message.toUpperCase();

    // Must have BUY or SELL
    const hasTradeType = /\b(BUY|SELL|LONG|SHORT)\b/.test(normalized);

    // Must have TP or TAKE PROFIT
    const hasTP = /\b(TP|TAKE\s*PROFIT)\b/.test(normalized);

    // Must have SL or STOP LOSS
    const hasSL = /\b(SL|STOP\s*LOSS|STOPLOSS)\b/.test(normalized);

    // Must have numbers (prices)
    const hasNumbers = /\d+\.?\d*/.test(normalized);

    return hasTradeType && hasTP && hasSL && hasNumbers;
  }
}

export default new SignalParserService();
