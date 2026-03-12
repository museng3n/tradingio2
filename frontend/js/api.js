/**
 * TradingHub API Client
 * Handles all API requests with automatic token refresh
 */

class APIClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
  }

  /**
   * Make an API request with automatic token refresh
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: auth.getHeaders()
    };

    // Add body as JSON if provided
    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      let res = await fetch(url, config);

      // If 401, try to refresh token and retry
      if (res.status === 401) {
        const refreshed = await auth.refreshAccessToken();
        if (refreshed) {
          config.headers = auth.getHeaders();
          res = await fetch(url, config);
        } else {
          window.dispatchEvent(new CustomEvent('auth:required'));
          throw new Error('Authentication required');
        }
      }

      // Handle non-JSON responses (like CSV downloads)
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/csv')) {
        if (!res.ok) throw new Error('Download failed');
        return await res.text();
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Request failed');
      }

      return data;

    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // ==================== ANALYTICS ====================

  async getAnalyticsSummary() {
    return this.request('/analytics/summary');
  }

  async getTPStatistics() {
    return this.request('/analytics/tp-statistics');
  }

  async getProfitChart(period = '7d') {
    return this.request(`/analytics/profit-chart?period=${period}`);
  }

  async getPerformanceBySymbol() {
    return this.request('/analytics/performance-by-symbol');
  }

  async getPerformanceByTime() {
    return this.request('/analytics/performance-by-time');
  }

  async getSignalStats() {
    return this.request('/analytics/signals');
  }

  async getDailySummary(date) {
    const query = date ? `?date=${date}` : '';
    return this.request(`/analytics/daily-summary${query}`);
  }

  async getWeeklySummary() {
    return this.request('/analytics/weekly-summary');
  }

  async generateReport(startDate, endDate) {
    let query = '';
    if (startDate) query += `?startDate=${startDate}`;
    if (endDate) query += `${query ? '&' : '?'}endDate=${endDate}`;
    return this.request(`/analytics/report${query}`);
  }

  async exportPositions(startDate, endDate) {
    let query = '';
    if (startDate) query += `?startDate=${startDate}`;
    if (endDate) query += `${query ? '&' : '?'}endDate=${endDate}`;
    return this.request(`/analytics/export/positions${query}`);
  }

  async exportSignals(startDate, endDate) {
    let query = '';
    if (startDate) query += `?startDate=${startDate}`;
    if (endDate) query += `${query ? '&' : '?'}endDate=${endDate}`;
    return this.request(`/analytics/export/signals${query}`);
  }

  // ==================== POSITIONS ====================

  async getPositions(status = '', page = 1, limit = 20) {
    let query = `?page=${page}&limit=${limit}`;
    if (status) query += `&status=${status}`;
    return this.request(`/positions${query}`);
  }

  async getPosition(id) {
    return this.request(`/positions/${id}`);
  }

  async openPosition(signalId, lotSize, tpStrategy) {
    return this.request('/positions', {
      method: 'POST',
      body: { signalId, lotSize, tpStrategy }
    });
  }

  async modifyPosition(id, updates) {
    return this.request(`/positions/${id}`, {
      method: 'PUT',
      body: updates
    });
  }

  async closePosition(id, percentage = 100) {
    return this.request(`/positions/${id}/close`, {
      method: 'POST',
      body: { percentage }
    });
  }

  async closeAllPositions() {
    return this.request('/positions/close-all', {
      method: 'POST'
    });
  }

  async getPositionStats() {
    return this.request('/positions/stats');
  }

  async getRiskMetrics() {
    return this.request('/positions/risk-metrics');
  }

  async calculateLotSize(entryPrice, sl, riskPercent = 1) {
    return this.request('/positions/calculate-lot-size', {
      method: 'POST',
      body: { entryPrice, sl, riskPercent }
    });
  }

  async getTPTemplates() {
    return this.request('/positions/tp-templates');
  }

  async previewTPDistribution(tpPrices, lotSize, strategy) {
    return this.request('/positions/preview-tp-distribution', {
      method: 'POST',
      body: { tpPrices, lotSize, strategy }
    });
  }

  // ==================== MT5 CONNECTION ====================

  async connectMT5(account, password, server) {
    return this.request('/positions/mt5/connect', {
      method: 'POST',
      body: { account, password, server }
    });
  }

  async disconnectMT5() {
    return this.request('/positions/mt5/disconnect', {
      method: 'POST'
    });
  }

  async getMT5Status() {
    return this.request('/positions/mt5/status');
  }

  // ==================== SIGNALS ====================

  async getSignals(page = 1, limit = 20, status) {
    let query = `?page=${page}&limit=${limit}`;
    if (status) query += `&status=${status}`;
    return this.request(`/signals${query}`);
  }

  async getSignal(id) {
    return this.request(`/signals/${id}`);
  }

  async getRecentSignals(limit = 5) {
    return this.request(`/signals?limit=${limit}&status=ACTIVE`);
  }

  async createSignal(signalData) {
    return this.request('/signals', {
      method: 'POST',
      body: signalData
    });
  }

  async parseSignal(message) {
    return this.request('/signals/parse', {
      method: 'POST',
      body: { message }
    });
  }

  async expireSignal(id) {
    return this.request(`/signals/${id}/expire`, {
      method: 'POST'
    });
  }

  // ==================== ADMIN (if admin) ====================

  async getUsers(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/admin/users${params ? '?' + params : ''}`);
  }

  async getUserDetails(userId) {
    return this.request(`/admin/users/${userId}`);
  }

  async getUserHistory(userId, page = 1, limit = 20) {
    return this.request(`/admin/users/${userId}/history?page=${page}&limit=${limit}`);
  }

  async suspendUser(userId, reason) {
    return this.request(`/admin/users/${userId}/suspend`, {
      method: 'POST',
      body: { reason }
    });
  }

  async activateUser(userId) {
    return this.request(`/admin/users/${userId}/activate`, {
      method: 'POST'
    });
  }

  async deleteUser(userId) {
    return this.request(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
  }

  async resetUserPassword(userId) {
    return this.request(`/admin/users/${userId}/reset-password`, {
      method: 'POST'
    });
  }

  async disableUser2FA(userId) {
    return this.request(`/admin/users/${userId}/disable-2fa`, {
      method: 'POST'
    });
  }

  async getSystemHealth() {
    return this.request('/admin/system/health');
  }

  async getSystemMetrics() {
    return this.request('/admin/system/metrics');
  }

  async getSystemStats() {
    return this.request('/admin/stats');
  }

  async getErrorMetrics() {
    return this.request('/admin/system/errors');
  }

  async getAdminMT5Status() {
    return this.request('/admin/system/mt5-status');
  }

  async getRealTimeMetrics() {
    return this.request('/admin/system/realtime');
  }

  async getAuditLogs(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/admin/audit-logs${params ? '?' + params : ''}`);
  }

  async exportAuditLogs(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/admin/audit-logs/export${params ? '?' + params : ''}`);
  }

  async getSecurityEvents(page = 1, limit = 50) {
    return this.request(`/admin/audit-logs/security?page=${page}&limit=${limit}`);
  }

  async getSystemProfit(period = '30d') {
    return this.request(`/admin/analytics/profit?period=${period}`);
  }

  async getSignalAnalytics() {
    return this.request('/admin/analytics/signals');
  }

  async getRiskDashboard() {
    return this.request('/admin/analytics/risk');
  }

  async compareUsers(userIds) {
    return this.request('/admin/users/compare', {
      method: 'POST',
      body: { userIds }
    });
  }

  async bulkSuspendUsers(userIds, reason) {
    return this.request('/admin/users/bulk-suspend', {
      method: 'POST',
      body: { userIds, reason }
    });
  }
}

// Global instance
const api = new APIClient();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { APIClient, api };
}
