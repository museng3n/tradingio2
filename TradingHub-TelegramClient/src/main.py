"""
TradingHub - Web UI Server
Flask application for Telegram setup wizard
"""

import asyncio
import json
import os
from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
import requests
from datetime import datetime
import logging
import nest_asyncio
import threading

from crypto_utils import SessionEncryptor
from telegram_client import TradingHubTelegramClient

# Apply nest_asyncio to allow nested event loops (fixes Telethon + Flask issue)
nest_asyncio.apply()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__,
            template_folder='../frontend',
            static_folder='../frontend/static')
app.secret_key = os.urandom(24)
CORS(app)

# Configuration
SERVER_API_URL = os.getenv('SERVER_API_URL', 'http://localhost:3001')
UPLOAD_ENDPOINT = f'{SERVER_API_URL}/api/session/upload'

# Store active clients (in-memory)
active_clients = {}

# Create a single persistent event loop for all Telethon operations
_loop = None
_loop_lock = threading.Lock()


def get_persistent_loop():
    """Get or create a persistent event loop for Telethon"""
    global _loop
    with _loop_lock:
        if _loop is None or _loop.is_closed():
            _loop = asyncio.new_event_loop()
            asyncio.set_event_loop(_loop)
        return _loop


def run_async(coro):
    """Run async coroutine in the persistent event loop"""
    loop = get_persistent_loop()
    return loop.run_until_complete(coro)


@app.route('/')
def index():
    """Home page - Setup wizard start"""
    return render_template('index.html')


@app.route('/api/check-server', methods=['GET'])
def check_server():
    """Check if TradingHub server is reachable"""
    try:
        response = requests.get(f'{SERVER_API_URL}/api/health', timeout=5)
        return jsonify({
            'success': True,
            'online': response.status_code == 200
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'online': False,
            'error': str(e)
        })


@app.route('/api/validate-api-key', methods=['POST'])
def validate_api_key():
    """
    Validate API key with server and get phone number
    
    Request:
        {
            "api_key": "user-api-key"
        }
    
    Response:
        {
            "success": true,
            "phone_number": "+1234567890",
            "user": {...}
        }
    """
    try:
        data = request.json
        api_key = data.get('api_key')
        
        if not api_key:
            return jsonify({
                'success': False,
                'error': 'API key is required'
            }), 400
        
        # Validate with server
        response = requests.post(
            f'{SERVER_API_URL}/api/user/validate-key',
            json={'api_key': api_key},
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Store in session
            session['api_key'] = api_key
            session['phone_number'] = result.get('phone_number')
            session['user_id'] = result.get('user_id')
            
            return jsonify({
                'success': True,
                'phone_number': result.get('phone_number'),
                'user': result.get('user')
            })
        else:
            return jsonify({
                'success': False,
                'error': response.json().get('error', 'Invalid API key')
            }), 401
            
    except requests.RequestException as e:
        logger.error(f"Server communication error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Could not connect to TradingHub server'
        }), 500
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/auth/start', methods=['POST'])
def start_auth():
    """
    Start Telegram authentication

    Request:
        {
            "phone_number": "+1234567890"
        }

    Response:
        {
            "success": true,
            "message": "OTP sent to +1234567890"
        }
    """
    try:
        # Debug logging
        logger.info(f"📥 Request Content-Type: {request.content_type}")
        logger.info(f"📥 Request data (raw): {request.data}")
        logger.info(f"📥 Request JSON: {request.json}")

        data = request.json

        # Handle case where request.json is None
        if data is None:
            logger.error("❌ request.json is None - check Content-Type header")
            return jsonify({
                'success': False,
                'error': 'Invalid request format. Content-Type must be application/json'
            }), 400

        phone_number = data.get('phone_number')
        logger.info(f"📱 Extracted phone_number: {phone_number}")
        
        if not phone_number:
            return jsonify({
                'success': False,
                'error': 'Phone number is required'
            }), 400
        
        # Create Telegram client
        client = TradingHubTelegramClient()

        # Start auth using persistent loop
        result = run_async(client.start_auth(phone_number))
        
        if result['success']:
            # Store client in session
            session_id = os.urandom(16).hex()
            active_clients[session_id] = client
            session['client_id'] = session_id
            session['phone_number'] = phone_number
            
            logger.info(f"✅ OTP sent to {phone_number}")
            
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Auth start error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/auth/verify-code', methods=['POST'])
def verify_code():
    """
    Verify OTP code
    
    Request:
        {
            "code": "12345"
        }
    
    Response:
        {
            "success": true,
            "session_string": "...",
            "user": {...},
            "needs_password": false
        }
    """
    try:
        data = request.json
        code = data.get('code')
        
        if not code:
            return jsonify({
                'success': False,
                'error': 'Code is required'
            }), 400
        
        # Get client from session
        client_id = session.get('client_id')
        if not client_id or client_id not in active_clients:
            return jsonify({
                'success': False,
                'error': 'Session expired. Please restart.'
            }), 400
        
        client = active_clients[client_id]

        # Verify code using persistent loop
        result = run_async(client.verify_code(code))

        # Check if 2FA password is needed
        if result.get('needs_password'):
            logger.info("2FA password required - showing password form")
            return jsonify(result)  # Returns with needs_password: true

        if result['success']:
            # Store session string
            session['session_string'] = result['session_string']
            session['user_info'] = result['user']

            logger.info(f"✅ User authenticated: {result['user']['first_name']}")

        return jsonify(result)

    except Exception as e:
        error_msg = str(e)

        # Check if 2FA is required (fallback)
        if 'Two-step verification' in error_msg or 'password' in error_msg.lower():
            logger.info("2FA password required (from exception)")
            return jsonify({
                'success': False,
                'needs_password': True,
                'error': '2FA password required'
            })

        logger.error(f"Code verification error: {error_msg}")
        return jsonify({
            'success': False,
            'error': error_msg
        }), 500


@app.route('/api/auth/verify-password', methods=['POST'])
def verify_password():
    """
    Verify 2FA password
    
    Request:
        {
            "password": "user-2fa-password"
        }
    
    Response:
        {
            "success": true,
            "session_string": "...",
            "user": {...}
        }
    """
    try:
        data = request.json
        password = data.get('password')
        
        if not password:
            return jsonify({
                'success': False,
                'error': 'Password is required'
            }), 400
        
        # Get client from session
        client_id = session.get('client_id')
        if not client_id or client_id not in active_clients:
            return jsonify({
                'success': False,
                'error': 'Session expired. Please restart.'
            }), 400
        
        client = active_clients[client_id]

        # Verify password using persistent loop
        result = run_async(client.verify_password(password))
        
        if result['success']:
            session['session_string'] = result['session_string']
            session['user_info'] = result['user']
            
            logger.info(f"✅ 2FA verified for: {result['user']['first_name']}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Password verification error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/channels/list', methods=['GET'])
def list_channels():
    """
    Get all channels user is subscribed to
    
    Response:
        {
            "success": true,
            "channels": [...]
        }
    """
    try:
        # Get session string
        session_string = session.get('session_string')
        if not session_string:
            return jsonify({
                'success': False,
                'error': 'Not authenticated'
            }), 401
        
        # Create client from session using persistent loop
        client = run_async(
            TradingHubTelegramClient.from_session_string(session_string)
        )

        # Get channels
        channels = run_async(client.get_all_channels())

        # Disconnect
        run_async(client.disconnect())
        
        logger.info(f"✅ Retrieved {len(channels)} channels")
        
        return jsonify({
            'success': True,
            'channels': channels,
            'total': len(channels)
        })
        
    except Exception as e:
        logger.error(f"Channel list error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/session/upload', methods=['POST'])
def upload_session():
    """
    Encrypt and upload session to TradingHub server
    
    Request:
        {
            "selected_channels": [
                {
                    "id": "123456",
                    "title": "Gold Signals VIP",
                    "username": "gold_signals"
                }
            ]
        }
    
    Response:
        {
            "success": true,
            "message": "Session uploaded successfully"
        }
    """
    try:
        data = request.json
        selected_channels = data.get('selected_channels', [])
        
        if not selected_channels:
            return jsonify({
                'success': False,
                'error': 'Please select at least one channel'
            }), 400
        
        # Get API key and session
        api_key = session.get('api_key')
        session_string = session.get('session_string')
        phone_number = session.get('phone_number')
        
        if not all([api_key, session_string, phone_number]):
            return jsonify({
                'success': False,
                'error': 'Missing required data. Please restart setup.'
            }), 400
        
        # Encrypt session
        logger.info("🔐 Encrypting Telegram session...")
        encryptor = SessionEncryptor(api_key)
        encrypted_session = encryptor.encrypt_to_string(
            session_string.encode('utf-8')
        )
        
        logger.info("✅ Session encrypted successfully")
        
        # Upload to server
        logger.info("📤 Uploading to TradingHub server...")
        
        upload_data = {
            'api_key': api_key,
            'encrypted_session': encrypted_session,
            'phone_number': phone_number,
            'selected_channels': selected_channels,
            'client_info': {
                'version': '1.0',
                'platform': 'desktop',
                'timestamp': datetime.utcnow().isoformat()
            }
        }
        
        response = requests.post(
            UPLOAD_ENDPOINT,
            json=upload_data,
            timeout=30
        )
        
        if response.status_code == 200:
            logger.info("✅ Session uploaded successfully!")
            
            # Clean up
            client_id = session.get('client_id')
            if client_id and client_id in active_clients:
                client = active_clients[client_id]
                run_async(client.disconnect())
                del active_clients[client_id]
            
            # Clear session
            session.clear()
            
            return jsonify({
                'success': True,
                'message': 'Session uploaded successfully',
                'channels_count': len(selected_channels)
            })
        else:
            error_msg = response.json().get('error', 'Upload failed')
            logger.error(f"Upload failed: {error_msg}")
            return jsonify({
                'success': False,
                'error': error_msg
            }), response.status_code
            
    except requests.RequestException as e:
        logger.error(f"Server communication error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Could not connect to TradingHub server'
        }), 500
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0'
    })


# Error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    print("🚀 TradingHub Telegram Client Starting...")
    print(f"📡 Server: {SERVER_API_URL}")
    print(f"🌐 Web UI: http://localhost:3737")
    print("\n✅ Ready! Open http://localhost:3737 in your browser\n")
    
    app.run(
        host='0.0.0.0',
        port=3737,
        debug=True
    )
