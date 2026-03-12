import { Router } from 'express';
import signalController from '../controllers/signal.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();

// All signal routes require authentication
router.use(authenticate);

// Get all signals
router.get(
  '/',
  auditLog('VIEW_SIGNALS', 'signal'),
  signalController.getSignals
);

// Get recent signals (for dashboard)
router.get(
  '/recent',
  signalController.getRecentSignals
);

// Get signal statistics
router.get(
  '/stats',
  signalController.getSignalStats
);

// Get specific signal
router.get(
  '/:signalId',
  auditLog('VIEW_SIGNAL', 'signal'),
  signalController.getSignalById
);

// Cancel a signal
router.post(
  '/:signalId/cancel',
  auditLog('CANCEL_SIGNAL', 'signal'),
  signalController.cancelSignal
);

// Manually create a signal (for testing)
router.post(
  '/',
  auditLog('CREATE_MANUAL_SIGNAL', 'signal'),
  signalController.createManualSignal
);

export default router;
