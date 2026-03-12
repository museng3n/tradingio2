/**
 * TradingHub - API Manager
 * يدير جميع استدعاءات API مع السيرفر
 */

// API Configuration
const API_CONFIG = {
    BASE_URL: 'http://localhost:3000/api',
    TIMEOUT: 10000, // 10 seconds
    RETRY_ATTEMPTS: 3,
    
    // Mock data mode للتطوير
    MOCK_MODE: true  // ⚠️ غيّر إلى false عندما يكون السيرفر جاهز
};

// API Manager Class
class APIManager {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.mockMode = API_CONFIG.MOCK_MODE;
    }

    // Helper: Get auth headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (window.authManager && window.authManager.isAuthenticated()) {
            headers['Authorization'] = `Bearer ${window.authManager.getToken()}`;
        }

        return headers;
    }

    // Helper: Make request with timeout
    async request(url, options = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

        try {
            const response = await fetch(url, {
                ...options,
                headers: this.getHeaders(),
                signal: controller.signal
            });

            clearTimeout(timeout);
            return response;
        } catch (error) {
            clearTimeout(timeout);
            throw error;
        }
    }

    // GET request
    async get(endpoint) {
        try {
            if (this.mockMode) {
                return this.getMockData(endpoint);
            }

            const response = await this.request(`${this.baseURL}${endpoint}`);
            return await response.json();
        } catch (error) {
            console.error(`GET ${endpoint} failed:`, error);
            
            // Fallback to mock data
            if (this.mockMode) {
                return this.getMockData(endpoint);
            }
            
            throw error;
        }
    }

    // POST request
    async post(endpoint, data) {
        try {
            if (this.mockMode) {
                return this.getMockResponse(endpoint, data);
            }

            const response = await this.request(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });

            return await response.json();
        } catch (error) {
            console.error(`POST ${endpoint} failed:`, error);
            
            if (this.mockMode) {
                return this.getMockResponse(endpoint, data);
            }
            
            throw error;
        }
    }

    // Mock Data للتطوير
    getMockData(endpoint) {
        console.log('📦 MOCK MODE: Returning fake data for', endpoint);

        const mockData = {
            '/dashboard/stats': {
                success: true,
                data: {
                    balance: 10000.00,
                    equity: 10000.00,
                    openPL: 0.00,
                    dailyPL: 0.00,
                    weeklyPL: 0.00,
                    monthlyPL: 0.00,
                    openPositions: 0,
                    totalSignals: 0,
                    executedToday: 0,
                    marginLevel: 0
                }
            },

            '/positions/open': {
                success: true,
                data: []
            },

            '/signals/recent': {
                success: true,
                data: []
            },

            '/history/trades': {
                success: true,
                data: []
            },

            '/analytics/performance': {
                success: true,
                data: {
                    winRate: 0,
                    profitFactor: 0,
                    avgWin: 0,
                    avgLoss: 0,
                    totalTrades: 0
                }
            },

            '/channels/list': {
                success: true,
                data: []
            }
        };

        return mockData[endpoint] || { success: true, data: null };
    }

    // Mock Response للطلبات
    getMockResponse(endpoint, data) {
        console.log('📦 MOCK MODE: Mock response for', endpoint, data);

        return {
            success: true,
            message: 'Request processed (mock)',
            data: data
        };
    }
}

// API Methods
const api = {
    manager: new APIManager(),

    // Dashboard
    getDashboardStats: () => api.manager.get('/dashboard/stats'),
    
    // Positions
    getOpenPositions: () => api.manager.get('/positions/open'),
    getPositionHistory: (limit = 50) => api.manager.get(`/positions/history?limit=${limit}`),
    closePosition: (positionId) => api.manager.post('/positions/close', { positionId }),
    
    // Signals
    getRecentSignals: (limit = 20) => api.manager.get(`/signals/recent?limit=${limit}`),
    getSignalHistory: (filters = {}) => api.manager.get('/signals/history', filters),
    
    // Analytics
    getPerformanceAnalytics: () => api.manager.get('/analytics/performance'),
    getProfitChart: (period = '30d') => api.manager.get(`/analytics/profit?period=${period}`),
    
    // Channels
    getMonitoredChannels: () => api.manager.get('/channels/list'),
    toggleChannel: (channelId, enabled) => api.manager.post('/channels/toggle', { channelId, enabled }),
    
    // Settings
    getSettings: () => api.manager.get('/settings'),
    updateSettings: (settings) => api.manager.post('/settings/update', settings),
    
    // EA Connection
    testEAConnection: () => api.manager.get('/ea/test-connection'),
    getEAStatus: () => api.manager.get('/ea/status')
};

// تصدير للاستخدام العام
window.api = api;
window.apiManager = new APIManager();

console.log('✅ API Manager loaded', API_CONFIG.MOCK_MODE ? '(MOCK MODE)' : '');
