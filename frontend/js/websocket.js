/**
 * TradingHub WebSocket Client
 * Handles real-time updates via Socket.IO
 */

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.isConnected = false;
    this.eventHandlers = new Map();
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (!auth.isAuthenticated()) {
      console.log('Not authenticated, skipping WebSocket connection');
      return;
    }

    // Check if Socket.IO is available
    if (typeof io === 'undefined') {
      console.warn('Socket.IO not loaded, WebSocket features disabled');
      return;
    }

    const wsURL = window.location.origin;

    this.socket = io(wsURL, {
      auth: {
        token: auth.getToken()
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay
    });

    this.setupEventListeners();
  }

  /**
   * Setup Socket.IO event listeners
   */
  setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus(true);
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.updateConnectionStatus(false);
      this.emit('disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.emit('connection_failed');
      }
    });

    // Server confirmation
    this.socket.on('connected', (data) => {
      console.log('Server confirmed connection:', data);
    });

    // Trading events
    this.socket.on('signal_new', (data) => this.handleSignalNew(data));
    this.socket.on('position_opened', (data) => this.handlePositionOpened(data));
    this.socket.on('position_update', (data) => this.handlePositionUpdate(data));
    this.socket.on('position_closed', (data) => this.handlePositionClosed(data));
    this.socket.on('tp_hit', (data) => this.handleTPHit(data));
    this.socket.on('sl_hit', (data) => this.handleSLHit(data));
    this.socket.on('sl_secured', (data) => this.handleSLSecured(data));
    this.socket.on('sl_trailed', (data) => this.handleSLTrailed(data));

    // System events
    this.socket.on('mt5_status', (data) => this.handleMT5Status(data));
    this.socket.on('signal_error', (data) => this.handleSignalError(data));
    this.socket.on('notification', (data) => this.handleNotification(data));

    // Security events
    this.socket.on('security_action', (data) => this.handleSecurityAction(data));
    this.socket.on('monitoring_started', (data) => this.handleMonitoringStarted(data));
    this.socket.on('monitoring_stopped', (data) => this.handleMonitoringStopped(data));
  }

  // ==================== EVENT HANDLERS ====================

  handleSignalNew(signal) {
    console.log('New signal received:', signal);
    this.showNotification('New Signal', `${signal.symbol} ${signal.type} @ ${signal.entry}`, 'info');
    this.emit('signal_new', signal);

    // Refresh signals list if on dashboard
    if (window.currentPage === 'dashboard' && typeof window.loadRecentSignals === 'function') {
      window.loadRecentSignals();
    }
  }

  handlePositionOpened(position) {
    console.log('Position opened:', position);
    this.showNotification('Position Opened', `${position.symbol} ${position.type}`, 'success');
    this.emit('position_opened', position);

    // Refresh relevant views
    if (window.currentPage === 'dashboard' && typeof window.loadDashboard === 'function') {
      window.loadDashboard();
    }
    if (window.currentPage === 'positions' && typeof window.loadPositions === 'function') {
      window.loadPositions();
    }
  }

  handlePositionUpdate(data) {
    console.log('Position update:', data);
    this.emit('position_update', data);
    this.updatePositionInDOM(data);
  }

  handlePositionClosed(data) {
    console.log('Position closed:', data);
    const profitText = data.profitLoss >= 0 ? `+$${data.profitLoss.toFixed(2)}` : `-$${Math.abs(data.profitLoss).toFixed(2)}`;
    this.showNotification(
      'Position Closed',
      `${data.reason}: ${profitText}`,
      data.profitLoss >= 0 ? 'success' : 'warning'
    );
    this.emit('position_closed', data);

    // Refresh views
    if (typeof window.loadPositions === 'function') {
      window.loadPositions();
    }
    if (typeof window.loadDashboard === 'function') {
      window.loadDashboard();
    }
  }

  handleTPHit(data) {
    console.log('TP hit:', data);
    this.showNotification(
      `TP${data.tpLevel} Hit!`,
      `${data.symbol} - Closed ${data.percentageClosed}%`,
      'success'
    );
    this.emit('tp_hit', data);
    this.updatePositionInDOM(data);
  }

  handleSLHit(data) {
    console.log('SL hit:', data);
    this.showNotification('Stop Loss Hit', `${data.symbol} @ ${data.currentPrice}`, 'warning');
    this.emit('sl_hit', data);
  }

  handleSLSecured(data) {
    console.log('SL secured:', data);
    this.showNotification('Position Secured', `SL moved to breakeven: ${data.newSl}`, 'info');
    this.emit('sl_secured', data);
    this.updatePositionInDOM(data);
  }

  handleSLTrailed(data) {
    console.log('SL trailed:', data);
    this.showNotification('SL Trailed', `New SL: ${data.newSl}`, 'info');
    this.emit('sl_trailed', data);
  }

  handleMT5Status(data) {
    console.log('MT5 status:', data);
    this.updateMT5Status(data.connected);
    this.emit('mt5_status', data);
  }

  handleSignalError(data) {
    console.error('Signal error:', data);
    this.showNotification('Signal Error', data.message || 'Processing failed', 'error');
    this.emit('signal_error', data);
  }

  handleNotification(data) {
    this.showNotification(data.title, data.message, data.type || 'info');
  }

  handleSecurityAction(data) {
    console.log('Security action:', data);
    this.emit('security_action', data);
  }

  handleMonitoringStarted(data) {
    console.log('Monitoring started:', data);
    this.emit('monitoring_started', data);
  }

  handleMonitoringStopped(data) {
    console.log('Monitoring stopped:', data);
    this.emit('monitoring_stopped', data);
  }

  // ==================== UI UPDATES ====================

  updatePositionInDOM(data) {
    const positionId = data.positionId || data.id;
    const card = document.querySelector(`[data-position-id="${positionId}"]`);
    if (!card) return;

    // Update current price
    if (data.currentPrice !== undefined) {
      const priceEl = card.querySelector('.current-price, [data-field="currentPrice"]');
      if (priceEl) priceEl.textContent = data.currentPrice.toFixed(5);
    }

    // Update P/L
    if (data.profitLoss !== undefined) {
      const plEl = card.querySelector('.profit-loss, [data-field="profitLoss"]');
      if (plEl) {
        const isProfit = data.profitLoss >= 0;
        plEl.textContent = `${isProfit ? '+' : ''}$${data.profitLoss.toFixed(2)}`;
        plEl.className = plEl.className.replace(/text-(green|red)-\d+/g, '');
        plEl.classList.add(isProfit ? 'text-green-500' : 'text-red-500');
      }
    }

    // Update SL secured indicator
    if (data.slSecured !== undefined) {
      const securedEl = card.querySelector('.sl-secured, [data-field="slSecured"]');
      if (securedEl) {
        securedEl.style.display = data.slSecured ? 'block' : 'none';
      }
    }
  }

  updateConnectionStatus(connected) {
    const statusEl = document.querySelector('.websocket-status, [data-status="websocket"]');
    if (!statusEl) return;

    if (connected) {
      statusEl.innerHTML = `
        <span class="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
          <span class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
          Live
        </span>
      `;
    } else {
      statusEl.innerHTML = `
        <span class="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded flex items-center gap-1">
          <span class="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
          Offline
        </span>
      `;
    }
  }

  updateMT5Status(connected) {
    const statusEl = document.querySelector('.mt5-status, [data-status="mt5"]');
    if (!statusEl) return;

    if (connected) {
      statusEl.innerHTML = `
        <span class="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">MT5 Online</span>
      `;
    } else {
      statusEl.innerHTML = `
        <span class="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">MT5 Offline</span>
      `;
    }
  }

  // ==================== NOTIFICATIONS ====================

  showNotification(title, message, type = 'info') {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico'
      });
    }

    // In-app notification
    this.showToast(title, message, type);

    // Console log
    const logMethod = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log';
    console[logMethod](`[${type.toUpperCase()}] ${title}: ${message}`);
  }

  showToast(title, message, type = 'info') {
    // Find or create toast container
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
      document.body.appendChild(container);
    }

    // Color mapping
    const colors = {
      info: 'bg-blue-500/90',
      success: 'bg-green-500/90',
      warning: 'bg-yellow-500/90',
      error: 'bg-red-500/90'
    };

    // Create toast
    const toast = document.createElement('div');
    toast.className = `${colors[type] || colors.info} text-white px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
    toast.innerHTML = `
      <div class="font-semibold text-sm">${title}</div>
      <div class="text-xs opacity-90">${message}</div>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-x-full');
    });

    // Remove after 5 seconds
    setTimeout(() => {
      toast.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  // ==================== EVENT EMITTER ====================

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (!this.eventHandlers.has(event)) return;
    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(handler);
    if (index > -1) handlers.splice(index, 1);
  }

  emit(event, data) {
    if (!this.eventHandlers.has(event)) return;
    this.eventHandlers.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  // ==================== SUBSCRIPTIONS ====================

  subscribe(channels) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('subscribe', { channels });
  }

  unsubscribe(channels) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('unsubscribe', { channels });
  }

  // ==================== CONNECTION MANAGEMENT ====================

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  reconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }

  getStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Global instance
const ws = new WebSocketClient();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WebSocketClient, ws };
}
