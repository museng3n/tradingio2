import { Router } from 'express';
import adminController from '../controllers/admin.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/admin.middleware';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// ==================== USER MANAGEMENT ====================

// Get all users with filters and stats
router.get(
  '/users',
  auditLog('VIEW_ALL_USERS', 'admin'),
  adminController.getAllUsers
);

// Bulk suspend users
router.post(
  '/users/bulk-suspend',
  auditLog('BULK_SUSPEND_USERS', 'admin'),
  adminController.bulkSuspend
);

// Compare user performance
router.post(
  '/users/compare',
  auditLog('COMPARE_USERS', 'admin'),
  adminController.compareUsers
);

// Get user details
router.get(
  '/users/:userId',
  auditLog('VIEW_USER_DETAILS', 'admin'),
  adminController.getUserDetails
);

// Get user trading history
router.get(
  '/users/:userId/history',
  auditLog('VIEW_USER_HISTORY', 'admin'),
  adminController.getUserHistory
);

// Suspend user
router.post(
  '/users/:userId/suspend',
  auditLog('SUSPEND_USER', 'admin'),
  adminController.suspendUser
);

// Activate user
router.post(
  '/users/:userId/activate',
  auditLog('ACTIVATE_USER', 'admin'),
  adminController.activateUser
);

// Delete user
router.delete(
  '/users/:userId',
  auditLog('DELETE_USER', 'admin'),
  adminController.deleteUser
);

// Reset user password
router.post(
  '/users/:userId/reset-password',
  auditLog('RESET_USER_PASSWORD', 'admin'),
  adminController.resetUserPassword
);

// Disable user 2FA
router.post(
  '/users/:userId/disable-2fa',
  auditLog('DISABLE_USER_2FA', 'admin'),
  adminController.disableUser2FA
);

// ==================== SYSTEM MONITORING ====================

// Get system statistics (legacy)
router.get(
  '/stats',
  auditLog('VIEW_SYSTEM_STATS', 'admin'),
  adminController.getSystemStats
);

// Get system health
router.get(
  '/system/health',
  adminController.getSystemHealth
);

// Get comprehensive system metrics
router.get(
  '/system/metrics',
  adminController.getSystemMetrics
);

// Get error metrics
router.get(
  '/system/errors',
  adminController.getErrorMetrics
);

// Get MT5 connection status
router.get(
  '/system/mt5-status',
  adminController.getMT5Status
);

// Get real-time trading metrics
router.get(
  '/system/realtime',
  adminController.getRealTimeMetrics
);

// ==================== AUDIT LOGS ====================

// Get audit logs with filters
router.get(
  '/audit-logs',
  auditLog('VIEW_AUDIT_LOGS', 'admin'),
  adminController.getAuditLogs
);

// Export audit logs
router.get(
  '/audit-logs/export',
  auditLog('EXPORT_AUDIT_LOGS', 'admin'),
  adminController.exportAuditLogs
);

// Get security events
router.get(
  '/audit-logs/security',
  auditLog('VIEW_SECURITY_EVENTS', 'admin'),
  adminController.getSecurityEvents
);

// ==================== ADVANCED ANALYTICS ====================

// Get system-wide profit tracking
router.get(
  '/analytics/profit',
  adminController.getSystemProfit
);

// Get signal analytics
router.get(
  '/analytics/signals',
  adminController.getSignalAnalytics
);

// Get risk dashboard
router.get(
  '/analytics/risk',
  adminController.getRiskDashboard
);

export default router;
