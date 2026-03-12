"""
TradingHub - Telegram Client
Handles Telegram authentication and channel management using Telethon
"""

import asyncio
import os
import json
from typing import List, Dict, Optional
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from telethon.tl.functions.messages import GetDialogsRequest
from telethon.tl.types import InputPeerEmpty, Channel, Chat
from telethon.errors import SessionPasswordNeededError
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TradingHubTelegramClient:
    """
    Wrapper for Telegram client operations
    
    Features:
    - Phone number authentication
    - OTP verification
    - Channel listing
    - Session management
    - Secure session export
    """
    
    # Telegram API Credentials (hardcoded as per plan)
    API_ID = 21769095
    API_HASH = "e3d4ceb7458bdf6699f73ce160baaae7"
    
    def __init__(self, session_string: str = None):
        """
        Initialize Telegram client
        
        Args:
            session_string: Existing StringSession (optional)
        """
        self.session_string = session_string
        self.client: Optional[TelegramClient] = None
        self.phone_number: Optional[str] = None
        self.phone_code_hash: Optional[str] = None
        
    async def start_auth(self, phone_number: str) -> Dict[str, any]:
        """
        Start authentication process
        
        Args:
            phone_number: User's phone number (international format)
            
        Returns:
            Dictionary with status and phone_code_hash
        """
        try:
            self.phone_number = phone_number
            
            # Create client with empty session
            self.client = TelegramClient(
                StringSession(),
                self.API_ID,
                self.API_HASH
            )
            
            await self.client.connect()
            
            # Send code request
            logger.info(f"Sending OTP to {phone_number}")
            sent_code = await self.client.send_code_request(phone_number)
            self.phone_code_hash = sent_code.phone_code_hash
            
            return {
                'success': True,
                'phone_code_hash': self.phone_code_hash,
                'message': f'OTP sent to {phone_number}'
            }
            
        except Exception as e:
            logger.error(f"Auth start failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def verify_code(self, code: str) -> Dict[str, any]:
        """
        Verify OTP code and complete authentication

        Args:
            code: OTP code from Telegram

        Returns:
            Dictionary with status and session string
        """
        try:
            if not self.client or not self.phone_code_hash:
                raise ValueError("Authentication not started")

            logger.info("Verifying OTP code...")

            # Sign in with code
            try:
                await self.client.sign_in(
                    phone=self.phone_number,
                    code=code,
                    phone_code_hash=self.phone_code_hash
                )
            except SessionPasswordNeededError:
                # 2FA is enabled - need password
                logger.info("2FA password required")
                return {
                    'success': False,
                    'needs_password': True,
                    'error': '2FA password required'
                }

            # Get session string
            session_string = self.client.session.save()

            # Get user info
            me = await self.client.get_me()

            logger.info(f"✅ Logged in as: {me.first_name} {me.last_name or ''}")

            return {
                'success': True,
                'session_string': session_string,
                'user': {
                    'id': me.id,
                    'first_name': me.first_name,
                    'last_name': me.last_name,
                    'username': me.username,
                    'phone': me.phone
                }
            }

        except Exception as e:
            logger.error(f"Code verification failed: {str(e)}")
            # Check if it's a 2FA error that wasn't caught
            error_msg = str(e).lower()
            if 'password' in error_msg or 'two-step' in error_msg or '2fa' in error_msg:
                return {
                    'success': False,
                    'needs_password': True,
                    'error': '2FA password required'
                }
            return {
                'success': False,
                'error': str(e)
            }
    
    async def verify_password(self, password: str) -> Dict[str, any]:
        """
        Verify 2FA password if required
        
        Args:
            password: 2FA password
            
        Returns:
            Dictionary with status and session string
        """
        try:
            if not self.client:
                raise ValueError("Authentication not started")
            
            logger.info("Verifying 2FA password...")
            
            # Sign in with password
            await self.client.sign_in(password=password)
            
            # Get session string
            session_string = self.client.session.save()
            
            # Get user info
            me = await self.client.get_me()
            
            return {
                'success': True,
                'session_string': session_string,
                'user': {
                    'id': me.id,
                    'first_name': me.first_name,
                    'last_name': me.last_name,
                    'username': me.username,
                    'phone': me.phone
                }
            }
            
        except Exception as e:
            logger.error(f"Password verification failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_all_channels(self) -> List[Dict]:
        """
        Get all channels user is subscribed to
        
        Returns:
            List of channel dictionaries
        """
        try:
            if not self.client:
                raise ValueError("Client not initialized")
            
            if not await self.client.is_user_authorized():
                raise ValueError("User not authenticated")
            
            logger.info("Fetching all channels...")
            
            channels = []
            
            # Get dialogs (chats/channels)
            dialogs = await self.client.get_dialogs()
            
            for dialog in dialogs:
                entity = dialog.entity
                
                # Filter only channels and groups
                if isinstance(entity, (Channel, Chat)):
                    channel_info = {
                        'id': str(entity.id),
                        'title': entity.title,
                        'username': getattr(entity, 'username', None),
                        'type': 'channel' if isinstance(entity, Channel) else 'group',
                        'is_public': bool(getattr(entity, 'username', None)),
                        'members_count': getattr(entity, 'participants_count', 0),
                        'description': getattr(entity, 'about', ''),
                    }
                    
                    channels.append(channel_info)
            
            logger.info(f"✅ Found {len(channels)} channels/groups")
            
            # Sort by type (channels first) and title
            channels.sort(key=lambda x: (x['type'] != 'channel', x['title']))
            
            return channels
            
        except Exception as e:
            logger.error(f"Failed to fetch channels: {str(e)}")
            raise
    
    async def test_connection(self) -> bool:
        """
        Test if client is connected and authorized
        
        Returns:
            True if connected and authorized
        """
        try:
            if not self.client:
                return False
            
            if not self.client.is_connected():
                await self.client.connect()
            
            return await self.client.is_user_authorized()
            
        except Exception as e:
            logger.error(f"Connection test failed: {str(e)}")
            return False
    
    async def disconnect(self):
        """Disconnect client"""
        if self.client:
            await self.client.disconnect()
            logger.info("Client disconnected")
    
    @classmethod
    async def from_session_string(cls, session_string: str) -> 'TradingHubTelegramClient':
        """
        Create client from existing session string
        
        Args:
            session_string: Telegram StringSession
            
        Returns:
            Initialized TelegramClient instance
        """
        instance = cls(session_string)
        
        instance.client = TelegramClient(
            StringSession(session_string),
            cls.API_ID,
            cls.API_HASH
        )
        
        await instance.client.connect()
        
        if not await instance.client.is_user_authorized():
            raise ValueError("Session is not valid or expired")
        
        logger.info("✅ Client initialized from session string")
        
        return instance


class ChannelMonitor:
    """
    Monitor Telegram channels for new messages (for server-side use)
    """
    
    def __init__(self, client: TelegramClient, channel_ids: List[str]):
        """
        Initialize channel monitor
        
        Args:
            client: Authenticated TelegramClient
            channel_ids: List of channel IDs to monitor
        """
        self.client = client
        self.channel_ids = channel_ids
        self.message_handlers = []
    
    def add_message_handler(self, handler):
        """
        Add handler for new messages
        
        Args:
            handler: Async function(channel_id, message)
        """
        self.message_handlers.append(handler)
    
    async def start_monitoring(self):
        """Start monitoring channels"""
        
        @self.client.on(events.NewMessage(chats=self.channel_ids))
        async def handle_new_message(event):
            """Handle new message"""
            channel_id = str(event.chat_id)
            message = event.message
            
            logger.info(f"📨 New message from channel {channel_id}")
            
            # Call all handlers
            for handler in self.message_handlers:
                try:
                    await handler(channel_id, message)
                except Exception as e:
                    logger.error(f"Handler error: {str(e)}")
        
        logger.info(f"👀 Monitoring {len(self.channel_ids)} channels...")
        await self.client.run_until_disconnected()


# Test function
async def test_telegram_client():
    """Test Telegram client functionality"""
    print("🧪 Testing Telegram Client...")
    
    # Test 1: Initialize client
    print("\n1️⃣ Testing client initialization...")
    client = TradingHubTelegramClient()
    print("✅ Client initialized")
    
    # Test 2: Auth start (would need real phone number)
    print("\n2️⃣ Auth flow test (manual):")
    print("   - Call start_auth(phone_number)")
    print("   - Receive OTP")
    print("   - Call verify_code(code)")
    print("   - Get session string")
    
    print("\n✅ Telegram client module ready!")
    print("\nNext steps:")
    print("1. User enters phone number")
    print("2. User enters OTP")
    print("3. Session encrypted with API key")
    print("4. Encrypted session uploaded to server")


if __name__ == '__main__':
    asyncio.run(test_telegram_client())
