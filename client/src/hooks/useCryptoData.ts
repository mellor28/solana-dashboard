/**
 * useCryptoData hook
 *
 * PRIMARY source: Binance REST API (no rate limits, CORS wildcard, instant)
 *   - Live prices, 24h change, 24h volume for all 7 coins
 *   - 30-day daily klines for SOL price history chart
 *   - 7d and 30d price change calculations from klines
 *
 * SUPPLEMENTARY source: CoinGecko (rate-limited, used for market cap, ATH, supply, rank)
 *   - Fetched with retry + longer timeout tolerance
 *   - If CoinGecko is rate-limited, Binance data still shows immediately
 *
 * TVL source: DeFiLlama (no rate limits, CORS open)
 *
 * This architecture ensures the dashboard ALWAYS shows live prices even when
 * CoinGecko is slow or rate-limited.
 */

import { useState, useEffect, useCallback } from "react";

export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  total_volume: number;
  circulating_supply: number;
  ath: number;
  ath_change_percentage: number;
  image: string;
}

export interface SolanaDetailData {
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    total_volume: { usd: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    circulating_supply: number;
    ath: { usd: number };
    ath_change_percentage: { usd: number };
  };
  community_data?: {
    twitter_followers?: number;
    reddit_subscribers?: number;
  };
  developer_data?: {
    stars?: number;
    forks?: number;
    commit_count_4_weeks?: number;
  };
}

export interface PriceHistoryPoint {
  timestamp: number;
  price: number;
}

export interface TvlDataPoint {
  date: string;
  tvl: number;
}

export interface CryptoState {
  solana: CoinData | null;
  topCoins: CoinData[];
  solanaHistory: PriceHistoryPoint[];
  solanaTvl: TvlDataPoint[];
  solanaDetail: SolanaDetailData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const BINANCE_BASE = "https://api.binance.com/api/v3";
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const DEFILLAMA_BASE = "https://api.llama.fi";

// Coin configuration: Binance symbol → metadata
const COIN_CONFIG = [
  { id: "bitcoin",                  symbol: "BTC",  name: "Bitcoin",   binance: "BTCUSDT",  rank: 1,   cgId: "bitcoin" },
  { id: "ethereum",                 symbol: "ETH",  name: "Ethereum",  binance: "ETHUSDT",  rank: 2,   cgId: "ethereum" },
  { id: "solana",                   symbol: "SOL",  name: "Solana",    binance: "SOLUSDT",  rank: 7,   cgId: "solana" },
  { id: "avalanche-2",              symbol: "AVAX", name: "Avalanche", binance: "AVAXUSDT", rank: 28,  cgId: "avalanche-2" },
  { id: "sui",                      symbol: "SUI",  name: "Sui",       binance: "SUIUSDT",  rank: 30,  cgId: "sui" },
  { id: "jupiter-exchange-solana",  symbol: "JUP",  name: "Jupiter",   binance: "JUPUSDT",  rank: 95,  cgId: "jupiter-exchange-solana" },
  { id: "stepn",                    symbol: "GMT",  name: "GMT",       binance: "GMTUSDT",  rank: 557, cgId: "stepn" },
];

// Coin logo URLs from CoinGecko CDN (static, no API call needed)
const COIN_LOGOS: Record<string, string> = {
  bitcoin:                 "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  ethereum:                "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  solana:                  "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  "avalanche-2":           "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  sui:                     "https://assets.coingecko.com/coins/images/26375/small/sui-ocean-square.png",
  "jupiter-exchange-solana": "https://assets.coingecko.com/coins/images/34188/small/jup.png",
  stepn:                   "https://assets.coingecko.com/coins/images/23597/small/gmt.png",
};

async function fetchBinanceTickers(): Promise<Map<string, { price: number; change24h: number; volume: number }>> {
  const symbols = COIN_CONFIG.map((c) => `"${c.binance}"`).join(",");
  const url = `${BINANCE_BASE}/ticker/24hr?symbols=[${symbols}]`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance ticker HTTP ${res.status}`);
  const data: any[] = await res.json();
  const map = new Map<string, { price: number; change24h: number; volume: number }>();
  for (const t of data) {
    map.set(t.symbol, {
      price: parseFloat(t.lastPrice),
      change24h: parseFloat(t.priceChangePercent),
      volume: parseFloat(t.quoteVolume),
    });
  }
  return map;
}

async function fetchBinanceKlines(symbol: string, days: number): Promise<PriceHistoryPoint[]> {
  const url = `${BINANCE_BASE}/klines?symbol=${symbol}&interval=1d&limit=${days + 1}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance klines HTTP ${res.status}`);
  const data: any[][] = await res.json();
  return data.map((k) => ({
    timestamp: k[0],
    price: parseFloat(k[4]), // close price
  }));
}

async function fetchBinance7dChange(symbol: string): Promise<number> {
  const klines = await fetchBinanceKlines(symbol, 8);
  if (klines.length < 2) return 0;
  const price7dAgo = klines[0].price;
  const priceNow = klines[klines.length - 1].price;
  return ((priceNow - price7dAgo) / price7dAgo) * 100;
}

async function fetchWithRetry(url: string, retries = 3, delayMs = 1500): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        if (i < retries) {
          await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
          continue;
        }
        throw new Error("Rate limited");
      }
      return res;
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}

async function fetchCoinGeckoSupplementary(): Promise<Map<string, { market_cap: number; rank: number; circulating_supply: number; ath: number; ath_change: number }>> {
  const ids = COIN_CONFIG.map((c) => c.cgId).join(",");
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=10&page=1&sparkline=false`;
  const res = await fetchWithRetry(url, 3, 2000);
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const data: any[] = await res.json();
  const map = new Map<string, any>();
  for (const c of data) {
    map.set(c.id, {
      market_cap: c.market_cap ?? 0,
      rank: c.market_cap_rank ?? 0,
      circulating_supply: c.circulating_supply ?? 0,
      ath: c.ath ?? 0,
      ath_change: c.ath_change_percentage ?? 0,
    });
  }
  return map;
}

export function useCryptoData() {
  const [state, setState] = useState<CryptoState>({
    solana: null,
    topCoins: [],
    solanaHistory: [],
    solanaTvl: [],
    solanaDetail: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchAll = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Step 1: Fetch Binance data (fast, no rate limits) — this populates prices immediately
      const [binanceTickers, solKlines, sol7dChange, tvlRes, cgDetailRes] = await Promise.allSettled([
        fetchBinanceTickers(),
        fetchBinanceKlines("SOLUSDT", 31),
        fetchBinance7dChange("SOLUSDT"),
        fetchWithRetry(`${DEFILLAMA_BASE}/v2/historicalChainTvl/Solana`),
        fetchWithRetry(`${COINGECKO_BASE}/coins/solana?localization=false&tickers=false&community_data=true&developer_data=true&sparkline=false`, 3, 2000),
      ]);

      // Build initial coin list from Binance data
      let tickers: Map<string, { price: number; change24h: number; volume: number }> = new Map();
      if (binanceTickers.status === "fulfilled") {
        tickers = binanceTickers.value;
      }

      // Build coins from Binance data (immediate)
      const coins: CoinData[] = COIN_CONFIG.map((cfg) => {
        const t = tickers.get(cfg.binance);
        return {
          id: cfg.id,
          symbol: cfg.symbol,
          name: cfg.name,
          current_price: t?.price ?? 0,
          market_cap: 0, // filled by CoinGecko below
          market_cap_rank: cfg.rank,
          price_change_percentage_24h: t?.change24h ?? 0,
          price_change_percentage_7d_in_currency: 0, // filled below
          total_volume: t?.volume ?? 0,
          circulating_supply: 0,
          ath: 0,
          ath_change_percentage: 0,
          image: COIN_LOGOS[cfg.id] ?? "",
        };
      });

      // SOL price history from Binance klines
      let solanaHistory: PriceHistoryPoint[] = [];
      if (solKlines.status === "fulfilled") {
        solanaHistory = solKlines.value;
      }

      // TVL from DeFiLlama
      let solanaTvl: TvlDataPoint[] = [];
      if (tvlRes.status === "fulfilled" && tvlRes.value.ok) {
        const data = await tvlRes.value.json();
        const recent = (data as { date: number; tvl: number }[]).slice(-90);
        solanaTvl = recent.map((d) => ({
          date: new Date(d.date * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          tvl: d.tvl / 1e9,
        }));
      }

      // Solana detail from CoinGecko (community/dev data)
      let solanaDetail: SolanaDetailData | null = null;
      if (cgDetailRes.status === "fulfilled" && cgDetailRes.value.ok) {
        solanaDetail = await cgDetailRes.value.json();
      }

      const solCoin = coins.find((c) => c.id === "solana") ?? null;

      // Publish first render with Binance data (fast path)
      setState({
        solana: solCoin,
        topCoins: coins,
        solanaHistory,
        solanaTvl,
        solanaDetail,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });

      // Step 2: Enrich with CoinGecko supplementary data (market cap, ATH, supply, rank, 7d change)
      // This runs in background and updates the state when ready
      Promise.allSettled([
        fetchCoinGeckoSupplementary(),
        sol7dChange.status === "fulfilled" ? Promise.resolve(sol7dChange.value) : fetchBinance7dChange("SOLUSDT"),
        // Fetch 7d changes for all coins from Binance klines in parallel
        ...COIN_CONFIG.filter(c => c.id !== "solana").map(c =>
          fetchBinanceKlines(c.binance, 8).then(klines => {
            if (klines.length < 2) return { id: c.id, change7d: 0 };
            const old = klines[0].price;
            const now = klines[klines.length - 1].price;
            return { id: c.id, change7d: ((now - old) / old) * 100 };
          }).catch(() => ({ id: c.id, change7d: 0 }))
        ),
      ]).then((results) => {
        const cgData = results[0].status === "fulfilled" ? results[0].value as Map<string, any> : null;
        const sol7d = results[1].status === "fulfilled" ? results[1].value as number : 0;
        const coinChanges = results.slice(2).map(r => r.status === "fulfilled" ? r.value as { id: string; change7d: number } : null);

        setState((prev) => {
          const enriched = prev.topCoins.map((coin) => {
            const cg = cgData?.get(coin.id);
            const change7d = coin.id === "solana"
              ? sol7d
              : (coinChanges.find(c => c?.id === coin.id)?.change7d ?? coin.price_change_percentage_7d_in_currency ?? 0);
            return {
              ...coin,
              market_cap: cg?.market_cap ?? coin.market_cap,
              market_cap_rank: cg?.rank ?? coin.market_cap_rank,
              circulating_supply: cg?.circulating_supply ?? coin.circulating_supply,
              ath: cg?.ath ?? coin.ath,
              ath_change_percentage: cg?.ath_change ?? coin.ath_change_percentage,
              price_change_percentage_7d_in_currency: change7d,
            };
          });

          const solEnriched = enriched.find((c) => c.id === "solana") ?? prev.solana;

          // Build synthetic solanaDetail if CoinGecko detail failed but we have CG supplementary
          let detail = prev.solanaDetail;
          if (!detail && cgData) {
            const cg = cgData.get("solana");
            if (cg) {
              const solCoinEnriched = enriched.find(c => c.id === "solana");
              detail = {
                market_data: {
                  current_price: { usd: solCoinEnriched?.current_price ?? 0 },
                  market_cap: { usd: cg.market_cap },
                  total_volume: { usd: solCoinEnriched?.total_volume ?? 0 },
                  price_change_percentage_24h: solCoinEnriched?.price_change_percentage_24h ?? 0,
                  price_change_percentage_7d: sol7d,
                  price_change_percentage_30d: 0,
                  circulating_supply: cg.circulating_supply,
                  ath: { usd: cg.ath },
                  ath_change_percentage: { usd: cg.ath_change },
                },
              };
            }
          }

          return {
            ...prev,
            solana: solEnriched ?? prev.solana,
            topCoins: enriched,
            solanaDetail: detail ?? prev.solanaDetail,
          };
        });
      });
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to fetch data. Retrying shortly.",
      }));
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { ...state, refresh: fetchAll };
}

export function formatCurrency(value: number, decimals = 2): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  return `$${value.toFixed(decimals)}`;
}

export function formatNumber(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
}
