/**
 * MeteoraStats — Live Meteora DLMM pool stats
 * Design: Glassmorphic Space Dashboard
 *
 * Fetches top pools by 24h volume from Meteora DLMM API (CORS wildcard).
 * Shows: pair name, 24h volume, liquidity, APR, fees 24h, bin step.
 * Refreshes every 3 minutes.
 */

import { useState, useEffect, useCallback } from "react";
import { Droplets, RefreshCw, TrendingUp } from "lucide-react";
import { formatTime } from "@/lib/utils";

const REFRESH_MS = 3 * 60_000;
const API_URL =
  "https://dlmm-api.meteora.ag/pair/all_with_pagination?limit=8&sort_key=volume&order_by=desc";

interface Pool {
  address: string;
  name: string;
  vol24h: number;
  liquidity: number;
  apr: number; // already a fraction (0.96 = 96%)
  fees24h: number;
  binStep: number;
  feeRate: number;
  currentPrice: number;
}

async function loadPools(): Promise<Pool[]> {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.pairs ?? []).map((p: any) => ({
    address: p.address,
    name: p.name,
    vol24h: parseFloat(p.trade_volume_24h) || 0,
    liquidity: parseFloat(p.liquidity) || 0,
    apr: parseFloat(p.apr) || 0,
    fees24h: parseFloat(p.fees_24h) || 0,
    binStep: parseInt(p.bin_step) || 0,
    feeRate: parseFloat(p.base_fee_percentage) || 0,
    currentPrice: parseFloat(p.current_price) || 0,
  }));
}

function fmt(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function MeteoraStats() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const p = await loadPools();
      setPools(p);
      setLastFetched(new Date());
      setError(null);
    } catch (e: any) {
      setError("Failed to load Meteora data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => {
    const id = setInterval(() => load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const maxVol = pools.length ? Math.max(...pools.map((p) => p.vol24h), 1) : 1;

  return (
    <div className="glass-card" style={{ padding: "20px 22px", marginBottom: 16 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "rgba(20,241,149,0.12)",
              border: "1px solid rgba(20,241,149,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Droplets size={16} color="#14F195" />
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "rgba(255,255,255,0.92)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Meteora DLMM
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              TOP POOLS BY 24H VOLUME
            </div>
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "5px 10px",
            cursor: refreshing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: "rgba(255,255,255,0.5)",
            fontSize: 11,
            fontFamily: "'DM Sans', sans-serif",
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw
            size={11}
            style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}
          />
          Refresh
        </button>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 80px 80px 70px 50px",
          gap: 8,
          padding: "0 4px 6px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 4,
        }}
      >
        {["Pool", "Vol 24h", "Liquidity", "APR", "Fees 24h"].map((h) => (
          <div
            key={h}
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
              fontFamily: "'Space Mono', monospace",
              textTransform: "uppercase",
              textAlign: h === "Pool" ? "left" : "right",
            }}
          >
            {h}
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 36,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 6,
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          style={{
            padding: "16px 0",
            color: "rgba(255,107,107,0.7)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {pools.map((pool, i) => {
            const volPct = (pool.vol24h / maxVol) * 100;
            const aprPct = pool.apr * 100; // convert fraction to %
            return (
              <div
                key={pool.address}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px 80px 70px 50px",
                  gap: 8,
                  padding: "8px 4px",
                  borderBottom:
                    i < pools.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                  alignItems: "center",
                }}
              >
                {/* Pool name + bar */}
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.85)",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 500,
                      marginBottom: 3,
                    }}
                  >
                    {pool.name}
                    <span
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,0.25)",
                        fontFamily: "'Space Mono', monospace",
                        marginLeft: 5,
                      }}
                    >
                      {pool.binStep}bp
                    </span>
                  </div>
                  <div
                    style={{
                      height: 2,
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${volPct}%`,
                        background:
                          i === 0
                            ? "linear-gradient(90deg, #14F195, #9945FF)"
                            : "rgba(20,241,149,0.35)",
                        borderRadius: 1,
                      }}
                    />
                  </div>
                </div>

                {/* Vol 24h */}
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 700,
                    color: "#00C2FF",
                    textAlign: "right",
                  }}
                >
                  {fmt(pool.vol24h)}
                </div>

                {/* Liquidity */}
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: "'Space Mono', monospace",
                    color: "rgba(255,255,255,0.55)",
                    textAlign: "right",
                  }}
                >
                  {fmt(pool.liquidity)}
                </div>

                {/* APR */}
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 700,
                    color: aprPct > 50 ? "#14F195" : aprPct > 20 ? "#FFB800" : "rgba(255,255,255,0.6)",
                    textAlign: "right",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 2,
                  }}
                >
                  {aprPct > 20 && <TrendingUp size={9} />}
                  {aprPct.toFixed(1)}%
                </div>

                {/* Fees 24h */}
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "'Space Mono', monospace",
                    color: "rgba(153,69,255,0.8)",
                    textAlign: "right",
                  }}
                >
                  {fmt(pool.fees24h)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lastFetched && !loading && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.04)",
            fontSize: 10,
            color: "rgba(255,255,255,0.2)",
            fontFamily: "'Space Mono', monospace",
            textAlign: "right",
          }}
        >
          Source: Meteora DLMM API · {formatTime(lastFetched)}
        </div>
      )}
    </div>
  );
}
