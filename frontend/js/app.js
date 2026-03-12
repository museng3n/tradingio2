/**
 * TradingHub Main Application
 * Connects frontend UI to backend API
 */

// Current page tracker
window.currentPage = 'dashboard';

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('TradingHub initializing...');

  // Setup event listeners
  setupEventListeners();

  // Check authentication
  if (!auth.isAuthenticated()) {
    showLoginModal();
    return;
  }

  // Initialize app
  await initializeApp();
});

async function initializeApp() {
  console.log('Initializing authenticated session...');

  // Connect WebSocket
  ws.connect();

  // Request notification permission
  requestNotificationPermission();

  // Load initial page
  await loadCurrentPage();

  // Update user info in UI
  updateUserInfo();

  console.log('TradingHub initialized successfully');
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
  // Auth events
  window.addEventListener('auth:logout', () => {
    ws.disconnect();
    showLoginModal();
  });

  window.addEventListener('auth:required', () => {
    showLoginModal();
  });

  // Navigation clicks
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const page = el.dataset.nav;
      navigateTo(page);
    });
  });

  // Logout button
  document.querySelectorAll('[data-action="logout"]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      await auth.logout();
    });
  });

  // Close position buttons
  document.addEventListener('click', async (e) => {
    if (e.target.matches('[data-action="close-position"]')) {
      const positionId = e.target.dataset.positionId;
      await handleClosePosition(positionId);
    }
  });

  // Partial close buttons
  document.addEventListener('click', async (e) => {
    if (e.target.matches('[data-action="partial-close"]')) {
      const positionId = e.target.dataset.positionId;
      const percentage = parseInt(e.target.dataset.percentage) || 50;
      await handleClosePosition(positionId, percentage);
    }
  });

  // Period selector for charts
  document.querySelectorAll('[data-period]').forEach(el => {
    el.addEventListener('click', async (e) => {
      const period = e.target.dataset.period;
      await loadProfitChart(period);
    });
  });

  // MT5 connect form
  const mt5Form = document.querySelector('[data-form="mt5-connect"]');
  if (mt5Form) {
    mt5Form.addEventListener('submit', handleMT5Connect);
  }
}

// ==================== NAVIGATION ====================

async function navigateTo(page) {
  window.currentPage = page;

  // Update active nav state
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === page);
  });

  // Show/hide page sections
  document.querySelectorAll('[data-page]').forEach(el => {
    el.classList.toggle('hidden', el.dataset.page !== page);
  });

  // Load page data
  await loadCurrentPage();
}

async function loadCurrentPage() {
  try {
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
      case 'admin':
        if (auth.isAdmin()) {
          await loadAdmin();
        }
        break;
    }
  } catch (error) {
    console.error('Error loading page:', error);
    showError('Failed to load page data');
  }
}

// ==================== DASHBOARD ====================

window.loadDashboard = async function() {
  showLoading('dashboard');

  try {
    const [summary, positions, signals] = await Promise.all([
      api.getAnalyticsSummary(),
      api.getPositions('OPEN', 1, 5),
      api.getRecentSignals(5)
    ]);

    updateDashboardSummary(summary);
    updateActivePositions(positions.positions || []);
    updateRecentSignals(signals.signals || []);

  } catch (error) {
    console.error('Dashboard load error:', error);
  } finally {
    hideLoading('dashboard');
  }
};

function updateDashboardSummary(summary) {
  setMetric('totalPositions', summary.totalPositions || 0);
  setMetric('openPositions', summary.openPositions || 0);
  setMetric('closedPositions', summary.closedPositions || 0);
  setMetric('winRate', `${(summary.winRate || 0).toFixed(1)}%`);
  setMetric('totalProfit', formatCurrency(summary.totalProfit || 0));
  setMetric('todayProfit', formatCurrency(summary.todayProfit || 0));
  setMetric('avgProfit', formatCurrency(summary.avgProfit || 0));
  setMetric('profitFactor', (summary.profitFactor || 0).toFixed(2));
}

function updateActivePositions(positions) {
  const container = document.querySelector('[data-list="active-positions"]');
  if (!container) return;

  if (positions.length === 0) {
    container.innerHTML = '<div class="text-gray-500 text-center py-4">No open positions</div>';
    return;
  }

  container.innerHTML = positions.map(p => `
    <div class="bg-gray-800/50 rounded-lg p-3 border border-gray-700" data-position-id="${p._id}">
      <div class="flex justify-between items-start mb-2">
        <div>
          <span class="font-semibold text-white">${p.symbol}</span>
          <span class="ml-2 px-2 py-0.5 text-xs rounded ${p.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">${p.type}</span>
        </div>
        <span class="profit-loss ${p.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(p.profitLoss)}</span>
      </div>
      <div class="text-xs text-gray-400 flex justify-between">
        <span>Entry: ${p.entryPrice?.toFixed(5)}</span>
        <span>Lot: ${p.lotSize}</span>
        <span>SL: ${p.sl?.toFixed(5)}</span>
      </div>
      ${p.slSecured ? '<span class="text-xs text-green-400 mt-1 block">SL Secured</span>' : ''}
    </div>
  `).join('');
}

function updateRecentSignals(signals) {
  const container = document.querySelector('[data-list="recent-signals"]');
  if (!container) return;

  if (signals.length === 0) {
    container.innerHTML = '<div class="text-gray-500 text-center py-4">No recent signals</div>';
    return;
  }

  container.innerHTML = signals.map(s => `
    <div class="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <div class="flex justify-between items-start">
        <div>
          <span class="font-semibold text-white">${s.symbol}</span>
          <span class="ml-2 px-2 py-0.5 text-xs rounded ${s.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">${s.type}</span>
        </div>
        <span class="text-xs text-gray-400">${formatTime(s.createdAt)}</span>
      </div>
      <div class="text-xs text-gray-400 mt-2">
        Entry: ${s.entry} | SL: ${s.sl} | TPs: ${s.tps?.length || 0}
      </div>
    </div>
  `).join('');
}

// ==================== POSITIONS ====================

window.loadPositions = async function(status = 'OPEN') {
  showLoading('positions');

  try {
    const [positions, stats] = await Promise.all([
      api.getPositions(status, 1, 50),
      api.getPositionStats()
    ]);

    updatePositionsTable(positions.positions || [], status);
    updatePositionStats(stats);

  } catch (error) {
    console.error('Positions load error:', error);
  } finally {
    hideLoading('positions');
  }
};

function updatePositionsTable(positions, status) {
  const container = document.querySelector('[data-list="positions"]');
  if (!container) return;

  if (positions.length === 0) {
    container.innerHTML = `<div class="text-gray-500 text-center py-8">No ${status.toLowerCase()} positions</div>`;
    return;
  }

  container.innerHTML = positions.map(p => `
    <tr data-position-id="${p._id}" class="border-b border-gray-700 hover:bg-gray-800/50">
      <td class="py-3 px-4">${p.symbol}</td>
      <td class="py-3 px-4">
        <span class="${p.type === 'BUY' ? 'text-green-400' : 'text-red-400'}">${p.type}</span>
      </td>
      <td class="py-3 px-4">${p.entryPrice?.toFixed(5)}</td>
      <td class="py-3 px-4 current-price">${p.currentPrice?.toFixed(5) || '-'}</td>
      <td class="py-3 px-4">${p.lotSize}</td>
      <td class="py-3 px-4">${p.sl?.toFixed(5)}</td>
      <td class="py-3 px-4 profit-loss ${p.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(p.profitLoss)}</td>
      <td class="py-3 px-4">
        ${status === 'OPEN' ? `
          <button data-action="close-position" data-position-id="${p._id}" class="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30">Close</button>
        ` : `
          <span class="text-xs text-gray-400">${formatTime(p.closedAt)}</span>
        `}
      </td>
    </tr>
  `).join('');
}

function updatePositionStats(stats) {
  setMetric('positionTotal', stats.total || 0);
  setMetric('positionOpen', stats.open || 0);
  setMetric('positionWon', stats.won || 0);
  setMetric('positionLost', stats.lost || 0);
}

async function handleClosePosition(positionId, percentage = 100) {
  if (!confirm(`Close ${percentage}% of this position?`)) return;

  try {
    await api.closePosition(positionId, percentage);
    ws.showNotification('Success', 'Position closed successfully', 'success');
    await loadPositions();
  } catch (error) {
    showError('Failed to close position: ' + error.message);
  }
}

// ==================== ANALYTICS ====================

window.loadAnalytics = async function() {
  showLoading('analytics');

  try {
    const [summary, tpStats, profitChart, bySymbol] = await Promise.all([
      api.getAnalyticsSummary(),
      api.getTPStatistics(),
      api.getProfitChart('7d'),
      api.getPerformanceBySymbol()
    ]);

    updateAnalyticsSummary(summary);
    updateTPStatistics(tpStats);
    updateProfitChartDisplay(profitChart);
    updateSymbolPerformance(bySymbol.symbols || []);

  } catch (error) {
    console.error('Analytics load error:', error);
  } finally {
    hideLoading('analytics');
  }
};

function updateAnalyticsSummary(summary) {
  setMetric('analyticsWinRate', `${(summary.winRate || 0).toFixed(1)}%`);
  setMetric('analyticsTotalProfit', formatCurrency(summary.totalProfit || 0));
  setMetric('analyticsProfitFactor', (summary.profitFactor || 0).toFixed(2));
  setMetric('analyticsAvgProfit', formatCurrency(summary.avgProfit || 0));
}

function updateTPStatistics(stats) {
  const container = document.querySelector('[data-chart="tp-stats"]');
  if (!container) return;

  const data = stats.chartData || [];
  const maxValue = Math.max(...data.map(d => d.value), 1);

  container.innerHTML = data.map(d => `
    <div class="flex items-center gap-2 mb-2">
      <span class="w-8 text-xs text-gray-400">${d.name}</span>
      <div class="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
        <div class="h-full ${d.name === 'SL' ? 'bg-red-500' : 'bg-green-500'}" style="width: ${(d.value / maxValue) * 100}%"></div>
      </div>
      <span class="w-16 text-xs text-right">${d.value} (${d.percentage}%)</span>
    </div>
  `).join('');
}

function updateProfitChartDisplay(data) {
  const container = document.querySelector('[data-chart="profit"]');
  if (!container) return;

  // Simple bar chart representation
  const chartData = data.data || [];
  const maxProfit = Math.max(...chartData.map(d => Math.abs(d.profit)), 1);

  container.innerHTML = `
    <div class="flex items-end gap-1 h-40">
      ${chartData.slice(-14).map(d => `
        <div class="flex-1 flex flex-col justify-end items-center">
          <div class="${d.profit >= 0 ? 'bg-green-500' : 'bg-red-500'} w-full rounded-t"
               style="height: ${Math.abs(d.profit) / maxProfit * 100}%"></div>
          <span class="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left">${d.date.slice(5)}</span>
        </div>
      `).join('')}
    </div>
    <div class="mt-4 text-center">
      <span class="text-sm text-gray-400">Total: </span>
      <span class="font-semibold ${data.summary?.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}">
        ${formatCurrency(data.summary?.totalProfit || 0)}
      </span>
    </div>
  `;
}

function updateSymbolPerformance(symbols) {
  const container = document.querySelector('[data-list="symbol-performance"]');
  if (!container) return;

  container.innerHTML = symbols.slice(0, 10).map(s => `
    <div class="flex justify-between items-center py-2 border-b border-gray-700">
      <span class="font-medium">${s.symbol}</span>
      <div class="text-right">
        <span class="${s.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(s.totalProfit)}</span>
        <span class="text-xs text-gray-400 ml-2">${s.winRate}% win</span>
      </div>
    </div>
  `).join('');
}

async function loadProfitChart(period) {
  try {
    const data = await api.getProfitChart(period);
    updateProfitChartDisplay(data);
  } catch (error) {
    console.error('Error loading profit chart:', error);
  }
}

// ==================== HISTORY ====================

window.loadHistory = async function() {
  showLoading('history');

  try {
    const positions = await api.getPositions('CLOSED', 1, 50);
    updateHistoryTable(positions.positions || []);
  } catch (error) {
    console.error('History load error:', error);
  } finally {
    hideLoading('history');
  }
};

function updateHistoryTable(positions) {
  const container = document.querySelector('[data-list="history"]');
  if (!container) return;

  if (positions.length === 0) {
    container.innerHTML = '<div class="text-gray-500 text-center py-8">No closed positions</div>';
    return;
  }

  container.innerHTML = positions.map(p => `
    <tr class="border-b border-gray-700">
      <td class="py-3 px-4">${p.symbol}</td>
      <td class="py-3 px-4 ${p.type === 'BUY' ? 'text-green-400' : 'text-red-400'}">${p.type}</td>
      <td class="py-3 px-4">${p.entryPrice?.toFixed(5)}</td>
      <td class="py-3 px-4">${p.closePrice?.toFixed(5) || '-'}</td>
      <td class="py-3 px-4">${p.lotSize}</td>
      <td class="py-3 px-4 ${p.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(p.profitLoss)}</td>
      <td class="py-3 px-4 text-xs text-gray-400">${formatTime(p.closedAt)}</td>
    </tr>
  `).join('');
}

// ==================== SETTINGS ====================

window.loadSettings = async function() {
  showLoading('settings');

  try {
    const mt5Status = await api.getMT5Status();
    updateMT5Settings(mt5Status);
  } catch (error) {
    console.error('Settings load error:', error);
  } finally {
    hideLoading('settings');
  }
};

function updateMT5Settings(status) {
  const statusEl = document.querySelector('[data-status="mt5-connection"]');
  if (statusEl) {
    statusEl.innerHTML = status.connected
      ? '<span class="text-green-400">Connected</span>'
      : '<span class="text-yellow-400">Disconnected</span>';
  }

  if (status.account) {
    setMetric('mt5Balance', formatCurrency(status.account.balance || 0));
    setMetric('mt5Equity', formatCurrency(status.account.equity || 0));
  }
}

async function handleMT5Connect(e) {
  e.preventDefault();

  const form = e.target;
  const account = form.querySelector('[name="account"]').value;
  const password = form.querySelector('[name="password"]').value;
  const server = form.querySelector('[name="server"]').value;

  try {
    await api.connectMT5(account, password, server);
    ws.showNotification('Success', 'Connected to MT5', 'success');
    await loadSettings();
  } catch (error) {
    showError('MT5 connection failed: ' + error.message);
  }
}

// ==================== ADMIN ====================

window.loadAdmin = async function() {
  if (!auth.isAdmin()) return;

  showLoading('admin');

  try {
    const [health, metrics, users] = await Promise.all([
      api.getSystemHealth(),
      api.getSystemMetrics(),
      api.getUsers({ limit: 10 })
    ]);

    updateAdminHealth(health);
    updateAdminMetrics(metrics);
    updateAdminUsers(users.users || []);

  } catch (error) {
    console.error('Admin load error:', error);
  } finally {
    hideLoading('admin');
  }
};

function updateAdminHealth(health) {
  const container = document.querySelector('[data-status="system-health"]');
  if (!container) return;

  const statusColor = {
    healthy: 'text-green-400',
    degraded: 'text-yellow-400',
    critical: 'text-red-400'
  };

  container.innerHTML = `
    <span class="${statusColor[health.status] || 'text-gray-400'}">${health.status?.toUpperCase()}</span>
  `;
}

function updateAdminMetrics(metrics) {
  setMetric('adminTotalUsers', metrics.users?.total || 0);
  setMetric('adminActiveUsers', metrics.users?.active || 0);
  setMetric('adminOpenPositions', metrics.positions?.open || 0);
  setMetric('adminTodayProfit', formatCurrency(metrics.positions?.todayProfit || 0));
}

function updateAdminUsers(users) {
  const container = document.querySelector('[data-list="admin-users"]');
  if (!container) return;

  container.innerHTML = users.map(u => `
    <tr class="border-b border-gray-700">
      <td class="py-2 px-4">${u.email}</td>
      <td class="py-2 px-4">${u.role}</td>
      <td class="py-2 px-4">
        <span class="${u.status === 'active' ? 'text-green-400' : 'text-red-400'}">${u.status}</span>
      </td>
      <td class="py-2 px-4">${u.stats?.totalPositions || 0}</td>
      <td class="py-2 px-4 ${(u.stats?.totalProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}">
        ${formatCurrency(u.stats?.totalProfit || 0)}
      </td>
    </tr>
  `).join('');
}

// ==================== LOGIN MODAL ====================

function showLoginModal() {
  let modal = document.getElementById('login-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'login-modal';
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-gray-900 rounded-xl p-8 w-full max-w-md border border-gray-700">
        <h2 class="text-2xl font-bold text-white mb-6 text-center">TradingHub Login</h2>
        <form id="login-form" class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Email</label>
            <input type="email" name="email" required class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Password</label>
            <input type="password" name="password" required class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none">
          </div>
          <div id="2fa-field" class="hidden">
            <label class="block text-sm text-gray-400 mb-1">2FA Code</label>
            <input type="text" name="totp" maxlength="6" class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none text-center tracking-widest">
          </div>
          <div id="login-error" class="text-red-400 text-sm hidden"></div>
          <button type="submit" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">
            Login
          </button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('login-form').addEventListener('submit', handleLogin);
  }
  modal.classList.remove('hidden');
}

function hideLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.classList.add('hidden');
}

let tempToken = null;

async function handleLogin(e) {
  e.preventDefault();

  const form = e.target;
  const email = form.querySelector('[name="email"]').value;
  const password = form.querySelector('[name="password"]').value;
  const totp = form.querySelector('[name="totp"]').value;
  const errorEl = document.getElementById('login-error');
  const twoFAField = document.getElementById('2fa-field');

  errorEl.classList.add('hidden');

  // If we have a temp token, verify 2FA
  if (tempToken && totp) {
    const result = await auth.verify2FA(tempToken, totp);
    if (result.success) {
      tempToken = null;
      hideLoginModal();
      await initializeApp();
    } else {
      errorEl.textContent = result.error || '2FA verification failed';
      errorEl.classList.remove('hidden');
    }
    return;
  }

  // Initial login
  const result = await auth.login(email, password);

  if (result.success) {
    hideLoginModal();
    await initializeApp();
  } else if (result.requires2FA) {
    tempToken = result.tempToken;
    twoFAField.classList.remove('hidden');
    form.querySelector('[name="totp"]').focus();
  } else {
    errorEl.textContent = result.error || 'Login failed';
    errorEl.classList.remove('hidden');
  }
}

// ==================== UTILITIES ====================

function setMetric(key, value) {
  const el = document.querySelector(`[data-metric="${key}"]`);
  if (el) el.textContent = value;
}

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  const prefix = num >= 0 ? '+' : '';
  return `${prefix}$${Math.abs(num).toFixed(2)}`;
}

function formatTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function showLoading(page) {
  const loader = document.querySelector(`[data-page="${page}"] .loading, [data-loading="${page}"]`);
  if (loader) loader.classList.remove('hidden');
}

function hideLoading(page) {
  const loader = document.querySelector(`[data-page="${page}"] .loading, [data-loading="${page}"]`);
  if (loader) loader.classList.add('hidden');
}

function showError(message) {
  ws.showNotification('Error', message, 'error');
}

function updateUserInfo() {
  const user = auth.getUser();
  if (!user) return;

  const emailEl = document.querySelector('[data-user="email"]');
  if (emailEl) emailEl.textContent = user.email;

  const roleEl = document.querySelector('[data-user="role"]');
  if (roleEl) roleEl.textContent = user.role;

  // Show/hide admin nav
  const adminNav = document.querySelector('[data-nav="admin"]');
  if (adminNav) {
    adminNav.classList.toggle('hidden', !auth.isAdmin());
  }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ==================== EXPORTS ====================

window.loadRecentSignals = async function() {
  try {
    const signals = await api.getRecentSignals(5);
    updateRecentSignals(signals.signals || []);
  } catch (error) {
    console.error('Error loading recent signals:', error);
  }
};

console.log('TradingHub frontend loaded successfully');
