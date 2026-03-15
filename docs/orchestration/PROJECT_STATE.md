# Project State

## Identity
- TradingHub is a multi-service trading platform.
- Backend service lives in `backend/`.
- Structured target frontend lives in `frontend-app/`.
- Immutable canonical UI reference lives in `frontend/TradingHub-Standalone (1).html`.
- Python Telegram setup client lives in `TradingHub-TelegramClient/`.
- MT5 EA lives in `TradingHub-MT5-EA/`.

## Protected Files and Areas
- Protected file: `frontend/TradingHub-Standalone (1).html`
- Protected area: `frontend/proposals/`
- Unrelated accepted product surfaces must not be touched casually.

## Accepted Completed Phases
- Frontend parity completed for shell, login modal, dashboard, positions, analytics, history, and settings.
- First backend integration slice completed and published.
- Open positions read-only integration slice completed and published.
- Settings slices completed and published: TP Strategy, Risk Management, Position Security, Blocked Symbols, Telegram Channels.
- Telegram runtime slices completed and published.
- Trading Statistics slice completed and published.
- Drawdown persistence slice completed and published.
- Best & Worst slice completed and published.

## Current Accepted Local Checkpoint
- Local `HEAD`: `c7ab246049708ebfe5d8a3d7c2d08cb91e976352`
- Subject: `Complete Profit & Loss summary contract`
- Current `origin/main`: `805efd84ad6d27bd37529a9f55c9daa8dc7072fa`
- Local branch is ahead of `origin/main` by one accepted checkpoint.
- Accepted unrelated local extras:
  - `IMPORTANT STARTUP RULE FOR THIS CHA.txt`
  - `frontend/proposals/`

## Accepted Metric Semantics
- `NET PROFIT` = realized net P&L from closed positions only, dollar-denominated.
- `TOTAL PROFIT` = sum of winning closed positions only in dollars.
- `TOTAL LOSS` = sum of losing closed positions only in dollars and displayed as a signed negative amount.
- `SHARPE RATIO` must not be invented.
- Later frontend Sharpe rule:
  - compute only when at least 60 daily return observations are available
  - otherwise show gray/de-emphasized state with a very short tooltip indicating insufficient data

## Current High-Priority Direction
1. Publish the accepted Profit & Loss backend checkpoint.
2. Then bind the Profit & Loss frontend card truthfully.
3. Then apply the approved Sharpe gray/de-emphasized plus short-tooltip behavior when the 60-observation rule is not met.
