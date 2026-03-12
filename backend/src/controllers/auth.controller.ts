import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import jwtService from '../services/auth/jwt.service';
import twoFAService from '../services/auth/2fa.service';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export class AuthController {
  // Register
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // Check if user exists
      const existing = await User.findOne({ email });
      if (existing) {
        throw new AppError('Email already registered', 400);
      }

      // Create user
      const user = await User.create({
        email,
        password,
        role: 'USER'
      });

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        message: 'Registration successful. Please enable 2FA.',
        userId: user._id
      });
    } catch (error) {
      next(error);
    }
  }

  // Login Step 1
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Check if locked
      if (user.isLocked()) {
        throw new AppError('Account locked. Try again later.', 423);
      }

      // Verify password
      const isValid = await user.comparePassword(password);
      if (!isValid) {
        // Increment failed attempts
        user.failedLoginAttempts += 1;

        if (user.failedLoginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);  // 30 min
          logger.warn(`Account locked due to failed attempts: ${email}`);
        }

        await user.save();
        throw new AppError('Invalid credentials', 401);
      }

      // Reset failed attempts
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();

      // Check if 2FA enabled
      if (user.twoFactorEnabled) {
        // Generate temp token for 2FA verification
        const tempToken = jwtService.generateAccessToken(user);

        res.json({
          message: '2FA verification required',
          requires2FA: true,
          tempToken
        });
        return;
      }

      // No 2FA - direct login
      user.lastLogin = new Date();
      await user.save();

      const accessToken = jwtService.generateAccessToken(user);
      const refreshToken = jwtService.generateRefreshToken(user);

      logger.info(`User logged in (no 2FA): ${user.email}`);

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Enable 2FA
  async enable2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Generate secret
      const { secret, otpauthUrl } = twoFAService.generateSecret(user.email);
      const qrCode = await twoFAService.generateQRCode(otpauthUrl!);

      // Save secret (not enabled yet)
      user.twoFactorSecret = secret;
      await user.save();

      res.json({
        message: 'Scan QR code with authenticator app',
        qrCode,
        secret  // Backup for manual entry
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify 2FA Setup
  async verify2FASetup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, token } = req.body;

      const user = await User.findById(userId).select('+twoFactorSecret');
      if (!user || !user.twoFactorSecret) {
        throw new AppError('2FA not initialized', 400);
      }

      // Verify token
      const isValid = twoFAService.verifyToken(user.twoFactorSecret, token);
      if (!isValid) {
        throw new AppError('Invalid 2FA token', 400);
      }

      // Enable 2FA
      user.twoFactorEnabled = true;
      await user.save();

      logger.info(`2FA enabled for user: ${user.email}`);

      res.json({
        message: '2FA enabled successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify 2FA Login
  async verify2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tempToken, token } = req.body;

      // Verify temp token
      const payload = jwtService.verifyAccessToken(tempToken);

      // Get user
      const user = await User.findById(payload.userId).select('+twoFactorSecret');
      if (!user || !user.twoFactorSecret) {
        throw new AppError('User not found', 404);
      }

      // Verify 2FA token
      const isValid = twoFAService.verifyToken(user.twoFactorSecret, token);
      if (!isValid) {
        throw new AppError('Invalid 2FA token', 400);
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const accessToken = jwtService.generateAccessToken(user);
      const refreshToken = jwtService.generateRefreshToken(user);

      logger.info(`User logged in: ${user.email}`);

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Refresh Token
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const payload = jwtService.verifyRefreshToken(refreshToken);

      // Get user
      const user = await User.findById(payload.userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Generate new tokens
      const newAccessToken = jwtService.generateAccessToken(user);
      const newRefreshToken = jwtService.generateRefreshToken(user);

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      next(error);
    }
  }

  // Logout (just for audit logging)
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // In a stateless JWT system, logout is handled client-side
      // This endpoint is for audit logging purposes
      res.json({
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Create test user (development only)
  async createTestUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Only allow in development
      if (process.env.NODE_ENV === 'production') {
        throw new AppError('Not available in production', 403);
      }

      const testEmail = 'test@tradinghub.com';
      const testPassword = 'TestPassword123!';

      // Check if exists
      let user = await User.findOne({ email: testEmail });

      if (user) {
        // Update password and disable 2FA for easy testing
        user.password = testPassword;
        user.twoFactorEnabled = false;
        user.twoFactorSecret = undefined;
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();

        logger.info(`Test user reset: ${testEmail}`);

        res.json({
          message: 'Test user reset successfully',
          email: testEmail,
          password: testPassword,
          note: '2FA disabled for testing'
        });
        return;
      }

      // Create new test user
      user = await User.create({
        email: testEmail,
        password: testPassword,
        role: 'USER',
        twoFactorEnabled: false
      });

      logger.info(`Test user created: ${testEmail}`);

      res.status(201).json({
        message: 'Test user created successfully',
        email: testEmail,
        password: testPassword,
        note: '2FA disabled for testing'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
