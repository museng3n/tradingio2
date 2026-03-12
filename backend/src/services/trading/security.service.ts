import { EventEmitter } from 'events';
import Position from '../../models/Position';
import AuditLog from '../../models/AuditLog';
import mt5OrderService from '../mt5/order.service';
import priceMonitorService from './price-monitor.service';
import { getWebSocketServer } from '../../websocket/server';
import logger from '../../utils/logger';

interface TpHitEvent {
  positionId: string;
  userId: string;
  tpIndex: number;
  tpPrice: number;
  currentPrice: number;
  percentage: number;
  entryPrice: number;
  isLastTp: boolean;
}

interface SecurityAction {
  type: 'PARTIAL_CLOSE' | 'FULL_CLOSE' | 'MOVE_SL' | 'TRAIL_SL';
  positionId: string;
  userId: string;
  details: Record<string, unknown>;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export class SecurityService extends EventEmitter {
  private static instance: SecurityService;
  private actionHistory: SecurityAction[] = [];
  private readonly MAX_HISTORY_SIZE = 1000;

  private constructor() {
    super();
  }

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Handle TP hit event - core security logic
   */
  async handleTpHit(event: TpHitEvent): Promise<void> {
    const { positionId, userId, tpIndex, tpPrice, currentPrice, percentage, entryPrice, isLastTp } = event;

    logger.info(`Processing TP${tpIndex + 1} hit for position ${positionId}`, event);

    try {
      // Get the position from DB
      const position = await Position.findById(positionId);

      if (!position) {
        logger.error(`Position not found: ${positionId}`);
        return;
      }

      // Update TP as hit in DB
      position.tps[tpIndex].hit = true;
      position.tps[tpIndex].hitAt = new Date();

      // Determine actions based on TP index
      if (isLastTp) {
        // Last TP - close remaining position
        await this.handleLastTpHit(position, tpIndex, currentPrice);
      } else {
        // Not last TP - partial close and secure
        await this.handlePartialTpHit(position, tpIndex, percentage, entryPrice, currentPrice);
      }

      // Save position updates
      await position.save();

      // Log security event
      await this.logSecurityEvent(userId, 'TP_HIT', positionId, {
        tpIndex: tpIndex + 1,
        tpPrice,
        currentPrice,
        percentage,
        isLastTp
      });

    } catch (error) {
      logger.error(`Failed to handle TP hit for position ${positionId}:`, error);
      await this.logSecurityEvent(userId, 'TP_HIT_ERROR', positionId, {
        tpIndex: tpIndex + 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle last TP hit - close entire remaining position
   */
  private async handleLastTpHit(
    position: InstanceType<typeof Position>,
    tpIndex: number,
    currentPrice: number
  ): Promise<void> {
    const positionId = position._id.toString();
    const userId = position.userId.toString();

    logger.info(`Last TP hit - closing remaining position ${positionId}`);

    try {
      // Close the remaining position
      const closeResult = await mt5OrderService.closeOrder(userId, {
        positionId,
        odooId: position.odooId,
        percentage: 100
      });

      if (closeResult.success) {
        // Update position status
        position.status = 'CLOSED';
        position.closedAt = new Date();
        position.closePrice = currentPrice;
        position.profitLoss = this.calculateProfitLoss(position, currentPrice);

        // Stop monitoring
        priceMonitorService.stopMonitoring(positionId);

        // Emit WebSocket event
        this.emitSecurityEvent('position_closed', {
          positionId,
          userId,
          reason: `TP${tpIndex + 1}_HIT`,
          closePrice: currentPrice,
          profitLoss: position.profitLoss
        });

        this.recordAction({
          type: 'FULL_CLOSE',
          positionId,
          userId,
          details: { tpIndex: tpIndex + 1, closePrice: currentPrice },
          timestamp: new Date(),
          success: true
        });

      } else {
        logger.error(`Failed to close position ${positionId}:`, closeResult.error);
        this.recordAction({
          type: 'FULL_CLOSE',
          positionId,
          userId,
          details: { tpIndex: tpIndex + 1 },
          timestamp: new Date(),
          success: false,
          error: closeResult.error
        });
      }

    } catch (error) {
      logger.error(`Error closing position ${positionId}:`, error);
    }
  }

  /**
   * Handle partial TP hit - partial close and move SL to breakeven
   */
  private async handlePartialTpHit(
    position: InstanceType<typeof Position>,
    tpIndex: number,
    percentage: number,
    entryPrice: number,
    currentPrice: number
  ): Promise<void> {
    const positionId = position._id.toString();
    const userId = position.userId.toString();

    logger.info(`Partial TP hit - closing ${percentage}% of position ${positionId}`);

    // Step 1: Partial close
    await this.executePartialClose(position, percentage, tpIndex);

    // Step 2: Move SL to breakeven (only on TP1)
    if (tpIndex === 0) {
      await this.moveSlToBreakeven(position, entryPrice);
    }

    // Emit combined event
    this.emitSecurityEvent('tp_hit', {
      positionId,
      userId,
      tpIndex: tpIndex + 1,
      percentage,
      currentPrice,
      slSecured: tpIndex === 0,
      newSl: tpIndex === 0 ? entryPrice : position.sl
    });
  }

  /**
   * Execute partial position close
   */
  private async executePartialClose(
    position: InstanceType<typeof Position>,
    percentage: number,
    tpIndex: number
  ): Promise<void> {
    const positionId = position._id.toString();
    const userId = position.userId.toString();

    try {
      const closeResult = await mt5OrderService.closeOrder(userId, {
        positionId,
        odooId: position.odooId,
        percentage
      });

      if (closeResult.success) {
        // Update lot size
        const closedLots = position.lotSize * (percentage / 100);
        position.lotSize -= closedLots;

        logger.info(`Partial close successful for position ${positionId}`, {
          closedLots,
          remainingLots: position.lotSize
        });

        // Update monitored position
        priceMonitorService.updatePosition(positionId, {
          lotSize: position.lotSize
        });

        this.recordAction({
          type: 'PARTIAL_CLOSE',
          positionId,
          userId,
          details: {
            tpIndex: tpIndex + 1,
            percentage,
            closedLots,
            remainingLots: position.lotSize
          },
          timestamp: new Date(),
          success: true
        });

      } else {
        logger.error(`Partial close failed for position ${positionId}:`, closeResult.error);
        this.recordAction({
          type: 'PARTIAL_CLOSE',
          positionId,
          userId,
          details: { tpIndex: tpIndex + 1, percentage },
          timestamp: new Date(),
          success: false,
          error: closeResult.error
        });
      }

    } catch (error) {
      logger.error(`Error during partial close for position ${positionId}:`, error);
    }
  }

  /**
   * Move SL to breakeven (entry price)
   */
  private async moveSlToBreakeven(
    position: InstanceType<typeof Position>,
    entryPrice: number
  ): Promise<void> {
    const positionId = position._id.toString();
    const userId = position.userId.toString();

    // Only move SL if it would improve the position
    const shouldMove = this.shouldMoveSlToBreakeven(position, entryPrice);

    if (!shouldMove) {
      logger.info(`SL already at or better than breakeven for position ${positionId}`);
      return;
    }

    try {
      const modifyResult = await mt5OrderService.modifyOrder(userId, {
        positionId,
        odooId: position.odooId,
        sl: entryPrice,
        tps: position.tps.filter(tp => !tp.hit).map(tp => tp.price)
      });

      if (modifyResult.success) {
        const oldSl = position.sl;
        position.sl = entryPrice;
        position.slSecured = true;
        position.slSecuredAt = new Date();

        logger.info(`SL moved to breakeven for position ${positionId}`, {
          oldSl,
          newSl: entryPrice
        });

        // Update monitored position
        priceMonitorService.updatePosition(positionId, { sl: entryPrice });

        // Emit sl_secured event
        this.emitSecurityEvent('sl_secured', {
          positionId,
          userId,
          oldSl,
          newSl: entryPrice,
          reason: 'TP1_HIT'
        });

        this.recordAction({
          type: 'MOVE_SL',
          positionId,
          userId,
          details: { oldSl, newSl: entryPrice, reason: 'breakeven' },
          timestamp: new Date(),
          success: true
        });

      } else {
        logger.error(`Failed to move SL for position ${positionId}:`, modifyResult.error);
        this.recordAction({
          type: 'MOVE_SL',
          positionId,
          userId,
          details: { targetSl: entryPrice },
          timestamp: new Date(),
          success: false,
          error: modifyResult.error
        });
      }

    } catch (error) {
      logger.error(`Error moving SL for position ${positionId}:`, error);
    }
  }

  /**
   * Check if SL should be moved to breakeven
   */
  private shouldMoveSlToBreakeven(
    position: InstanceType<typeof Position>,
    entryPrice: number
  ): boolean {
    if (position.type === 'BUY') {
      // For BUY, breakeven SL should be higher than current SL
      return entryPrice > position.sl;
    } else {
      // For SELL, breakeven SL should be lower than current SL
      return entryPrice < position.sl;
    }
  }

  /**
   * Calculate profit/loss
   */
  private calculateProfitLoss(
    position: InstanceType<typeof Position>,
    closePrice: number
  ): number {
    const priceDiff = position.type === 'BUY'
      ? closePrice - position.entryPrice
      : position.entryPrice - closePrice;

    // Standard lot calculation (100,000 units)
    return priceDiff * position.lotSize * 100000;
  }

  /**
   * Emit WebSocket security event
   */
  private emitSecurityEvent(event: string, data: Record<string, unknown>): void {
    try {
      const wsServer = getWebSocketServer();
      if (wsServer) {
        const userId = data.userId as string;
        wsServer.emitToUser(userId, event, data);
        wsServer.emitToUser(userId, 'position_update', data);
      }
    } catch (error) {
      logger.error('Failed to emit WebSocket event:', error);
    }
  }

  /**
   * Log security event to audit log
   */
  private async logSecurityEvent(
    userId: string,
    action: string,
    resourceId: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      await AuditLog.create({
        userId,
        action,
        resourceType: 'position',
        resourceId,
        details,
        ipAddress: 'system',
        userAgent: 'security-service'
      });
    } catch (error) {
      logger.error('Failed to log security event:', error);
    }
  }

  /**
   * Record action in history
   */
  private recordAction(action: SecurityAction): void {
    this.actionHistory.push(action);

    // Keep history size manageable
    if (this.actionHistory.length > this.MAX_HISTORY_SIZE) {
      this.actionHistory.shift();
    }

    this.emit('security_action', action);
  }

  /**
   * Trail stop loss (advanced feature)
   */
  async trailStopLoss(
    positionId: string,
    userId: string,
    newSl: number
  ): Promise<boolean> {
    try {
      const position = await Position.findById(positionId);

      if (!position || position.userId.toString() !== userId) {
        return false;
      }

      // Validate trail direction
      const isValidTrail = this.isValidSlTrail(position, newSl);

      if (!isValidTrail) {
        logger.warn(`Invalid SL trail for position ${positionId}`, {
          currentSl: position.sl,
          proposedSl: newSl
        });
        return false;
      }

      const modifyResult = await mt5OrderService.modifyOrder(userId, {
        positionId,
        odooId: position.odooId,
        sl: newSl,
        tps: position.tps.filter(tp => !tp.hit).map(tp => tp.price)
      });

      if (modifyResult.success) {
        const oldSl = position.sl;
        position.sl = newSl;
        await position.save();

        priceMonitorService.updatePosition(positionId, { sl: newSl });

        this.emitSecurityEvent('sl_trailed', {
          positionId,
          userId,
          oldSl,
          newSl
        });

        this.recordAction({
          type: 'TRAIL_SL',
          positionId,
          userId,
          details: { oldSl, newSl },
          timestamp: new Date(),
          success: true
        });

        return true;
      }

      return false;

    } catch (error) {
      logger.error(`Error trailing SL for position ${positionId}:`, error);
      return false;
    }
  }

  /**
   * Validate SL trail is in correct direction
   */
  private isValidSlTrail(position: InstanceType<typeof Position>, newSl: number): boolean {
    if (position.type === 'BUY') {
      // For BUY, SL can only move up (improve)
      return newSl > position.sl;
    } else {
      // For SELL, SL can only move down (improve)
      return newSl < position.sl;
    }
  }

  /**
   * Get recent security actions
   */
  getRecentActions(limit: number = 50): SecurityAction[] {
    return this.actionHistory.slice(-limit);
  }

  /**
   * Get actions for a specific position
   */
  getPositionActions(positionId: string): SecurityAction[] {
    return this.actionHistory.filter(a => a.positionId === positionId);
  }
}

export default SecurityService.getInstance();
