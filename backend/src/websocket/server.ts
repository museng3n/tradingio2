import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwtService from '../services/auth/jwt.service';
import logger from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

interface SignalData {
  id: string;
  symbol: string;
  type: string;
  entry: number;
  tps: (number | string)[];
  sl: number;
  status: string;
  createdAt: Date;
}

interface PositionUpdateData {
  id: string;
  currentPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
}

interface TPHitData {
  positionId: string;
  tpLevel: number;
  tpPrice: number;
  percentageClosed: number;
}

interface SLSecuredData {
  positionId: string;
  newSL: number;
  reason: string;
}

interface PositionClosedData {
  positionId: string;
  closePrice: number;
  profitLoss: number;
  reason: string;
}

interface SignalErrorData {
  errorType: string;
  message: string;
  channel: string;
  timestamp: Date;
}

export class WebSocketService {
  private io: Server | null = null;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> socketIds

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: true,  // Allow all origins including file://
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      allowEIO3: true  // Enable Engine.IO v3 compatibility
    });

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token ||
                      socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const payload = jwtService.verifyAccessToken(token);
        socket.userId = payload.userId;
        socket.userEmail = payload.email;
        socket.userRole = payload.role;

        next();
      } catch (error) {
        next(new Error('Invalid or expired token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    logger.info('WebSocket server initialized');
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;

    logger.info(`WebSocket connected: ${socket.userEmail} (${socket.id})`);

    // Track connected user
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(socket.id);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Handle subscription to channels
    socket.on('subscribe', (data: { channels: string[] }) => {
      if (data.channels) {
        data.channels.forEach(channel => {
          socket.join(channel);
          logger.debug(`${socket.userEmail} subscribed to ${channel}`);
        });
      }
    });

    // Handle unsubscription
    socket.on('unsubscribe', (data: { channels: string[] }) => {
      if (data.channels) {
        data.channels.forEach(channel => {
          socket.leave(channel);
          logger.debug(`${socket.userEmail} unsubscribed from ${channel}`);
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket disconnected: ${socket.userEmail} - ${reason}`);

      // Remove from tracking
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(userId);
        }
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`WebSocket error for ${socket.userEmail}:`, error);
    });

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected to TradingHub WebSocket',
      userId,
      timestamp: new Date()
    });
  }

  /**
   * Emit new signal event
   */
  emitSignalNew(signal: SignalData, userId?: string): void {
    if (!this.io) return;

    if (userId) {
      // Send to specific user
      this.io.to(`user:${userId}`).emit('signal_new', signal);
    } else {
      // Broadcast to all (admin view)
      this.io.emit('signal_new', signal);
    }

    logger.debug(`Emitted signal_new: ${signal.symbol} ${signal.type}`);
  }

  /**
   * Emit position update event
   */
  emitPositionUpdate(data: PositionUpdateData, userId: string): void {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('position_update', data);
    logger.debug(`Emitted position_update for position ${data.id}`);
  }

  /**
   * Emit TP hit event
   */
  emitTPHit(data: TPHitData, userId: string): void {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('tp_hit', data);
    logger.debug(`Emitted tp_hit: position ${data.positionId}, TP${data.tpLevel}`);
  }

  /**
   * Emit SL secured event
   */
  emitSLSecured(data: SLSecuredData, userId: string): void {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('sl_secured', data);
    logger.debug(`Emitted sl_secured for position ${data.positionId}`);
  }

  /**
   * Emit position closed event
   */
  emitPositionClosed(data: PositionClosedData, userId: string): void {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('position_closed', data);
    logger.debug(`Emitted position_closed for position ${data.positionId}`);
  }

  /**
   * Emit signal error event
   */
  emitSignalError(data: SignalErrorData, userId?: string): void {
    if (!this.io) return;

    if (userId) {
      this.io.to(`user:${userId}`).emit('signal_error', data);
    } else {
      // Broadcast to admins
      this.io.emit('signal_error', data);
    }

    logger.debug(`Emitted signal_error: ${data.errorType}`);
  }

  /**
   * Emit MT5 connection status
   */
  emitMT5Status(connected: boolean, userId: string): void {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('mt5_status', { connected });
    logger.debug(`Emitted mt5_status: ${connected}`);
  }

  /**
   * Get number of connected users
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId: string, event: string, data: unknown): void {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit to specific user (alias for sendToUser)
   */
  emitToUser(userId: string, event: string, data: unknown): void {
    this.sendToUser(userId, event, data);
  }

  /**
   * Broadcast to all connected users
   */
  broadcast(event: string, data: unknown): void {
    if (!this.io) return;

    this.io.emit(event, data);
  }
}

// Singleton instance
export const websocketService = new WebSocketService();

// Helper function to get the WebSocket server instance
export function getWebSocketServer(): WebSocketService {
  return websocketService;
}

export default websocketService;
