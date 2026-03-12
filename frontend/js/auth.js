/**
 * TradingHub Authentication Manager
 * Handles login, 2FA, token management, and session persistence
 */

class AuthManager {
  constructor() {
    this.token = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
    this.tokenRefreshInterval = null;
    this.baseURL = '/api';
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.user?.role === 'admin';
  }

  /**
   * Get current user
   */
  getUser() {
    return this.user;
  }

  /**
   * Login with email and password
   */
  async login(email, password) {
    try {
      const res = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Check if 2FA is required
      if (data.requires2FA) {
        return {
          success: false,
          requires2FA: true,
          tempToken: data.tempToken,
          message: '2FA verification required'
        };
      }

      // No 2FA - save tokens directly
      this.saveSession(data.accessToken, data.refreshToken, data.user);

      return { success: true, user: data.user };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify 2FA code
   */
  async verify2FA(tempToken, totpCode) {
    try {
      const res = await fetch(`${this.baseURL}/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, token: totpCode })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '2FA verification failed');
      }

      // Save tokens
      this.saveSession(data.accessToken, data.refreshToken, data.user);

      return { success: true, user: data.user };

    } catch (error) {
      console.error('2FA verification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Register new user
   */
  async register(email, password) {
    try {
      const res = await fetch(`${this.baseURL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      return { success: true, message: data.message };

    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup 2FA
   */
  async setup2FA() {
    try {
      const res = await fetch(`${this.baseURL}/auth/2fa/setup`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '2FA setup failed');
      }

      return {
        success: true,
        secret: data.secret,
        qrCode: data.qrCode,
        otpauthUrl: data.otpauthUrl
      };

    } catch (error) {
      console.error('2FA setup error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enable 2FA after setup
   */
  async enable2FA(token) {
    try {
      const res = await fetch(`${this.baseURL}/auth/2fa/enable`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ token })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '2FA enable failed');
      }

      // Update user
      if (this.user) {
        this.user.twoFactorEnabled = true;
        localStorage.setItem('user', JSON.stringify(this.user));
      }

      return { success: true, backupCodes: data.backupCodes };

    } catch (error) {
      console.error('2FA enable error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      this.logout();
      return false;
    }

    try {
      const res = await fetch(`${this.baseURL}/auth/refresh`, {
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

  /**
   * Save session data
   */
  saveSession(accessToken, refreshToken, user) {
    this.token = accessToken;
    this.refreshToken = refreshToken;
    this.user = user;

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    // Start token refresh interval (refresh 1 minute before expiry, assuming 15min tokens)
    this.startTokenRefresh();
  }

  /**
   * Start automatic token refresh
   */
  startTokenRefresh() {
    // Clear existing interval
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }

    // Refresh every 14 minutes (tokens expire at 15 minutes)
    this.tokenRefreshInterval = setInterval(async () => {
      await this.refreshAccessToken();
    }, 14 * 60 * 1000);
  }

  /**
   * Stop token refresh
   */
  stopTokenRefresh() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    // Call logout endpoint to invalidate refresh token
    if (this.token) {
      try {
        await fetch(`${this.baseURL}/auth/logout`, {
          method: 'POST',
          headers: this.getHeaders()
        });
      } catch (error) {
        // Ignore logout errors
      }
    }

    // Clear local data
    this.token = null;
    this.refreshToken = null;
    this.user = null;

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    this.stopTokenRefresh();

    // Emit logout event
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  /**
   * Change password
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const res = await fetch(`${this.baseURL}/auth/change-password`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Password change failed');
      }

      return { success: true };

    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get authorization headers
   */
  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Get token for WebSocket authentication
   */
  getToken() {
    return this.token;
  }
}

// Global instance
const auth = new AuthManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuthManager, auth };
}
