# 📁 Recommended Project Structure

## Directory Layout (PROTECTED FRONTEND)

```
tradinghub/
│
├── frontend/                          🔒 PROTECTED - READ ONLY
│   ├── TradingHub-Final-Fixed.html   # Complete UI (DO NOT MODIFY)
│   └── .frontendlock                  # Lock file with hash
│
├── backend/                           ✅ YOUR WORK AREA
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── redis.ts
│   │   │   ├── security.ts
│   │   │   └── env.ts
│   │   │
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Position.ts
│   │   │   ├── Signal.ts
│   │   │   ├── Setting.ts
│   │   │   └── AuditLog.ts
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── position.controller.ts
│   │   │   ├── signal.controller.ts
│   │   │   ├── analytics.controller.ts
│   │   │   ├── settings.controller.ts
│   │   │   └── admin.controller.ts
│   │   │
│   │   ├── services/
│   │   │   ├── auth/
│   │   │   │   ├── jwt.service.ts
│   │   │   │   ├── 2fa.service.ts
│   │   │   │   └── session.service.ts
│   │   │   │
│   │   │   ├── trading/
│   │   │   │   ├── signal-parser.service.ts
│   │   │   │   ├── symbol-mapper.service.ts
│   │   │   │   ├── tp-strategy.service.ts
│   │   │   │   ├── risk-manager.service.ts
│   │   │   │   └── executor.service.ts
│   │   │   │
│   │   │   ├── mt5/
│   │   │   │   ├── connection.service.ts
│   │   │   │   ├── order.service.ts
│   │   │   │   └── monitor.service.ts
│   │   │   │
│   │   │   ├── telegram/
│   │   │   │   ├── bot.service.ts
│   │   │   │   └── webhook.service.ts
│   │   │   │
│   │   │   └── security/
│   │   │       ├── encryption.service.ts
│   │   │       └── validator.service.ts
│   │   │
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── admin.middleware.ts
│   │   │   ├── validator.middleware.ts
│   │   │   ├── rate-limit.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── audit.middleware.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── position.routes.ts
│   │   │   ├── signal.routes.ts
│   │   │   ├── analytics.routes.ts
│   │   │   ├── settings.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── crypto.ts
│   │   │   ├── validator.ts
│   │   │   └── errors.ts
│   │   │
│   │   ├── websocket/
│   │   │   ├── server.ts
│   │   │   ├── handlers.ts
│   │   │   └── events.ts
│   │   │
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── security/
│   │
│   ├── scripts/
│   │   ├── backup.sh
│   │   ├── restore.sh
│   │   └── seed-admin.ts
│   │
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── docs/                              ✅ DOCUMENTATION
│   ├── BLUEPRINTS/
│   │   ├── MASTER_BLUEPRINT.md
│   │   ├── FRONTEND_ANALYSIS.md
│   │   ├── PHASE_0_FOUNDATION.md
│   │   ├── ALL_PHASES_SUMMARY.md
│   │   └── SUMMARY.md
│   │
│   ├── FRONTEND_PROTECTION_GUIDE.md
│   ├── CLAUDE_CODE_START_HERE.md
│   └── API_DOCUMENTATION.md
│
├── protection/                        🔒 PROTECTION SYSTEM
│   ├── .frontendlock
│   └── check-frontend-integrity.js
│
├── .gitignore                         # Git ignore file
├── README.md                          # Main readme
└── package.json                       # Root package.json (optional)
```

---

## 🔒 Access Rules

### Frontend Folder
- **Access:** Read-only
- **Purpose:** Reference for API requirements
- **Modification:** Never (except owner manually)
- **Usage:** Claude Code reads to understand data structures

### Backend Folder
- **Access:** Full access
- **Purpose:** Build the backend system
- **Modification:** Allowed
- **Usage:** Claude Code works here

### Docs Folder
- **Access:** Read-only
- **Purpose:** Blueprints and guides
- **Modification:** Update only when needed
- **Usage:** Claude Code references during development

### Protection Folder
- **Access:** Read-only (scripts executable)
- **Purpose:** Verify frontend integrity
- **Modification:** Never
- **Usage:** Run checks regularly

---

## 🚀 Setup Instructions

### 1. Create Structure

```bash
# Create main folders
mkdir -p tradinghub/{frontend,backend,docs,protection}

# Copy frontend
cp TradingHub-Final-Fixed.html tradinghub/frontend/

# Copy protection files
cp .frontendlock tradinghub/protection/
cp check-frontend-integrity.js tradinghub/protection/

# Copy documentation
cp -r BLUEPRINTS tradinghub/docs/
cp CLAUDE_CODE_START_HERE.md tradinghub/docs/
cp FRONTEND_PROTECTION_GUIDE.md tradinghub/docs/

# Initialize backend
cd tradinghub/backend
npm init -y
```

### 2. Make Protection Script Executable

```bash
chmod +x tradinghub/protection/check-frontend-integrity.js
```

### 3. Create Symbolic Link (Optional)

```bash
cd tradinghub
ln -s protection/check-frontend-integrity.js check-frontend.js
```

Now you can run: `./check-frontend.js` from project root

---

## 🔍 Verification Commands

### Check Frontend Integrity
```bash
cd tradinghub
node protection/check-frontend-integrity.js
```

Expected output:
```
🔍 Checking Frontend Integrity...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 Checking: frontend/TradingHub-Final-Fixed.html
   Expected: 34757816a0900f3d...
   Current:  34757816a0900f3d...
   ✅ Intact

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PASSED - All 1 files intact
   Frontend is protected and unchanged.
```

### Run Before Each Git Commit
```bash
# Add to pre-commit hook
node protection/check-frontend-integrity.js || exit 1
```

---

## 📝 .gitignore Configuration

Create `backend/.gitignore`:

```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.*.local

# Build
dist/
build/
*.tsbuildinfo

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Testing
coverage/
.nyc_output/

# Temporary files
tmp/
temp/

# CRITICAL: Never ignore frontend protection
!../protection/
!../protection/.frontendlock
!../protection/check-frontend-integrity.js
```

Create root `.gitignore`:

```gitignore
# Backend build files
backend/dist/
backend/node_modules/

# Environment files
*.env
!.env.example

# Logs
*.log

# OS files
.DS_Store

# IDE
.vscode/
.idea/

# NEVER ignore frontend protection
!frontend/
!protection/
```

---

## 🎯 Claude Code Instructions

Add to `CLAUDE_CODE_START_HERE.md`:

```markdown
## 📁 Project Structure

You will work in the `backend/` folder ONLY.

The `frontend/` folder contains the complete UI and is PROTECTED.

NEVER:
- Modify files in frontend/
- Create alternative frontends
- Suggest frontend changes

ALWAYS:
- Work in backend/ folder
- Read frontend for reference
- Run integrity check regularly

Command to verify:
```bash
node protection/check-frontend-integrity.js
```

If this fails, you modified the frontend (VIOLATION!).
```

---

## ✅ Setup Checklist

```
Before starting development:

[ ] Project structure created
[ ] Frontend file in frontend/ folder
[ ] Protection files in protection/ folder
[ ] Documentation in docs/ folder
[ ] Backend folder created (empty)
[ ] .gitignore configured
[ ] Frontend integrity check passes
[ ] Claude Code has clear instructions
[ ] Protection guide reviewed
```

---

## 🚨 Regular Checks

Run integrity check:
- After each phase
- Before each git commit
- Daily during development
- Before deployment

---

## 💡 Benefits

✅ **Separation of Concerns:** Frontend and backend clearly separated
✅ **Protection:** Frontend locked and verified
✅ **Organization:** Clear folder structure
✅ **Collaboration:** Easy for multiple developers
✅ **Documentation:** Everything in its place
✅ **Security:** Integrity checks prevent accidents
✅ **Clarity:** Claude Code knows where to work

---

**🔒 Protect the Frontend. Organize the Backend. Build with Confidence. 🔒**
