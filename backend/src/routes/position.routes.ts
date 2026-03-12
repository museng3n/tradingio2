import { Router } from 'express';
import positionController from '../controllers/position.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();

// All position routes require authentication
router.use(authenticate);

// Get all positions
router.get(
  '/',
  auditLog('VIEW_POSITIONS', 'position'),
  positionController.getPositions
);

// Get open positions only
router.get(
  '/open',
  positionController.getOpenPositions
);

// Get position statistics
router.get(
  '/stats',
  positionController.getPositionStats
);

// Get risk metrics
router.get(
  '/risk-metrics',
  positionController.getRiskMetrics
);

// Calculate recommended lot size
router.post(
  '/calculate-lot-size',
  positionController.calculateLotSize
);

// Get TP templates
router.get(
  '/tp-templates',
  positionController.getTPTemplates
);

// Preview TP distribution
router.post(
  '/preview-tp-distribution',
  positionController.previewTPDistribution
);

// MT5 connection endpoints
router.post(
  '/mt5/connect',
  auditLog('MT5_CONNECT', 'mt5'),
  positionController.connectMT5
);

router.post(
  '/mt5/disconnect',
  auditLog('MT5_DISCONNECT', 'mt5'),
  positionController.disconnectMT5
);

router.get(
  '/mt5/status',
  positionController.getMT5Status
);

// Get specific position
router.get(
  '/:positionId',
  auditLog('VIEW_POSITION', 'position'),
  positionController.getPositionById
);

// Open a new position (from signal)
router.post(
  '/',
  auditLog('OPEN_POSITION', 'position'),
  positionController.openPosition
);

// Modify a position (SL/TP)
router.put(
  '/:positionId',
  auditLog('MODIFY_POSITION', 'position'),
  positionController.modifyPosition
);

// Close a position
router.post(
  '/:positionId/close',
  auditLog('CLOSE_POSITION', 'position'),
  positionController.closePosition
);

// Close all positions
router.post(
  '/close-all',
  auditLog('CLOSE_ALL_POSITIONS', 'position'),
  positionController.closeAllPositions
);

export default router;
