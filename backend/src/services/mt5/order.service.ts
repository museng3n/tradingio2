import { EventEmitter } from 'events';
import { getConnectionService, MT5Position, MT5SymbolInfo } from './connection.service';
import logger from '../../utils/logger';

export interface OrderRequest {
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  price?: number;  // Market order if not specified
  sl: number;
  tp?: number;
  magic?: number;
  comment?: string;
}

export interface OrderResult {
  success: boolean;
  ticket?: number;
  openPrice?: number;
  error?: string;
  errorCode?: number;
}

export interface ModifyRequest {
  ticket?: number;
  positionId?: string;
  odooId?: string;
  sl?: number;
  tp?: number;
  tps?: number[];
}

export interface CloseRequest {
  ticket?: number;
  positionId?: string;
  odooId?: string;
  volume?: number;  // Partial close if specified
  percentage?: number;
}

export interface CloseResult {
  success: boolean;
  closePrice?: number;
  profit?: number;
  error?: string;
}

export class MT5OrderService extends EventEmitter {
  private ticketCounter: number = 1000000;

  /**
   * Open a new order
   */
  async openOrder(userId: string, request: OrderRequest): Promise<OrderResult> {
    try {
      const connection = getConnectionService(userId);

      if (!connection.isConnected()) {
        return { success: false, error: 'Not connected to MT5', errorCode: 1 };
      }

      // Get current price
      const price = await connection.getPrice(request.symbol);
      if (!price) {
        return { success: false, error: 'Unable to get price', errorCode: 2 };
      }

      // Determine execution price
      const executionPrice = request.type === 'BUY' ? price.ask : price.bid;

      // Validate SL
      if (request.type === 'BUY' && request.sl >= executionPrice) {
        return { success: false, error: 'Stop loss must be below entry for BUY orders', errorCode: 3 };
      }
      if (request.type === 'SELL' && request.sl <= executionPrice) {
        return { success: false, error: 'Stop loss must be above entry for SELL orders', errorCode: 3 };
      }

      // Validate TP if provided
      if (request.tp) {
        if (request.type === 'BUY' && request.tp <= executionPrice) {
          return { success: false, error: 'Take profit must be above entry for BUY orders', errorCode: 4 };
        }
        if (request.type === 'SELL' && request.tp >= executionPrice) {
          return { success: false, error: 'Take profit must be below entry for SELL orders', errorCode: 4 };
        }
      }

      // Get symbol info for validation
      const symbolInfo = await connection.getSymbolInfo(request.symbol);
      if (!symbolInfo) {
        return { success: false, error: 'Invalid symbol', errorCode: 5 };
      }

      // Validate volume
      if (request.volume < symbolInfo.minLot) {
        return { success: false, error: `Volume below minimum (${symbolInfo.minLot})`, errorCode: 6 };
      }
      if (request.volume > symbolInfo.maxLot) {
        return { success: false, error: `Volume above maximum (${symbolInfo.maxLot})`, errorCode: 6 };
      }

      // Generate ticket number (in production, MT5 returns this)
      const ticket = this.generateTicket();

      // Create position object
      const position: MT5Position = {
        ticket,
        symbol: request.symbol.toUpperCase(),
        type: request.type,
        volume: request.volume,
        openPrice: executionPrice,
        currentPrice: executionPrice,
        sl: request.sl,
        tp: request.tp || 0,
        profit: 0,
        swap: 0,
        commission: 0,
        openTime: new Date(),
        magic: request.magic || 0,
        comment: request.comment || ''
      };

      // Add to simulated positions
      connection.addSimulatedPosition(position);

      logger.info(`Order opened: ${request.type} ${request.volume} ${request.symbol} @ ${executionPrice}, Ticket: ${ticket}`);

      this.emit('orderOpened', position);

      return {
        success: true,
        ticket,
        openPrice: executionPrice
      };

    } catch (error) {
      logger.error('Error opening order:', error);
      return { success: false, error: 'Internal error', errorCode: 99 };
    }
  }

  /**
   * Modify an existing order (SL/TP)
   */
  async modifyOrder(userId: string, request: ModifyRequest): Promise<OrderResult> {
    try {
      const connection = getConnectionService(userId);

      if (!connection.isConnected()) {
        return { success: false, error: 'Not connected to MT5', errorCode: 1 };
      }

      const ticket = request.ticket || 0;
      const position = await connection.getPosition(ticket);
      if (!position) {
        return { success: false, error: 'Position not found', errorCode: 7 };
      }

      // Validate new SL if provided
      if (request.sl !== undefined) {
        if (position.type === 'BUY' && request.sl >= position.currentPrice) {
          return { success: false, error: 'Stop loss must be below current price for BUY', errorCode: 3 };
        }
        if (position.type === 'SELL' && request.sl <= position.currentPrice) {
          return { success: false, error: 'Stop loss must be above current price for SELL', errorCode: 3 };
        }
      }

      // Validate new TP if provided
      if (request.tp !== undefined) {
        if (position.type === 'BUY' && request.tp <= position.currentPrice) {
          return { success: false, error: 'Take profit must be above current price for BUY', errorCode: 4 };
        }
        if (position.type === 'SELL' && request.tp >= position.currentPrice) {
          return { success: false, error: 'Take profit must be below current price for SELL', errorCode: 4 };
        }
      }

      // Update position
      const updates: Partial<MT5Position> = {};
      if (request.sl !== undefined) updates.sl = request.sl;
      if (request.tp !== undefined) updates.tp = request.tp;

      connection.updateSimulatedPosition(ticket, updates);

      logger.info(`Order modified: Ticket ${ticket}, SL: ${request.sl}, TP: ${request.tp}`);

      this.emit('orderModified', { ticket, ...updates });

      return { success: true, ticket };

    } catch (error) {
      logger.error('Error modifying order:', error);
      return { success: false, error: 'Internal error', errorCode: 99 };
    }
  }

  /**
   * Close an order (full or partial)
   */
  async closeOrder(userId: string, request: CloseRequest): Promise<CloseResult> {
    try {
      const connection = getConnectionService(userId);

      if (!connection.isConnected()) {
        return { success: false, error: 'Not connected to MT5' };
      }

      const ticket = request.ticket || 0;
      const position = await connection.getPosition(ticket);
      if (!position) {
        return { success: false, error: 'Position not found' };
      }

      // Get current price
      const price = await connection.getPrice(position.symbol);
      if (!price) {
        return { success: false, error: 'Unable to get price' };
      }

      const closePrice = position.type === 'BUY' ? price.bid : price.ask;
      const closeVolume = request.volume || position.volume;

      // Calculate profit
      const priceDiff = position.type === 'BUY'
        ? closePrice - position.openPrice
        : position.openPrice - closePrice;

      const symbolInfo = await connection.getSymbolInfo(position.symbol);
      const contractSize = symbolInfo?.contractSize || 100000;
      const profit = priceDiff * closeVolume * contractSize;

      if (closeVolume >= position.volume) {
        // Full close
        connection.removeSimulatedPosition(ticket);
        logger.info(`Order closed: Ticket ${ticket} @ ${closePrice}, Profit: ${profit.toFixed(2)}`);
      } else {
        // Partial close
        connection.updateSimulatedPosition(ticket, {
          volume: position.volume - closeVolume
        });
        logger.info(`Order partially closed: Ticket ${ticket}, Volume: ${closeVolume} @ ${closePrice}, Profit: ${profit.toFixed(2)}`);
      }

      this.emit('orderClosed', {
        ticket,
        closePrice,
        closeVolume,
        profit,
        partial: closeVolume < position.volume
      });

      return {
        success: true,
        closePrice,
        profit
      };

    } catch (error) {
      logger.error('Error closing order:', error);
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Close all positions for a symbol
   */
  async closeAllBySymbol(userId: string, symbol: string): Promise<{ closed: number; errors: number }> {
    const connection = getConnectionService(userId);
    const positions = await connection.getPositions();
    const symbolPositions = positions.filter(p => p.symbol === symbol.toUpperCase());

    let closed = 0;
    let errors = 0;

    for (const position of symbolPositions) {
      const result = await this.closeOrder(userId, { ticket: position.ticket });
      if (result.success) {
        closed++;
      } else {
        errors++;
      }
    }

    return { closed, errors };
  }

  /**
   * Close all positions
   */
  async closeAll(userId: string): Promise<{ closed: number; errors: number }> {
    const connection = getConnectionService(userId);
    const positions = await connection.getPositions();

    let closed = 0;
    let errors = 0;

    for (const position of positions) {
      const result = await this.closeOrder(userId, { ticket: position.ticket });
      if (result.success) {
        closed++;
      } else {
        errors++;
      }
    }

    return { closed, errors };
  }

  /**
   * Generate unique ticket number
   */
  private generateTicket(): number {
    return ++this.ticketCounter;
  }
}

export default new MT5OrderService();
