import telegramBotService from './bot.service';
import signalParserService, { ParsedSignal, ParseError } from '../trading/signal-parser.service';
import symbolMapperService from '../trading/symbol-mapper.service';
import Signal from '../../models/Signal';
import AuditLog from '../../models/AuditLog';
import logger from '../../utils/logger';
import { websocketService } from '../../websocket/server';

interface WebhookResult {
  success: boolean;
  signalId?: string;
  error?: string;
  errorType?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; username?: string };
    chat: { id: number; type: string; title?: string; username?: string };
    date: number;
    text?: string;
  };
  channel_post?: {
    message_id: number;
    chat: { id: number; type: string; title?: string; username?: string };
    date: number;
    text?: string;
  };
}

export class WebhookService {
  /**
   * Process incoming Telegram webhook update
   */
  async processWebhook(
    update: TelegramUpdate,
    secretHeader: string | undefined,
    userId?: string
  ): Promise<WebhookResult> {
    try {
      // Verify webhook secret
      if (!telegramBotService.verifyWebhookSecret(secretHeader)) {
        logger.warn('Invalid webhook secret received');
        return { success: false, error: 'Invalid webhook secret' };
      }

      // Parse the update
      const message = telegramBotService.parseUpdate(update);
      if (!message) {
        // Not a text message, ignore silently
        return { success: true };
      }

      // Check if channel is allowed
      if (!telegramBotService.isChannelAllowed(message.chatUsername)) {
        logger.warn(`Message from non-allowed channel: ${message.chatUsername}`);
        return { success: false, error: 'Channel not allowed' };
      }

      // Check if message looks like a signal
      if (!signalParserService.isLikelySignal(message.text)) {
        // Not a signal, ignore silently
        logger.debug(`Non-signal message from ${message.chatUsername}: ${message.text.substring(0, 50)}...`);
        return { success: true };
      }

      // Parse the signal
      const parseResult = signalParserService.parseSignal(message.text);

      // Check if parsing failed
      if ('type' in parseResult && parseResult.type !== undefined && 'message' in parseResult) {
        // It's a ParseError
        const error = parseResult as ParseError;
        await this.logSignalError(error, message.chatUsername || '', message.messageId, userId);
        return {
          success: false,
          error: error.message,
          errorType: error.type
        };
      }

      // It's a valid ParsedSignal
      const signal = parseResult as ParsedSignal;

      // Map symbol to broker format (optional, based on user settings)
      const mappedSymbol = await symbolMapperService.mapSymbol(signal.symbol, userId);

      // Create signal in database
      const signalData: Record<string, unknown> = {
        symbol: mappedSymbol || signal.symbol,
        type: signal.type,
        entry: signal.entry,
        tps: signal.tps,
        sl: signal.sl,
        status: 'ACTIVE',
        telegramMessageId: message.messageId,
        channel: message.chatUsername,
        rawMessage: signal.rawMessage
      };

      if (userId) {
        signalData.userId = userId;
      }

      const newSignal = await Signal.create(signalData);

      logger.info(`New signal created: ${newSignal.symbol} ${newSignal.type} @ ${newSignal.entry}`);

      // Emit WebSocket event
      if (websocketService) {
        websocketService.emitSignalNew({
          id: newSignal._id.toString(),
          symbol: newSignal.symbol,
          type: newSignal.type,
          entry: newSignal.entry,
          tps: newSignal.tps,
          sl: newSignal.sl,
          status: newSignal.status,
          createdAt: newSignal.createdAt
        });
      }

      // Create audit log
      await AuditLog.create({
        userId: userId || undefined,
        action: 'SIGNAL_RECEIVED',
        resource: 'signal',
        resourceId: newSignal._id.toString(),
        details: {
          symbol: newSignal.symbol,
          type: newSignal.type,
          entry: newSignal.entry,
          channel: message.chatUsername
        },
        success: true
      });

      return {
        success: true,
        signalId: newSignal._id.toString()
      };

    } catch (error) {
      logger.error('Error processing webhook:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Log signal parsing error
   */
  private async logSignalError(
    error: ParseError,
    channel: string,
    messageId: number,
    userId?: string
  ): Promise<void> {
    try {
      await AuditLog.create({
        userId: userId || undefined,
        action: 'SIGNAL_PARSE_ERROR',
        resource: 'signal',
        details: {
          errorType: error.type,
          errorMessage: error.message,
          rawMessage: error.rawMessage.substring(0, 500),  // Limit length
          channel,
          telegramMessageId: messageId
        },
        success: false,
        errorMessage: error.message
      });

      logger.warn(`Signal parse error from ${channel}: ${error.message}`);

      // Emit WebSocket event for signal error
      if (websocketService) {
        websocketService.emitSignalError({
          errorType: error.type,
          message: error.message,
          channel,
          timestamp: new Date()
        });
      }
    } catch (err) {
      logger.error('Error logging signal error:', err);
    }
  }

  /**
   * Manually process a signal message (for testing or manual input)
   */
  async processManualSignal(
    message: string,
    userId: string,
    channel?: string
  ): Promise<WebhookResult> {
    try {
      // Check if message looks like a signal
      if (!signalParserService.isLikelySignal(message)) {
        return {
          success: false,
          error: 'Message does not appear to be a trading signal'
        };
      }

      // Parse the signal
      const parseResult = signalParserService.parseSignal(message);

      // Check if parsing failed
      if ('type' in parseResult && 'message' in parseResult && parseResult.type !== undefined) {
        const error = parseResult as ParseError;
        return {
          success: false,
          error: error.message,
          errorType: error.type
        };
      }

      // It's a valid ParsedSignal
      const signal = parseResult as ParsedSignal;

      // Map symbol
      const mappedSymbol = await symbolMapperService.mapSymbol(signal.symbol, userId);

      // Create signal in database
      const newSignal = await Signal.create({
        userId,
        symbol: mappedSymbol || signal.symbol,
        type: signal.type,
        entry: signal.entry,
        tps: signal.tps,
        sl: signal.sl,
        status: 'ACTIVE',
        channel: channel || 'MANUAL',
        rawMessage: signal.rawMessage
      });

      logger.info(`Manual signal created: ${newSignal.symbol} ${newSignal.type} @ ${newSignal.entry}`);

      // Emit WebSocket event
      if (websocketService) {
        websocketService.emitSignalNew({
          id: newSignal._id.toString(),
          symbol: newSignal.symbol,
          type: newSignal.type,
          entry: newSignal.entry,
          tps: newSignal.tps,
          sl: newSignal.sl,
          status: newSignal.status,
          createdAt: newSignal.createdAt
        });
      }

      return {
        success: true,
        signalId: newSignal._id.toString()
      };

    } catch (error) {
      logger.error('Error processing manual signal:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }
}

export default new WebhookService();
