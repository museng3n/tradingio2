# 🔌 TradingHub - Complete Connection Rules & Architecture

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Telegram Connection Rules](#telegram-connection-rules)
3. [MT5 Connection Rules](#mt5-connection-rules)
4. [Data Flow & Security](#data-flow--security)
5. [API Specifications](#api-specifications)
6. [Deployment Options](#deployment-options)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

### Complete Signal Flow

```
┌──────────────────────┐
│ TELEGRAM CHANNELS    │
│ • Gold Signals VIP   │
│ • Forex Premium      │
│ • Crypto Signals     │
└──────────┬───────────┘
           │
           ▼ (User's encrypted session)
┌──────────────────────────────────────────────┐
│ TRADINGHUB SERVER (24/7)                     │
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ Session Manager                          ││
│ │ • Decrypts user sessions (in memory)     ││
│ │ • Monitors selected channels             ││
│ │ • Parses signal messages                 ││
│ │ • Queues for distribution                ││
│ └──────────────────────────────────────────┘│
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ Signal Parser                            ││
│ │ • Pattern detection                      ││
│ │ • Data extraction (Symbol, Type, SL, TP) ││
│ │ • Validation                             ││
│ │ • Storage in database                    ││
│ └──────────────────────────────────────────┘│
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ Distribution API                         ││
│ │ • Authenticates EA via API key           ││
│ │ • Sends pending signals                  ││
│ │ • Receives execution reports             ││
│ └──────────────────────────────────────────┘│
└──────────────────┬───────────────────────────┘
                   │
                   ▼ (HTTPS REST API)
┌──────────────────────────────────────────────┐
│ USER'S MT5 TERMINAL                          │
│                                              │
│ ┌──────────────────────────────────────────┐│
│ │ TradingHub EA                            ││
│ │ • Polls server every 10s                 ││
│ │ • Receives signals via API               ││
│ │ • Calculates lot size (risk %)           ││
│ │ • Executes trades                        ││
│ │ • Reports back to server                 ││
│ │ • Manages trailing stops                 ││
│ └──────────────────────────────────────────┘│
│                                              │
│ Broker Account: ✓ Password NEVER leaves VPS │
└──────────────────────────────────────────────┘
```

---

## 📱 Telegram Connection Rules

### 1. Authentication Flow

#### Phase 1: Initial Setup (Desktop App)

```javascript
// User Flow
Step 1: User enters API key from TradingHub dashboard
   ↓
Step 2: Server validates API key and returns phone number
   ↓
Step 3: Desktop app sends OTP to user's Telegram
   ↓
Step 4: User enters OTP (and 2FA password if enabled)
   ↓
Step 5: Telethon creates authenticated session
   ↓
Step 6: Desktop app fetches all user's channels
   ↓
Step 7: User selects channels to monitor
   ↓
Step 8: Session encrypted with AES-256-GCM using API key
   ↓
Step 9: Encrypted session uploaded to server
   ↓
Step 10: Desktop app closes (setup complete) ✅
```

#### Session Encryption Specification

```python
# Encryption Parameters
Algorithm: AES-256-GCM
Key Derivation: PBKDF2-HMAC-SHA256
Iterations: 100,000
Salt Size: 32 bytes (256 bits)
Nonce Size: 12 bytes (96 bits)
Authentication Tag: 16 bytes (128 bits)

# Encryption Process
1. Generate random salt (32 bytes)
2. Derive key from API key using PBKDF2
3. Generate random nonce (12 bytes)
4. Encrypt session data with AES-256-GCM
5. Store: salt:nonce:ciphertext:tag (Base64)

# Decryption Process (Server-side)
1. Extract salt, nonce, ciphertext, tag
2. Derive key from user's API key
3. Decrypt and verify authentication tag
4. Load session (in memory only, never on disk)
```

### 2. Server-Side Connection Rules

#### Session Manager Service

```javascript
// Service Configuration
const SESSION_MANAGER_CONFIG = {
  maxConcurrentSessions: 1000,      // Per server instance
  sessionPoolSize: 100,              // Keep N sessions hot
  sessionIdleTimeout: 3600000,       // 1 hour
  reconnectAttempts: 5,
  reconnectDelay: 5000,              // 5 seconds
  messageQueueSize: 1000,
  
  // Renewal Policy
  renewalPolicy: {
    recommendedDays: 7,              // Suggest renewal every 7 days
    gracePeriodDays: 60,             // Hard limit: 60 days
    notifyBefore: [7, 3, 1],         // Notify N days before expiry
    autoDisable: true                 // Auto-disable after grace period
  }
};

// Session Lifecycle
class SessionLifecycle {
  1. CREATED: Session uploaded from desktop app
  2. ACTIVE: Session decrypted and connected to Telegram
  3. MONITORING: Listening to selected channels
  4. NEEDS_RENEWAL: Recommended renewal date reached
  5. GRACE_PERIOD: Beyond recommended date, within grace period
  6. PAUSED: Grace period expired or manually paused
  7. DELETED: User deleted or session removed
}
```

#### Connection Handling

```javascript
// Per-User Connection
async function initializeUserSession(userId) {
  // 1. Fetch encrypted session from database
  const encryptedSession = await UserSession.findOne({ userId });
  
  // 2. Get user's API key
  const user = await User.findById(userId);
  const apiKey = user.apiKey;
  
  // 3. Decrypt session (in memory only)
  const encryptor = new SessionEncryptor(apiKey);
  const sessionString = encryptor.decrypt(encryptedSession.data);
  
  // 4. Create Telegram client
  const client = new TelegramClient(
    new StringSession(sessionString),
    API_ID,
    API_HASH
  );
  
  // 5. Connect
  await client.connect();
  
  // 6. Verify authorization
  if (!await client.isUserAuthorized()) {
    throw new Error('Session expired or invalid');
  }
  
  // 7. Get monitored channels
  const channels = await MonitoredChannel.find({ 
    userId, 
    enabled: true 
  });
  
  // 8. Subscribe to channel messages
  channels.forEach(channel => {
    client.on('newMessage', handleNewMessage(userId, channel.channelId));
  });
  
  return client;
}
```

### 3. Message Parsing Rules

#### Signal Detection Patterns

```javascript
// Pattern Recognition
const SIGNAL_PATTERNS = {
  // Pattern 1: Standard Format
  standard: /(?<symbol>[A-Z]{6,8})\s+(?<type>BUY|SELL)\s+[@at]*\s*(?<entry>[\d.]+)/i,
  
  // Pattern 2: With SL/TP
  withSLTP: /SL[:\s]*(?<sl>[\d.]+).*TP[:\s]*(?<tp>[\d.]+)/i,
  
  // Pattern 3: Multiple TPs
  multipleTPs: /TP[:\s]*(?<tp1>[\d.]+)(?:.*TP[:\s]*(?<tp2>[\d.]+))?(?:.*TP[:\s]*(?<tp3>[\d.]+))?/i,
  
  // Pattern 4: Emoji indicators
  buyEmoji: /[🟢✅📈⬆️]/,
  sellEmoji: /[🔴❌📉⬇️]/
};

// Message Parser
async function parseSignalMessage(message) {
  const text = message.message;
  
  // Extract symbol and type
  const match = text.match(SIGNAL_PATTERNS.standard);
  if (!match) return null;
  
  const signal = {
    symbol: normalizeSymbol(match.groups.symbol),
    type: match.groups.type.toUpperCase(),
    entry: parseFloat(match.groups.entry),
    tps: [],
    sl: null,
    confidence: 0,
    rawMessage: text
  };
  
  // Extract SL/TP
  const sltp = text.match(SIGNAL_PATTERNS.withSLTP);
  if (sltp) {
    signal.sl = parseFloat(sltp.groups.sl);
    signal.tps.push(parseFloat(sltp.groups.tp));
  }
  
  // Extract multiple TPs
  const tps = text.match(SIGNAL_PATTERNS.multipleTPs);
  if (tps) {
    if (tps.groups.tp1) signal.tps.push(parseFloat(tps.groups.tp1));
    if (tps.groups.tp2) signal.tps.push(parseFloat(tps.groups.tp2));
    if (tps.groups.tp3) signal.tps.push(parseFloat(tps.groups.tp3));
  }
  
  // Calculate confidence score
  signal.confidence = calculateConfidence(signal);
  
  // Validate signal
  if (!validateSignal(signal)) return null;
  
  return signal;
}

// Symbol Normalization
function normalizeSymbol(symbol) {
  const mappings = {
    'GOLD': 'XAUUSD',
    'XAU': 'XAUUSD',
    'SILVER': 'XAGUSD',
    'XAG': 'XAGUSD',
    'EUR': 'EURUSD',
    'GBP': 'GBPUSD'
  };
  
  return mappings[symbol] || symbol;
}

// Validation Rules
function validateSignal(signal) {
  // Must have: symbol, type, entry
  if (!signal.symbol || !signal.type || !signal.entry) {
    return false;
  }
  
  // Entry must be positive
  if (signal.entry <= 0) {
    return false;
  }
  
  // SL must be on correct side
  if (signal.sl) {
    if (signal.type === 'BUY' && signal.sl >= signal.entry) {
      return false;
    }
    if (signal.type === 'SELL' && signal.sl <= signal.entry) {
      return false;
    }
  }
  
  // TPs must be on correct side
  if (signal.tps.length > 0) {
    for (const tp of signal.tps) {
      if (signal.type === 'BUY' && tp <= signal.entry) {
        return false;
      }
      if (signal.type === 'SELL' && tp >= signal.entry) {
        return false;
      }
    }
  }
  
  return true;
}
```

### 4. Rate Limiting & Quotas

```javascript
// Telegram API Limits
const TELEGRAM_LIMITS = {
  // Official Telegram limits
  messagesPerSecond: 30,
  messagesPerMinute: 20,
  floodWaitHandling: true,
  
  // Our implementation
  maxChannelsPerUser: {
    free: 1,
    starter: 3,
    pro: 10,
    business: Infinity
  },
  
  maxSignalsPerDay: {
    free: 10,
    starter: Infinity,
    pro: Infinity,
    business: Infinity
  }
};
```

---

## 📊 MT5 Connection Rules

### 1. EA Authentication Flow

```cpp
// EA Initialization Sequence
OnInit() {
  1. Validate API key (length check)
     ↓
  2. Set timer for periodic polling
     ↓
  3. Verify connection to server
     POST /api/ea/verify
     Headers: Authorization: Bearer {api_key}
     ↓
  4. If successful → Mark as connected
     If failed → Log error, retry later
     ↓
  5. Start monitoring loop ✅
}
```

### 2. Signal Polling Rules

```cpp
// Polling Configuration
const POLLING_CONFIG = {
  defaultInterval: 10,        // seconds
  minInterval: 5,             // Don't poll faster than 5s
  maxInterval: 60,            // Don't poll slower than 60s
  backoffOnError: true,       // Exponential backoff
  maxBackoff: 300,            // Max 5 minutes
  
  // Connection health
  healthCheckInterval: 300,   // Check every 5 minutes
  connectionTimeout: 10000,   // 10 seconds
  maxRetries: 3
};

// Timer Function
void OnTimer() {
  // Reset daily counter at midnight
  if (newDay) {
    TradesToday = 0;
  }
  
  // Check daily limit
  if (TradesToday >= MaxTradesPerDay) {
    return; // Stop trading for today
  }
  
  // Check for signals
  CheckForSignals();
}

// Signal Fetching
void CheckForSignals() {
  // 1. Prepare request
  string url = ServerUrl + "/api/ea/signals";
  string headers = "Authorization: Bearer " + ApiKey;
  
  // 2. Send GET request
  int res = WebRequest("GET", url, headers, ...);
  
  // 3. Handle response
  if (res == 200) {
    // Parse JSON response
    ProcessSignals(response);
  }
  else if (res == 401) {
    // Invalid API key
    LogError("Invalid API key");
  }
  else if (res == -1) {
    // WebRequest not allowed
    LogError("Enable WebRequest for: " + ServerUrl);
  }
  else {
    // Other error
    LogError("HTTP " + IntegerToString(res));
  }
}
```

### 3. Trade Execution Rules

```cpp
// Execution Parameters
const EXECUTION_RULES = {
  // Order type selection
  orderType: 'MARKET',           // Always market execution
  fillingMode: 'FOK',            // Fill or Kill
  
  // Slippage handling
  maxSlippage: 30,               // Points
  retriesOnSlippage: 3,
  
  // Lot size calculation
  riskBased: true,               // Calculate by risk %
  minLot: 0.01,
  maxLot: 100.0,
  lotStep: 0.01,
  
  // Position limits
  maxOpenTrades: 5,              // Default
  maxTradesPerDay: 20,           // Default
  maxDrawdown: 20.0,             // % (optional)
  
  // Validation checks
  validateBeforeExecution: [
    'symbolTradeable',
    'marketOpen',
    'sufficientMargin',
    'dailyLimitNotReached',
    'concurrentLimitNotReached',
    'validLotSize',
    'validSLTP'
  ]
};

// Lot Size Calculation
double CalculateLotSize(symbol, entry, sl, riskPercent) {
  accountBalance = AccountBalance();
  riskAmount = accountBalance * (riskPercent / 100);
  
  pointValue = SymbolTickValue(symbol);
  pointSize = SymbolPoint(symbol);
  
  slDistance = Abs(entry - sl);
  slPoints = slDistance / pointSize;
  
  lotSize = riskAmount / (slPoints * pointValue);
  
  // Apply limits
  if (lotSize < MinLotSize) lotSize = MinLotSize;
  if (lotSize > MaxLotSize) lotSize = MaxLotSize;
  
  // Normalize to lot step
  lotSize = Floor(lotSize / LotStep) * LotStep;
  
  return lotSize;
}
```

### 4. Error Handling & Reporting

```cpp
// Error Handling Matrix
const ERROR_HANDLING = {
  // Retriable errors
  RETRIABLE: [
    10004, // REQUOTE
    10006, // REQUEST_REJECTED  
    10007, // REQUEST_CANCELLED
    10010, // PRICE_CHANGED
    10028, // TOO_MANY_REQUESTS
  ],
  
  // Fatal errors (don't retry)
  FATAL: [
    10013, // INVALID_REQUEST
    10014, // INVALID_VOLUME
    10015, // INVALID_PRICE
    10016, // INVALID_STOPS
    10019, // NO_MONEY
    10025, // NOT_ENOUGH_MONEY
  ],
  
  // Handle differently
  SPECIAL: {
    10018: 'MARKET_CLOSED',      // Wait and retry
    10027: 'TRADE_DISABLED',     // Skip symbol
    10033: 'ORDER_LOCKED',       // Wait and retry
  }
};

// Reporting to Server
void ReportExecution(signalId, ticket, success, error) {
  POST /api/ea/report
  Body: {
    signal_id: signalId,
    ticket: ticket,
    success: success,
    error: error,
    timestamp: TimeCurrent(),
    platform: "MT5",
    account: AccountNumber()
  }
}
```

### 5. Position Management Rules

```cpp
// Trailing Stop Configuration
const TRAILING_STOP_RULES = {
  // Activation
  minProfit: 20.0,              // Pips in profit before trailing
  
  // Parameters
  distance: 50.0,               // Pips from current price
  step: 10.0,                   // Minimum move before update
  
  // Conditions
  onlyInProfit: true,           // Only trail profitable positions
  moveToBreakeven: true,        // Move SL to entry when possible
  breakevenOffset: 5.0,         // Pips above/below entry
  
  // Update frequency
  checkInterval: 1,             // Every tick
  minTimeUpdate: 10,            // Min 10s between updates
};

// Trailing Implementation
void ManageTrailingStops() {
  for (each open position) {
    if (position.magic != MagicNumber) continue;
    
    currentPrice = (isBuy) ? Bid : Ask;
    profit = (isBuy) ? 
             (currentPrice - openPrice) : 
             (openPrice - currentPrice);
    profitPips = profit / point * 10;
    
    // Check if profitable enough
    if (profitPips < minProfit) continue;
    
    // Calculate new SL
    newSL = (isBuy) ? 
            currentPrice - (distance * point * 10) : 
            currentPrice + (distance * point * 10);
    
    // Check if should update
    if (shouldUpdate(currentSL, newSL, step)) {
      ModifyPosition(ticket, newSL, tp);
    }
  }
}
```

---

## 🔐 Data Flow & Security

### Complete Data Flow Diagram

```
[Telegram Message]
       ↓
[Server Session Manager] ← Encrypted with user's API key
       ↓
[Signal Parser] → Validates & extracts data
       ↓
[Signal Database] → Stores parsed signal
       ↓
[Distribution Queue] → Queues for user's EA
       ↓
[EA Polls Server] ← Authenticates with API key
       ↓
[EA Receives Signal] → JSON over HTTPS
       ↓
[EA Validates Signal] → Checks limits & conditions
       ↓
[EA Calculates Lot] → Risk-based calculation
       ↓
[EA Sends Order] → To broker via MT5
       ↓
[EA Reports Back] → Execution status to server
       ↓
[Server Updates DB] → Records execution
```

### Security Layers

#### Layer 1: Telegram Session Security

```
User's Telegram Session
├── Encrypted at rest: AES-256-GCM
├── Key: Derived from user's API key (PBKDF2)
├── Salt: Unique per encryption
├── Decryption: Only in server memory
└── Never stored decrypted on disk ✅
```

#### Layer 2: API Authentication

```
EA ↔ Server Communication
├── Protocol: HTTPS (TLS 1.3)
├── Authentication: Bearer token (API key)
├── Rate limiting: 100 requests/minute
├── IP whitelisting: Optional
└── Request signing: HMAC-SHA256 ✅
```

#### Layer 3: MT5 Password Protection

```
User's MT5 Password
├── Option A: Never sent to server (VPS/Oracle)
├── Option B: Encrypted if stored (Shared VPS)
├── Encryption: AES-256-GCM with server master key
├── Access: Only for trade execution
└── Audit: All access logged ✅
```

---

## 📡 API Specifications

### EA → Server Endpoints

#### 1. Verify Connection

```http
POST /api/ea/verify
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Request:
{
  "api_key": "abc123...",
  "platform": "MT5",
  "version": "1.00"
}

Response:
{
  "success": true,
  "user_id": "user123",
  "subscription": {
    "plan": "pro",
    "status": "active",
    "expires_at": "2025-01-13T00:00:00Z"
  }
}
```

#### 2. Get Pending Signals

```http
GET /api/ea/signals
Headers:
  Authorization: Bearer {api_key}

Response:
{
  "success": true,
  "signals": [
    {
      "id": "signal123",
      "symbol": "XAUUSD",
      "type": "BUY",
      "entry": 2500.00,
      "sl": 2480.00,
      "tp": 2520.00,
      "received_at": "2025-12-13T10:15:23Z",
      "channel": "Gold Signals VIP"
    }
  ],
  "count": 1
}
```

#### 3. Report Execution

```http
POST /api/ea/report
Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Request:
{
  "signal_id": "signal123",
  "ticket": 123456,
  "success": true,
  "error": "",
  "execution_details": {
    "platform": "MT5",
    "actual_entry": 2500.15,
    "lot_size": 0.10,
    "executed_at": "2025-12-13T10:15:27Z"
  }
}

Response:
{
  "success": true,
  "message": "Execution recorded"
}
```

#### 4. Heartbeat

```http
POST /api/ea/heartbeat
Headers:
  Authorization: Bearer {api_key}

Response:
{
  "success": true,
  "server_time": "2025-12-13T10:15:30Z",
  "status": "healthy"
}
```

---

## 🚀 Deployment Options

### Option A: Broker Free VPS (Recommended)

```
✅ Pros:
- 100% Free (if you meet broker's criteria)
- Low latency (hosted near broker's server)
- Managed by broker (updates, monitoring)
- MT5 password stays on broker's VPS

❌ Cons:
- Requires minimum balance or trading volume
- Limited to broker's infrastructure
- May require re-application periodically

Setup:
1. Contact broker for free VPS access
2. Connect via RDP
3. Install MT5
4. Attach TradingHub EA
5. Done! ✅
```

### Option B: Oracle Cloud Free Tier

```
✅ Pros:
- 100% Free forever
- 24GB RAM, 4 CPUs
- Full control
- Multiple MT5 accounts possible

❌ Cons:
- Requires setup (Wine + MT5 on Linux)
- Need basic Linux knowledge
- Self-managed

Setup:
1. Create Oracle Cloud account
2. Launch Ubuntu VM (Always Free)
3. Install Wine + MT5
4. Attach TradingHub EA
5. Done! ✅
```

### Option C: TradingHub Shared VPS ($1/month)

```
✅ Pros:
- Dirt cheap ($1/month)
- Fully managed
- 99.9% uptime SLA
- 24/7 monitoring
- Support included

❌ Cons:
- Monthly cost (though minimal)
- Shared resources
- Password encrypted and stored

Setup:
1. Subscribe to Shared VPS add-on
2. We provision container
3. Provide MT5 credentials
4. We set up everything
5. Done! ✅
```

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Issue: EA can't connect to server

```
Symptoms:
- "Could not connect to TradingHub server"
- "WebRequest error"

Solutions:
1. Enable WebRequest:
   Tools → Options → Expert Advisors
   Add: https://api.tradinghub.com

2. Check internet connection

3. Verify API key is correct

4. Check firewall settings
```

#### Issue: No signals received

```
Symptoms:
- Signals: 0
- EA shows "Connected" but no trades

Solutions:
1. Check Telegram setup:
   - Go to TradingHub dashboard
   - Verify channels are selected
   - Check session status

2. Verify subscription is active

3. Wait for channels to post signals

4. Check signal history in dashboard
```

#### Issue: Trades fail to execute

```
Symptoms:
- Signals received but "Failed" count increases

Solutions:
1. Check account balance
2. Reduce lot size or risk %
3. Check symbol is available on broker
4. Verify market is open
5. Check broker's trading conditions
```

---

## 📞 Support & Resources

**Technical Support**:
- Email: support@tradinghub.com
- Discord: discord.gg/tradinghub
- Live Chat: dashboard.tradinghub.com

**Documentation**:
- Full Docs: https://docs.tradinghub.com
- Video Tutorials: https://tradinghub.com/tutorials
- API Reference: https://api.tradinghub.com/docs

**Community**:
- Discord Server: Support & discussions
- Reddit: r/tradinghub
- Telegram: @tradinghub_community

---

**Document Version**: 1.0  
**Last Updated**: December 13, 2025  
**Status**: Production Ready ✅

Made with ❤️ by TradingHub Team
