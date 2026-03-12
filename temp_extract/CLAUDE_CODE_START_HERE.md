# 🚀 START HERE - Instructions for Claude Code

## Welcome, Claude Code!

You are about to build **TradingHub** - a secure, automated trading system.

**CRITICAL:** This system handles REAL MONEY and trading accounts. Security is NOT optional.

---

## 📋 Your Mission

Build TradingHub in 5 phases, following the blueprints in order:

1. **PHASE_0_FOUNDATION.md** - Secure backend setup
2. **PHASE_1_SIGNALS.md** - Signal processing engine  
3. **PHASE_2_EXECUTION.md** - Trade execution with risk management
4. **PHASE_3_SECURITY.md** - Position monitoring & automation
5. **PHASE_4_ANALYTICS.md** - Analytics & reporting

Then: **FRONTEND_INTEGRATION.md** - Connect the HTML frontend

---

## 🔒 Security Rules (NON-NEGOTIABLE)

Before writing ANY code, memorize these:

1. ✅ **NEVER log sensitive data** (passwords, keys, tokens)
2. ✅ **ALWAYS validate input** (joi/express-validator)
3. ✅ **ALWAYS encrypt** (bcrypt for passwords, AES-256 for data)
4. ✅ **ALWAYS audit** (log all critical actions)
5. ✅ **ALWAYS rate-limit** (protect against abuse)
6. ✅ **NEVER trust user input** (sanitize everything)

---

## 🎯 How to Proceed

### Step 1: Read MASTER_BLUEPRINT.md
Understand the full system architecture

### Step 2: Complete Phase 0
Follow PHASE_0_FOUNDATION.md exactly

### Step 3: Test Phase 0
Run tests, ensure everything works

### Step 4: Move to Phase 1
Repeat for each phase

### Step 5: Frontend Integration
Connect the existing HTML interface

---

## ⚡ Tech Stack

- **Backend:** Node.js 20 + TypeScript + Express
- **Database:** MongoDB (encrypted) + Redis (sessions)
- **Auth:** JWT + 2FA + bcrypt
- **Security:** Helmet, rate-limit, joi, express-validator
- **Trading:** node-mt5 (MT4/MT5 integration)
- **Telegram:** node-telegram-bot-api
- **Monitoring:** Winston + Sentry

---

## 📁 Frontend Files Available

The following HTML files contain the complete frontend:
- `TradingHub-SymbolMapper.html` - Full UI with all features

Study these files to understand:
- API endpoints needed
- Data structures expected
- WebSocket events required
- User flows and interactions

---

## ✅ Definition of Done (Each Phase)

A phase is complete when:
- [ ] All code written and documented
- [ ] All tests passing (unit + integration)
- [ ] Security checklist verified
- [ ] No sensitive data in logs
- [ ] Error handling implemented
- [ ] Audit logging working
- [ ] README updated

---

## 🚨 When in Doubt

1. **Security first** - If unsure, choose the more secure option
2. **Validate everything** - Never trust input
3. **Log everything** - Except sensitive data
4. **Test everything** - Especially security features
5. **Document everything** - Future you will thank you

---

## 📞 Emergency Stop Conditions

STOP and ask for clarification if:
- You need to store passwords in plain text
- You need to disable security features
- You're about to log sensitive data
- You're unsure about encryption
- Risk management seems wrong

---

**Now, open MASTER_BLUEPRINT.md and begin!**

🔒 Build it secure. Build it right. 🔒
