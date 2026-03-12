import { EventEmitter } from 'events';
import Position from '../../models/Position';
import { getConnectionService } from '../mt5/connection.service';
import securityService from './security.service';
import logger from '../../utils/logger';

interface MonitoredPosition {
  positionId: string;
  odooId: string;
  userId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  lotSize: number;
  sl: number;
  tps: Array<{
    price: number;
    percentage: number;
    hit: boolean;
  }>;
  lastPrice: number | null;
  lastCheck: Date;
}

interface PriceUpdate {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: Date;
}

export class PriceMonitorService extends EventEmitter {
  private static instance: PriceMonitorService;
  private monitoredPositions: Map<string, MonitoredPosition> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private readonly MONITOR_INTERVAL_MS = 1500; // 1.5 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private priceCache: Map<string, PriceUpdate> = new Map();
  private readonly PRICE_CACHE_TTL_MS = 500; // 500ms cache

  private constructor() {
    super();
  }

  static getInstance(): PriceMonitorService {
    if (!PriceMonitorService.instance) {
      PriceMonitorService.instance = new PriceMonitorService();
    }
    return PriceMonitorService.instance;
  }

  /**
   * Start monitoring a position
   */
  async startMonitoring(positionId: string): Promise<void> {
    try {
      const position = await Position.findById(positionId);

      if (!position) {
        logger.warn(`Position not found for monitoring: ${positionId}`);
        return;
      }

      if (position.status !== 'OPEN') {
        logger.warn(`Position ${positionId} is not open, skipping monitoring`);
        return;
      }

      const monitoredPosition: MonitoredPosition = {
        positionId: position._id.toString(),
        odooId: position.odooId,
        userId: position.userId.toString(),
        symbol: position.symbol,
        type: position.type,
        entryPrice: position.entryPrice,
        lotSize: position.lotSize,
        sl: position.sl,
        tps: position.tps.map(tp => ({
          price: tp.price,
          percentage: tp.percentage,
          hit: tp.hit
        })),
        lastPrice: null,
        lastCheck: new Date()
      };

      this.monitoredPositions.set(positionId, monitoredPosition);

      logger.info(`Started monitoring position ${positionId}`, {
        symbol: position.symbol,
        type: position.type,
        entryPrice: position.entryPrice,
        tps: position.tps.length
      });

      // Start the monitoring loop if not already running
      this.ensureMonitoringLoop();

      this.emit('position_monitoring_started', {
        positionId,
        symbol: position.symbol,
        userId: position.userId
      });

    } catch (error) {
      logger.error(`Failed to start monitoring position ${positionId}:`, error);
      throw error;
    }
  }

  /**
   * Stop monitoring a position
   */
  stopMonitoring(positionId: string): void {
    const position = this.monitoredPositions.get(positionId);

    if (position) {
      this.monitoredPositions.delete(positionId);

      logger.info(`Stopped monitoring position ${positionId}`);

      this.emit('position_monitoring_stopped', {
        positionId,
        symbol: position.symbol,
        userId: position.userId
      });
    }

    // Stop the loop if no more positions to monitor
    if (this.monitoredPositions.size === 0) {
      this.stopMonitoringLoop();
    }
  }

  /**
   * Update position data (after partial close or SL move)
   */
  updatePosition(positionId: string, updates: Partial<MonitoredPosition>): void {
    const position = this.monitoredPositions.get(positionId);

    if (position) {
      Object.assign(position, updates);
      logger.debug(`Updated monitored position ${positionId}`, updates);
    }
  }

  /**
   * Ensure the monitoring loop is running
   */
  private ensureMonitoringLoop(): void {
    if (!this.isMonitoring && this.monitoredPositions.size > 0) {
      this.startMonitoringLoop();
    }
  }

  /**
   * Start the main monitoring loop
   */
  private startMonitoringLoop(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    logger.info('Price monitoring loop started');

    this.monitoringInterval = setInterval(async () => {
      await this.checkAllPositions();
    }, this.MONITOR_INTERVAL_MS);
  }

  /**
   * Stop the monitoring loop
   */
  private stopMonitoringLoop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.info('Price monitoring loop stopped');
  }

  /**
   * Check all monitored positions
   */
  private async checkAllPositions(): Promise<void> {
    if (this.monitoredPositions.size === 0) return;

    // Group positions by user for efficient price fetching
    const positionsByUser = new Map<string, MonitoredPosition[]>();

    for (const position of this.monitoredPositions.values()) {
      const userPositions = positionsByUser.get(position.userId) || [];
      userPositions.push(position);
      positionsByUser.set(position.userId, userPositions);
    }

    // Check each user's positions
    for (const [userId, positions] of positionsByUser) {
      await this.checkUserPositions(userId, positions);
    }
  }

  /**
   * Check positions for a specific user
   */
  private async checkUserPositions(userId: string, positions: MonitoredPosition[]): Promise<void> {
    try {
      const connection = getConnectionService(userId);

      if (!connection.isConnected()) {
        logger.warn(`MT5 connection not available for user ${userId}`);
        return;
      }

      // Get unique symbols
      const symbols = [...new Set(positions.map(p => p.symbol))];

      // Fetch prices for all symbols
      for (const symbol of symbols) {
        const price = await this.getPriceWithRetry(userId, symbol);

        if (!price) {
          logger.warn(`Failed to get price for ${symbol}`);
          continue;
        }

        // Check all positions for this symbol
        const symbolPositions = positions.filter(p => p.symbol === symbol);

        for (const position of symbolPositions) {
          await this.checkPosition(position, price);
        }
      }

    } catch (error) {
      logger.error(`Error checking positions for user ${userId}:`, error);
    }
  }

  /**
   * Get price with retry logic
   */
  private async getPriceWithRetry(
    userId: string,
    symbol: string
  ): Promise<{ bid: number; ask: number } | null> {
    // Check cache first
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp.getTime() < this.PRICE_CACHE_TTL_MS) {
      return { bid: cached.bid, ask: cached.ask };
    }

    const connection = getConnectionService(userId);

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const price = await connection.getPrice(symbol);

        if (price) {
          // Update cache
          this.priceCache.set(symbol, {
            symbol,
            bid: price.bid,
            ask: price.ask,
            timestamp: new Date()
          });
          return price;
        }

      } catch (error) {
        logger.warn(`Price fetch attempt ${attempt} failed for ${symbol}:`, error);

        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY_MS);
        }
      }
    }

    return null;
  }

  /**
   * Check a single position against current price
   */
  private async checkPosition(
    position: MonitoredPosition,
    price: { bid: number; ask: number }
  ): Promise<void> {
    const currentPrice = position.type === 'BUY' ? price.bid : price.ask;

    // Update last price
    position.lastPrice = currentPrice;
    position.lastCheck = new Date();

    // Emit price update event
    this.emit('price_update', {
      positionId: position.positionId,
      userId: position.userId,
      symbol: position.symbol,
      currentPrice,
      entryPrice: position.entryPrice,
      type: position.type
    });

    // Check TPs
    await this.checkTakeProfits(position, currentPrice);

    // Check SL (for emergency logging)
    await this.checkStopLoss(position, currentPrice);
  }

  /**
   * Check if any take profit levels have been hit
   */
  private async checkTakeProfits(
    position: MonitoredPosition,
    currentPrice: number
  ): Promise<void> {
    for (let i = 0; i < position.tps.length; i++) {
      const tp = position.tps[i];

      if (tp.hit) continue; // Already processed

      const tpHit = this.isTpHit(position.type, currentPrice, tp.price);

      if (tpHit) {
        logger.info(`TP${i + 1} hit for position ${position.positionId}`, {
          symbol: position.symbol,
          tpPrice: tp.price,
          currentPrice,
          percentage: tp.percentage
        });

        // Mark as hit locally
        tp.hit = true;

        // Delegate to security service
        await securityService.handleTpHit({
          positionId: position.positionId,
          userId: position.userId,
          tpIndex: i,
          tpPrice: tp.price,
          currentPrice,
          percentage: tp.percentage,
          entryPrice: position.entryPrice,
          isLastTp: i === position.tps.length - 1
        });

        // Emit event
        this.emit('tp_hit', {
          positionId: position.positionId,
          userId: position.userId,
          symbol: position.symbol,
          tpIndex: i + 1,
          tpPrice: tp.price,
          currentPrice,
          percentage: tp.percentage
        });
      }
    }
  }

  /**
   * Check if stop loss has been hit
   */
  private async checkStopLoss(
    position: MonitoredPosition,
    currentPrice: number
  ): Promise<void> {
    const slHit = this.isSlHit(position.type, currentPrice, position.sl);

    if (slHit) {
      logger.warn(`SL hit for position ${position.positionId}`, {
        symbol: position.symbol,
        slPrice: position.sl,
        currentPrice
      });

      // Emit event
      this.emit('sl_hit', {
        positionId: position.positionId,
        userId: position.userId,
        symbol: position.symbol,
        slPrice: position.sl,
        currentPrice
      });

      // Stop monitoring this position (MT5 will close it)
      this.stopMonitoring(position.positionId);
    }
  }

  /**
   * Check if TP price has been reached
   */
  private isTpHit(type: 'BUY' | 'SELL', currentPrice: number, tpPrice: number): boolean {
    if (type === 'BUY') {
      return currentPrice >= tpPrice;
    } else {
      return currentPrice <= tpPrice;
    }
  }

  /**
   * Check if SL price has been reached
   */
  private isSlHit(type: 'BUY' | 'SELL', currentPrice: number, slPrice: number): boolean {
    if (type === 'BUY') {
      return currentPrice <= slPrice;
    } else {
      return currentPrice >= slPrice;
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    positionCount: number;
    positions: Array<{ positionId: string; symbol: string; lastPrice: number | null }>;
  } {
    return {
      isMonitoring: this.isMonitoring,
      positionCount: this.monitoredPositions.size,
      positions: Array.from(this.monitoredPositions.values()).map(p => ({
        positionId: p.positionId,
        symbol: p.symbol,
        lastPrice: p.lastPrice
      }))
    };
  }

  /**
   * Load and start monitoring all open positions (on server startup)
   */
  async loadOpenPositions(): Promise<void> {
    try {
      const openPositions = await Position.find({ status: 'OPEN' });

      logger.info(`Loading ${openPositions.length} open positions for monitoring`);

      for (const position of openPositions) {
        await this.startMonitoring(position._id.toString());
      }

    } catch (error) {
      logger.error('Failed to load open positions for monitoring:', error);
    }
  }

  /**
   * Shutdown the monitor gracefully
   */
  shutdown(): void {
    this.stopMonitoringLoop();
    this.monitoredPositions.clear();
    this.priceCache.clear();
    logger.info('Price monitor service shut down');
  }
}

export default PriceMonitorService.getInstance();
