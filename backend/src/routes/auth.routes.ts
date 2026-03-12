import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { validate } from '../middlewares/validator.middleware';
import { authLimiter } from '../middlewares/rate-limit.middleware';
import { auditLog } from '../middlewares/audit.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import {
  registerSchema,
  loginSchema,
  enable2FASchema,
  verify2FASetupSchema,
  verify2FASchema,
  refreshTokenSchema
} from '../utils/validators';

const router = Router();

// Register
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  auditLog('REGISTER', 'auth'),
  authController.register
);

// Login (Step 1 - credentials)
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  auditLog('LOGIN_ATTEMPT', 'auth'),
  authController.login
);

// Enable 2FA
router.post(
  '/2fa/enable',
  validate(enable2FASchema),
  auditLog('2FA_ENABLE_REQUEST', 'auth'),
  authController.enable2FA
);

// Verify 2FA Setup
router.post(
  '/2fa/verify-setup',
  validate(verify2FASetupSchema),
  auditLog('2FA_ENABLE_VERIFY', 'auth'),
  authController.verify2FASetup
);

// Verify 2FA Login (Step 2)
router.post(
  '/2fa/verify',
  authLimiter,
  validate(verify2FASchema),
  auditLog('2FA_VERIFY', 'auth'),
  authController.verify2FA
);

// Refresh Token
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refresh
);

// Logout
router.post(
  '/logout',
  authenticate,
  auditLog('LOGOUT', 'auth'),
  authController.logout
);

// Create test user (development only)
router.post(
  '/create-test-user',
  authController.createTestUser
);

export default router;
