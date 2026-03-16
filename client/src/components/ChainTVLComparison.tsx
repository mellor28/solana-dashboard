/**
 * ChainTVLComparison — Solana vs other chains by TVL
 * Design: Glassmorphic Space Dashboard
 *
 * Data sources (all CORS-open, DeFiLlama):
 *  - api.llama.fi/v2/historicalChainTvl/{chain} — per-chain TVL + 24h change
 *
 * Shows:
 *  - Horizontal bar chart: ETH / SOL / BSC / Tron / Base / Arbitrum / Avalanche / Sui
 *  - Solana rank highlight
 *  - 30-day Solana TVL trend mini-chart
 *  - 24h % change badges
 *
 * Fetches all chains in parallel. Refreshes every 10 minutes.
 */

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart2, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { formatTime } from "@/lib/utils";

const REFRESH_MS = 10 * 60_000;

const CHAINS = [
  { id: "Ethereum", label: "Ethereum", color: "#627EEA", emoji: "Ξ" },
  { id: "Solana", label: "Solana", color: "#14F195", emoji: "◎" },
  { id: "Tron", label: "Tron", color: "#FF0013", emoji: "T" },
  { id: "BSC", label: "BNB Chain", color: "#F3BA2F", emoji: "B" },
  { id: "Base", label: "Base", color: "#0052FF", emoji: "B" },
  { id: "Arbitrum", label: "Arbitrum", color: "#28A0F0", emoji: "A" },
  { id: "Avalanche", label: "Avalanche", color: "#E84142", emoji: "A" },
  { id: "Sui", label: "Sui", color: "#4DA2FF", emoji: "S" },
];

interface ChainStat {
  id: string;
  label: string;
  color: string;
  tvl: number;
  change24h: number;
  history: { date: string; tvl: number }[];
}

interface ComparisonData {
  chains: ChainStat[];
  solanaRank: number;
  fetchedAt: Date;
}

function fmt(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
}

async function loadChainData(): Promise<ComparisonData> {
  const results = await Promise.all(
    CHAINS.map(async (chain) => {
      try {
        const res = await fetch(`https://api.llama.fi/v2/historicalChainTvl/${chain.id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: any[] = await res.json();
        if (!data?.length) throw new Error("empty");

        const latest = data[data.length - 1];
        const prev = data.length > 1 ? data[data.length - 2] : latest;
        const change24h = prev.tvl > 0 ? ((latest.tvl - prev.tvl) / prev.tvl) * 100 : 0;

        // 30-day history for Solana mini-chart
        const now = Date.now() / 1000;
        const thirtyAgo = now - 30 * 86400;
        const history = data
          .filter((p) => p.date >= thirtyAgo)
          .map((p) => {
            const d = new Date(p.date * 1000);
            return {
              date: `${d.getMonth() + 1}/${d.getDate()}`,
              tvl: p.tvl,
            };
          });

        return {
          id: chain.id,
          label: chain.label,
          color: chain.color,
          tvl: latest.tvl,
          change24h,
          history,
        } as ChainStat;
      } catch {
        return {
          id: chain.id,
          label: chain.label,
          color: chain.color,
          tvl: 0,
          change24h: 0,
          history: [],
        } as ChainStat;
      }
    })
  );

  // Sort by TVL descending
  const sorted = [...results].sort((a, b) => b.tvl - a.tvl);
  const solanaRank = sorted.findIndex((c) => c.id === "Solana") + 1;

  return { chains: sorted, solanaRank, fetchedAt: new Date() };
}

function MiniTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(6,9,26,0.95)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 6, padding: "6px 10px",
      fontFamily: "'Space Mono', monospace", fontSize: 10,
    }}>
      <div style={{ color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>{label}</div>
      <div style={{ color: "#14F195" }}>{fmt(payload[0].value)}</div>
    </div>
  );
}

export default function ChainTVLComparison() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const d = await loadChainData();
      setData(d);
      setError(null);
    } catch (e: any) {
      setError("Failed to load chain TVL data");
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

  const maxTvl = data ? Math.max(...data.chains.map((c) => c.tvl), 1) : 1;
  const solana = data?.chains.find((c) => c.id === "Solana");

  return (
    <section id="chain-comparison" style={{ marginBottom: 32 }}>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div style={{
          width: 4, height: 28,
          background: "linear-gradient(180deg, #627EEA, #14F195)",
          borderRadius: 2,
        }} />
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontSize: 22, fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.2,
          }}>
            Chain TVL Comparison
          </h2>
          <div style={{
            fontSize: 12, color: "rgba(255,255,255,0.4)",
            fontFamily: "'Space Mono', monospace",
          }}>
            LIVE · DEFILLAMA · TOTAL VALUE LOCKED · REFRESHES 10m
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "6px 12px",
            cursor: refreshing ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 5,
            color: "rgba(255,255,255,0.6)", fontSize: 12,
            fontFamily: "'DM Sans', sans-serif",
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[300, 160].map((h, i) => (
            <div key={i} style={{
              height: h,
              background: "rgba(255,255,255,0.04)",
              borderRadius: 12,
              animation: "pulse 1.5s ease-in-out infinite",
              animationDelay: `${i * 100}ms`,
            }} />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card" style={{
          padding: 20, color: "rgba(255,107,107,0.7)",
          fontFamily: "'DM Sans', sans-serif", fontSize: 13,
        }}>
          {error}
        </div>
      ) : data ? (
        <>
          {/* Two-column: bar chart + Solana spotlight */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 16 }} className="flex-col-on-mobile">
            {/* Horizontal bar chart */}
            <div className="glass-card" style={{ padding: "20px 24px" }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)",
                  fontFamily: "'DM Sans', sans-serif", marginBottom: 2,
                }}>
                  TVL by Chain
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono', monospace" }}>
                  RANKED BY TOTAL VALUE LOCKED
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.chains.filter(c => c.tvl > 0).map((chain, i) => {
                  const barPct = (chain.tvl / maxTvl) * 100;
                  const isSolana = chain.id === "Solana";
                  const isPos = chain.change24h >= 0;
                  return (
                    <div key={chain.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            fontSize: 10, color: "rgba(255,255,255,0.25)",
                            fontFamily: "'Space Mono', monospace", width: 14, textAlign: "right",
                          }}>
                            {i + 1}
                          </span>
                          <span style={{
                            fontSize: 13,
                            color: isSolana ? "#14F195" : "rgba(255,255,255,0.85)",
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: isSolana ? 700 : 500,
                          }}>
                            {chain.label}
                          </span>
                          {isSolana && (
                            <span style={{
                              fontSize: 9, background: "rgba(20,241,149,0.15)",
                              border: "1px solid rgba(20,241,149,0.3)",
                              color: "#14F195", borderRadius: 4,
                              padding: "1px 5px", fontFamily: "'Space Mono', monospace",
                            }}>
                              YOU
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            fontSize: 11, fontFamily: "'Space Mono', monospace",
                            fontWeight: 700, color: "rgba(255,255,255,0.85)",
                          }}>
                            {fmt(chain.tvl)}
                          </span>
                          <span style={{
                            fontSize: 10, fontFamily: "'Space Mono', monospace",
                            color: isPos ? "#14F195" : "#FF6B6B",
                            minWidth: 52, textAlign: "right",
                          }}>
                            {isPos ? "+" : ""}{chain.change24h.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <div style={{
                        height: isSolana ? 5 : 3,
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 2, overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%",
                          width: `${barPct}%`,
                          background: chain.color,
                          opacity: isSolana ? 0.85 : 0.5,
                          borderRadius: 2,
                          transition: "width 1s ease",
                          boxShadow: isSolana ? `0 0 8px ${chain.color}40` : "none",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Solana spotlight + mini trend */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Rank card */}
              <div className="glass-card" style={{
                padding: "20px 22px",
                background: "linear-gradient(135deg, rgba(20,241,149,0.07) 0%, rgba(153,69,255,0.05) 100%)",
                borderColor: "rgba(20,241,149,0.2)",
                flex: "0 0 auto",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <BarChart2 size={14} color="#14F195" />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>
                    SOLANA POSITION
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 48, fontFamily: "'Space Mono', monospace", fontWeight: 700,
                    color: "#14F195", lineHeight: 1,
                  }}>
                    #{data.solanaRank}
                  </span>
                  <span style={{
                    fontSize: 14, color: "rgba(255,255,255,0.4)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    by TVL
                  </span>
                </div>
                <div style={{
                  fontSize: 22, fontFamily: "'Space Mono', monospace", fontWeight: 700,
                  color: "rgba(255,255,255,0.9)", marginBottom: 4,
                }}>
                  {solana ? fmt(solana.tvl) : "—"}
                </div>
                {solana && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {solana.change24h >= 0
                      ? <TrendingUp size={13} color="#14F195" />
                      : <TrendingDown size={13} color="#FF6B6B" />}
                    <span style={{
                      fontSize: 13, fontFamily: "'Space Mono', monospace",
                      color: solana.change24h >= 0 ? "#14F195" : "#FF6B6B",
                    }}>
                      {solana.change24h >= 0 ? "+" : ""}{solana.change24h.toFixed(2)}% 24h
                    </span>
                  </div>
                )}
              </div>

              {/* 30-day Solana TVL mini chart */}
              {solana && solana.history.length > 0 && (
                <div className="glass-card" style={{ padding: "16px 18px", flex: 1 }}>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)",
                      fontFamily: "'DM Sans', sans-serif", marginBottom: 1,
                    }}>
                      Solana TVL — 30 Days
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace" }}>
                      TOTAL VALUE LOCKED TREND
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={110}>
                    <AreaChart data={solana.history} margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="solTvlGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14F195" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#14F195" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9, fontFamily: "'Space Mono', monospace" }}
                        tickLine={false} axisLine={false}
                        interval={Math.floor(solana.history.length / 5)}
                      />
                      <YAxis
                        tickFormatter={(v) => `$${(v / 1e9).toFixed(1)}B`}
                        tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9, fontFamily: "'Space Mono', monospace" }}
                        tickLine={false} axisLine={false} width={42}
                      />
                      <Tooltip content={<MiniTooltip />} />
                      <Area
                        type="monotone" dataKey="tvl"
                        stroke="#14F195" strokeWidth={1.5}
                        fill="url(#solTvlGrad)" dot={false}
                        activeDot={{ r: 3, fill: "#14F195", stroke: "rgba(255,255,255,0.3)", strokeWidth: 1 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div style={{
            fontSize: 11, color: "rgba(255,255,255,0.2)",
            fontFamily: "'Space Mono', monospace", textAlign: "right",
          }}>
            Source: DeFiLlama · Updated {formatTime(data.fetchedAt)}
          </div>
        </>
      ) : null}
    </section>
  );
}
