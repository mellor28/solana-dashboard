/**
 * useCryptoData hook
 * Fetches live Solana and crypto market data from CoinGecko's free public API.
 * Also fetches Solana TVL from DeFiLlama's free API.
 * Design: Glassmorphic Space Dashboard — Space Mono numbers, DM Sans labels
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

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const DEFILLAMA_BASE = "https://api.llama.fi";

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        // Rate limited — wait and retry
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      return res;
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Max retries exceeded");
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
      // Parallel fetch: top coins list + Solana 30d history + Solana TVL
      const [coinsRes, historyRes, tvlRes, detailRes] = await Promise.allSettled([
        fetchWithRetry(
          `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=solana,bitcoin,ethereum,binancecoin,ripple,cardano,avalanche-2,polkadot&order=market_cap_desc&per_page=8&page=1&sparkline=false&price_change_percentage=7d`
        ),
        fetchWithRetry(
          `${COINGECKO_BASE}/coins/solana/market_chart?vs_currency=usd&days=30&interval=daily`
        ),
        fetchWithRetry(`${DEFILLAMA_BASE}/v2/historicalChainTvl/Solana`),
        fetchWithRetry(`${COINGECKO_BASE}/coins/solana?localization=false&tickers=false&community_data=true&developer_data=true&sparkline=false`),
      ]);

      let topCoins: CoinData[] = [];
      let solana: CoinData | null = null;
      let solanaHistory: PriceHistoryPoint[] = [];
      let solanaTvl: TvlDataPoint[] = [];
      let solanaDetail: SolanaDetailData | null = null;

      if (coinsRes.status === "fulfilled" && coinsRes.value.ok) {
        const data: CoinData[] = await coinsRes.value.json();
        topCoins = data;
        solana = data.find((c) => c.id === "solana") || null;
      }

      if (historyRes.status === "fulfilled" && historyRes.value.ok) {
        const data = await historyRes.value.json();
        solanaHistory = (data.prices as [number, number][]).map(([ts, price]) => ({
          timestamp: ts,
          price,
        }));
      }

      if (tvlRes.status === "fulfilled" && tvlRes.value.ok) {
        const data = await tvlRes.value.json();
        // Take last 90 days
        const recent = (data as { date: number; tvl: number }[]).slice(-90);
        solanaTvl = recent.map((d) => ({
          date: new Date(d.date * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          tvl: d.tvl / 1e9, // Convert to billions
        }));
      }

      if (detailRes.status === "fulfilled" && detailRes.value.ok) {
        solanaDetail = await detailRes.value.json();
      }

      setState({
        solana,
        topCoins,
        solanaHistory,
        solanaTvl,
        solanaDetail,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to fetch data. Showing cached or estimated values.",
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
