import { Router, Request, Response, NextFunction } from 'express';
import webhookService from '../services/telegram/webhook.service';
import signalParserService from '../services/trading/signal-parser.service';
import { authenticate, AuthRequest } from '../middlewares/auth.middleware';
import logger from '../utils/logger';

const router = Router();

/**
 * Telegram webhook endpoint
 * POST /api/webhook/telegram
 */
router.post('/telegram', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'] as string | undefined;
    const update = req.body;

    logger.debug('Received Telegram webhook update:', JSON.stringify(update).substring(0, 200));

    const result = await webhookService.processWebhook(update, secretHeader);

    if (result.success) {
      res.status(200).json({ ok: true, signalId: result.signalId });
    } else {
      // Still return 200 to Telegram (so it doesn't retry)
      // but include error info in response
      res.status(200).json({
        ok: false,
        error: result.error,
        errorType: result.errorType
      });
    }
  } catch (error) {
    logger.error('Webhook error:', error);
    // Always return 200 to Telegram
    res.status(200).json({ ok: false, error: 'Internal server error' });
  }
});

/**
 * Manual signal submission (authenticated)
 * POST /api/webhook/manual
 */
router.post(
  '/manual',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      const { message, channel } = req.body;

      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const result = await webhookService.processManualSignal(message, userId, channel);

      if (result.success) {
        res.status(201).json({
          message: 'Signal created successfully',
          signalId: result.signalId
        });
      } else {
        res.status(400).json({
          error: result.error,
          errorType: result.errorType
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Test signal parsing (authenticated)
 * POST /api/webhook/test-parse
 */
router.post(
  '/test-parse',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { message } = req.body;

      if (!message) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      const isLikelySignal = signalParserService.isLikelySignal(message);
      const parseResult = signalParserService.parseSignal(message);

      res.json({
        isLikelySignal,
        parseResult
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
