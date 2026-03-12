# 📊 Frontend Analysis - TradingHub HTML

## Overview

This document provides a complete analysis of `TradingHub-SymbolMapper.html` including all pages, features, required API endpoints, WebSocket events, and data structures needed for backend integration.

---

## 🎨 UI Structure

### **5 Main Pages:**
1. Dashboard - Overview & metrics
2. Positions - Active/closed positions management
3. Analytics - Statistics & charts
4. History - Signal history & bugs
5. Settings - User configuration

---

## 📄 Page 1: Dashboard

### **UI Components:**

#### **Account Overview Cards (4 cards)**
```html
<div class="grid grid-cols-4 gap-4">
  <div>Total Positions</div>
  <div>Open Positions</div>
  <div>Closed Positions</div>
  <div>Win Rate</div>
</div>
```

**Required API:**
```javascript
GET /api/dashboard/summary

Response:
{
  total_positions: 156,
  open_positions: 12,
  closed_positions: 144,
  win_rate: 68.5,  // percentage
  total_profit: 15420.50,
  today_profit: 320.75
}
```

#### **Profit Overview Card**
Shows total profit with breakdown.

**Required API:**
```javascript
GET /api/dashboard/profit

Response:
{
  total_profit: 15420.50,
  today_profit: 320.75,
  this_week: 1250.30,
  this_month: 5680.90
}
```

#### **Recent Signals (Last 5)**
Table showing recent signals.

**Required API:**
```javascript
GET /api/signals/recent?limit=5

Response: [
  {
    id: "signal_123",
    symbol: "XAUUSD",
    type: "BUY" | "SELL",
    entry: 2500.50,
    tps: [2520, 2540, 2560],
    sl: 2480,
    status: "ACTIVE" | "CLOSED" | "CANCELLED",
    created_at: "2025-12-11T10:30:00Z"
  }
]
```

#### **Active Positions (Last 5)**
Table showing open positions.

**Required API:**
```javascript
GET /api/positions?status=OPEN&limit=5

Response: [
  {
    id: "pos_456",
    signal_id: "signal_123",
    symbol: "XAUUSD",
    type: "BUY",
    entry_price: 2500.50,
    current_price: 2515.30,
    lot_size: 0.1,
    profit_loss: 148.00,
    tps_hit: [true, false, false],  // TP1 hit, TP2/TP3 not hit
    sl: 2500.50,  // moved to breakeven
    opened_at: "2025-12-11T10:35:00Z"
  }
]
```

### **WebSocket Events:**
```javascript
// Real-time updates
socket.on('signal_new', (signal) => {
  // Add new signal to list
});

socket.on('position_update', (position) => {
  // Update position card
  // Update profit/loss
});
```

---

## 📄 Page 2: Positions

### **UI Components:**

#### **Tabs:**
- Active Positions
- Closed Positions

#### **Active Positions Table**
Columns: Symbol, Type, Entry, Current, P/L, TPs Status, Actions

**Required API:**
```javascript
GET /api/positions?status=OPEN

Response: [
  {
    id: "pos_456",
    symbol: "XAUUSD",
    type: "BUY",
    entry_price: 2500.50,
    current_price: 2515.30,
    lot_size: 0.1,
    profit_loss: 148.00,
    profit_loss_percentage: 2.96,
    tps: [
      { level: 1, price: 2520, percentage: 50, hit: true, hit_at: "2025-12-11T10:40:00Z" },
      { level: 2, price: 2540, percentage: 30, hit: false },
      { level: 3, price: 2560, percentage: 20, hit: false }
    ],
    sl: 2500.50,  // moved to breakeven after TP1
    security_applied: true,
    opened_at: "2025-12-11T10:35:00Z"
  }
]
```

#### **Actions:**
- Close Position (partial or full)
- Modify TP/SL

**Required API:**
```javascript
// Close Position
POST /api/positions/:id/close
Body: {
  percentage: 100  // or 50 for partial
}

// Modify Position
PUT /api/positions/:id
Body: {
  sl: 2510.00,
  tps: [2525, 2545, 2565]
}
```

#### **Closed Positions Table**
Same structure but with close details.

**Required API:**
```javascript
GET /api/positions?status=CLOSED&page=1&limit=20

Response: [
  {
    id: "pos_789",
    symbol: "EURUSD",
    type: "SELL",
    entry_price: 1.0850,
    close_price: 1.0820,
    lot_size: 0.2,
    profit_loss: 60.00,
    profit_loss_percentage: 5.54,
    tps_hit: [true, true, false],
    close_reason: "TP2" | "SL" | "MANUAL",
    opened_at: "2025-12-10T15:20:00Z",
    closed_at: "2025-12-10T16:45:00Z",
    duration: "1h 25m"
  }
]
```

### **WebSocket Events:**
```javascript
socket.on('position_update', (position) => {
  // Update current price
  // Update P/L
  // Update TP status
});

socket.on('position_closed', (position) => {
  // Move to closed positions
  // Show notification
});
```

---

## 📄 Page 3: Analytics

### **UI Components:**

#### **Summary Cards**
- Total Trades
- Win Rate
- Average Profit
- Best Trade

**Required API:**
```javascript
GET /api/analytics/summary

Response: {
  total_trades: 156,
  winning_trades: 107,
  losing_trades: 49,
  win_rate: 68.59,
  average_profit: 98.85,
  average_loss: -45.20,
  best_trade: 450.00,
  worst_trade: -120.00,
  total_profit: 15420.50
}
```

#### **TP Achievement Statistics**

Interactive SVG chart showing TP hit rates.

**Required API:**
```javascript
GET /api/analytics/tp-statistics

Response: {
  tp1: {
    total_trades: 245,
    hit: 240,
    success_rate: 97.96,
    avg_pips: 15.2
  },
  tp2: {
    total_trades: 245,
    hit: 193,
    success_rate: 78.78,
    avg_pips: 28.5
  },
  tp3: {
    total_trades: 245,
    hit: 139,
    success_rate: 56.73,
    avg_pips: 42.8
  },
  tp4: {
    total_trades: 120,  // only some signals have TP4
    hit: 43,
    success_rate: 35.83,
    avg_pips: 58.3
  }
}
```

**Chart Data Format:**
```javascript
// For rendering SVG chart
chart_data: {
  tp1: [
    { x: 10, y: 95 },   // 10 pips, 95% success
    { x: 15, y: 98 },   // 15 pips, 98% success
    { x: 20, y: 92 }
  ],
  tp2: [...],
  tp3: [...],
  tp4: [...]
}
```

#### **Profit Chart**
7-day profit chart.

**Required API:**
```javascript
GET /api/analytics/profit-chart?period=7d

Response: {
  labels: ["Dec 5", "Dec 6", "Dec 7", "Dec 8", "Dec 9", "Dec 10", "Dec 11"],
  data: [450.20, -120.50, 380.75, 620.30, 145.80, -80.20, 320.75]
}
```

---

## 📄 Page 4: History

### **UI Components:**

#### **Tabs:**
- Secured Signals (signals that hit TP1 and moved SL)
- Signal Bugs (parsing errors)

#### **Secured Signals Table**

**Required API:**
```javascript
GET /api/history/secured-signals?page=1

Response: [
  {
    id: "signal_123",
    symbol: "XAUUSD",
    type: "BUY",
    entry: 2500.50,
    tp1_price: 2520,
    tp1_hit_at: "2025-12-11T10:40:00Z",
    sl_moved_to_entry_at: "2025-12-11T10:41:00Z",
    security_type: "AUTO",  // or "MANUAL"
    created_at: "2025-12-11T10:35:00Z"
  }
]
```

#### **Signal Bugs Table**
Shows parsing errors.

**Required API:**
```javascript
GET /api/history/signal-bugs?page=1

Response: [
  {
    id: "bug_789",
    raw_message: "XAUUSD BUY @",  // incomplete signal
    error: "Missing entry price",
    error_type: "PARSE_ERROR",
    telegram_message_id: 12345,
    channel: "@signals_channel",
    created_at: "2025-12-11T09:15:00Z",
    resolved: false
  }
]
```

---

## 📄 Page 5: Settings

### **Features:**

#### **1. Position Security**

**UI:**
- Toggle: Move SL to Breakeven (ON/OFF)
- Dropdown: Secure Position After (TP1, TP2, TP3)

**Required API:**
```javascript
GET /api/settings/position-security
Response: {
  enabled: true,
  trigger: "TP1"  // or "TP2", "TP3"
}

PUT /api/settings/position-security
Body: {
  enabled: true,
  trigger: "TP1"
}
```

#### **2. Take Profit Strategy**

**Modes:**
- Template Based (auto-select template by TP count)
- Strategy Based (apply same strategy to all)
- Open TP Handler (handle open/unlimited TPs)

**Templates:**
```javascript
// 2 TPs Template
{
  tp_count: 2,
  percentages: [50, 50],
  enabled: true
}

// 3 TPs Template
{
  tp_count: 3,
  percentages: [33, 33, 34],
  enabled: true
}

// And so on for 4, 5, 6 TPs
```

**Strategies:**
```javascript
// Equal Division
{
  type: "equal",
  description: "Divide equally across all TPs"
}

// Weighted
{
  type: "weighted",
  percentages: [50, 30, 20]  // Fixed for TP1, TP2, TP3
}

// Custom
{
  type: "custom",
  tps: [
    { tp: 1, percentage: 40 },
    { tp: 2, percentage: 30 },
    { tp: 3, percentage: 20 },
    { tp: 4, percentage: 10 }
  ]
}
```

**Open TP Handler:**
```javascript
// Scenario 1: Open TP + Fixed TPs
{
  scenario: "with_fixed",
  action: "reminder" | "autoclose",
  target_pips: 50  // User can set any number
}

// Scenario 2: Only Open TP
{
  scenario: "only_open",
  security_pips: 30,  // Move SL to entry
  close_pips: 80      // Close position
}
```

**Required API:**
```javascript
GET /api/settings/tp-strategy
Response: {
  mode: "template" | "strategy" | "opentp",
  templates: [...],
  strategy: {...},
  open_tp: {...}
}

PUT /api/settings/tp-strategy
Body: {
  mode: "template",
  templates: [...]
}
```

#### **3. Symbol Mapper** 🔄

**Tabs:**
- Broker Profiles (6 pre-configured brokers)
- Symbol Mappings (custom mappings)
- Settings (unknown symbol handling)

**Broker Profiles:**
```javascript
profiles: [
  "xm",
  "icmarkets",
  "exness",
  "pepperstone",
  "fxpro",
  "custom"
]
```

**Required API:**
```javascript
// Get user's mappings
GET /api/settings/symbol-mappings
Response: {
  broker_profile: "xm" | "icmarkets" | "custom" | null,
  mappings: {
    "XAUUSD": "GOLD",
    "EURUSD": "EURUSD",
    "GER30": "GER30",
    "CUSTOM_SYMBOL": "BROKER_SYMBOL"
  }
}

// Apply broker profile
POST /api/settings/symbol-mappings/apply-profile
Body: {
  broker: "xm"
}

// Add custom mapping
POST /api/settings/symbol-mappings
Body: {
  signal_symbol: "XAUUSD",
  broker_symbol: "GOLD"
}

// Delete mapping
DELETE /api/settings/symbol-mappings/:signal_symbol

// Import mappings
POST /api/settings/symbol-mappings/import
Body: {
  mappings: {...}
}

// Export mappings
GET /api/settings/symbol-mappings/export
Response: JSON file download
```

**Settings:**
```javascript
GET /api/settings/symbol-mapper-settings
Response: {
  unknown_handling: "ask" | "use" | "skip",
  case_sensitive: false,
  auto_suggest: true
}
```

#### **4. Block Symbols**

**Required API:**
```javascript
GET /api/settings/blocked-symbols
Response: {
  symbols: ["XAUUSD", "BTCUSD", "CUSTOM"]
}

POST /api/settings/blocked-symbols
Body: {
  symbol: "XAUUSD"
}

DELETE /api/settings/blocked-symbols/:symbol
```

---

## 🔌 WebSocket Events (Complete List)

### **Client → Server (Emit)**
```javascript
// Authentication
socket.emit('authenticate', { token: jwt_token });

// Subscribe to updates
socket.emit('subscribe', { channels: ['positions', 'signals'] });
```

### **Server → Client (Listen)**
```javascript
// New signal received
socket.on('signal_new', (data) => {
  // data: { signal object }
});

// Position opened
socket.on('position_opened', (data) => {
  // data: { position object }
});

// Position updated (price change)
socket.on('position_update', (data) => {
  // data: { id, current_price, profit_loss }
});

// TP hit
socket.on('tp_hit', (data) => {
  // data: { position_id, tp_level, tp_price, percentage_closed }
});

// SL moved to breakeven
socket.on('sl_secured', (data) => {
  // data: { position_id, new_sl, reason: "TP1_HIT" }
});

// Position closed
socket.on('position_closed', (data) => {
  // data: { position_id, close_price, profit_loss, reason }
});

// Signal parsing error
socket.on('signal_error', (data) => {
  // data: { raw_message, error }
});

// MT5 connection status
socket.on('mt5_status', (data) => {
  // data: { connected: true/false }
});
```

---

## 📊 Data Structures (TypeScript Types)

```typescript
// User
interface User {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  created_at: Date;
  last_login: Date;
  two_fa_enabled: boolean;
}

// Signal
interface Signal {
  id: string;
  user_id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entry: number;
  tps: number[];  // [2520, 2540, 2560] or [2520, 2540, "OPEN"]
  sl: number;
  status: 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  telegram_message_id: number;
  channel: string;
  created_at: Date;
}

// Position
interface Position {
  id: string;
  user_id: string;
  signal_id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entry_price: number;
  current_price: number;
  lot_size: number;
  profit_loss: number;
  profit_loss_percentage: number;
  tps: TP[];
  sl: number;
  security_applied: boolean;
  status: 'OPEN' | 'CLOSED';
  close_reason?: 'TP' | 'SL' | 'MANUAL';
  opened_at: Date;
  closed_at?: Date;
}

interface TP {
  level: number;  // 1, 2, 3, 4
  price: number;
  percentage: number;  // 50, 30, 20
  hit: boolean;
  hit_at?: Date;
}

// Settings
interface Settings {
  user_id: string;
  position_security: {
    enabled: boolean;
    trigger: 'TP1' | 'TP2' | 'TP3';
  };
  tp_strategy: {
    mode: 'template' | 'strategy' | 'opentp';
    templates?: Template[];
    strategy?: Strategy;
    open_tp?: OpenTPConfig;
  };
  symbol_mappings: {
    [signal_symbol: string]: string;  // broker_symbol
  };
  blocked_symbols: string[];
}
```

---

## 🔒 Authentication Flow

```javascript
// 1. Login
POST /api/auth/login
Body: { email, password }
Response: { message: "2FA required", temp_token }

// 2. Verify 2FA
POST /api/auth/2fa/verify
Body: { temp_token, totp_code }
Response: { 
  access_token,     // 15min expiry
  refresh_token     // 7d expiry
}

// 3. Use access_token in headers
Authorization: Bearer <access_token>

// 4. Refresh when expired
POST /api/auth/refresh
Body: { refresh_token }
Response: { access_token, refresh_token }

// 5. WebSocket authentication
socket.emit('authenticate', { token: access_token });
```

---

## 📱 Responsive Considerations

Current HTML is desktop-focused. Backend should support mobile but UI needs adaptation.

---

## ✅ Summary

### **Total API Endpoints Needed:**

**Auth:** 5 endpoints
**Dashboard:** 3 endpoints
**Positions:** 4 endpoints
**Signals:** 2 endpoints
**Analytics:** 4 endpoints
**History:** 2 endpoints
**Settings:** 12 endpoints

**Total: ~32 REST endpoints + WebSocket server**

### **WebSocket Events:** 10 events

### **Database Collections:** 6 collections
- Users
- Positions
- Signals
- Settings
- Symbol Mappings
- Audit Logs

---

**This analysis provides everything needed to build the backend that perfectly integrates with the existing frontend.** 🎯
