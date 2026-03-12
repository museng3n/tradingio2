/**
 * TradingHub - Authentication System
 * يدعم وضع التطوير للاختبار السريع
 */

// Configuration
const AUTH_CONFIG = {
    // وضع التطوير - يقبل أي إيميل/باسورد
    DEV_MODE: true,  // ⚠️ غيّر إلى false في الإنتاج
    
    // API endpoints
    API_URL: 'http://localhost:3000/api',
    
    // Storage keys
    STORAGE_KEY: 'tradinghub_auth',
    
    // Test accounts (للتطوير فقط)
    TEST_ACCOUNTS: [
        { email: 'admin@tradinghub.com', password: 'admin123' },
        { email: 'test@test.com', password: 'test123' }
    ]
};

// Authentication Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.loadSession();
    }

    // تحميل الجلسة من localStorage
    loadSession() {
        try {
            const saved = localStorage.getItem(AUTH_CONFIG.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                this.currentUser = data.user;
                this.token = data.token;
                
                console.log('✅ Session loaded:', this.currentUser.email);
                return true;
            }
        } catch (e) {
            console.error('Failed to load session:', e);
        }
        return false;
    }

    // حفظ الجلسة
    saveSession(user, token) {
        this.currentUser = user;
        this.token = token;
        
        const data = { user, token };
        localStorage.setItem(AUTH_CONFIG.STORAGE_KEY, JSON.stringify(data));
        
        console.log('✅ Session saved:', user.email);
    }

    // تسجيل الدخول
    async login(email, password) {
        console.log('🔐 Attempting login:', email);

        // وضع التطوير - يقبل أي إيميل/باسورد
        if (AUTH_CONFIG.DEV_MODE) {
            console.log('⚠️ DEV MODE: Auto-login enabled');
            
            const user = {
                id: 'dev_' + Date.now(),
                email: email,
                name: email.split('@')[0],
                role: 'admin',
                subscription: {
                    plan: 'pro',
                    status: 'active'
                }
            };
            
            const token = 'dev_token_' + Date.now();
            
            this.saveSession(user, token);
            return { success: true, user, token };
        }

        // وضع الإنتاج - استدعاء API
        try {
            const response = await fetch(`${AUTH_CONFIG.API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.saveSession(data.user, data.token);
                return { success: true, user: data.user, token: data.token };
            } else {
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // في حالة فشل الاتصال بالسيرفر، استخدم وضع التطوير
            if (AUTH_CONFIG.DEV_MODE) {
                console.log('⚠️ Server offline - using DEV MODE');
                return this.login(email, password); // إعادة المحاولة بوضع التطوير
            }
            
            return { success: false, error: 'Connection failed' };
        }
    }

    // تسجيل الخروج
    logout() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem(AUTH_CONFIG.STORAGE_KEY);
        console.log('✅ Logged out');
        window.location.reload();
    }

    // التحقق من تسجيل الدخول
    isAuthenticated() {
        return this.currentUser !== null && this.token !== null;
    }

    // الحصول على المستخدم الحالي
    getCurrentUser() {
        return this.currentUser;
    }

    // الحصول على التوكن
    getToken() {
        return this.token;
    }

    // الحصول على headers للـ API
    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
}

// إنشاء instance عام
const authManager = new AuthManager();

// Login Modal Functions
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Handle login form submission
async function handleLogin(event) {
    if (event) {
        event.preventDefault();
    }

    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    const errorEl = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');

    // تنظيف الأخطاء السابقة
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
    }

    // التحقق من البيانات
    if (!email || !password) {
        if (errorEl) {
            errorEl.textContent = 'Please enter email and password';
            errorEl.classList.remove('hidden');
        }
        return;
    }

    // إظهار loading
    if (loginBtn) {
        loginBtn.textContent = 'Logging in...';
        loginBtn.disabled = true;
    }

    try {
        // محاولة تسجيل الدخول
        const result = await authManager.login(email, password);

        if (result.success) {
            console.log('✅ Login successful!');
            hideLoginModal();
            
            // إعادة تحميل الصفحة لتحديث البيانات
            window.location.reload();
        } else {
            // إظهار الخطأ
            if (errorEl) {
                errorEl.textContent = result.error || 'Login failed';
                errorEl.classList.remove('hidden');
            }
            
            // إعادة زر تسجيل الدخول
            if (loginBtn) {
                loginBtn.textContent = 'Login';
                loginBtn.disabled = false;
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        
        if (errorEl) {
            errorEl.textContent = 'An error occurred. Please try again.';
            errorEl.classList.remove('hidden');
        }
        
        if (loginBtn) {
            loginBtn.textContent = 'Login';
            loginBtn.disabled = false;
        }
    }
}

// إضافة Login Modal إلى الصفحة
function injectLoginModal() {
    // التحقق من عدم وجود modal مسبقاً
    if (document.getElementById('loginModal')) {
        return;
    }

    const modalHTML = `
    <!-- Login Modal -->
    <div id="loginModal" class="hidden fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div class="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-800">
            <h2 class="text-2xl font-bold text-white mb-6 text-center">TradingHub Login</h2>
            
            <form onsubmit="handleLogin(event)">
                <!-- Email -->
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-400 mb-2">Email</label>
                    <input 
                        type="email" 
                        id="loginEmail" 
                        class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        placeholder="m2jenqnnn@gmail.com"
                        required
                    >
                </div>

                <!-- Password -->
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-400 mb-2">Password</label>
                    <input 
                        type="password" 
                        id="loginPassword" 
                        class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        placeholder="••••••••••"
                        required
                    >
                </div>

                <!-- Error Message -->
                <div id="loginError" class="hidden mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                    <p class="text-red-400 text-sm text-center"></p>
                </div>

                <!-- Dev Mode Notice -->
                ${AUTH_CONFIG.DEV_MODE ? `
                <div class="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                    <p class="text-yellow-400 text-xs text-center">
                        🔧 DEV MODE: Any email/password will work
                    </p>
                </div>
                ` : ''}

                <!-- Login Button -->
                <button 
                    type="submit" 
                    id="loginBtn"
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
                >
                    Login
                </button>
            </form>

            <!-- Footer -->
            <p class="text-center text-gray-500 text-sm mt-6">
                Don't have an account? 
                <a href="#" class="text-blue-500 hover:text-blue-400">Contact Support</a>
            </p>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// التحقق من تسجيل الدخول عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Auth system initializing...');
    
    // إضافة Login Modal
    injectLoginModal();

    // التحقق من تسجيل الدخول
    if (!authManager.isAuthenticated()) {
        console.log('⚠️ User not authenticated - showing login');
        showLoginModal();
    } else {
        console.log('✅ User authenticated:', authManager.getCurrentUser().email);
        hideLoginModal();
        
        // عرض معلومات المستخدم في الواجهة
        updateUserInfo();
    }
});

// تحديث معلومات المستخدم في الواجهة
function updateUserInfo() {
    const user = authManager.getCurrentUser();
    if (!user) return;

    // يمكن إضافة كود لعرض اسم المستخدم في الـ sidebar مثلاً
    console.log('👤 Current user:', user.email);
}

// تصدير للاستخدام العام
window.authManager = authManager;
window.showLoginModal = showLoginModal;
window.hideLoginModal = hideLoginModal;
window.handleLogin = handleLogin;

console.log('✅ Auth system loaded');
