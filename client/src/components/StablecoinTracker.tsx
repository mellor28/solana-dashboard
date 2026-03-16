/**
 * StablecoinTracker — Stablecoin supply on Solana
 * Design: Glassmorphic Space Dashboard
 *
 * Data sources (all CORS-open):
 *  - DeFiLlama stablecoins.llama.fi/stablecoins — per-issuer breakdown
 *  - DeFiLlama stablecoins.llama.fi/stablecoincharts/Solana — 30-day history
 *
 * Shows:
 *  - Total USD stablecoin supply on Solana
 *  - 24h net change with direction badge
 *  - Top 6 stablecoins by supply (bar breakdown)
 *  - 30-day area chart of total supply
 *
 * Refreshes every 10 minutes (data updates ~daily but we poll for freshness).
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
import { DollarSign, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { formatTime } from "@/lib/utils";

const REFRESH_MS = 10 * 60_000;

interface StableEntry {
  name: string;
  symbol: string;
  amount: number;
  color: string;
}

interface ChartPoint {
  date: string;
  total: number;
}

interface StablecoinData {
  totalUsd: number;
  change24h: number; // absolute USD
  change24hPct: number;
  topStables: StableEntry[];
  chart: ChartPoint[];
  fetchedAt: Date;
}

// Brand colors for well-known stablecoins
const STABLE_COLORS: Record<string, string> = {
  USDC: "#2775CA",
  USDT: "#26A17B",
  USDG: "#FFB800",
  USD1: "#FF6B6B",
  PYUSD: "#0070BA",
  BUIDL: "#000000",
  USDS: "#9945FF",
  YLDS: "#14F195",
  FDUSD: "#F0B90B",
  EURC: "#003087",
};

function stableColor(symbol: string, idx: number): string {
  if (STABLE_COLORS[symbol]) return STABLE_COLORS[symbol];
  const fallbacks = ["#00C2FF", "#A8FF78", "#FF9F43", "#EE5A24", "#C44569", "#786FA6"];
  return fallbacks[idx % fallbacks.length];
}

function fmt(n: number, decimals = 1): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(decimals)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtShort(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  return `${n.toFixed(0)}`;
}

async function loadStablecoinData(): Promise<StablecoinData> {
  const [listRes, chartRes] = await Promise.all([
    fetch("https://stablecoins.llama.fi/stablecoins?includePrices=true"),
    fetch("https://stablecoins.llama.fi/stablecoincharts/Solana"),
  ]);

  const listData = await listRes.json();
  const chartData: any[] = await chartRes.json();

  // Per-issuer breakdown on Solana
  const assets: any[] = listData.peggedAssets ?? [];
  const solAssets = assets
    .map((a) => {
      const circ = a.chainCirculating?.Solana?.current?.peggedUSD ?? 0;
      return {
        name: a.name,
        symbol: a.symbol,
        amount: parseFloat(circ) || 0,
      };
    })
    .filter((a) => a.amount > 1e6)
    .sort((a, b) => b.amount - a.amount);

  const topStables: StableEntry[] = solAssets.slice(0, 8).map((a, i) => ({
    ...a,
    color: stableColor(a.symbol, i),
  }));

  const totalUsd = solAssets.reduce((s, a) => s + a.amount, 0);

  // 30-day chart from history
  const now = Date.now() / 1000;
  const thirtyDaysAgo = now - 30 * 86400;
  const chart: ChartPoint[] = chartData
    .filter((p) => parseInt(p.date) >= thirtyDaysAgo)
    .map((p) => {
      const ts = parseInt(p.date) * 1000;
      const d = new Date(ts);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const total = parseFloat(p.totalCirculating?.peggedUSD ?? 0);
      return { date: label, total };
    });

  // 24h change from last two chart points
  let change24h = 0;
  let change24hPct = 0;
  if (chart.length >= 2) {
    const prev = chart[chart.length - 2].total;
    const curr = chart[chart.length - 1].total;
    change24h = curr - prev;
    change24hPct = prev > 0 ? (change24h / prev) * 100 : 0;
  }

  return {
    totalUsd,
    change24h,
    change24hPct,
    topStables,
    chart,
    fetchedAt: new Date(),
  };
}

// Custom tooltip for the chart
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(6,9,26,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: 3 }}>{label}</div>
      <div style={{ color: "#14F195", fontWeight: 700 }}>
        ${fmtShort(payload[0].value)}
      </div>
    </div>
  );
}

export default function StablecoinTracker() {
  const [data, setData] = useState<StablecoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const d = await loadStablecoinData();
      setData(d);
      setError(null);
    } catch (e: any) {
      setError("Failed to load stablecoin data");
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

  const maxAmount = data ? Math.max(...data.topStables.map((s) => s.amount), 1) : 1;
  const isPos = (data?.change24hPct ?? 0) >= 0;

  return (
    <section id="stablecoins" style={{ marginBottom: 32 }}>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          style={{
            width: 4,
            height: 28,
            background: "linear-gradient(180deg, #2775CA, #26A17B)",
            borderRadius: 2,
          }}
        />
        <div style={{ flex: 1 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.2,
            }}
          >
            Stablecoin Supply
          </h2>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            LIVE · DEFILLAMA · SOLANA CHAIN · REFRESHES 10m
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "6px 12px",
            cursor: refreshing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: "rgba(255,255,255,0.6)",
            fontSize: 12,
            fontFamily: "'DM Sans', sans-serif",
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw
            size={13}
            style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}
          />
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[180, 280, 120].map((h, i) => (
            <div
              key={i}
              style={{
                height: h,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 12,
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          className="glass-card"
          style={{
            padding: 20,
            color: "rgba(255,107,107,0.7)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : data ? (
        <>
          {/* Hero total + 24h change */}
          <div
            className="glass-card"
            style={{
              padding: "24px 28px",
              marginBottom: 16,
              background:
                "linear-gradient(135deg, rgba(39,117,202,0.08) 0%, rgba(38,161,123,0.06) 100%)",
              borderColor: "rgba(39,117,202,0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <DollarSign size={16} color="#2775CA" />
                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.4)",
                      fontFamily: "'Space Mono', monospace",
                      textTransform: "uppercase",
                    }}
                  >
                    Total Stablecoin Supply on Solana
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 42,
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.95)",
                    lineHeight: 1.1,
                    letterSpacing: "-1px",
                  }}
                >
                  {fmt(data.totalUsd, 2)}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Capital available for DeFi, trading &amp; payments on Solana
                </div>
              </div>

              {/* 24h change badge */}
              <div
                style={{
                  background: isPos ? "rgba(20,241,149,0.1)" : "rgba(255,107,107,0.1)",
                  border: `1px solid ${isPos ? "rgba(20,241,149,0.25)" : "rgba(255,107,107,0.25)"}`,
                  borderRadius: 12,
                  padding: "12px 18px",
                  textAlign: "center",
                  minWidth: 130,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    marginBottom: 4,
                  }}
                >
                  {isPos ? (
                    <TrendingUp size={14} color="#14F195" />
                  ) : (
                    <TrendingDown size={14} color="#FF6B6B" />
                  )}
                  <span
                    style={{
                      fontSize: 18,
                      fontFamily: "'Space Mono', monospace",
                      fontWeight: 700,
                      color: isPos ? "#14F195" : "#FF6B6B",
                    }}
                  >
                    {isPos ? "+" : ""}
                    {data.change24hPct.toFixed(2)}%
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontFamily: "'Space Mono', monospace",
                    color: isPos ? "rgba(20,241,149,0.7)" : "rgba(255,107,107,0.7)",
                  }}
                >
                  {isPos ? "+" : ""}
                  {fmt(Math.abs(data.change24h), 0)}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                    fontFamily: "'DM Sans', sans-serif",
                    marginTop: 3,
                  }}
                >
                  24h change
                </div>
              </div>
            </div>
          </div>

          {/* Two-column: breakdown + chart */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr",
              gap: 16,
            }}
            className="flex-col-on-mobile"
          >
            {/* Stablecoin breakdown */}
            <div className="glass-card" style={{ padding: "20px 22px" }}>
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.9)",
                    fontFamily: "'DM Sans', sans-serif",
                    marginBottom: 2,
                  }}
                >
                  Breakdown by Issuer
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.35)",
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  TOP STABLECOINS ON SOLANA
                </div>
              </div>

              {/* Stacked color bar */}
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  overflow: "hidden",
                  display: "flex",
                  marginBottom: 16,
                }}
              >
                {data.topStables.map((s) => (
                  <div
                    key={s.symbol}
                    style={{
                      flex: s.amount,
                      background: s.color,
                      transition: "flex 0.8s ease",
                    }}
                  />
                ))}
              </div>

              {/* List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {data.topStables.map((stable, i) => {
                  const pct = (stable.amount / data.totalUsd) * 100;
                  const barPct = (stable.amount / maxAmount) * 100;
                  return (
                    <div
                      key={stable.symbol}
                      style={{
                        padding: "7px 0",
                        borderBottom:
                          i < data.topStables.length - 1
                            ? "1px solid rgba(255,255,255,0.04)"
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: stable.color,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 13,
                              color: "rgba(255,255,255,0.85)",
                              fontFamily: "'DM Sans', sans-serif",
                              fontWeight: 500,
                            }}
                          >
                            {stable.symbol}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              color: "rgba(255,255,255,0.3)",
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {stable.name.length > 20 ? stable.name.slice(0, 20) + "…" : stable.name}
                          </span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              fontSize: 12,
                              fontFamily: "'Space Mono', monospace",
                              fontWeight: 700,
                              color: "rgba(255,255,255,0.85)",
                            }}
                          >
                            {fmt(stable.amount, 1)}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              color: "rgba(255,255,255,0.3)",
                              fontFamily: "'Space Mono', monospace",
                              marginLeft: 5,
                            }}
                          >
                            {pct.toFixed(1)}%
                          </span>
                        </div>
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
                            width: `${barPct}%`,
                            background: stable.color,
                            opacity: 0.6,
                            borderRadius: 1,
                            transition: "width 0.8s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 30-day chart */}
            <div className="glass-card" style={{ padding: "20px 22px" }}>
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.9)",
                    fontFamily: "'DM Sans', sans-serif",
                    marginBottom: 2,
                  }}
                >
                  30-Day Supply Trend
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.35)",
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  TOTAL USD STABLECOINS ON SOLANA
                </div>
              </div>

              {data.chart.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart
                    data={data.chart}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="stableGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2775CA" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2775CA" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{
                        fill: "rgba(255,255,255,0.3)",
                        fontSize: 10,
                        fontFamily: "'Space Mono', monospace",
                      }}
                      tickLine={false}
                      axisLine={false}
                      interval={Math.floor(data.chart.length / 6)}
                    />
                    <YAxis
                      tickFormatter={(v) => `$${(v / 1e9).toFixed(1)}B`}
                      tick={{
                        fill: "rgba(255,255,255,0.3)",
                        fontSize: 10,
                        fontFamily: "'Space Mono', monospace",
                      }}
                      tickLine={false}
                      axisLine={false}
                      width={55}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#2775CA"
                      strokeWidth={2}
                      fill="url(#stableGrad)"
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: "#2775CA",
                        stroke: "rgba(255,255,255,0.3)",
                        strokeWidth: 1,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div
                  style={{
                    height: 220,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.3)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                  }}
                >
                  No chart data available
                </div>
              )}

              {/* Min/max annotation */}
              {data.chart.length > 1 && (() => {
                const vals = data.chart.map((p) => p.total);
                const min = Math.min(...vals);
                const max = Math.max(...vals);
                const range = max - min;
                const rangePct = min > 0 ? (range / min) * 100 : 0;
                return (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.25)",
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        30d LOW
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontFamily: "'Space Mono', monospace",
                          color: "#FF6B6B",
                        }}
                      >
                        {fmt(min, 1)}
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.25)",
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        30d RANGE
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontFamily: "'Space Mono', monospace",
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        {rangePct.toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.25)",
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        30d HIGH
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontFamily: "'Space Mono', monospace",
                          color: "#14F195",
                        }}
                      >
                        {fmt(max, 1)}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "rgba(255,255,255,0.2)",
              fontFamily: "'Space Mono', monospace",
              textAlign: "right",
            }}
          >
            Source: DeFiLlama · Updated {formatTime(data.fetchedAt)}
          </div>
        </>
      ) : null}
    </section>
  );
}
