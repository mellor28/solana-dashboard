# Agent Skill: Build a Solana Network Dashboard

> **Purpose:** This document teaches an AI agent how to build a production-ready Solana dashboard from scratch — including design, data integration, component architecture, and deployment. It is self-contained and requires no prior knowledge of the existing codebase.

---

## Overview

A Solana dashboard is a React + Tailwind CSS single-page application that displays live blockchain metrics, DeFi ecosystem data, and optionally personal portfolio tracking. All data sources are **free, require no API key, and are CORS-open** (accessible directly from the browser with no proxy needed).

The reference implementation lives at **https://solanamellor.manus.space** and its source code at **https://github.com/mellor28/solana-dashboard**.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Styling | Tailwind CSS 4 + custom CSS variables |
| Charts | Recharts (AreaChart, BarChart, ResponsiveContainer) |
| Icons | Lucide React |
| Routing | Wouter |
| Build | Vite |
| Font | Space Mono (numbers/mono), DM Sans (UI text) |

---

## Design Philosophy

The dashboard uses a **Glassmorphic Space Dashboard** aesthetic:

- **Background:** Deep space dark (`#0a0a0f` base, `#0d0d18` cards)
- **Primary accent:** Solana purple `#9945FF`
- **Secondary accent:** Solana green `#14F195`
- **Warning:** Amber `#FFA500`
- **Danger:** Red `#ef4444`
- **Glass cards:** `backdrop-filter: blur(12px)`, `background: rgba(255,255,255,0.03)`, `border: 1px solid rgba(255,255,255,0.08)`
- **Numbers:** Always Space Mono font, bold weight
- **UI text:** DM Sans, regular weight
- **Positive changes:** Green with `▲` prefix
- **Negative changes:** Red with `▼` prefix

---

## Dashboard Sections (Build in This Order)

### 1. Navbar

A fixed top navigation bar with anchor links to each section. Keep it minimal — logo on the left, nav links on the right. On mobile, collapse to a hamburger menu.

Nav items (with anchor IDs): `#portfolio`, `#market`, `#network`, `#tvl`, `#defi`, `#stables`, `#bridges`, `#chains`, `#staking`

### 2. Hero Section

The most prominent section. Displays SOL and JUP prices side by side in large Space Mono font (56px), with official coin logos from CoinGecko CDN.

**SOL logo:** `https://coin-images.coingecko.com/coins/images/4128/large/solana.png`  
**JUP logo:** `https://coin-images.coingecko.com/coins/images/34188/large/jup.png`

Below each price, show a 24h change badge (green/red). Below the prices, show a stat row: Market Cap · 24h Volume · 7d Change · ATH Distance.

Price source: **Binance WebSocket** `wss://stream.binance.com:9443/stream?streams=solusdt@ticker/jupusdt@ticker` for real-time updates.

### 3. Epoch Banner

A full-width strip immediately below the hero. Shows:
- Current epoch number
- Countdown timer (days, hours, minutes, seconds — ticking every second)
- Progress bar (purple → green gradient)
- Slot count (e.g., `51,852 / 432,000 slots`)
- Warning state (amber) when < 6 hours remain

**Data source:** `https://solana-rpc.publicnode.com` — POST `getEpochInfo`  
**Refresh:** Every 5 minutes (countdown ticks locally between fetches)

### 4. Portfolio Net Worth Card

A combined card showing the user's total staked value in USD. Requires the user to input their staked SOL amount and JUP amount (stored in localStorage). Calculates:

- Staked SOL value = `stakedSOL × solPrice`
- JUP value = `jupBalance × jupPrice`
- Total = sum of both
- Shows a breakdown bar (purple for SOL, green for JUP)

This section is **personal** — omit it for a public-facing network info site.

### 5. SOL Price Chart

A 30-day area chart of SOL's historical price. Use Recharts `AreaChart` with a gradient fill. Show the current price, 30d change percentage, and a mini stats row (30d low, high, range).

**Data source:** `https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=30&interval=daily`

### 6. Market Overview Table

A table of the top 7 cryptocurrencies with columns: Rank · Asset (logo + name + ticker) · Price · 24h · 7d · 30d · Market Cap.

Coins: BTC, ETH, SOL, AVAX, SUI, JUP, GMT

**Price/change data:** Binance klines API for 24h/7d/30d changes  
**Market cap/rank:** CoinGecko `/coins/markets` endpoint  
**Logos:** `https://assets.coingecko.com/coins/images/{id}/small/{name}.png`

Mark SOL with a "FOCUS" badge to highlight it as the primary asset.

### 7. Network Health Panel

The most data-rich section. Contains:

**Live stats row (refreshes every 30s):**
- Total TPS (formatted as `3.1K`)
- Non-vote TPS
- Current slot number
- Block number
- Active validators count
- Delinquent validators count
- Current epoch + slot progress

**TPS History Chart (12 hours):**
- Dual area chart: total TPS (green) + non-vote TPS (purple)
- 720 data points at 60-second intervals
- Shows AVG and PEAK in the header
- Dashed average reference line
- New readings appended every 30 seconds

**Service Uptime Bars (90 days):**
- 3 rows: Mainnet Beta Cluster · RPC Nodes · Explorer
- 90 thin coloured segments per row (green = operational, amber = minor, orange = major, red = critical, purple = maintenance)
- Hover tooltip shows incident name and date
- "All Systems Operational" badge when no active incidents

**Data sources:**
- TPS + slots + validators: `https://solana-rpc.publicnode.com` (POST `getRecentPerformanceSamples`, `getSlot`, `getVoteAccounts`, `getEpochInfo`)
- Uptime/incidents: `https://status.solana.com/api/v2/incidents.json` and `/components.json`

### 8. TVL Adoption Chart

A card showing Solana's Total Value Locked with a 90-day area chart. Shows current TVL, 24h change badge, and the chart.

**Data source:** `https://api.llama.fi/v2/historicalChainTvl/Solana`

### 9. DeFi Ecosystem Panel

Two sub-sections:

**DEX Volume Leaderboard:**
- Top 8 DEXes on Solana by 24h volume (PumpSwap, Orca, Raydium, Meteora, etc.)
- Each row: logo · name · 24h volume bar · 24h volume USD
- Summary totals: total 24h volume + total 24h fees

**Top Protocols by TVL:**
- Top 10 native Solana protocols ranked by TVL
- Each row: protocol name · category badge · TVL · 24h change
- Filter to Solana-native only (exclude bridged protocols)

**Data source:** `https://api.llama.fi/overview/dexs/solana` and `https://api.llama.fi/protocols`

### 10. Stablecoin Supply Tracker

Shows total stablecoins on Solana (~$15.6B) with:
- Total supply in large font with 24h change badge
- Breakdown bar (each stablecoin gets a colour slice)
- Individual cards for top 8 stablecoins: name · supply · % of total · 24h change
- 30-day area chart with 30d low/high/range annotations

**Data source:** `https://api.llama.fi/stablecoins?includePrices=true` + `https://api.llama.fi/stablecoincharts/Solana`

Key stablecoins on Solana: USDC, USDT, USDG, USD1, PYUSD, BUIDL, USX, YLDS

### 11. Bridge Flow Monitor

Shows capital flowing into and out of Solana via bridges:
- Net flow indicator (today's inflows minus outflows)
- Total inflow and outflow for today
- 7-day net balance
- Grouped bar chart: daily inflows (green) vs outflows (red) for 7 days
- Bridge leaderboard: top 6 bridges by 24h volume (LayerZero, Relay, Wormhole, Chainlink CCIP, Mayan, rhino.fi)

**Data source:** `https://api.llama.fi/bridges` and `https://api.llama.fi/bridgedaystats/{timestamp}/Solana`

**Note:** DeFiLlama bridges API can rate-limit (429). Implement exponential backoff: wait 5s → 10s → 30s before retrying.

### 12. Chain TVL Comparison

Horizontal bar chart comparing TVL across major chains:
- Ethereum, Solana, BSC, Base, Arbitrum, Tron, Avalanche, Polygon
- Each bar shows TVL amount + 24h change badge
- Solana highlighted with a "FOCUS" indicator
- Solana rank badge (e.g., "#2 by TVL")
- 30-day Solana TVL mini trend chart

**Data source:** `https://api.llama.fi/chains`

### 13. Network Staking Overview

Network-wide staking metrics (not personal):
- Total SOL staked (e.g., 422M SOL)
- Staking ratio as % of circulating supply (e.g., 74.1%)
- Marinade APY (e.g., 7.17%)
- Active validator count
- Jito MEV epoch total
- Staking ratio progress bar

**Data sources:**
- Supply + staking: `https://solana-rpc.publicnode.com` POST `getSupply`
- Validators: POST `getVoteAccounts`
- Marinade APY: `https://api.marinade.finance/kraken` → `apy` field
- Jito MEV: `https://kobe.mainnet.jito.network/api/v1/mev_stats`

### 14. Analytics Footer

A slim footer at the bottom showing:
- Page views (tracked via Manus analytics endpoint)
- Session time (live counter, updates every second)
- Engagement status (Active/Idle based on mouse movement)
- Manus tracking indicator
- Copyright and data attribution

---

## Complete API Reference

All APIs below are **free, no API key required, CORS wildcard (`*`)**.

### Solana RPC — publicnode.com

**Base URL:** `https://solana-rpc.publicnode.com`  
**Method:** POST with JSON-RPC body  
**CORS:** `*`

```javascript
// Helper function for all RPC calls
const rpc = async (method, params = []) => {
  const res = await fetch('https://solana-rpc.publicnode.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  return (await res.json()).result;
};

// Get epoch info
const epoch = await rpc('getEpochInfo');
// { epoch: 941, slotIndex: 51852, slotsInEpoch: 432000, absoluteSlot: 406600000 }

// Get current slot
const slot = await rpc('getSlot');
// 406600000

// Get validators
const validators = await rpc('getVoteAccounts');
// { current: [...], delinquent: [...] }

// Get supply + staking
const supply = await rpc('getSupply');
// { value: { total: 598000000000000000, circulating: 476000000000000000, nonCirculating: 122000000000000000 } }
// Note: values are in lamports (1 SOL = 1,000,000,000 lamports)

// Get TPS history (720 samples = 12 hours)
const samples = await rpc('getRecentPerformanceSamples', [720]);
// [{ slot, numTransactions, numNonVoteTransactions, numSlots, samplePeriodSecs }, ...]
// TPS = numTransactions / samplePeriodSecs
// Non-vote TPS = numNonVoteTransactions / samplePeriodSecs
```

### CoinGecko API

**Base URL:** `https://api.coingecko.com/api/v3`  
**Rate limit:** ~10-50 calls/minute free tier  
**CORS:** `*`

```javascript
// Current prices
const prices = await fetch(
  'https://api.coingecko.com/api/v3/simple/price?ids=solana,jupiter-ag&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true'
).then(r => r.json());
// { solana: { usd: 142.50, usd_24h_change: 5.23, usd_market_cap: 67000000000 } }

// Market data for multiple coins
const markets = await fetch(
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,avalanche-2,sui,jupiter-ag,stepn&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h,7d,30d'
).then(r => r.json());

// 30-day price history
const history = await fetch(
  'https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=30&interval=daily'
).then(r => r.json());
// { prices: [[timestamp_ms, price], ...] }

// Full coin data (ATH, market cap rank, etc.)
const solData = await fetch(
  'https://api.coingecko.com/api/v3/coins/solana?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false'
).then(r => r.json());
// solData.market_data.ath.usd, .market_cap_rank, .price_change_percentage_30d_in_currency.usd
```

### Binance API (Real-time prices)

**Base URL:** `https://api.binance.com/api/v3`  
**WebSocket:** `wss://stream.binance.com:9443/stream`  
**CORS:** `*`

```javascript
// Real-time price via WebSocket (preferred for live price display)
const ws = new WebSocket(
  'wss://stream.binance.com:9443/stream?streams=solusdt@ticker/jupusdt@ticker'
);
ws.onmessage = (event) => {
  const { stream, data } = JSON.parse(event.data);
  const price = parseFloat(data.c);  // current price
  const change24h = parseFloat(data.P);  // 24h change %
};

// Historical klines for 7d/30d change calculation
const klines = await fetch(
  'https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1d&limit=31'
).then(r => r.json());
// [[openTime, open, high, low, close, volume, ...], ...]
// 30d change = ((klines[30][4] - klines[0][4]) / klines[0][4]) * 100
```

### DeFiLlama API

**Base URL:** `https://api.llama.fi`  
**CORS:** `*`  
**Rate limit:** Generous, but implement 2-3s delays between calls

```javascript
// Chain TVL list (all chains)
const chains = await fetch('https://api.llama.fi/chains').then(r => r.json());
const solana = chains.find(c => c.name === 'Solana');
// { name: 'Solana', tvl: 6880000000, change_1d: 2.64 }

// Solana TVL history (90 days)
const tvlHistory = await fetch('https://api.llama.fi/v2/historicalChainTvl/Solana').then(r => r.json());
// [{ date: 1700000000, tvl: 6500000000 }, ...]

// DEX volume overview for Solana
const dexData = await fetch('https://api.llama.fi/overview/dexs/solana?excludeTotalDataChart=false&excludeTotalDataChartBreakdown=false&dataType=dailyVolume').then(r => r.json());
// { totalVolume24h: 2540000000, totalFees24h: 9000000, protocols: [...] }

// All protocols (filter by chain)
const protocols = await fetch('https://api.llama.fi/protocols').then(r => r.json());
const solanaProtocols = protocols.filter(p => 
  p.chains?.includes('Solana') && p.tvl > 1000000
).sort((a, b) => b.tvl - a.tvl);

// Stablecoins on Solana
const stables = await fetch('https://api.llama.fi/stablecoins?includePrices=true').then(r => r.json());
const solanaStables = stables.peggedAssets
  .filter(s => s.chainBalances?.Solana?.tokens?.length > 0)
  .map(s => ({
    name: s.name,
    symbol: s.symbol,
    supply: s.chainBalances.Solana.tokens.reduce((sum, t) => sum + (t.circulating?.peggedUSD || 0), 0),
    change24h: s.change_24h
  }))
  .sort((a, b) => b.supply - a.supply);

// Stablecoin supply history for Solana
const stableHistory = await fetch('https://api.llama.fi/stablecoincharts/Solana').then(r => r.json());
// [{ date: 1700000000, totalCirculatingUSD: { peggedUSD: 15600000000 } }, ...]

// Bridge volume
const bridges = await fetch('https://api.llama.fi/bridges').then(r => r.json());
// bridges.bridges = [{ id, displayName, volumePrevDay, volumePrev2Day, ... }]
```

### Marinade Finance API

**Base URL:** `https://api.marinade.finance`  
**CORS:** `*`

```javascript
// Staking APY and mSOL/SOL exchange rate
const marinade = await fetch('https://api.marinade.finance/kraken').then(r => r.json());
// { apy: 0.0717, msolPrice: 1.0842 }
// apy is a decimal (0.0717 = 7.17%)
// msolPrice is the mSOL/SOL exchange rate
```

### Jito API

**Base URL:** `https://kobe.mainnet.jito.network`  
**CORS:** `*`

```javascript
// MEV statistics
const jito = await fetch('https://kobe.mainnet.jito.network/api/v1/mev_stats').then(r => r.json());
// { epochMev: 1234.56, blockMev: 0.0023, ... }
// epochMev is in SOL
```

### Solana Status Page (Atlassian Statuspage)

**Base URL:** `https://status.solana.com/api/v2`  
**CORS:** `*`

```javascript
// Current component status
const components = await fetch('https://status.solana.com/api/v2/components.json').then(r => r.json());
// components.components = [{ id, name, status: 'operational'|'degraded_performance'|'partial_outage'|'major_outage', ... }]

// Incident history (for 90-day uptime bars)
const incidents = await fetch('https://status.solana.com/api/v2/incidents.json').then(r => r.json());
// incidents.incidents = [{ id, name, status, impact: 'none'|'minor'|'major'|'critical', created_at, resolved_at, ... }]

// Build 90-day uptime bars:
// 1. Create array of 90 dates (today - 89 days to today)
// 2. For each date, check if any incident overlapped that day
// 3. Color: operational=green, minor=amber, major=orange, critical=red, maintenance=purple
```

### Wormhole Scan API

**Base URL:** `https://api.wormholescan.io`  
**CORS:** `*`

```javascript
// Cross-chain flows (7-day)
const flows = await fetch(
  'https://api.wormholescan.io/api/v1/stats/chains/activity?timespan=7d'
).then(r => r.json());

// Chain ID mapping (important for display names):
const CHAIN_NAMES = {
  1: 'Solana', 2: 'Ethereum', 4: 'BSC', 5: 'Polygon',
  6: 'Avalanche', 10: 'Fantom', 13: 'Klaytn', 14: 'Celo',
  16: 'Moonbeam', 23: 'Arbitrum', 24: 'Optimism', 30: 'Base',
  32: 'Aptos', 34: 'Near', 35: 'Injective', 36: 'Osmosis',
  40: 'Mantle', 42: 'Sui', 43: 'Algorand', 44: 'Osmosis',
  47: 'Berachain', 51: 'Unichain'
};
```

### Fear & Greed Index

**Base URL:** `https://api.alternative.me`  
**CORS:** `*`

```javascript
// Current fear & greed index
const fearGreed = await fetch('https://api.alternative.me/fng/?limit=1').then(r => r.json());
// { data: [{ value: '15', value_classification: 'Extreme Fear', timestamp: '1710000000' }] }
// value: 0-100 (0=Extreme Fear, 100=Extreme Greed)
// Render as a semicircular gauge SVG
```

---

## React Component Architecture

### Custom Hooks Pattern

Each data source should have its own custom hook:

```typescript
// hooks/useSolanaNetwork.ts
import { useState, useEffect, useCallback } from 'react';

interface NetworkData {
  tps: number;
  nonVoteTps: number;
  slot: number;
  validators: number;
  delinquentValidators: number;
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
}

export function useSolanaNetwork() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetch = useCallback(async () => {
    try {
      // ... fetch logic
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError('Failed to load network data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 30_000); // 30s refresh
    return () => clearInterval(interval);
  }, [fetch]);

  return { data, loading, error, lastUpdated, refresh: fetch };
}
```

### Glass Card Component Pattern

```tsx
// All dashboard cards use this base style
const GlassCard = ({ children, className = '' }) => (
  <div
    className={className}
    style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 16,
      backdropFilter: 'blur(12px)',
      padding: '20px 24px',
    }}
  >
    {children}
  </div>
);
```

### Section Header Pattern

```tsx
// Consistent section headers across all panels
const SectionHeader = ({ icon: Icon, title, subtitle, badge }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon size={18} color="#9945FF" />
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontFamily: "'DM Sans', sans-serif" }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: "'Space Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {badge}
  </div>
);
```

### Change Badge Pattern

```tsx
// Reusable component for showing price/metric changes
const ChangeBadge = ({ value, suffix = '%' }) => {
  const isPositive = value >= 0;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      padding: '3px 8px',
      borderRadius: 6,
      fontSize: 12,
      fontFamily: "'Space Mono', monospace",
      fontWeight: 600,
      background: isPositive ? 'rgba(20, 241, 149, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      color: isPositive ? '#14F195' : '#ef4444',
      border: `1px solid ${isPositive ? 'rgba(20, 241, 149, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
    }}>
      {isPositive ? '▲' : '▼'} {Math.abs(value).toFixed(2)}{suffix}
    </span>
  );
};
```

### TPS History Chart (Recharts)

```tsx
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const TPSChart = ({ data, avgTps }) => (
  <ResponsiveContainer width="100%" height={160}>
    <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#14F195" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#14F195" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="nonVoteGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#9945FF" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#9945FF" stopOpacity={0} />
        </linearGradient>
      </defs>
      <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)', fontFamily: "'Space Mono'" }} />
      <YAxis tickFormatter={v => `${(v/1000).toFixed(1)}K`} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} />
      <Tooltip
        contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
        formatter={(v) => [`${v.toFixed(0)} TPS`]}
      />
      <ReferenceLine y={avgTps} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
      <Area type="monotone" dataKey="totalTps" stroke="#14F195" strokeWidth={1.5} fill="url(#totalGrad)" />
      <Area type="monotone" dataKey="nonVoteTps" stroke="#9945FF" strokeWidth={1.5} fill="url(#nonVoteGrad)" />
    </AreaChart>
  </ResponsiveContainer>
);
```

---

## Number Formatting Utilities

```typescript
// Format large numbers with B/M/K suffixes
export const formatValue = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
};

// Format TPS
export const formatTPS = (tps: number): string => {
  if (tps >= 1000) return `${(tps / 1000).toFixed(1)}K`;
  return tps.toFixed(0);
};

// Format SOL amounts (lamports to SOL)
export const lamportsToSOL = (lamports: number): number => lamports / 1_000_000_000;

// Format slot numbers
export const formatSlot = (slot: number): string => {
  if (slot >= 1_000_000) return `${(slot / 1_000_000).toFixed(1)}M`;
  return slot.toLocaleString();
};

// Relative time
export const timeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};
```

---

## Error Handling & Rate Limits

### Exponential Backoff

```typescript
const fetchWithRetry = async (url: string, options = {}, maxRetries = 3): Promise<Response> => {
  let delay = 5000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
  throw new Error('Max retries exceeded');
};
```

### localStorage Cache

```typescript
const cache = {
  set: (key: string, value: unknown, ttlSeconds = 600) => {
    localStorage.setItem(key, JSON.stringify({
      value,
      expires: Date.now() + ttlSeconds * 1000
    }));
  },
  get: <T>(key: string): T | null => {
    const item = localStorage.getItem(key);
    if (!item) return null;
    const { value, expires } = JSON.parse(item);
    if (Date.now() > expires) { localStorage.removeItem(key); return null; }
    return value as T;
  }
};

// Usage: cache expensive DeFiLlama calls for 10 minutes
const tvlData = cache.get<TVLData>('solana-tvl') ?? await fetchTVL();
cache.set('solana-tvl', tvlData, 600);
```

---

## Refresh Interval Reference

| Data | Interval | Notes |
|---|---|---|
| SOL/JUP price | Real-time (WebSocket) | Binance stream |
| TPS, slots, validators | 30 seconds | publicnode RPC |
| Epoch info | 5 minutes | Ticks locally between fetches |
| TVL, DEX volume | 5 minutes | DeFiLlama |
| Stablecoin supply | 10 minutes | DeFiLlama |
| Bridge flows | 15 minutes | DeFiLlama (rate-limit sensitive) |
| Staking APY | 10 minutes | Marinade API |
| Uptime/incidents | 5 minutes | Statuspage API |
| Fear & Greed | 1 hour | Changes daily |

---

## Security Checklist (Before Making Repo Public)

- [ ] No API keys hardcoded in source files (use `import.meta.env.VITE_*` for any keys)
- [ ] No wallet private keys or mnemonics anywhere in the codebase
- [ ] `.env` files are in `.gitignore`
- [ ] Wallet addresses (if any) are acceptable to be public (they're on-chain anyway)
- [ ] Manus-injected secrets (`VITE_ANALYTICS_ENDPOINT`, etc.) are not in the repo — they're runtime-only

**Audit command:**
```bash
grep -rn --include="*.ts" --include="*.tsx" -E "(api[_-]?key|apikey|secret|token|private[_-]?key)" client/src/ | grep -v "VITE_" | grep -v "// "
```

---

## Deployment

### Manus (Recommended)

1. Create a Manus webdev project
2. Build the dashboard
3. Run `webdev_save_checkpoint`
4. Click **Publish** in the Manus Management UI
5. Configure custom domain in Settings → Domains

### GitHub Pages

1. Add `.github/workflows/deploy.yml` with the GitHub Pages action
2. Set `base: process.env.GITHUB_PAGES === 'true' ? '/repo-name/' : '/'` in `vite.config.ts`
3. In the workflow, set `GITHUB_PAGES: 'true'` as an env var during build
4. Go to GitHub repo Settings → Pages → Source: GitHub Actions
5. Push to `main` — deploys automatically

### Vercel

1. Connect GitHub repo to Vercel
2. Set build command: `pnpm run build`
3. Set output directory: `dist/public`
4. Add all `VITE_*` environment variables in Vercel Settings → Environment Variables
5. Deploy

---

## Personal vs Public Dashboard

When building a **personal dashboard** (for a specific user), include:
- Portfolio Net Worth card (staked SOL + JUP value)
- Personal staking tracker (Marinade mSOL balance, rewards)
- JUP price in hero
- Personal epoch countdown (tied to staking rewards)

When building a **public network info site**, remove all personal sections and keep only:
- SOL price hero (no JUP)
- Epoch banner
- All network-wide metrics (TPS, TVL, DEX volume, stablecoins, bridges, staking overview)
- Market overview table

---

## Reference Implementation

- **Live personal dashboard:** https://solanamellor.manus.space
- **GitHub source:** https://github.com/mellor28/solana-dashboard
- **Tech stack:** React 19, Tailwind CSS 4, Recharts, Vite, TypeScript
- **All APIs used:** publicnode RPC, CoinGecko, Binance, DeFiLlama, Marinade, Jito, Wormhole, Statuspage, Alternative.me
