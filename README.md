# Momentum Scout

Real-time momentum scanner for US stocks (S&P 500) and crypto (Coinbase). Surfaces the top 1-2 day trade setups using institutional momentum principles — EMA stack, RS Rating, volume surges, RSI zone, anchored VWAP — with entry/target/stop levels and on-demand Claude AI analysis.

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in your API keys:
   ```
   POLYGON_API_KEY=   # from polygon.io (free = 15-min delay, $29/mo = real-time)
   ANTHROPIC_API_KEY= # from console.anthropic.com (for Deep Analysis button)
   ```

2. Install and run:
   ```bash
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000)

## Features

- **Momentum Scanner** — scores S&P 500 stocks and top 10 crypto pairs on 6 signals: RS Rating, EMA stack (9/21/50), volume surge, RSI zone (55-80), 9/21 EMA cross, anchored VWAP
- **TradingView Charts** — candlestick + toggleable EMA/VWAP overlays, RSI panel, volume panel
- **Trade Setup** — colour-coded entry zone, price target, stop-loss, risk/reward ratio per pick
- **AI Analysis** — rule-based commentary by default; "Deep Analysis — Ask Claude" calls Claude claude-sonnet-4-6 for specific entry/exit reasoning
- **Auto-refresh** — re-scans every 5 minutes; market open/closed indicator

## Tech Stack

Next.js 16 · TypeScript · TailwindCSS · TradingView Lightweight Charts · TanStack Query · Anthropic SDK · Polygon.io · Coinbase API
