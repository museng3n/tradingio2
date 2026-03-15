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
- Profit & Loss slice completed and published.
- TP Achievement Statistics slice completed and published.

## Current Published Baseline
- Local `HEAD`: `e8512e659080b8f67003f7f4ebd0487f18c26bea`
- Current `origin/main`: `e8512e659080b8f67003f7f4ebd0487f18c26bea`
- Published commits now on `origin/main`:
  - `353ff3cf5a714f0b4c54d0161b99c2c309d3eac7` `Implement TP achievement statistics contract`
  - `e8512e659080b8f67003f7f4ebd0487f18c26bea` `Bind TP achievement statistics surface`
  - `51602be360e101402fb432f3c6de995cbf24e0bb` `Bind Profit & Loss frontend to published summary contract`
  - `6e9850a850855c124cad80129dbd4a70488c7efb` `Correct Sharpe orchestration contract wording`
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
  - otherwise show gray/de-emphasized state with the static inline hint `Insufficient data`
- TP Achievement Statistics accepted semantics:
  - time-based analytics surface
  - supported TP levels are `1..6` only
  - hit-rate denominator is the number of closed positions that actually had that TP level configured
  - unsupported or unverified normalization must not fabricate pips
  - partial normalization coverage is exposed truthfully
  - persistent normalization override entry/storage was not implemented in the published milestone

## Current High-Priority Direction
1. Determine the next post-TP product milestone from live repo evidence only.
2. Preserve the published TP Achievement Statistics semantics, deferred normalization override fact, and approved Sharpe inline-hint behavior.
