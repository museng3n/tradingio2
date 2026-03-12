/**
 * TradingHub - WebSocket Manager
 * إدارة الاتصال المباشر للتحديثات الفورية
 */

// WebSocket Configuration
const WS_CONFIG = {
    URL: 'ws://localhost:3000',
    RECONNECT_INTERVAL: 5000, // 5 seconds
    MAX_RECONNECT_ATTEMPTS: 10,
    PING_INTERVAL: 30000, // 30 seconds
    
    // Mock mode للتطوير
    MOCK_MODE: true  // ⚠️ غيّر إلى false عندما يكون السيرفر جاهز
};

// WebSocket Manager Class
class WebSocketManager {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.pingTimer = null;
        this.connected = false;
        this.listeners = {};
        this.mockMode = WS_CONFIG.MOCK_MODE;

        if (!this.mockMode) {
            this.connect();
        } else {
            console.log('📡 MOCK MODE: WebSocket simulation enabled');
            this.simulateConnection();
        }
    }

    // الاتصال بالسيرفر
    connect() {
        if (this.connected) {
            console.log('⚠️ Already connected');
            return;
        }

        try {
            console.log('📡 Connecting to WebSocket...');
            
            this.ws = new WebSocket(WS_CONFIG.URL);

            this.ws.onopen = () => this.onOpen();
            this.ws.onmessage = (event) => this.onMessage(event);
            this.ws.onerror = (error) => this.onError(error);
            this.ws.onclose = () => this.onClose();

        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.scheduleReconnect();
        }
    }

    // عند الاتصال بنجاح
    onOpen() {
        console.log('✅ WebSocket connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        
        // إرسال التوكن للمصادقة
        if (window.authManager && window.authManager.isAuthenticated()) {
            this.send({
                type: 'auth',
                token: window.authManager.getToken()
            });
        }

        // بدء ping للحفاظ على الاتصال
        this.startPing();

        // تحديث حالة الاتصال في الواجهة
        this.updateConnectionStatus(true);

        // إطلاق حدث الاتصال
        this.emit('connected');
    }

    // عند استلام رسالة
    onMessage(event) {
        try {
            const message = JSON.parse(event.data);
            console.log('📨 WebSocket message:', message.type);

            // معالجة أنواع الرسائل المختلفة
            switch (message.type) {
                case 'signal':
                    this.emit('signal', message.data);
                    break;

                case 'position_update':
                    this.emit('position_update', message.data);
                    break;

                case 'balance_update':
                    this.emit('balance_update', message.data);
                    break;

                case 'ea_status':
                    this.emit('ea_status', message.data);
                    break;

                case 'notification':
                    this.emit('notification', message.data);
                    break;

                case 'pong':
                    // استجابة لـ ping
                    break;

                default:
                    console.log('Unknown message type:', message.type);
            }

        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    // عند حدوث خطأ
    onError(error) {
        console.error('❌ WebSocket error:', error);
        this.updateConnectionStatus(false);
    }

    // عند قطع الاتصال
    onClose() {
        console.log('🔌 WebSocket disconnected');
        this.connected = false;
        this.stopPing();
        this.updateConnectionStatus(false);
        this.emit('disconnected');

        // محاولة إعادة الاتصال
        this.scheduleReconnect();
    }

    // جدولة إعادة الاتصال
    scheduleReconnect() {
        if (this.reconnectAttempts >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
            console.log('❌ Max reconnect attempts reached');
            return;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectAttempts++;
        console.log(`⏳ Reconnecting in ${WS_CONFIG.RECONNECT_INTERVAL/1000}s... (Attempt ${this.reconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, WS_CONFIG.RECONNECT_INTERVAL);
    }

    // إرسال رسالة
    send(data) {
        if (!this.connected || !this.ws) {
            console.warn('⚠️ Cannot send - not connected');
            return false;
        }

        try {
            this.ws.send(JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error sending message:', error);
            return false;
        }
    }

    // بدء Ping
    startPing() {
        this.stopPing();
        
        this.pingTimer = setInterval(() => {
            this.send({ type: 'ping' });
        }, WS_CONFIG.PING_INTERVAL);
    }

    // إيقاف Ping
    stopPing() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    // الاستماع لحدث
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    // إطلاق حدث
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }

    // تحديث حالة الاتصال في الواجهة
    updateConnectionStatus(connected) {
        const statusElements = document.querySelectorAll('.ws-status');
        
        statusElements.forEach(el => {
            if (connected) {
                el.innerHTML = `
                    <span class="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                        <div class="w-1.5 h-1.5 bg-green-400 rounded-full pulse-dot"></div>
                        Live
                    </span>
                `;
            } else {
                el.innerHTML = `
                    <span class="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                        Offline
                    </span>
                `;
            }
        });
    }

    // محاكاة الاتصال في وضع التطوير
    simulateConnection() {
        console.log('🔧 Simulating WebSocket connection (MOCK MODE)');
        this.connected = true;
        this.updateConnectionStatus(true);

        // محاكاة رسائل عشوائية كل فترة
        if (WS_CONFIG.MOCK_MODE) {
            this.startMockMessages();
        }
    }

    // إرسال رسائل تجريبية
    startMockMessages() {
        // محاكاة تحديث الرصيد كل 30 ثانية
        setInterval(() => {
            this.emit('balance_update', {
                balance: 10000 + Math.random() * 100,
                equity: 10000 + Math.random() * 100,
                timestamp: new Date().toISOString()
            });
        }, 30000);

        console.log('✅ Mock WebSocket messages started');
    }

    // قطع الاتصال
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
        this.stopPing();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
    }
}

// إنشاء instance عام
const wsManager = new WebSocketManager();

// Event listeners للتحديثات المباشرة
wsManager.on('signal', (data) => {
    console.log('📊 New signal received:', data);
    // يمكن إضافة notification أو تحديث الجدول
});

wsManager.on('position_update', (data) => {
    console.log('📈 Position updated:', data);
    // تحديث جدول المراكز
});

wsManager.on('balance_update', (data) => {
    console.log('💰 Balance updated:', data);
    // تحديث عرض الرصيد
});

wsManager.on('notification', (data) => {
    console.log('🔔 Notification:', data.message);
    // إظهار notification
});

// تصدير للاستخدام العام
window.wsManager = wsManager;

console.log('✅ WebSocket Manager loaded', WS_CONFIG.MOCK_MODE ? '(MOCK MODE)' : '');
