import logger from '../../utils/logger';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
    };
    date: number;
    text?: string;
  };
  channel_post?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
    };
    date: number;
    text?: string;
  };
}

interface TelegramMessage {
  messageId: number;
  chatId: number;
  chatType: string;
  chatTitle?: string;
  chatUsername?: string;
  text: string;
  date: Date;
  fromUserId?: number;
  fromUsername?: string;
}

export class TelegramBotService {
  private botToken: string;
  private webhookUrl: string;
  private webhookSecret: string;
  private allowedChannels: string[];

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || '';
    this.webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
    this.allowedChannels = (process.env.TELEGRAM_ALLOWED_CHANNELS || '').split(',').filter(Boolean);
  }

  /**
   * Set up webhook with Telegram
   */
  async setupWebhook(): Promise<boolean> {
    if (!this.botToken || !this.webhookUrl) {
      logger.warn('Telegram bot token or webhook URL not configured');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/setWebhook`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: this.webhookUrl,
          secret_token: this.webhookSecret,
          allowed_updates: ['message', 'channel_post']
        })
      });

      const data = await response.json() as { ok: boolean; description?: string };

      if (data.ok) {
        logger.info('Telegram webhook set up successfully');
        return true;
      } else {
        logger.error('Failed to set up Telegram webhook:', data.description);
        return false;
      }
    } catch (error) {
      logger.error('Error setting up Telegram webhook:', error);
      return false;
    }
  }

  /**
   * Remove webhook
   */
  async removeWebhook(): Promise<boolean> {
    if (!this.botToken) {
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/deleteWebhook`;
      const response = await fetch(url, { method: 'POST' });
      const data = await response.json() as { ok: boolean };

      if (data.ok) {
        logger.info('Telegram webhook removed');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error removing Telegram webhook:', error);
      return false;
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(): Promise<Record<string, unknown> | null> {
    if (!this.botToken) {
      return null;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getWebhookInfo`;
      const response = await fetch(url);
      const data = await response.json() as { ok: boolean; result?: Record<string, unknown> };

      if (data.ok) {
        return data.result || null;
      }
      return null;
    } catch (error) {
      logger.error('Error getting webhook info:', error);
      return null;
    }
  }

  /**
   * Verify webhook secret
   */
  verifyWebhookSecret(secretHeader: string | undefined): boolean {
    if (!this.webhookSecret) {
      // If no secret configured, allow all (development mode)
      return true;
    }
    return secretHeader === this.webhookSecret;
  }

  /**
   * Check if channel is allowed
   */
  isChannelAllowed(chatUsername: string | undefined): boolean {
    if (this.allowedChannels.length === 0) {
      // If no channels configured, allow all (development mode)
      return true;
    }
    if (!chatUsername) {
      return false;
    }
    return this.allowedChannels.includes(chatUsername) ||
           this.allowedChannels.includes(`@${chatUsername}`);
  }

  /**
   * Parse Telegram update into a standardized message format
   */
  parseUpdate(update: TelegramUpdate): TelegramMessage | null {
    // Handle channel posts
    if (update.channel_post) {
      const post = update.channel_post;
      if (!post.text) {
        return null;
      }

      return {
        messageId: post.message_id,
        chatId: post.chat.id,
        chatType: post.chat.type,
        chatTitle: post.chat.title,
        chatUsername: post.chat.username,
        text: post.text,
        date: new Date(post.date * 1000)
      };
    }

    // Handle regular messages
    if (update.message) {
      const msg = update.message;
      if (!msg.text) {
        return null;
      }

      return {
        messageId: msg.message_id,
        chatId: msg.chat.id,
        chatType: msg.chat.type,
        chatTitle: msg.chat.title,
        chatUsername: msg.chat.username,
        text: msg.text,
        date: new Date(msg.date * 1000),
        fromUserId: msg.from?.id,
        fromUsername: msg.from?.username
      };
    }

    return null;
  }

  /**
   * Send a message to a chat
   */
  async sendMessage(chatId: number, text: string): Promise<boolean> {
    if (!this.botToken) {
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML'
        })
      });

      const data = await response.json() as { ok: boolean };
      return data.ok;
    } catch (error) {
      logger.error('Error sending Telegram message:', error);
      return false;
    }
  }
}

export default new TelegramBotService();
