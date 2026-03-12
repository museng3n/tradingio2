# 🏗️ TradingHub - Master Blueprint (Security-First Architecture)

## 🎯 Project Overview

**TradingHub** is a secure, automated trading signal management system that handles REAL MONEY and trading accounts.

### Core Functionality:
- ✅ Receive & parse signals from Telegram channels
- ✅ Map symbols across different brokers (Symbol Mapper)
- ✅ Execute trades on MT4/MT5 platforms
- ✅ Automated position security (move SL to breakeven)
- ✅ Take Profit strategy distribution (Template/Strategy/Open TP)
- ✅ Real-time position monitoring & analytics
- ✅ Admin panel for system management

**CRITICAL:** Security, reliability, and data integrity are paramount.

---

## 🔒 Security Architecture (NON-NEGOTIABLE)

### **Level 1: Authentication & Authorization**
```javascript
✅ JWT-based auth with 15min access tokens
✅ Refresh tokens (7 days, rotate on use)
✅ 2FA mandatory (TOTP - Google Authenticator)
✅ bcrypt password hashing (12 rounds)
✅ Redis session management
✅ Role-Based Access Control (USER / ADMIN)
✅ Account lockout after 5 failed attempts
✅ Password reset with email OTP
```

### **Level 2: Data Protection**
```javascript
✅ AES-256-GCM encryption for sensitive data
✅ MT4/MT5 credentials stored encrypted
✅ API keys never logged or exposed
✅ MongoDB encryption at rest
✅ TLS 1.3 for all communications
✅ Environment variables for secrets
✅ No sensitive data in error messages
```

### **Level 3: API Security**
```javascript
✅ Rate limiting: 100 req/min per user
✅ joi/express-validator on ALL inputs
✅ Helmet.js security headers
✅ CORS configuration
✅ CSRF protection for state changes
✅ NoSQL injection prevention
✅ XSS protection (CSP headers)
✅ Request signature verification
```

### **Level 4: Trading Security**
```javascript
✅ Position size validation (max % of account)
✅ Daily loss limits enforced
✅ Stop loss mandatory for all positions
✅ Order confirmation before execution
✅ Balance check before opening
✅ Maximum open positions limit
✅ Risk management rules enforced
```

### **Level 5: Monitoring & Audit**
```javascript
✅ Complete audit trail (all actions)
✅ Winston logger (structured logging)
✅ Sentry error tracking
✅ Real-time monitoring & alerts
✅ Suspicious activity detection
✅ Database backup every 6 hours
✅ Point-in-time recovery enabled
```

---

## 🏛️ System Architecture

```
┌──────────────────────────────────────────────────────┐
│                   FRONTEND (HTML5)                   │
│  ┌─────────┬──────────┬──────────┬─────────────┐    │
│  │Dashboard│Positions │Analytics │Settings     │    │
│  │         │          │          │Admin Panel🔒│    │
│  └─────────┴──────────┴──────────┴─────────────┘    │
└───────────────────┬──────────────────────────────────┘
                    │ HTTPS + WSS (TLS 1.3)
┌───────────────────▼──────────────────────────────────┐
│              API GATEWAY + SECURITY                  │
│  ┌────────────────────────────────────────────────┐  │
│  │Rate Limiter│Helmet│Auth│Validator│CORS│Audit  │  │
│  └────────────────────────────────────────────────┘  │
└───────────────────┬──────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
┌───────▼──────┐ ┌─▼────────┐ ┌▼──────────┐
│ Auth Service │ │ Trading  │ │ Admin     │
│              │ │ Service  │ │ Service🔒 │
│ - Login      │ │ - Parse  │ │ - Users   │
│ - 2FA        │ │ - Map    │ │ - Stats   │
│ - RBAC       │ │ - Execute│ │ - Monitor │
└───────┬──────┘ └─┬────────┘ └┬──────────┘
        │          │            │
        └──────────┼────────────┘
                   │
        ┌──────────▼───────────┐
        │   Database Layer     │
        │  ┌────────┬────────┐ │
        │  │MongoDB │ Redis  │ │
        │  │(Encrypt)│(Cache)│ │
        │  └────────┴────────┘ │
        └──────────┬───────────┘
                   │
        ┌──────────▼───────────┐
        │ External Services    │
        │ ┌────────┬────────┐  │
        │ │Telegram│ MT4/MT5│  │
        │ │  Bot   │  API   │  │
        │ └────────┴────────┘  │
        └──────────────────────┘
```

---

## 📦 Tech Stack (Production-Ready)

### **Backend**
```javascript
Runtime:      Node.js 20 LTS (Active support until 2026)
Framework:    Express 4.18+
Language:     TypeScript 5.3+ (Type safety + Better DX)
Process Mgr:  PM2 (Cluster mode, auto-restart)
```

### **Database**
```javascript
Primary:      MongoDB 7.0+ (Encryption at rest)
Cache:        Redis 7.2+ (SSL mode, persistence)
Backup:       Automated every 6 hours
Recovery:     Point-in-time recovery enabled
```

### **Security Stack**
```javascript
Auth:         jsonwebtoken, passport-jwt, speakeasy
Encryption:   crypto (AES-256-GCM), bcrypt (12 rounds)
Validation:   joi, express-validator
Rate Limit:   express-rate-limit, rate-limit-redis
Headers:      helmet
Protection:   cors, hpp, express-mongo-sanitize, xss-clean
```

### **Trading Integration**
```javascript
MT4/MT5:      node-mt5 (WebSocket connection, auto-reconnect)
Telegram:     node-telegram-bot-api (Webhook mode)
```

### **Monitoring & Logging**
```javascript
Logging:      winston (structured), morgan (HTTP)
Errors:       @sentry/node (Error tracking + performance)
Monitoring:   pm2-io-apm
Health:       node-health-check
Alerts:       nodemailer (Email alerts)
```

### **Development**
```javascript
Testing:      Jest, Supertest
Linting:      ESLint, Prettier
Type Check:   TypeScript strict mode
Git Hooks:    Husky (pre-commit, pre-push)
```

---

## 📂 Project Structure

```
tradinghub-backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # MongoDB setup (encrypted)
│   │   ├── redis.ts             # Redis setup (SSL)
│   │   ├── security.ts          # Security constants
│   │   ├── telegram.ts          # Telegram bot config
│   │   ├── mt5.ts               # MT5 connection config
│   │   └── env.ts               # Environment loader
│   │
│   ├── models/
│   │   ├── User.ts              # User schema (encrypted fields)
│   │   ├── Position.ts          # Position tracking
│   │   ├── Signal.ts            # Telegram signals
│   │   ├── Setting.ts           # User settings
│   │   ├── SymbolMapping.ts     # Symbol mapper data
│   │   ├── AuditLog.ts          # Audit trail
│   │   └── index.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts   # Login, 2FA, logout
│   │   ├── user.controller.ts   # User profile
│   │   ├── position.controller.ts
│   │   ├── signal.controller.ts
│   │   ├── analytics.controller.ts
│   │   ├── settings.controller.ts
│   │   └── admin.controller.ts  # 🔒 Admin only
│   │
│   ├── services/
│   │   ├── auth/
│   │   │   ├── jwt.service.ts
│   │   │   ├── 2fa.service.ts
│   │   │   └── session.service.ts
│   │   │
│   │   ├── trading/
│   │   │   ├── signal-parser.service.ts
│   │   │   ├── symbol-mapper.service.ts
│   │   │   ├── tp-strategy.service.ts
│   │   │   ├── risk-manager.service.ts
│   │   │   └── executor.service.ts
│   │   │
│   │   ├── mt5/
│   │   │   ├── connection.service.ts
│   │   │   ├── order.service.ts
│   │   │   └── monitor.service.ts
│   │   │
│   │   ├── telegram/
│   │   │   ├── bot.service.ts
│   │   │   └── webhook.service.ts
│   │   │
│   │   ├── security/
│   │   │   ├── encryption.service.ts
│   │   │   ├── validator.service.ts
│   │   │   └── rate-limiter.service.ts
│   │   │
│   │   ├── analytics/
│   │   │   ├── stats.service.ts
│   │   │   └── reports.service.ts
│   │   │
│   │   └── notification/
│   │       ├── email.service.ts
│   │       └── websocket.service.ts
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── 2fa.middleware.ts
│   │   ├── admin.middleware.ts     # 🔒 Admin check
│   │   ├── validator.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── audit.middleware.ts
│   │   └── sanitize.middleware.ts
│   │
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── position.routes.ts
│   │   ├── signal.routes.ts
│   │   ├── analytics.routes.ts
│   │   ├── settings.routes.ts
│   │   ├── admin.routes.ts        # 🔒 Admin routes
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── crypto.ts
│   │   ├── validator.ts
│   │   ├── errors.ts
│   │   └── constants.ts
│   │
│   ├── types/
│   │   ├── user.types.ts
│   │   ├── position.types.ts
│   │   ├── signal.types.ts
│   │   ├── admin.types.ts
│   │   └── index.ts
│   │
│   ├── websocket/
│   │   ├── server.ts
│   │   ├── handlers.ts
│   │   └── events.ts
│   │
│   ├── app.ts                    # Express app
│   └── server.ts                 # Server entry
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── security/
│
├── scripts/
│   ├── backup.sh
│   ├── restore.sh
│   ├── seed-admin.ts            # Create first admin
│   └── migrate.ts
│
├── docs/
│   ├── API.md
│   ├── SECURITY.md
│   └── DEPLOYMENT.md
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── ecosystem.config.js          # PM2 config
└── README.md
```

---

## 🔐 Environment Variables

```bash
# NEVER commit .env file!

# App
NODE_ENV=production
PORT=3000
APP_URL=https://tradinghub.com
API_VERSION=v1

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/tradinghub
REDIS_URL=rediss://user:pass@redis-host:6380

# JWT (Generate: openssl rand -base64 32)
JWT_SECRET=your-super-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption (32 bytes for AES-256)
ENCRYPTION_KEY=your-encryption-key-must-be-32-bytes-exactly
ENCRYPTION_IV=16-bytes-iv-here

# 2FA
TWO_FA_APP_NAME=TradingHub
TWO_FA_ISSUER=TradingHub

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_WEBHOOK_URL=https://tradinghub.com/api/webhook/telegram
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Sentry
SENTRY_DSN=https://your-sentry-dsn

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Security
SESSION_SECRET=your-session-secret-min-32-chars
CORS_ORIGIN=https://tradinghub.com
ALLOWED_IPS=127.0.0.1

# Backup
BACKUP_SCHEDULE=0 */6 * * *
BACKUP_RETENTION_DAYS=30

# Trading Limits
MAX_POSITION_SIZE_PERCENT=2
MAX_DAILY_LOSS_PERCENT=5
MAX_OPEN_POSITIONS=10
```

---

## 🚦 Development Phases

### **Phase 0: Foundation + Basic Admin** (8-10 hours)
```
✅ Project setup (TypeScript + Express)
✅ Database models (User, Position, Signal, etc.)
✅ Authentication (JWT + 2FA)
✅ Basic Admin System (view users, basic stats)
✅ Security middleware stack
✅ Audit logging
✅ Testing framework

Output: Secure backend skeleton + Basic admin
```

### **Phase 1: Signal Processing** (6-8 hours)
```
✅ Telegram bot integration (webhook mode)
✅ Signal parser (extract symbol, type, TPs, SL)
✅ Symbol mapper integration
✅ Signal validation & storage
✅ WebSocket events for new signals

Output: Telegram signals → Database
```

### **Phase 2: Trade Execution** (8-10 hours)
```
✅ MT5 connection service
✅ Risk management system
✅ TP Strategy implementation (Template/Strategy/Open TP)
✅ Order execution with validation
✅ Position management (open/modify/close)

Output: Signals → Live trades with risk controls
```

### **Phase 3: Position Security** (6-8 hours)
```
✅ Real-time price monitoring
✅ TP hit detection
✅ Auto SL movement to breakeven
✅ Partial close execution
✅ WebSocket updates

Output: Automated position security
```

### **Phase 4: Analytics** (4-6 hours)
```
✅ Statistics calculation
✅ TP Achievement tracking
✅ Profit/Loss reports
✅ Chart data generation

Output: Analytics dashboard
```

### **Phase 5: Advanced Admin** (6-8 hours)
```
✅ Full user management
✅ System monitoring dashboard
✅ Audit log viewer
✅ Performance analytics
✅ Health checks

Output: Complete admin panel
```

### **Phase 6: Frontend Integration** (6-8 hours)
```
✅ REST API endpoints
✅ WebSocket server
✅ Connect HTML frontend
✅ End-to-end testing

Output: Fully functional system
```

**Total Development Time: 44-58 hours (~1-2 weeks)**

---

## 🎯 User Roles

### **USER (Normal Trader)**
```javascript
Permissions:
- View own dashboard
- Manage own positions
- View own analytics
- Configure own settings
- Manage symbol mappings
```

### **ADMIN (You)** 🔒
```javascript
Permissions: ALL USER permissions +
- View all users
- View user details
- View system statistics
- Monitor all positions
- View audit logs
- Suspend/activate users
- System health monitoring
```

---

## 📋 Phase Documents

Read in order:

1. **FRONTEND_ANALYSIS.md** - Complete HTML analysis
2. **PHASE_0_FOUNDATION.md** - Backend + Basic Admin
3. **PHASE_1_SIGNALS.md** - Telegram integration
4. **PHASE_2_EXECUTION.md** - MT5 trading
5. **PHASE_3_SECURITY.md** - Position monitoring
6. **PHASE_4_ANALYTICS.md** - Statistics & reports
7. **PHASE_5_ADMIN_ADVANCED.md** - Full admin panel
8. **FRONTEND_INTEGRATION.md** - Connect frontend

---

## 🔒 Security Checklist (Before Production)

```
Authentication:
[ ] JWT expires in 15min
[ ] Refresh tokens rotate
[ ] 2FA mandatory
[ ] Password bcrypt 12 rounds
[ ] Account lockout works
[ ] Session timeout 30min

Data Protection:
[ ] Sensitive data encrypted
[ ] MT5 credentials in vault
[ ] Database encryption on
[ ] TLS 1.3 enabled
[ ] No secrets in logs

API Security:
[ ] Rate limiting active
[ ] Input validation everywhere
[ ] CORS configured
[ ] Helmet headers set
[ ] CSRF protection on
[ ] Injection prevention

Trading:
[ ] Position size limits
[ ] Daily loss limits
[ ] SL mandatory
[ ] Balance checks
[ ] Max positions limit

Monitoring:
[ ] Audit trail working
[ ] Sentry configured
[ ] Backups automated
[ ] Health checks active
[ ] Alerts configured
```

---

## ⚠️ CRITICAL REMINDERS

1. **NEVER log sensitive data**
2. **ALWAYS validate input**
3. **ALWAYS encrypt sensitive data**
4. **ALWAYS audit critical actions**
5. **ALWAYS test security**
6. **NEVER expose detailed errors**
7. **ALWAYS rate limit**
8. **ALWAYS backup**

---

## 🚀 Getting Started

1. Read FRONTEND_ANALYSIS.md first
2. Read each phase document in order
3. Set up .env file (NEVER commit)
4. Complete Phase 0 before others
5. Run security tests after each phase
6. Review checklist before production

---

**🔒 Security First. Quality Always. 🔒**
