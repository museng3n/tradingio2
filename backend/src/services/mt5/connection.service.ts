import { EventEmitter } from 'events';
import logger from '../../utils/logger';
import { websocketService } from '../../websocket/server';

export interface MT5AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  currency: string;
  leverage: number;
  server: string;
  connected: boolean;
}

export interface MT5Position {
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  currentPrice: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  commission: number;
  openTime: Date;
  magic: number;
  comment: string;
}

export interface MT5SymbolInfo {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  digits: number;
  point: number;
  minLot: number;
  maxLot: number;
  lotStep: number;
  contractSize: number;
}

export interface MT5Credentials {
  account: string;
  password: string;
  server: string;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export class MT5ConnectionService extends EventEmitter {
  private credentials: MT5Credentials | null = null;
  private status: ConnectionStatus = 'disconnected';
  private accountInfo: MT5AccountInfo | null = null;
  private positions: Map<number, MT5Position> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private userId: string | null = null;

  // Simulated price data for development
  private simulatedPrices: Map<string, { bid: number; ask: number }> = new Map([
    ['XAUUSD', { bid: 2500.00, ask: 2500.50 }],
    ['EURUSD', { bid: 1.0850, ask: 1.0852 }],
    ['GBPUSD', { bid: 1.2650, ask: 1.2652 }],
    ['USDJPY', { bid: 149.50, ask: 149.52 }],
    ['BTCUSD', { bid: 43000.00, ask: 43050.00 }],
  ]);

  /**
   * Connect to MT5 server
   */
  async connect(credentials: MT5Credentials, userId: string): Promise<boolean> {
    try {
      this.credentials = credentials;
      this.userId = userId;
      this.status = 'connecting';

      logger.info(`Connecting to MT5 server: ${credentials.server}`);

      // In production, this would establish a WebSocket connection to MT5
      // For now, simulate successful connection
      await this.simulateConnection();

      this.status = 'connected';
      this.reconnectAttempts = 0;

      // Start heartbeat
      this.startHeartbeat();

      // Emit connection status
      this.emit('connected', this.accountInfo);
      if (this.userId) {
        websocketService.emitMT5Status(true, this.userId);
      }

      logger.info(`Connected to MT5: Account ${credentials.account}`);
      return true;

    } catch (error) {
      this.status = 'error';
      logger.error('MT5 connection error:', error);

      if (this.userId) {
        websocketService.emitMT5Status(false, this.userId);
      }

      // Attempt reconnection
      this.scheduleReconnect();
      return false;
    }
  }

  /**
   * Disconnect from MT5
   */
  async disconnect(): Promise<void> {
    this.status = 'disconnected';
    this.stopHeartbeat();
    this.credentials = null;
    this.accountInfo = null;
    this.positions.clear();

    if (this.userId) {
      websocketService.emitMT5Status(false, this.userId);
    }

    this.emit('disconnected');
    logger.info('Disconnected from MT5');
  }

  /**
   * Get connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === 'connected';
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<MT5AccountInfo | null> {
    if (!this.isConnected()) {
      return null;
    }

    // In production, fetch from MT5
    // For now, return simulated data
    return this.accountInfo;
  }

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol: string): Promise<{ bid: number; ask: number } | null> {
    if (!this.isConnected()) {
      return null;
    }

    // In production, fetch from MT5
    // For now, use simulated prices with slight randomization
    const basePrice = this.simulatedPrices.get(symbol.toUpperCase());
    if (!basePrice) {
      // Return a default price for unknown symbols
      return { bid: 100.00, ask: 100.05 };
    }

    // Add small random variation
    const variation = (Math.random() - 0.5) * 0.001 * basePrice.bid;
    return {
      bid: basePrice.bid + variation,
      ask: basePrice.ask + variation
    };
  }

  /**
   * Get symbol information
   */
  async getSymbolInfo(symbol: string): Promise<MT5SymbolInfo | null> {
    if (!this.isConnected()) {
      return null;
    }

    const price = await this.getPrice(symbol);
    if (!price) {
      return null;
    }

    // Simulated symbol info
    const isForex = symbol.length === 6 && !symbol.includes('XAU') && !symbol.includes('BTC');
    const digits = symbol.includes('JPY') ? 3 : (isForex ? 5 : 2);

    return {
      symbol: symbol.toUpperCase(),
      bid: price.bid,
      ask: price.ask,
      spread: Math.round((price.ask - price.bid) * Math.pow(10, digits)),
      digits,
      point: Math.pow(10, -digits),
      minLot: 0.01,
      maxLot: 100,
      lotStep: 0.01,
      contractSize: symbol.includes('XAU') ? 100 : 100000
    };
  }

  /**
   * Get open positions
   */
  async getPositions(): Promise<MT5Position[]> {
    if (!this.isConnected()) {
      return [];
    }

    return Array.from(this.positions.values());
  }

  /**
   * Get position by ticket
   */
  async getPosition(ticket: number): Promise<MT5Position | null> {
    return this.positions.get(ticket) || null;
  }

  /**
   * Update simulated price (for testing)
   */
  updateSimulatedPrice(symbol: string, bid: number, ask: number): void {
    this.simulatedPrices.set(symbol.toUpperCase(), { bid, ask });
    this.emit('priceUpdate', { symbol, bid, ask });
  }

  /**
   * Add simulated position (for testing)
   */
  addSimulatedPosition(position: MT5Position): void {
    this.positions.set(position.ticket, position);
    this.emit('positionOpened', position);
  }

  /**
   * Update simulated position (for testing)
   */
  updateSimulatedPosition(ticket: number, updates: Partial<MT5Position>): void {
    const position = this.positions.get(ticket);
    if (position) {
      Object.assign(position, updates);
      this.emit('positionUpdated', position);
    }
  }

  /**
   * Remove simulated position (for testing)
   */
  removeSimulatedPosition(ticket: number): void {
    const position = this.positions.get(ticket);
    if (position) {
      this.positions.delete(ticket);
      this.emit('positionClosed', position);
    }
  }

  /**
   * Simulate connection (development mode)
   */
  private async simulateConnection(): Promise<void> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Set simulated account info
    this.accountInfo = {
      balance: 10000.00,
      equity: 10000.00,
      margin: 0,
      freeMargin: 10000.00,
      marginLevel: 0,
      currency: 'USD',
      leverage: 100,
      server: this.credentials?.server || 'Demo',
      connected: true
    };
  }

  /**
   * Start heartbeat to monitor connection
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(async () => {
      try {
        // In production, send heartbeat to MT5
        // For now, just emit event
        this.emit('heartbeat', { timestamp: new Date() });
      } catch (error) {
        logger.error('MT5 heartbeat failed:', error);
        this.handleDisconnect();
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle unexpected disconnect
   */
  private handleDisconnect(): void {
    this.status = 'disconnected';
    this.stopHeartbeat();

    if (this.userId) {
      websocketService.emitMT5Status(false, this.userId);
    }

    this.emit('disconnected');
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      this.emit('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    logger.info(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    setTimeout(async () => {
      if (this.credentials && this.userId) {
        await this.connect(this.credentials, this.userId);
      }
    }, delay);
  }
}

// Singleton instance per user (in production, manage multiple instances)
const connectionInstances: Map<string, MT5ConnectionService> = new Map();

export function getConnectionService(userId: string): MT5ConnectionService {
  if (!connectionInstances.has(userId)) {
    connectionInstances.set(userId, new MT5ConnectionService());
  }
  return connectionInstances.get(userId)!;
}

export default new MT5ConnectionService();
