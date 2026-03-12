# 🚀 TradingHub - Telegram Desktop Client

Complete setup application for connecting your Telegram account to TradingHub.

## 📦 What This Does

1. **One-time Setup**: Securely connects your Telegram account
2. **Channel Selection**: Choose which channels to monitor for signals
3. **End-to-End Encryption**: Your session is encrypted with your API key
4. **No Password Stored**: Your Telegram password never leaves your device
5. **24/7 Monitoring**: Server monitors channels after setup complete

## 🏗️ Architecture

```
User's Computer (One-time Setup)
    ↓
TradingHub Desktop App
    ↓ (Encrypted Session)
TradingHub Server (24/7 Monitoring)
    ↓ (Parsed Signals)
MT4/MT5 EA (Auto Trading)
```

## 🚀 Quick Start

### Option 1: Using Docker (Recommended)

```bash
# 1. Clone or download this folder
cd TradingHub-TelegramClient

# 2. Start the application
docker-compose up

# 3. Open your browser
http://localhost:3737

# 4. Follow the setup wizard
```

### Option 2: Using Python Directly

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the application
python src/main.py

# 3. Open your browser
http://localhost:3737
```

## 📝 Step-by-Step Setup Guide

### Step 1: API Key

1. Log in to your TradingHub account
2. Go to **Settings** → **API Keys**
3. Copy your API key
4. Paste it in the setup wizard

### Step 2: Phone Authentication

1. Your phone number will be auto-filled from server
2. Click **"Send OTP"**
3. Check your **Telegram app** for the code
4. Enter the code
5. If you have 2FA enabled, enter your password

### Step 3: Channel Selection

1. See all your Telegram channels/groups
2. Select channels you want to monitor for signals
3. Click **"Activate Trading"**
4. Done! ✅

### Step 4: Close Application

- You can now close the desktop app
- Your session is securely stored on the server
- Monitoring runs 24/7 automatically

## 🔐 Security Features

### End-to-End Encryption

```
Your Telegram Session
    ↓
Encrypted with YOUR API Key (AES-256-GCM)
    ↓
Uploaded to Server (Encrypted)
    ↓
Only decrypted in server memory (never on disk)
```

### What We Store

| Data | How Stored | Who Can Access |
|------|------------|----------------|
| Telegram Session | Encrypted (AES-256-GCM) | Nobody (requires your API key) |
| Selected Channels | Plain text | Only you |
| Phone Number | Encrypted | Only you |
| API Key | Hashed | Nobody |

### What We DON'T Store

- ❌ Your Telegram password
- ❌ Your 2FA password
- ❌ Message content
- ❌ Personal conversations
- ❌ Unselected channels

## 🛠️ Development

### Project Structure

```
TradingHub-TelegramClient/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── README.md
│
├── src/
│   ├── main.py              # Flask web server
│   ├── telegram_client.py   # Telethon wrapper
│   └── crypto_utils.py      # Encryption utilities
│
├── frontend/
│   └── index.html           # Setup wizard UI
│
├── sessions/                # Temp sessions (gitignored)
└── logs/                    # Application logs
```

### Running Tests

```bash
# Test encryption module
python src/crypto_utils.py

# Test Telegram client (manual - requires phone number)
python src/telegram_client.py
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```bash
# Server Configuration
SERVER_API_URL=https://api.tradinghub.com

# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=0

# Optional: Custom port
PORT=3737
```

### Telegram API Credentials

The Telegram API credentials are **hardcoded** in the application:

```python
API_ID = 21769095
API_HASH = "e3d4ceb7458bdf6699f73ce160baaae7"
```

These are **our** credentials, not the user's. Users don't need to create Telegram API apps.

## 📱 Building Executable (Optional)

### For Windows

```bash
# Install PyInstaller
pip install pyinstaller

# Build executable
pyinstaller --onefile --windowed --name TradingHub-Setup src/main.py

# Output: dist/TradingHub-Setup.exe
```

### For macOS

```bash
# Build .app bundle
pyinstaller --onefile --windowed --name TradingHub-Setup src/main.py

# Output: dist/TradingHub-Setup.app
```

### For Linux

```bash
# Build binary
pyinstaller --onefile --name tradinghub-setup src/main.py

# Output: dist/tradinghub-setup
```

## 🐛 Troubleshooting

### "Could not connect to server"

**Solution**: Check if TradingHub server is running and `SERVER_API_URL` is correct.

### "Invalid API key"

**Solution**: Make sure you copied the full API key from your dashboard.

### "OTP expired"

**Solution**: Request a new OTP and enter it quickly (within 5 minutes).

### "Session expired during setup"

**Solution**: Restart the setup process from Step 1.

### "Channel list is empty"

**Solution**: Make sure you're subscribed to Telegram channels/groups with your account.

## 🔄 Session Renewal

Sessions may need renewal periodically (recommended: 7 days, maximum: 60 days).

### Renewal Process

1. Admin marks your session as "needs renewal"
2. You receive email notification
3. Run this desktop app again
4. Follow the same setup process
5. New encrypted session replaces the old one

## 📊 What Happens After Setup

```
1. Server loads your encrypted session
2. Decrypts it in memory (using your API key)
3. Connects to Telegram (one client per user)
4. Monitors selected channels 24/7
5. Parses new messages for trading signals
6. Sends signals to your MT4/MT5 EA
7. EA executes trades automatically
```

## ❓ FAQ

### Q: Can I use this on multiple computers?
**A**: Yes, but you only need to run it once. After setup, it runs on the server.

### Q: What if I change my Telegram password?
**A**: Your session remains valid. Password changes don't affect existing sessions.

### Q: Can I add more channels later?
**A**: Yes, just run the setup again and select additional channels.

### Q: Is my data safe?
**A**: Yes! Your session is encrypted with military-grade AES-256-GCM and only YOU have the key.

### Q: Can TradingHub access my messages?
**A**: No! Only messages from selected channels are monitored, and only for signal parsing.

### Q: What if I lose my API key?
**A**: Contact support to reset it. You'll need to reconnect Telegram with the new key.

## 📞 Support

- 📧 Email: support@tradinghub.com
- 💬 Discord: discord.gg/tradinghub
- 📖 Docs: https://docs.tradinghub.com

## 📄 License

Proprietary - TradingHub © 2025

---

**Made with ❤️ by TradingHub Team**
