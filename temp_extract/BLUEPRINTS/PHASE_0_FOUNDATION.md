# 🔨 Phase 0: Foundation + Basic Admin

## 🎯 Objectives

Build the secure foundation of TradingHub with:
1. Express + TypeScript setup
2. Database models (MongoDB + Redis)
3. Authentication system (JWT + 2FA)
4. Basic admin system (user management)
5. Security middleware stack
6. Audit logging
7. Testing framework

**Estimated Time: 8-10 hours**

---

## 📦 Project Setup

### **1. Initialize Project**

```bash
mkdir tradinghub-backend
cd tradinghub-backend
npm init -y

# Install dependencies
npm install express mongoose redis typescript ts-node-dev
npm install jsonwebtoken bcrypt speakeasy qrcode
npm install joi express-validator helmet cors hpp express-rate-limit
npm install express-mongo-sanitize xss-clean
npm install winston morgan @sentry/node
npm install dotenv

# Install dev dependencies
npm install -D @types/express @types/node @types/bcrypt
npm install -D @types/jsonwebtoken @types/cors @types/morgan
npm install -D eslint prettier jest supertest @types/jest
npm install -D ts-jest @types/supertest

# Initialize TypeScript
npx tsc --init
```

### **2. TypeScript Configuration**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node", "jest"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### **3. Package.json Scripts**

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts"
  }
}
```

---

## 🗄️ Database Models

### **User Model**

```typescript
// src/models/User.ts
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'USER' | 'ADMIN';
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date;
  lastLogin?: Date;
  mt5Credentials?: {
    account: string;
    password: string;  // Encrypted
    server: string;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(password: string): Promise<boolean>;
  isLocked(): boolean;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 12,
    select: false  // Don't return password by default
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN'],
    default: 'USER'
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  mt5Credentials: {
    account: String,
    password: String,  // Will be encrypted
    server: String
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

export default mongoose.model<IUser>('User', userSchema);
```

### **Position Model**

```typescript
// src/models/Position.ts
import mongoose, { Document, Schema } from 'mongoose';

interface ITP {
  level: number;
  price: number;
  percentage: number;
  hit: boolean;
  hitAt?: Date;
}

export interface IPosition extends Document {
  userId: mongoose.Types.ObjectId;
  signalId: mongoose.Types.ObjectId;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  lotSize: number;
  profitLoss: number;
  profitLossPercentage: number;
  tps: ITP[];
  sl: number;
  securityApplied: boolean;
  status: 'OPEN' | 'CLOSED';
  closeReason?: 'TP' | 'SL' | 'MANUAL';
  openedAt: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const positionSchema = new Schema<IPosition>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  signalId: {
    type: Schema.Types.ObjectId,
    ref: 'Signal',
    required: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  type: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  entryPrice: {
    type: Number,
    required: true
  },
  currentPrice: {
    type: Number,
    required: true
  },
  lotSize: {
    type: Number,
    required: true,
    min: 0.01
  },
  profitLoss: {
    type: Number,
    default: 0
  },
  profitLossPercentage: {
    type: Number,
    default: 0
  },
  tps: [{
    level: Number,
    price: Number,
    percentage: Number,
    hit: { type: Boolean, default: false },
    hitAt: Date
  }],
  sl: {
    type: Number,
    required: true
  },
  securityApplied: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED'],
    default: 'OPEN',
    index: true
  },
  closeReason: {
    type: String,
    enum: ['TP', 'SL', 'MANUAL']
  },
  openedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  closedAt: Date
}, {
  timestamps: true
});

// Index for faster queries
positionSchema.index({ userId: 1, status: 1 });
positionSchema.index({ status: 1, openedAt: -1 });

export default mongoose.model<IPosition>('Position', positionSchema);
```

### **Signal Model**

```typescript
// src/models/Signal.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ISignal extends Document {
  userId: mongoose.Types.ObjectId;
  symbol: string;
  type: 'BUY' | 'SELL';
  entry: number;
  tps: (number | string)[];  // [2520, 2540, "OPEN"]
  sl: number;
  status: 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  telegramMessageId?: number;
  channel?: string;
  rawMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const signalSchema = new Schema<ISignal>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  entry: {
    type: Number,
    required: true
  },
  tps: [{
    type: Schema.Types.Mixed  // number or "OPEN"
  }],
  sl: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'CLOSED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  telegramMessageId: Number,
  channel: String,
  rawMessage: String
}, {
  timestamps: true
});

export default mongoose.model<ISignal>('Signal', signalSchema);
```

### **AuditLog Model**

```typescript
// src/models/AuditLog.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: String,
  details: Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: String
}, {
  timestamps: true
});

// Index for faster queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
```

---

## 🔒 Authentication System

### **JWT Service**

```typescript
// src/services/auth/jwt.service.ts
import jwt from 'jsonwebtoken';
import { IUser } from '../../models/User';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class JWTService {
  private accessSecret: string;
  private refreshSecret: string;
  
  constructor() {
    this.accessSecret = process.env.JWT_SECRET!;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET!;
  }
  
  generateAccessToken(user: IUser): string {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    };
    
    return jwt.sign(payload, this.accessSecret, {
      expiresIn: '15m'
    });
  }
  
  generateRefreshToken(user: IUser): string {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    };
    
    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: '7d'
    });
  }
  
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.accessSecret) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
  
  verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.refreshSecret) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }
}

export default new JWTService();
```

### **2FA Service**

```typescript
// src/services/auth/2fa.service.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export class TwoFAService {
  generateSecret(email: string) {
    const secret = speakeasy.generateSecret({
      name: `TradingHub (${email})`,
      issuer: 'TradingHub'
    });
    
    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url
    };
  }
  
  async generateQRCode(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }
  
  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2  // Allow 2 steps before/after for clock drift
    });
  }
}

export default new TwoFAService();
```

---

## 🛡️ Middleware Stack

### **Auth Middleware**

```typescript
// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwtService from '../services/auth/jwt.service';
import { AppError } from '../utils/errors';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new AppError('No token provided', 401);
    }
    
    const payload = jwtService.verifyAccessToken(token);
    req.user = payload;
    
    next();
  } catch (error) {
    next(new AppError('Invalid or expired token', 401));
  }
};
```

### **Admin Middleware**

```typescript
// src/middlewares/admin.middleware.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppError } from '../utils/errors';

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  
  if (req.user.role !== 'ADMIN') {
    return next(new AppError('Admin access required', 403));
  }
  
  next();
};
```

### **Validator Middleware**

```typescript
// src/middlewares/validator.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { AppError } from '../utils/errors';

export const validate = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const message = error.details.map(d => d.message).join(', ');
      return next(new AppError(message, 400));
    }
    
    next();
  };
};
```

### **Rate Limiter**

```typescript
// src/middlewares/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,  // 100 requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 login attempts
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true
});
```

### **Audit Middleware**

```typescript
// src/middlewares/audit.middleware.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import AuditLog from '../models/AuditLog';

export const auditLog = (action: string, resource: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await AuditLog.create({
        userId: req.user?.userId,
        action,
        resource,
        resourceId: req.params.id,
        details: {
          body: req.body,
          query: req.query
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (error) {
      // Don't fail request if audit fails, just log
      console.error('Audit log error:', error);
    }
    
    next();
  };
};
```

---

## 📡 API Controllers

### **Auth Controller**

```typescript
// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import jwtService from '../services/auth/jwt.service';
import twoFAService from '../services/auth/2fa.service';
import { AppError } from '../utils/errors';

export class AuthController {
  // Register
  async register(req: Request, res: Response, next: NextFunction) {
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
      
      res.status(201).json({
        message: 'Registration successful. Please enable 2FA.',
        userId: user._id
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Login Step 1
  async login(req: Request, res: Response, next: NextFunction) {
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
        }
        
        await user.save();
        throw new AppError('Invalid credentials', 401);
      }
      
      // Reset failed attempts
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
      
      // Check if 2FA enabled
      if (!user.twoFactorEnabled) {
        throw new AppError('2FA not enabled. Please enable 2FA first.', 403);
      }
      
      // Generate temp token for 2FA verification
      const tempToken = jwtService.generateAccessToken(user);
      
      res.json({
        message: '2FA verification required',
        tempToken
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Enable 2FA
  async enable2FA(req: Request, res: Response, next: NextFunction) {
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
  async verify2FASetup(req: Request, res: Response, next: NextFunction) {
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
      
      res.json({
        message: '2FA enabled successfully'
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Verify 2FA Login
  async verify2FA(req: Request, res: Response, next: NextFunction) {
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
  async refresh(req: Request, res: Response, next: NextFunction) {
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
}

export default new AuthController();
```

---

## 👑 Basic Admin Controller

```typescript
// src/controllers/admin.controller.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import User from '../models/User';
import Position from '../models/Position';
import Signal from '../models/Signal';

export class AdminController {
  // Get all users
  async getAllUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const users = await User.find()
        .select('-password -twoFactorSecret')
        .sort({ createdAt: -1 });
      
      res.json({
        total: users.length,
        users
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Get user details
  async getUserDetails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      
      const user = await User.findById(userId)
        .select('-password -twoFactorSecret');
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get user statistics
      const [openPositions, closedPositions, totalSignals] = await Promise.all([
        Position.countDocuments({ userId, status: 'OPEN' }),
        Position.countDocuments({ userId, status: 'CLOSED' }),
        Signal.countDocuments({ userId })
      ]);
      
      // Calculate total profit
      const positions = await Position.find({ userId, status: 'CLOSED' });
      const totalProfit = positions.reduce((sum, p) => sum + p.profitLoss, 0);
      
      res.json({
        user,
        statistics: {
          openPositions,
          closedPositions,
          totalSignals,
          totalProfit
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Get system statistics
  async getSystemStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const [
        totalUsers,
        totalPositions,
        openPositions,
        totalSignals
      ] = await Promise.all([
        User.countDocuments(),
        Position.countDocuments(),
        Position.countDocuments({ status: 'OPEN' }),
        Signal.countDocuments()
      ]);
      
      // Calculate total profit
      const closedPositions = await Position.find({ status: 'CLOSED' });
      const systemProfit = closedPositions.reduce((sum, p) => sum + p.profitLoss, 0);
      
      res.json({
        totalUsers,
        totalPositions,
        openPositions,
        closedPositions: closedPositions.length,
        totalSignals,
        systemProfit
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminController();
```

---

## 🚀 Express App Setup

```typescript
// src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import morgan from 'morgan';

import { apiLimiter } from './middlewares/rate-limit.middleware';
import { errorHandler } from './middlewares/error.middleware';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));
app.use(mongoSanitize());
app.use(hpp());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
```

---

## ✅ Testing

```typescript
// tests/auth.test.ts
import request from 'supertest';
import app from '../src/app';
import User from '../src/models/User';

describe('Auth API', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });
  
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        });
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('userId');
    });
    
    it('should reject duplicate email', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'password'
      });
      
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        });
      
      expect(res.status).toBe(400);
    });
  });
});
```

---

## 🔐 Security Checklist

```
[ ] Passwords hashed with bcrypt (12 rounds)
[ ] JWT expires in 15 minutes
[ ] 2FA mandatory for all users
[ ] Account lockout after 5 failed attempts
[ ] Rate limiting enabled
[ ] Input validation on all endpoints
[ ] Helmet security headers
[ ] CORS configured
[ ] NoSQL injection prevention
[ ] Audit logging working
[ ] No sensitive data in logs
```

---

## 📝 TODO

1. Set up MongoDB connection
2. Set up Redis connection
3. Configure environment variables
4. Create seed script for first admin user
5. Write comprehensive tests
6. Set up CI/CD pipeline
7. Configure Sentry for error tracking

---

**Output: Secure backend foundation with basic admin system ready!** ✅
