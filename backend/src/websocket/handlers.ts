import priceMonitorService from '../services/trading/price-monitor.service';
import securityService from '../services/trading/security.service';
import { websocketService } from './server';
import logger from '../utils/logger';

/**
 * Initialize WebSocket event handlers for the security system
 * These handlers connect the price monitor and security services to WebSocket events
 */
export function initializeSecurityHandlers(): void {
  logger.info('Initializing security WebSocket handlers');

  // Price Monitor Events
  setupPriceMonitorHandlers();

  // Security Service Events
  setupSecurityHandlers();

  logger.info('Security WebSocket handlers initialized');
}

/**
 * Setup price monitor event handlers
 */
function setupPriceMonitorHandlers(): void {
  // Position monitoring started
  priceMonitorService.on('position_monitoring_started', (data) => {
    logger.debug('Position monitoring started', data);
    websocketService.sendToUser(data.userId, 'monitoring_started', {
      positionId: data.positionId,
      symbol: data.symbol,
      timestamp: new Date()
    });
  });

  // Position monitoring stopped
  priceMonitorService.on('position_monitoring_stopped', (data) => {
    logger.debug('Position monitoring stopped', data);
    websocketService.sendToUser(data.userId, 'monitoring_stopped', {
      positionId: data.positionId,
      symbol: data.symbol,
      timestamp: new Date()
    });
  });

  // Real-time price updates
  priceMonitorService.on('price_update', (data) => {
    const profitLoss = calculateUnrealizedPL(data);

    websocketService.sendToUser(data.userId, 'position_update', {
      positionId: data.positionId,
      symbol: data.symbol,
      currentPrice: data.currentPrice,
      entryPrice: data.entryPrice,
      type: data.type,
      profitLoss,
      timestamp: new Date()
    });
  });

  // TP hit event
  priceMonitorService.on('tp_hit', (data) => {
    logger.info(`TP${data.tpIndex} hit event emitted`, data);

    websocketService.sendToUser(data.userId, 'tp_hit', {
      positionId: data.positionId,
      symbol: data.symbol,
      tpLevel: data.tpIndex,
      tpPrice: data.tpPrice,
      currentPrice: data.currentPrice,
      percentageClosed: data.percentage,
      timestamp: new Date()
    });

    // Also send notification
    websocketService.sendToUser(data.userId, 'notification', {
      type: 'success',
      title: `TP${data.tpIndex} Hit!`,
      message: `${data.symbol} reached TP${data.tpIndex} at ${data.currentPrice}. Closing ${data.percentage}%`,
      timestamp: new Date()
    });
  });

  // SL hit event
  priceMonitorService.on('sl_hit', (data) => {
    logger.warn(`SL hit event emitted`, data);

    websocketService.sendToUser(data.userId, 'sl_hit', {
      positionId: data.positionId,
      symbol: data.symbol,
      slPrice: data.slPrice,
      currentPrice: data.currentPrice,
      timestamp: new Date()
    });

    // Send notification
    websocketService.sendToUser(data.userId, 'notification', {
      type: 'warning',
      title: 'Stop Loss Hit',
      message: `${data.symbol} hit SL at ${data.currentPrice}`,
      timestamp: new Date()
    });
  });
}

/**
 * Setup security service event handlers
 */
function setupSecurityHandlers(): void {
  // Security action events
  securityService.on('security_action', (action) => {
    logger.info('Security action executed', {
      type: action.type,
      positionId: action.positionId,
      success: action.success
    });

    websocketService.sendToUser(action.userId, 'security_action', {
      type: action.type,
      positionId: action.positionId,
      details: action.details,
      success: action.success,
      error: action.error,
      timestamp: action.timestamp
    });

    // Send specific notifications based on action type
    if (action.success) {
      switch (action.type) {
        case 'MOVE_SL':
          websocketService.sendToUser(action.userId, 'notification', {
            type: 'info',
            title: 'SL Secured',
            message: `Stop loss moved to breakeven (${action.details.newSl})`,
            timestamp: new Date()
          });
          break;

        case 'PARTIAL_CLOSE':
          websocketService.sendToUser(action.userId, 'notification', {
            type: 'success',
            title: 'Partial Close',
            message: `Closed ${action.details.percentage}% at TP${action.details.tpIndex}`,
            timestamp: new Date()
          });
          break;

        case 'FULL_CLOSE':
          websocketService.sendToUser(action.userId, 'notification', {
            type: 'success',
            title: 'Position Closed',
            message: `Position fully closed at TP${action.details.tpIndex}`,
            timestamp: new Date()
          });
          break;

        case 'TRAIL_SL':
          websocketService.sendToUser(action.userId, 'notification', {
            type: 'info',
            title: 'SL Trailed',
            message: `Stop loss trailed to ${action.details.newSl}`,
            timestamp: new Date()
          });
          break;
      }
    } else {
      // Error notification
      websocketService.sendToUser(action.userId, 'notification', {
        type: 'error',
        title: 'Security Action Failed',
        message: action.error || `Failed to execute ${action.type}`,
        timestamp: new Date()
      });
    }
  });
}

/**
 * Calculate unrealized profit/loss
 */
function calculateUnrealizedPL(data: {
  type: string;
  currentPrice: number;
  entryPrice: number;
}): number {
  const priceDiff = data.type === 'BUY'
    ? data.currentPrice - data.entryPrice
    : data.entryPrice - data.currentPrice;

  // Return in pips (multiply by 10000 for forex pairs)
  return priceDiff * 10000;
}

/**
 * Emit position status summary
 */
export function emitPositionStatus(userId: string): void {
  const status = priceMonitorService.getStatus();

  websocketService.sendToUser(userId, 'monitor_status', {
    isMonitoring: status.isMonitoring,
    positionCount: status.positionCount,
    positions: status.positions,
    timestamp: new Date()
  });
}

/**
 * Emit security action history
 */
export function emitSecurityHistory(userId: string, limit: number = 20): void {
  const actions = securityService.getRecentActions(limit);

  // Filter to user's actions only
  const userActions = actions.filter(a => a.userId === userId);

  websocketService.sendToUser(userId, 'security_history', {
    actions: userActions,
    timestamp: new Date()
  });
}

export default {
  initializeSecurityHandlers,
  emitPositionStatus,
  emitSecurityHistory
};
