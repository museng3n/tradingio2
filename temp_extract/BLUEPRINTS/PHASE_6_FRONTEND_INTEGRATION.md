# 🔌 Phase 6: Frontend Integration (PROTECTED APPROACH)

## ⚠️ CRITICAL FRONTEND PROTECTION NOTICE

**THE FRONTEND HTML FILE MUST NOT BE MODIFIED!**

This phase is about creating a **separate JavaScript file** that connects the existing frontend to your backend.

**DO NOT:**
- ❌ Modify TradingHub-Final-Fixed.html
- ❌ Change HTML structure
- ❌ Edit CSS styles
- ❌ Restructure components
- ❌ "Improve" the UI

**DO:**
- ✅ Create separate `app.js` file
- ✅ Add API calls
- ✅ Add WebSocket client
- ✅ Add authentication flow
- ✅ Update DOM dynamically

---

## 🎯 Objectives

1. Create JavaScript connector file (`app.js`)
2. Implement authentication flow
3. Connect all API endpoints
4. Implement WebSocket client
5. Handle real-time updates
6. Test end-to-end integration

**Estimated Time: 6-8 hours**

---

## 📁 File Structure

```
frontend/
├── TradingHub-Final-Fixed.html    # 🔒 DO NOT TOUCH
└── js/
    ├── app.js                      # ✅ CREATE THIS (main connector)
    ├── api.js                      # ✅ CREATE THIS (API calls)
    ├── websocket.js                # ✅ CREATE THIS (WebSocket client)
    └── auth.js                     # ✅ CREATE THIS (authentication)
```

---

## 🔧 Implementation Strategy

### **Approach: External JavaScript Files**

Instead of modifying the HTML, we'll:
1. Create separate JavaScript files
2. Include them in HTML with a **single line addition**
3. Keep HTML structure intact

### **HTML Modification (ONLY THIS):**

Open `TradingHub-Final-Fixed.html` and add **ONLY** this before `</body>`:

```html
<!-- Backend Integration -->
<script src="js/api.js"></script>
<script src="js/auth.js"></script>
<script src="js/websocket.js"></script>
<script src="js/app.js"></script>
</body>
```

**That's it! No other HTML changes allowed!**

---

## 📝 File 1: auth.js

```javascript
// js/auth.js
// Authentication management

class AuthManager {
  constructor() {
    this.token = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
  }
  
  isAuthenticated() {
    return !!this.token && !!this.user;
  }
  
  async login(email, password) {
    try {
      // Step 1: Login
      const res1 = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!res1.ok) throw new Error('Login failed');
      
      const data1 = await res1.json();
      
      // Step 2: Show 2FA prompt
      const totpCode = prompt('Enter 2FA code from authenticator app:');
      if (!totpCode) throw new Error('2FA cancelled');
      
      // Step 3: Verify 2FA
      const res2 = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: data1.tempToken,
          token: totpCode
        })
      });
      
      if (!res2.ok) throw new Error('2FA verification failed');
      
      const data2 = await res2.json();
      
      // Save tokens
      this.token = data2.accessToken;
      this.refreshToken = data2.refreshToken;
      this.user = data2.user;
      
      localStorage.setItem('access_token', this.token);
      localStorage.setItem('refresh_token', this.refreshToken);
      localStorage.setItem('user', JSON.stringify(this.user));
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }
  
  async refreshAccessToken() {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });
      
      if (!res.ok) {
        this.logout();
        return false;
      }
      
      const data = await res.json();
      this.token = data.accessToken;
      this.refreshToken = data.refreshToken;
      
      localStorage.setItem('access_token', this.token);
      localStorage.setItem('refresh_token', this.refreshToken);
      
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      return false;
    }
  }
  
  logout() {
    this.token = null;
    this.refreshToken = null;
    this.user = null;
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    window.location.href = '/login.html';
  }
  
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  }
}

// Global instance
const auth = new AuthManager();
```

---

## 📝 File 2: api.js

```javascript
// js/api.js
// API client with automatic token refresh

class APIClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: auth.getHeaders()
    };
    
    try {
      let res = await fetch(url, config);
      
      // If 401, try to refresh token
      if (res.status === 401) {
        const refreshed = await auth.refreshAccessToken();
        if (refreshed) {
          // Retry with new token
          config.headers = auth.getHeaders();
          res = await fetch(url, config);
        } else {
          throw new Error('Authentication failed');
        }
      }
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Request failed');
      }
      
      return await res.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }
  
  // Dashboard
  async getDashboardSummary() {
    return this.request('/dashboard/summary');
  }
  
  async getDashboardProfit() {
    return this.request('/dashboard/profit');
  }
  
  async getRecentSignals(limit = 5) {
    return this.request(`/signals/recent?limit=${limit}`);
  }
  
  // Positions
  async getPositions(status = 'OPEN', page = 1, limit = 20) {
    return this.request(`/positions?status=${status}&page=${page}&limit=${limit}`);
  }
  
  async getPosition(id) {
    return this.request(`/positions/${id}`);
  }
  
  async closePosition(id, percentage = 100) {
    return this.request(`/positions/${id}/close`, {
      method: 'POST',
      body: JSON.stringify({ percentage })
    });
  }
  
  async modifyPosition(id, updates) {
    return this.request(`/positions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }
  
  // Analytics
  async getAnalyticsSummary() {
    return this.request('/analytics/summary');
  }
  
  async getTPStatistics() {
    return this.request('/analytics/tp-statistics');
  }
  
  async getProfitChart(period = '7d') {
    return this.request(`/analytics/profit-chart?period=${period}`);
  }
  
  // History
  async getSecuredSignals(page = 1) {
    return this.request(`/history/secured-signals?page=${page}`);
  }
  
  async getSignalBugs(page = 1) {
    return this.request(`/history/signal-bugs?page=${page}`);
  }
  
  // Settings
  async getSettings() {
    return this.request('/settings');
  }
  
  async updatePositionSecurity(settings) {
    return this.request('/settings/position-security', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }
  
  async updateTPStrategy(strategy) {
    return this.request('/settings/tp-strategy', {
      method: 'PUT',
      body: JSON.stringify(strategy)
    });
  }
  
  async getSymbolMappings() {
    return this.request('/settings/symbol-mappings');
  }
  
  async applyBrokerProfile(broker) {
    return this.request('/settings/symbol-mappings/apply-profile', {
      method: 'POST',
      body: JSON.stringify({ broker })
    });
  }
  
  async addSymbolMapping(signalSymbol, brokerSymbol) {
    return this.request('/settings/symbol-mappings', {
      method: 'POST',
      body: JSON.stringify({ signal_symbol: signalSymbol, broker_symbol: brokerSymbol })
    });
  }
  
  async deleteSymbolMapping(signalSymbol) {
    return this.request(`/settings/symbol-mappings/${signalSymbol}`, {
      method: 'DELETE'
    });
  }
  
  async getBlockedSymbols() {
    return this.request('/settings/blocked-symbols');
  }
  
  async addBlockedSymbol(symbol) {
    return this.request('/settings/blocked-symbols', {
      method: 'POST',
      body: JSON.stringify({ symbol })
    });
  }
  
  async deleteBlockedSymbol(symbol) {
    return this.request(`/settings/blocked-symbols/${symbol}`, {
      method: 'DELETE'
    });
  }
}

// Global instance
const api = new APIClient();
```

---

## 📝 File 3: websocket.js

```javascript
// js/websocket.js
// WebSocket client for real-time updates

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }
  
  connect() {
    if (!auth.isAuthenticated()) {
      console.log('Not authenticated, skipping WebSocket connection');
      return;
    }
    
    const wsURL = `ws://${window.location.host}`;
    this.socket = new WebSocket(wsURL);
    
    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Authenticate
      this.socket.send(JSON.stringify({
        type: 'authenticate',
        token: auth.token
      }));
      
      // Update connection status in UI
      this.updateConnectionStatus(true);
    };
    
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
    
    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.updateConnectionStatus(false);
      this.reconnect();
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }
  
  handleMessage(data) {
    switch (data.type) {
      case 'signal_new':
        this.onNewSignal(data.payload);
        break;
      case 'position_opened':
        this.onPositionOpened(data.payload);
        break;
      case 'position_update':
        this.onPositionUpdate(data.payload);
        break;
      case 'tp_hit':
        this.onTPHit(data.payload);
        break;
      case 'sl_secured':
        this.onSLSecured(data.payload);
        break;
      case 'position_closed':
        this.onPositionClosed(data.payload);
        break;
      case 'signal_error':
        this.onSignalError(data.payload);
        break;
      case 'mt5_status':
        this.onMT5Status(data.payload);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }
  
  onNewSignal(signal) {
    console.log('New signal:', signal);
    // Refresh signals list if on dashboard
    if (window.currentPage === 'dashboard') {
      window.loadRecentSignals();
    }
    // Show notification
    this.showNotification('New Signal', `${signal.symbol} ${signal.type}`);
  }
  
  onPositionOpened(position) {
    console.log('Position opened:', position);
    // Refresh positions if on positions page
    if (window.currentPage === 'positions') {
      window.loadPositions();
    }
    // Refresh dashboard
    if (window.currentPage === 'dashboard') {
      window.loadDashboard();
    }
  }
  
  onPositionUpdate(data) {
    console.log('Position update:', data);
    // Update position card dynamically
    this.updatePositionCard(data);
  }
  
  onTPHit(data) {
    console.log('TP hit:', data);
    this.showNotification('TP Hit!', `TP${data.tp_level} hit for position ${data.position_id}`);
    this.updatePositionCard(data);
  }
  
  onSLSecured(data) {
    console.log('SL secured:', data);
    this.showNotification('Position Secured', `SL moved to breakeven for ${data.position_id}`);
    this.updatePositionCard(data);
  }
  
  onPositionClosed(data) {
    console.log('Position closed:', data);
    this.showNotification('Position Closed', `Closed with ${data.profit_loss > 0 ? 'profit' : 'loss'}: $${Math.abs(data.profit_loss).toFixed(2)}`);
    // Refresh lists
    if (window.currentPage === 'positions') {
      window.loadPositions();
    }
  }
  
  onSignalError(data) {
    console.error('Signal error:', data);
    this.showNotification('Signal Error', data.error, 'error');
  }
  
  onMT5Status(data) {
    console.log('MT5 status:', data);
    this.updateMT5Status(data.connected);
  }
  
  updatePositionCard(data) {
    // Find position card and update
    const card = document.querySelector(`[data-position-id="${data.id}"]`);
    if (!card) return;
    
    // Update current price
    const priceEl = card.querySelector('.current-price');
    if (priceEl) priceEl.textContent = data.current_price.toFixed(5);
    
    // Update P/L
    const plEl = card.querySelector('.profit-loss');
    if (plEl) {
      plEl.textContent = `$${data.profit_loss.toFixed(2)}`;
      plEl.className = `profit-loss ${data.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}`;
    }
  }
  
  updateConnectionStatus(connected) {
    const statusEl = document.querySelector('.websocket-status');
    if (!statusEl) return;
    
    if (connected) {
      statusEl.innerHTML = `
        <span class="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
          <div class="w-1.5 h-1.5 bg-green-400 rounded-full pulse-dot"></div>
          Live
        </span>
      `;
    } else {
      statusEl.innerHTML = `
        <span class="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">Offline</span>
      `;
    }
  }
  
  updateMT5Status(connected) {
    const statusEl = document.querySelector('.mt5-status');
    if (!statusEl) return;
    
    statusEl.innerHTML = connected
      ? '<span class="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">Online</span>'
      : '<span class="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">Offline</span>';
  }
  
  showNotification(title, message, type = 'info') {
    // Use browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
    
    // Also show in-app notification
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

// Global instance
const ws = new WebSocketClient();
```

---

## 📝 File 4: app.js

```javascript
// js/app.js
// Main application logic

// Current page tracker
window.currentPage = 'dashboard';

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!auth.isAuthenticated()) {
    // Redirect to login if not authenticated
    // (For now, show login prompt)
    const email = prompt('Email:');
    const password = prompt('Password:');
    
    const success = await auth.login(email, password);
    if (!success) {
      alert('Login failed');
      return;
    }
  }
  
  // Connect WebSocket
  ws.connect();
  
  // Load current page data
  await loadCurrentPage();
  
  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});

// Page loading functions
async function loadCurrentPage() {
  switch (window.currentPage) {
    case 'dashboard':
      await loadDashboard();
      break;
    case 'positions':
      await loadPositions();
      break;
    case 'analytics':
      await loadAnalytics();
      break;
    case 'history':
      await loadHistory();
      break;
    case 'settings':
      await loadSettings();
      break;
  }
}

// Dashboard
window.loadDashboard = async function() {
  try {
    const [summary, profit, signals, positions] = await Promise.all([
      api.getDashboardSummary(),
      api.getDashboardProfit(),
      api.getRecentSignals(5),
      api.getPositions('OPEN', 1, 5)
    ]);
    
    updateDashboardCards(summary, profit);
    updateRecentSignals(signals);
    updateActivePositions(positions);
  } catch (error) {
    console.error('Dashboard load error:', error);
  }
};

function updateDashboardCards(summary, profit) {
  // Update cards (find elements by IDs or classes and update)
  document.querySelector('[data-metric="total-positions"]').textContent = summary.total_positions;
  document.querySelector('[data-metric="open-positions"]').textContent = summary.open_positions;
  document.querySelector('[data-metric="closed-positions"]').textContent = summary.closed_positions;
  document.querySelector('[data-metric="win-rate"]').textContent = `${summary.win_rate.toFixed(1)}%`;
  document.querySelector('[data-metric="total-profit"]').textContent = `$${profit.total_profit.toFixed(2)}`;
  document.querySelector('[data-metric="today-profit"]').textContent = `$${profit.today_profit.toFixed(2)}`;
}

// Positions
window.loadPositions = async function() {
  const status = window.positionsTab || 'OPEN';
  try {
    const positions = await api.getPositions(status);
    updatePositionsTable(positions, status);
  } catch (error) {
    console.error('Positions load error:', error);
  }
};

// Analytics
window.loadAnalytics = async function() {
  try {
    const [summary, tpStats, profitChart] = await Promise.all([
      api.getAnalyticsSummary(),
      api.getTPStatistics(),
      api.getProfitChart('7d')
    ]);
    
    updateAnalyticsSummary(summary);
    updateTPStatistics(tpStats);
    updateProfitChart(profitChart);
  } catch (error) {
    console.error('Analytics load error:', error);
  }
};

// History
window.loadHistory = async function() {
  try {
    const [secured, bugs] = await Promise.all([
      api.getSecuredSignals(),
      api.getSignalBugs()
    ]);
    
    updateSecuredSignals(secured);
    updateSignalBugs(bugs);
  } catch (error) {
    console.error('History load error:', error);
  }
};

// Settings
window.loadSettings = async function() {
  try {
    const settings = await api.getSettings();
    updateSettingsUI(settings);
  } catch (error) {
    console.error('Settings load error:', error);
  }
};

// Helper functions to update UI
// (Implement these based on existing HTML structure)
function updateRecentSignals(signals) {
  // Update signals table
}

function updateActivePositions(positions) {
  // Update positions cards
}

function updatePositionsTable(positions, status) {
  // Update positions table
}

function updateAnalyticsSummary(summary) {
  // Update analytics cards
}

function updateTPStatistics(stats) {
  // Update TP achievement chart
}

function updateProfitChart(data) {
  // Update profit chart
}

function updateSecuredSignals(signals) {
  // Update secured signals table
}

function updateSignalBugs(bugs) {
  // Update bugs table
}

function updateSettingsUI(settings) {
  // Update settings forms
}

console.log('✅ TradingHub frontend connected to backend');
```

---

## ✅ Integration Checklist

```
Phase 6 Complete When:

[ ] auth.js created and working
[ ] api.js created with all endpoints
[ ] websocket.js created and connecting
[ ] app.js created and loading data
[ ] Frontend HTML modified (4 script tags added ONLY)
[ ] Authentication flow working
[ ] All pages loading data from backend
[ ] WebSocket real-time updates working
[ ] Notifications working
[ ] Error handling implemented
[ ] Token refresh working
[ ] Frontend integrity check PASSES
```

---

## 🔍 Verify Frontend Integrity

After Phase 6, run:

```bash
node protection/check-frontend-integrity.js
```

**Expected:** ✅ PASSED (HTML file unchanged)

**If FAILED:** You modified HTML! Revert changes!

---

## 🎯 Success Criteria

- ✅ All 4 JavaScript files created
- ✅ HTML modified with ONLY 4 script tags
- ✅ Frontend integrity check passes
- ✅ Authentication working
- ✅ All pages loading data
- ✅ WebSocket updates working
- ✅ No console errors

---

**🔒 Frontend Protected. Integration Complete. System Ready! 🔒**
