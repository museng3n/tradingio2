import { Router } from 'express';
import analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

// Dashboard summary (cards data)
router.get(
  '/summary',
  analyticsController.getSummary
);

// TP statistics (achievement chart)
router.get(
  '/tp-statistics',
  analyticsController.getTPStatistics
);

// Profit chart data
router.get(
  '/profit-chart',
  analyticsController.getProfitChart
);

// Performance by symbol
router.get(
  '/performance-by-symbol',
  analyticsController.getPerformanceBySymbol
);

// Performance by time of day
router.get(
  '/performance-by-time',
  analyticsController.getPerformanceByTime
);

// Signal statistics
router.get(
  '/signals',
  analyticsController.getSignalStats
);

// Full report generation
router.get(
  '/report',
  auditLog('GENERATE_REPORT', 'analytics'),
  analyticsController.generateReport
);

// Daily summary
router.get(
  '/daily-summary',
  analyticsController.getDailySummary
);

// Weekly summary
router.get(
  '/weekly-summary',
  analyticsController.getWeeklySummary
);

// Export positions to CSV
router.get(
  '/export/positions',
  auditLog('EXPORT_POSITIONS', 'analytics'),
  analyticsController.exportPositions
);

// Export signals to CSV
router.get(
  '/export/signals',
  auditLog('EXPORT_SIGNALS', 'analytics'),
  analyticsController.exportSignals
);

export default router;
