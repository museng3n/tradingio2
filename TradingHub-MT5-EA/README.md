# 📊 TradingHub MT5 Expert Advisor - Installation Guide

Complete guide for installing and configuring the TradingHub MT5 EA.

## 🎯 What This EA Does

1. **Connects to TradingHub**: Authenticates with your API key
2. **Receives Signals**: Polls server every 10 seconds for new signals
3. **Auto-Executes Trades**: Opens positions based on signals
4. **Risk Management**: Calculates lot size based on your risk %
5. **Trailing Stops**: Optional trailing stop for active positions
6. **Reports Back**: Sends execution status to server

## 📥 Installation Steps

### Step 1: Download the EA

1. Log in to your TradingHub dashboard
2. Go to **Downloads** → **MT5 Expert Advisor**
3. Download `TradingHub_MT5.ex5` file

### Step 2: Install in MT5

#### Windows:

```
1. Open MT5
2. Click: File → Open Data Folder
3. Navigate to: MQL5 → Experts
4. Copy TradingHub_MT5.ex5 here
5. Restart MT5 or click "Refresh" in Navigator
```

#### macOS:

```
1. Open MT5
2. Click: File → Open Data Folder
3. Navigate to: MQL5 → Experts
4. Copy TradingHub_MT5.ex5 here
5. Restart MT5
```

### Step 3: Enable WebRequest

**CRITICAL**: MT5 must allow WebRequest to TradingHub server

```
1. In MT5: Tools → Options
2. Go to "Expert Advisors" tab
3. Check "Allow WebRequest for listed URL:"
4. Add: https://api.tradinghub.com
5. Click OK
```

### Step 4: Attach EA to Chart

```
1. Open any chart (e.g., EURUSD M15)
2. In Navigator → Expert Advisors
3. Drag "TradingHub_MT5" to the chart
4. Settings window will open
```

### Step 5: Configure Settings

#### Required Settings:

| Setting | Value | Description |
|---------|-------|-------------|
| **ApiKey** | Your API key | Get from TradingHub dashboard |
| **RiskPercent** | 1.0 | Risk per trade (1% recommended) |

#### Optional Settings:

| Setting | Default | Description |
|---------|---------|-------------|
| MaxLotSize | 10.0 | Maximum lot size |
| MinLotSize | 0.01 | Minimum lot size |
| MaxTradesPerDay | 20 | Daily trade limit |
| MaxOpenTrades | 5 | Concurrent trades limit |
| SlippagePoints | 30 | Allowed slippage |
| EnableTrailingStop | true | Enable trailing stops |
| TrailingStopDistance | 50.0 | Trailing stop distance (pips) |
| TrailingStopStep | 10.0 | Trailing step (pips) |
| PollingIntervalSeconds | 10 | Check signals every N seconds |
| ShowInfoPanel | true | Show info panel on chart |

### Step 6: Enable Auto Trading

```
1. Click "AutoTrading" button in toolbar (should be GREEN)
2. Check "Allow live trading" in EA settings
3. Click OK
```

### Step 7: Verify Connection

Look at the "Experts" tab (Terminal window):

```
✓ Correct:
========================================
TradingHub MT5 EA Started
API Key: abc123...
Account: 12345678
Risk: 1.0%
Polling: Every 10 seconds
========================================
✓ Connected to TradingHub server
```

```
✗ Error:
WARNING: Could not connect to TradingHub server
```

If you see the error, check:
- Internet connection
- WebRequest is enabled for https://api.tradinghub.com
- API key is correct

## 🔧 Configuration Guide

### Risk Management Settings

#### Conservative (Recommended for Beginners)
```
RiskPercent = 0.5          // 0.5% per trade
MaxLotSize = 1.0           // Max 1 lot
MaxTradesPerDay = 10       // 10 trades/day
MaxOpenTrades = 3          // 3 concurrent
```

#### Moderate (Recommended for Most Users)
```
RiskPercent = 1.0          // 1% per trade
MaxLotSize = 5.0           // Max 5 lots
MaxTradesPerDay = 20       // 20 trades/day
MaxOpenTrades = 5          // 5 concurrent
```

#### Aggressive (For Experienced Traders)
```
RiskPercent = 2.0          // 2% per trade
MaxLotSize = 10.0          // Max 10 lots
MaxTradesPerDay = 50       // 50 trades/day
MaxOpenTrades = 10         // 10 concurrent
```

### Trailing Stop Settings

#### Tight Trailing (Scalping)
```
TrailingStopDistance = 20.0    // 20 pips
TrailingStopStep = 5.0         // 5 pips step
```

#### Standard Trailing
```
TrailingStopDistance = 50.0    // 50 pips
TrailingStopStep = 10.0        // 10 pips step
```

#### Wide Trailing (Swing Trading)
```
TrailingStopDistance = 100.0   // 100 pips
TrailingStopStep = 20.0        // 20 pips step
```

## 📊 Understanding the Info Panel

The info panel shows real-time status:

```
┌─────────────────────────┐
│ TradingHub MT5 EA       │
│ Status: Connected ✓     │
│ Signals: 45             │ ← Total signals received
│ Executed: 42            │ ← Successfully executed
│ Failed: 3               │ ← Failed to execute
│ Today: 8/20             │ ← Trades today / daily limit
│ Open: 3/5               │ ← Open positions / max
└─────────────────────────┘
```

## 🔍 Troubleshooting

### Problem: "API Key is required"

**Solution**: 
```
1. Get your API key from TradingHub dashboard
2. In EA settings, paste it in "ApiKey" field
3. Restart EA
```

### Problem: "Could not connect to server"

**Solution**:
```
1. Check internet connection
2. Verify WebRequest is enabled:
   Tools → Options → Expert Advisors
   Add: https://api.tradinghub.com
3. Restart MT5
```

### Problem: "WebRequest error"

**Solution**:
```
1. In MT5: Tools → Options → Expert Advisors
2. Check "Allow WebRequest for listed URL:"
3. Add: https://api.tradinghub.com
4. Click OK and restart EA
```

### Problem: "No signals received"

**Possible Causes**:
```
1. No active Telegram channels configured
   → Go to TradingHub dashboard and add channels

2. No new signals from channels
   → Wait for signal providers to post

3. Subscription expired
   → Renew your TradingHub subscription
```

### Problem: "Trade failed with code XXXX"

**Common Error Codes**:

| Code | Meaning | Solution |
|------|---------|----------|
| 10004 | Requote | Increase slippage |
| 10006 | Request rejected | Check broker settings |
| 10013 | Invalid request | Check symbol/lot size |
| 10014 | Invalid volume | Adjust lot size |
| 10015 | Invalid price | Market is closed or invalid |
| 10016 | Invalid stops | Check SL/TP levels |
| 10018 | Market closed | Wait for market open |
| 10019 | No money | Insufficient funds |
| 10025 | Not enough money | Reduce lot size or risk % |

### Problem: "Symbol not tradeable"

**Solution**:
```
1. Symbol not available on your broker
   → Contact broker to enable symbol
   
2. Market is closed
   → Wait for market hours

3. Wrong symbol format
   → Check symbol names in Market Watch
```

## 🎛️ Advanced Configuration

### Multiple Charts

You can attach the EA to **one chart only**. It will trade all signals regardless of symbol.

### Multiple Accounts

Each MT5 account needs:
1. Separate API key from TradingHub
2. EA attached on each account

### VPS Deployment

For 24/7 operation:

1. **Broker Free VPS** (Recommended):
   - Contact your broker for free VPS
   - Install MT5 on VPS
   - Attach EA
   - Password stays on VPS ✅

2. **Oracle Cloud Free Tier**:
   - Setup Ubuntu VM (free)
   - Install Wine + MT5
   - Run EA
   - Free forever ✅

3. **TradingHub Shared VPS** ($1/month):
   - We manage everything
   - 99.9% uptime
   - 24/7 monitoring
   - Easy setup

## 📈 Performance Monitoring

### In MT5

Check the "Experts" tab for logs:
```
2025.12.13 10:15:23 Received 1 new signal(s)
2025.12.13 10:15:25 Executing signal: XAUUSD BUY @ 2500.00
2025.12.13 10:15:26 Calculated lot size: 0.10
2025.12.13 10:15:27 ✓ Trade executed successfully! Ticket: 123456
```

### In TradingHub Dashboard

- View all signals received
- See execution statistics
- Track P&L by signal channel
- Performance analytics

## 🔐 Security Best Practices

1. **Never share your API key**
2. **Use different API keys** for different accounts
3. **Rotate API keys** periodically (every 90 days)
4. **Monitor logs** regularly for suspicious activity
5. **Enable 2FA** on TradingHub account
6. **Use VPS** for better security and uptime

## 📞 Support

### If EA is not working:

1. **Check Logs**: View "Experts" tab in MT5
2. **Verify Settings**: Ensure API key and WebRequest are correct
3. **Test Connection**: Look for "Connected to TradingHub server" message
4. **Contact Support**:
   - Email: support@tradinghub.com
   - Discord: discord.gg/tradinghub
   - Live Chat: dashboard.tradinghub.com

### Before Contacting Support:

Please provide:
- MT5 account number
- TradingHub API key (first 10 characters)
- Screenshot of EA settings
- Screenshot of "Experts" tab logs
- Description of the issue

## 🔄 Updates

The EA auto-updates through TradingHub:

1. Download latest version from dashboard
2. Replace old .ex5 file
3. Restart MT5
4. Settings are preserved

**Check for updates**: Monthly

## ⚠️ Important Notes

1. **One EA per Account**: Only attach EA to ONE chart
2. **Don't Modify Trades**: Let EA manage all trades automatically
3. **Don't Close MT5**: Keep running 24/7 (use VPS)
4. **Monitor Regularly**: Check performance daily
5. **Backup Settings**: Save your EA settings

## 📄 Changelog

### Version 1.00 (2025-12-13)
- Initial release
- Signal execution
- Risk management
- Trailing stops
- Info panel
- Error reporting

---

**Made with ❤️ by TradingHub Team**

For video tutorials, visit: https://tradinghub.com/tutorials
