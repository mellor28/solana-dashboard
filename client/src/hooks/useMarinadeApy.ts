/**
 * useMarinadeApy hook
 * Fetches live APY data directly from Marinade Finance's public API.
 * Endpoint: https://api.marinade.finance/msol/apy/{period}
 *
 * The API returns APY derived from mSOL price appreciation over the given period.
 * We fetch multiple periods (7d, 30d, 1y) to give the user context on recent vs
 * long-term yield, and use 30d as the primary "current APY" displayed in the tracker.
 *
 * CORS: The Marinade API supports cross-origin requests — no proxy needed.
 * Refresh: Fetches on mount and every 15 minutes (APY changes slowly, not per-block).
 */

import { useState, useEffect, useCallback } from "react";

export interface MarinadeApyData {
  value: number;        // raw decimal e.g. 0.0596
  apy: number;          // percentage e.g. 5.96
  end_time: string;
  start_time: string;
  end_price: number;
  start_price: number;
}

export interface MarinadeApyState {
  apy7d: MarinadeApyData | null;
  apy30d: MarinadeApyData | null;
  apy1y: MarinadeApyData | null;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  refetch: () => void;
}

const MARINADE_API = "https://api.marinade.finance";
const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

async function fetchApyPeriod(period: string): Promise<MarinadeApyData> {
  const res = await fetch(`${MARINADE_API}/msol/apy/${period}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for period ${period}`);
  const data = await res.json();
  return {
    ...data,
    apy: parseFloat((data.value * 100).toFixed(4)),
  };
}

export function useMarinadeApy(): MarinadeApyState {
  const [apy7d, setApy7d] = useState<MarinadeApyData | null>(null);
  const [apy30d, setApy30d] = useState<MarinadeApyData | null>(null);
  const [apy1y, setApy1y] = useState<MarinadeApyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d7, d30, d1y] = await Promise.all([
        fetchApyPeriod("7d"),
        fetchApyPeriod("30d"),
        fetchApyPeriod("1y"),
      ]);
      setApy7d(d7);
      setApy30d(d30);
      setApy1y(d1y);
      setLastFetched(new Date());
    } catch (err: any) {
      setError(err?.message ?? "Failed to fetch Marinade APY");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { apy7d, apy30d, apy1y, loading, error, lastFetched, refetch: fetchAll };
}
