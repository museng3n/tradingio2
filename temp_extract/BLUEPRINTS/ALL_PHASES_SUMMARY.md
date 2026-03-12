# 🚀 All Phases - Quick Reference

## Phase 1: Signal Processing (6-8h)

### Objectives:
- Telegram bot integration (webhook mode)
- Signal parser (extract symbol, type, TPs, SL)
- Symbol mapper integration
- Signal validation & storage
- WebSocket events

### Key Files to Create:
```
src/services/telegram/
├── bot.service.ts       # Telegram bot setup
├── webhook.service.ts   # Webhook handler
└── parser.service.ts    # Parse signal messages

src/services/trading/
└── symbol-mapper.service.ts  # Map symbols

src/routes/
└── webhook.routes.ts    # Telegram webhook endpoint
```

### Signal Parser Logic:
```typescript
// Parse formats like:
"XAUUSD BUY @ 2500
TP1: 2520
TP2: 2540
TP3: OPEN
SL: 2480"

Output:
{
  symbol: "XAUUSD",
  type: "BUY",
  entry: 2500,
  tps: [2520, 2540, "OPEN"],
  sl: 2480
}
```

### API Endpoints:
- POST /api/webhook/telegram (receive signals)
- GET /api/signals (list signals)
- GET /api/signals/:id (get signal)

---

## Phase 2: Trade Execution (8-10h)

### Objectives:
- MT5 connection service
- Risk management system
- TP Strategy implementation
- Order execution
- Position management

### Key Files:
```
src/services/mt5/
├── connection.service.ts   # MT5 WebSocket connection
├── order.service.ts        # Execute orders
└── monitor.service.ts      # Monitor positions

src/services/trading/
├── tp-strategy.service.ts  # Apply TP strategies
├── risk-manager.service.ts # Risk checks
└── executor.service.ts     # Main execution logic
```

### TP Strategy Logic:
```typescript
// Template Based
if (tpCount === 2) percentages = [50, 50];
if (tpCount === 3) percentages = [33, 33, 34];

// Strategy Based
if (strategy === 'equal') distribute_equally();
if (strategy === 'weighted') [50, 30, 20];

// Open TP
if (hasOpenTP) apply_open_tp_rules();
```

### Risk Management:
```typescript
// Before opening position:
- Check account balance
- Validate position size (max 2% of account)
- Check daily loss limit (max 5%)
- Verify SL is present
- Check max open positions (10)
```

### API Endpoints:
- POST /api/positions (open position)
- GET /api/positions (list positions)
- PUT /api/positions/:id (modify position)
- POST /api/positions/:id/close (close position)

---

## Phase 3: Position Security (6-8h)

### Objectives:
- Real-time price monitoring
- TP hit detection
- Auto SL movement
- Partial close execution
- WebSocket updates

### Key Files:
```
src/services/trading/
├── price-monitor.service.ts  # Monitor prices
└── security.service.ts       # Apply security rules

src/websocket/
├── server.ts      # WebSocket server
└── events.ts      # Emit events
```

### Security Logic:
```typescript
// When TP1 hits:
1. Close X% of position
2. Move SL to entry (breakeven)
3. Emit WebSocket event
4. Update position in database
5. Log in audit trail

// For each subsequent TP:
1. Close Y% of position
2. Emit event
3. Update database
```

### WebSocket Events:
```typescript
socket.emit('tp_hit', { position_id, tp_level });
socket.emit('sl_secured', { position_id, new_sl });
socket.emit('position_update', { id, price, profit });
```

---

## Phase 4: Analytics (4-6h)

### Objectives:
- Statistics calculation
- TP achievement tracking
- Profit/Loss reports
- Chart data generation

### Key Files:
```
src/services/analytics/
├── stats.service.ts     # Calculate statistics
└── reports.service.ts   # Generate reports
```

### Statistics to Calculate:
```typescript
// Dashboard
- Total positions
- Win rate
- Total profit
- Today's profit

// TP Achievement
- TP1: hit rate, avg pips
- TP2: hit rate, avg pips
- TP3: hit rate, avg pips
- TP4: hit rate, avg pips

// Profit Chart
- Daily profit for last 7/30 days
```

### API Endpoints:
- GET /api/analytics/summary
- GET /api/analytics/tp-statistics
- GET /api/analytics/profit-chart

---

## Phase 5: Advanced Admin (6-8h)

### Objectives:
- Full user management
- System monitoring dashboard
- Audit log viewer
- Performance analytics

### Key Files:
```
src/controllers/
└── admin.controller.ts  # Extended admin functions

src/routes/
└── admin.routes.ts      # Admin-only routes
```

### Admin Features:
```typescript
// User Management
- View all users with stats
- View user details
- Suspend/activate users
- Delete users
- View user positions

// System Monitoring
- Real-time system stats
- Active positions count
- Error rate
- MT5 connection status
- Database health

// Audit Logs
- View all actions
- Filter by user/action/date
- Export logs
```

### API Endpoints:
- GET /api/admin/users
- GET /api/admin/users/:id
- PUT /api/admin/users/:id/suspend
- DELETE /api/admin/users/:id
- GET /api/admin/system-stats
- GET /api/admin/audit-logs

---

## Phase 6: Frontend Integration (6-8h)

### Objectives:
- Connect REST API to HTML
- Implement WebSocket client
- Handle authentication flow
- Display real-time updates

### Tasks:
```
1. Add API calls to HTML
   - fetch() for REST endpoints
   - Update DOM with responses

2. WebSocket client
   - Connect on login
   - Handle events
   - Update UI in real-time

3. Authentication
   - Login form
   - Store JWT in localStorage
   - Include in headers
   - Handle token refresh

4. Error handling
   - Display error messages
   - Handle network errors
   - Retry logic
```

### JavaScript Example:
```javascript
// API Call
async function getDashboard() {
  const token = localStorage.getItem('access_token');
  
  const res = await fetch('/api/dashboard/summary', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await res.json();
  updateDashboardUI(data);
}

// WebSocket
const socket = io('https://tradinghub.com', {
  auth: { token: localStorage.getItem('access_token') }
});

socket.on('position_update', (data) => {
  updatePositionCard(data);
});
```

---

## 🔐 Security Reminders (ALL PHASES)

Every phase must include:
- ✅ Input validation
- ✅ Error handling (try/catch)
- ✅ Audit logging
- ✅ No sensitive data in logs
- ✅ Rate limiting where applicable
- ✅ Unit tests
- ✅ Integration tests

---

## ✅ Definition of Done (Each Phase)

Phase is complete when:
- [ ] All code written & documented
- [ ] All tests passing (80%+ coverage)
- [ ] Security checklist verified
- [ ] No console.log() in production code
- [ ] Error handling implemented
- [ ] Audit logging working
- [ ] README updated with API docs
- [ ] Postman collection created

---

## 🎯 Final Checklist (Before Production)

```
Authentication:
[ ] JWT expires in 15min
[ ] 2FA works correctly
[ ] Password bcrypt 12 rounds
[ ] Account lockout after 5 attempts

Security:
[ ] All inputs validated
[ ] Rate limiting active
[ ] Helmet headers set
[ ] CORS configured
[ ] NoSQL injection prevented

Trading:
[ ] Risk management enforced
[ ] Position size limits work
[ ] Daily loss limits work
[ ] SL mandatory check
[ ] Balance checks before orders

Monitoring:
[ ] Winston logger configured
[ ] Sentry error tracking setup
[ ] Database backups automated
[ ] Health check endpoint working

Testing:
[ ] Unit tests pass
[ ] Integration tests pass
[ ] Security tests pass
[ ] Load tests pass (if applicable)
```

---

**Total Development Time: 44-58 hours (~1-2 weeks)**

**Each phase builds on the previous one. Complete in order!**

🔒 **Security First. Quality Always.** 🔒
