"""
TradingHub - Encryption Utilities
Implements AES-256-GCM encryption for Telegram sessions
"""

import os
import hashlib
from base64 import b64encode, b64decode
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend


class SessionEncryptor:
    """
    Encrypts and decrypts Telegram sessions using AES-256-GCM
    
    Security Features:
    - AES-256-GCM authenticated encryption
    - PBKDF2 key derivation (100,000 iterations)
    - Random salt per encryption
    - Random nonce per encryption
    - Authentication tag validation
    """
    
    SALT_SIZE = 32  # 256 bits
    NONCE_SIZE = 12  # 96 bits (recommended for GCM)
    KEY_SIZE = 32   # 256 bits
    ITERATIONS = 100000  # PBKDF2 iterations
    
    def __init__(self, api_key: str):
        """
        Initialize encryptor with user's API key
        
        Args:
            api_key: User's TradingHub API key
        """
        self.api_key = api_key.encode('utf-8')
    
    def _derive_key(self, salt: bytes) -> bytes:
        """
        Derive encryption key from API key using PBKDF2
        
        Args:
            salt: Random salt for key derivation
            
        Returns:
            32-byte encryption key
        """
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=self.KEY_SIZE,
            salt=salt,
            iterations=self.ITERATIONS,
            backend=default_backend()
        )
        return kdf.derive(self.api_key)
    
    def encrypt(self, session_data: bytes) -> dict:
        """
        Encrypt Telegram session data
        
        Args:
            session_data: Raw session data (StringSession string as bytes)
            
        Returns:
            Dictionary containing:
            - salt: Base64-encoded salt
            - nonce: Base64-encoded nonce
            - ciphertext: Base64-encoded encrypted data
            - tag: Base64-encoded authentication tag
        """
        # Generate random salt and nonce
        salt = os.urandom(self.SALT_SIZE)
        nonce = os.urandom(self.NONCE_SIZE)
        
        # Derive encryption key
        key = self._derive_key(salt)
        
        # Create AESGCM cipher
        aesgcm = AESGCM(key)
        
        # Encrypt data (GCM mode produces ciphertext + tag)
        ciphertext = aesgcm.encrypt(nonce, session_data, None)
        
        # GCM appends the tag to the ciphertext
        # Split them for clarity
        tag = ciphertext[-16:]  # Last 16 bytes is the auth tag
        ciphertext_only = ciphertext[:-16]
        
        return {
            'salt': b64encode(salt).decode('utf-8'),
            'nonce': b64encode(nonce).decode('utf-8'),
            'ciphertext': b64encode(ciphertext_only).decode('utf-8'),
            'tag': b64encode(tag).decode('utf-8'),
            'version': '1.0',
            'algorithm': 'AES-256-GCM'
        }
    
    def decrypt(self, encrypted_data: dict) -> bytes:
        """
        Decrypt Telegram session data
        
        Args:
            encrypted_data: Dictionary with salt, nonce, ciphertext, tag
            
        Returns:
            Decrypted session data as bytes
            
        Raises:
            ValueError: If decryption fails (wrong key or corrupted data)
        """
        try:
            # Decode from base64
            salt = b64decode(encrypted_data['salt'])
            nonce = b64decode(encrypted_data['nonce'])
            ciphertext = b64decode(encrypted_data['ciphertext'])
            tag = b64decode(encrypted_data['tag'])
            
            # Derive key
            key = self._derive_key(salt)
            
            # Create AESGCM cipher
            aesgcm = AESGCM(key)
            
            # Reconstruct full ciphertext (ciphertext + tag)
            full_ciphertext = ciphertext + tag
            
            # Decrypt and verify
            plaintext = aesgcm.decrypt(nonce, full_ciphertext, None)
            
            return plaintext
            
        except Exception as e:
            raise ValueError(f"Decryption failed: {str(e)}")
    
    def encrypt_to_string(self, session_data: bytes) -> str:
        """
        Encrypt session and return as single hex string for easy transmission
        
        Format: salt:nonce:ciphertext:tag (all hex-encoded)
        
        Args:
            session_data: Raw session data
            
        Returns:
            Hex-encoded encrypted session string
        """
        encrypted = self.encrypt(session_data)
        
        # Combine all parts with separator
        parts = [
            encrypted['salt'],
            encrypted['nonce'],
            encrypted['ciphertext'],
            encrypted['tag']
        ]
        
        return ':'.join(parts)
    
    def decrypt_from_string(self, encrypted_string: str) -> bytes:
        """
        Decrypt session from hex string format
        
        Args:
            encrypted_string: Hex-encoded encrypted session
            
        Returns:
            Decrypted session data
        """
        parts = encrypted_string.split(':')
        
        if len(parts) != 4:
            raise ValueError("Invalid encrypted session format")
        
        encrypted_data = {
            'salt': parts[0],
            'nonce': parts[1],
            'ciphertext': parts[2],
            'tag': parts[3]
        }
        
        return self.decrypt(encrypted_data)


class PasswordEncryptor:
    """
    Encrypts MT4/MT5 passwords (if using shared VPS option)
    """
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash password for storage (one-way, for verification)
        
        Args:
            password: Plain text password
            
        Returns:
            SHA-256 hash (hex)
        """
        return hashlib.sha256(password.encode('utf-8')).hexdigest()
    
    @staticmethod
    def encrypt_password(password: str, master_key: str) -> dict:
        """
        Encrypt password for secure storage
        
        Args:
            password: Plain text password
            master_key: Server master key
            
        Returns:
            Encrypted password data
        """
        encryptor = SessionEncryptor(master_key)
        return encryptor.encrypt(password.encode('utf-8'))
    
    @staticmethod
    def decrypt_password(encrypted_data: dict, master_key: str) -> str:
        """
        Decrypt password
        
        Args:
            encrypted_data: Encrypted password data
            master_key: Server master key
            
        Returns:
            Plain text password
        """
        encryptor = SessionEncryptor(master_key)
        return encryptor.decrypt(encrypted_data).decode('utf-8')


# Utility function for session validation
def validate_session_string(session_string: str) -> bool:
    """
    Validate that session string is in correct format
    
    Args:
        session_string: Telegram StringSession
        
    Returns:
        True if valid format
    """
    if not session_string:
        return False
    
    # StringSession should be base64-like string
    # Typically 200-400 characters
    if len(session_string) < 100 or len(session_string) > 1000:
        return False
    
    return True


# Test function
def test_encryption():
    """Test encryption/decryption flow"""
    print("🔐 Testing Session Encryption...")
    
    # Test data
    api_key = "test-api-key-12345"
    session_data = b"1AgAOMTQ5LjE1NC4xNjcuNTABu4..."  # Mock session
    
    # Initialize encryptor
    encryptor = SessionEncryptor(api_key)
    
    # Encrypt
    print("Encrypting session...")
    encrypted = encryptor.encrypt(session_data)
    print(f"✅ Encrypted successfully")
    print(f"   Salt: {encrypted['salt'][:20]}...")
    print(f"   Nonce: {encrypted['nonce'][:20]}...")
    print(f"   Ciphertext: {encrypted['ciphertext'][:30]}...")
    
    # Decrypt
    print("\nDecrypting session...")
    decrypted = encryptor.decrypt(encrypted)
    print(f"✅ Decrypted successfully")
    
    # Verify
    assert decrypted == session_data, "Decryption failed!"
    print("✅ Verification passed - data matches!")
    
    # Test string format
    print("\nTesting string format...")
    encrypted_string = encryptor.encrypt_to_string(session_data)
    print(f"Encrypted string: {encrypted_string[:50]}...")
    
    decrypted_string = encryptor.decrypt_from_string(encrypted_string)
    assert decrypted_string == session_data, "String decryption failed!"
    print("✅ String encryption/decryption works!")
    
    print("\n✅ All encryption tests passed!")


if __name__ == '__main__':
    test_encryption()
