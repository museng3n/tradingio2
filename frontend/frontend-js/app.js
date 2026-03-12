/**
 * TradingHub - Main Application
 * الملف الرئيسي لإدارة التطبيق
 */

// Application State
const appState = {
    currentPage: 'dashboard',
    refreshInterval: null,
    autoRefresh: true,
    refreshRate: 5000 // 5 seconds
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 TradingHub Application Starting...');

    // انتظار تحميل المصادقة
    await waitForAuth();

    // تهيئة التطبيق
    initializeApp();

    console.log('✅ Application initialized');
});

// انتظار تحميل نظام المصادقة
function waitForAuth() {
    return new Promise((resolve) => {
        const checkAuth = setInterval(() => {
            if (window.authManager) {
                clearInterval(checkAuth);
                resolve();
            }
        }, 100);
    });
}

// تهيئة التطبيق
async function initializeApp() {
    // تحميل البيانات الأولية
    await loadInitialData();

    // بدء التحديث التلقائي
    if (appState.autoRefresh) {
        startAutoRefresh();
    }

    // إضافة event listeners
    setupEventListeners();

    // تحديث الوقت
    updateClock();
    setInterval(updateClock, 1000);
}

// تحميل البيانات الأولية
async function loadInitialData() {
    try {
        console.log('📊 Loading initial data...');

        // تحميل إحصائيات Dashboard
        const stats = await api.getDashboardStats();
        if (stats.success) {
            updateDashboardStats(stats.data);
        }

        // تحميل المراكز المفتوحة
        const positions = await api.getOpenPositions();
        if (positions.success) {
            updatePositionsTable(positions.data);
        }

        // تحميل الإشارات الأخيرة
        const signals = await api.getRecentSignals();
        if (signals.success) {
            updateSignalsFeed(signals.data);
        }

        console.log('✅ Initial data loaded');

    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

// تحديث إحصائيات Dashboard
function updateDashboardStats(data) {
    // تحديث الأرقام الرئيسية
    updateElement('balance-value', formatMoney(data.balance));
    updateElement('equity-value', formatMoney(data.equity));
    updateElement('open-pl-value', formatMoney(data.openPL));
    updateElement('open-positions-value', data.openPositions);

    // تحديث P&L
    updateElement('daily-pl-value', formatMoney(data.dailyPL));
    updateElement('weekly-pl-value', formatMoney(data.weeklyPL));
    updateElement('monthly-pl-value', formatMoney(data.monthlyPL));

    // تحديث Margin Level
    updateElement('margin-level-value', data.marginLevel.toFixed(2) + '%');

    console.log('✅ Dashboard stats updated');
}

// تحديث جدول المراكز
function updatePositionsTable(positions) {
    const tbody = document.getElementById('positionsTableBody');
    if (!tbody) return;

    if (!positions || positions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-8 text-gray-500">
                    No open positions
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = positions.map(pos => `
        <tr class="border-b border-dark hover:bg-gray-800/50">
            <td class="px-4 py-3">${pos.ticket}</td>
            <td class="px-4 py-3">
                <span class="font-mono font-semibold">${pos.symbol}</span>
            </td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 rounded text-xs ${pos.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                    ${pos.type}
                </span>
            </td>
            <td class="px-4 py-3 font-mono">${pos.lots}</td>
            <td class="px-4 py-3 font-mono">${pos.openPrice}</td>
            <td class="px-4 py-3 font-mono">${pos.currentPrice}</td>
            <td class="px-4 py-3 font-mono">${pos.sl || '-'}</td>
            <td class="px-4 py-3 font-mono">${pos.tp || '-'}</td>
            <td class="px-4 py-3">
                <span class="font-semibold ${pos.profit >= 0 ? 'text-green-400' : 'text-red-400'}">
                    ${formatMoney(pos.profit)}
                </span>
            </td>
            <td class="px-4 py-3">
                <button onclick="closePosition('${pos.ticket}')" 
                        class="text-red-400 hover:text-red-300 text-sm">
                    Close
                </button>
            </td>
        </tr>
    `).join('');
}

// تحديث Live Trade Feed
function updateSignalsFeed(signals) {
    const feed = document.getElementById('tradeFeed');
    if (!feed) return;

    if (!signals || signals.length === 0) {
        feed.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                No signals received yet
            </div>
        `;
        return;
    }

    feed.innerHTML = signals.slice(0, 10).map(signal => `
        <div class="p-4 bg-black rounded-lg mb-2">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <span class="font-mono font-semibold text-white">${signal.symbol}</span>
                    <span class="px-2 py-0.5 rounded text-xs ${signal.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                        ${signal.type}
                    </span>
                </div>
                <span class="text-xs text-gray-500">${formatTime(signal.timestamp)}</span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-sm">
                <div>
                    <div class="text-gray-500 text-xs">Entry</div>
                    <div class="text-white font-mono">${signal.entry}</div>
                </div>
                <div>
                    <div class="text-gray-500 text-xs">SL</div>
                    <div class="text-white font-mono">${signal.sl || '-'}</div>
                </div>
                <div>
                    <div class="text-gray-500 text-xs">TP</div>
                    <div class="text-white font-mono">${signal.tp || '-'}</div>
                </div>
            </div>
            <div class="mt-2 text-xs text-gray-500">
                From: ${signal.channel || 'Unknown'}
            </div>
        </div>
    `).join('');
}

// تحديث عنصر HTML
function updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
    }
}

// بدء التحديث التلقائي
function startAutoRefresh() {
    if (appState.refreshInterval) {
        clearInterval(appState.refreshInterval);
    }

    appState.refreshInterval = setInterval(async () => {
        if (document.hidden) return; // لا تحديث عندما تكون الصفحة مخفية

        console.log('🔄 Auto-refreshing data...');
        await loadInitialData();
    }, appState.refreshRate);

    console.log(`✅ Auto-refresh started (every ${appState.refreshRate/1000}s)`);
}

// إيقاف التحديث التلقائي
function stopAutoRefresh() {
    if (appState.refreshInterval) {
        clearInterval(appState.refreshInterval);
        appState.refreshInterval = null;
        console.log('⏸️ Auto-refresh stopped');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // WebSocket events
    if (window.wsManager) {
        wsManager.on('signal', (data) => {
            console.log('📊 New signal:', data);
            showNotification('New Signal', `${data.symbol} ${data.type}`);
            loadInitialData(); // تحديث البيانات
        });

        wsManager.on('position_update', () => {
            loadInitialData(); // تحديث البيانات
        });

        wsManager.on('balance_update', (data) => {
            updateDashboardStats(data);
        });
    }

    // Page visibility - إيقاف التحديث عند إخفاء الصفحة
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('👁️ Page hidden - pausing updates');
        } else {
            console.log('👁️ Page visible - resuming updates');
            loadInitialData();
        }
    });
}

// إظهار إشعار
function showNotification(title, message) {
    // يمكن استخدام Notification API أو إظهار toast
    console.log(`🔔 ${title}: ${message}`);
    
    // TODO: إضافة نظام toast للإشعارات
}

// إغلاق مركز
async function closePosition(ticket) {
    if (!confirm('Are you sure you want to close this position?')) {
        return;
    }

    try {
        const result = await api.closePosition(ticket);
        
        if (result.success) {
            showNotification('Position Closed', `Ticket #${ticket}`);
            await loadInitialData();
        } else {
            alert('Failed to close position: ' + result.error);
        }
    } catch (error) {
        console.error('Error closing position:', error);
        alert('Error closing position');
    }
}

// تحديث الساعة
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    updateElement('current-time', timeString);
}

// Utility Functions
function formatMoney(value) {
    return '$' + Number(value).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// تصدير الدوال للاستخدام العام
window.closePosition = closePosition;
window.loadInitialData = loadInitialData;
window.startAutoRefresh = startAutoRefresh;
window.stopAutoRefresh = stopAutoRefresh;

console.log('✅ App.js loaded');
