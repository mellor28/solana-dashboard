/**
 * BridgeFlowMonitor — Capital flows into/out of Solana via bridges
 * Design: Glassmorphic Space Dashboard
 *
 * Data sources (CORS-open):
 *  - DeFiLlama bridges.llama.fi/bridgevolume/Solana — daily in/out/net
 *  - DeFiLlama bridges.llama.fi/bridges — per-bridge breakdown
 *
 * Shows:
 *  - Net flow today (positive = capital entering Solana)
 *  - 7-day bar chart of inflows vs outflows
 *  - Top bridges by 24h volume
 *
 * Refreshes every 15 minutes (data updates ~daily).
 */

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Activity } from "lucide-react";

const REFRESH_MS = 15 * 60_000;

interface DayFlow {
  date: string;
  inflow: number;
  outflow: number;
  net: number;
}

interface BridgeEntry {
  name: string;
  volume24h: number;
}

interface BridgeData {
  todayNet: number;
  todayIn: number;
  todayOut: number;
  weeklyNet: number;
  chart: DayFlow[];
  topBridges: BridgeEntry[];
  fetchedAt: Date;
}

function fmt(n: number, decimals = 0): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(decimals + 1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(decimals)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

async function fetchWithRetry(url: string, retries = 3, delayMs = 2000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        if (i < retries - 1) await new Promise(r => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

async function loadBridgeData(): Promise<BridgeData> {
  // Fetch both in parallel with retry
  const [volumeData, bridgesData] = await Promise.all([
    fetchWithRetry("https://bridges.llama.fi/bridgevolume/Solana"),
    fetchWithRetry("https://bridges.llama.fi/bridges?includeChains=true"),
  ]);

  // Process daily volume chart (last 7 days)
  const now = Date.now() / 1000;
  const sevenDaysAgo = now - 7 * 86400;
  const chart: DayFlow[] = (volumeData as any[])
    .filter((p: any) => parseInt(p.date) >= sevenDaysAgo)
    .map((p: any) => {
      const ts = parseInt(p.date) * 1000;
      const d = new Date(ts);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const inflow = parseFloat(p.depositUSD || 0);
      const outflow = parseFloat(p.withdrawUSD || 0);
      const net = inflow - outflow;
      return { date: label, inflow, outflow, net };
    });

  const today = chart[chart.length - 1] ?? { inflow: 0, outflow: 0, net: 0 };
  const weeklyNet = chart.reduce((s, d) => s + d.net, 0);

  // Top bridges to Solana
  const allBridges: any[] = bridgesData?.bridges ?? [];
  const solBridges = allBridges
    .filter((b: any) => (b.chains ?? []).includes("Solana"))
    .map((b: any) => ({
      name: b.displayName as string,
      volume24h: parseFloat(b.lastDailyVolume ?? 0),
    }))
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, 6);

  return {
    todayNet: today.net,
    todayIn: today.inflow,
    todayOut: today.outflow,
    weeklyNet,
    chart,
    topBridges: solBridges,
    fetchedAt: new Date(),
  };
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const inflow = payload.find((p: any) => p.dataKey === "inflow")?.value ?? 0;
  const outflow = payload.find((p: any) => p.dataKey === "outflow")?.value ?? 0;
  const net = inflow - outflow;
  return (
    <div style={{
      background: "rgba(6,9,26,0.95)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 8,
      padding: "8px 12px",
      fontFamily: "'Space Mono', monospace",
      fontSize: 11,
      minWidth: 140,
    }}>
      <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>{label}</div>
      <div style={{ color: "#14F195", marginBottom: 2 }}>In: {fmt(inflow)}</div>
      <div style={{ color: "#FF6B6B", marginBottom: 2 }}>Out: {fmt(outflow)}</div>
      <div style={{
        color: net >= 0 ? "#14F195" : "#FF6B6B",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        paddingTop: 4,
        marginTop: 4,
        fontWeight: 700,
      }}>
        Net: {net >= 0 ? "+" : ""}{fmt(net)}
      </div>
    </div>
  );
}

export default function BridgeFlowMonitor() {
  const [data, setData] = useState<BridgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const d = await loadBridgeData();
      setData(d);
      setError(null);
    } catch (e: any) {
      setError("Bridge data temporarily unavailable (rate limited). Will retry.");
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

  const isNetPositive = (data?.todayNet ?? 0) >= 0;
  const isWeeklyPositive = (data?.weeklyNet ?? 0) >= 0;

  return (
    <section id="bridge-flows" style={{ marginBottom: 32 }}>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div style={{
          width: 4, height: 28,
          background: "linear-gradient(180deg, #14F195, #00C2FF)",
          borderRadius: 2,
        }} />
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontSize: 22, fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.2,
          }}>
            Bridge Flow Monitor
          </h2>
          <div style={{
            fontSize: 12, color: "rgba(255,255,255,0.4)",
            fontFamily: "'Space Mono', monospace",
          }}>
            LIVE · DEFILLAMA · CAPITAL FLOWS INTO SOLANA · REFRESHES 15m
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
          {[80, 200, 100].map((h, i) => (
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
          padding: "20px 24px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <Activity size={18} color="rgba(255,165,0,0.7)" />
          <div>
            <div style={{ color: "rgba(255,165,0,0.9)", fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600 }}>
              Bridge data temporarily unavailable
            </div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif", fontSize: 12, marginTop: 3 }}>
              DeFiLlama bridges API is rate-limited. Data will load on next refresh.
            </div>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Summary stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
            {/* Today net */}
            <div className="glass-card" style={{
              padding: "18px 20px",
              background: isNetPositive
                ? "linear-gradient(135deg, rgba(20,241,149,0.07) 0%, rgba(0,194,255,0.04) 100%)"
                : "linear-gradient(135deg, rgba(255,107,107,0.07) 0%, rgba(255,60,60,0.04) 100%)",
              borderColor: isNetPositive ? "rgba(20,241,149,0.2)" : "rgba(255,107,107,0.2)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                {isNetPositive
                  ? <ArrowDownLeft size={14} color="#14F195" />
                  : <ArrowUpRight size={14} color="#FF6B6B" />}
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>
                  TODAY NET FLOW
                </span>
              </div>
              <div style={{
                fontSize: 26, fontFamily: "'Space Mono', monospace", fontWeight: 700,
                color: isNetPositive ? "#14F195" : "#FF6B6B",
                lineHeight: 1.1,
              }}>
                {isNetPositive ? "+" : ""}{fmt(data.todayNet)}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
                {isNetPositive ? "Net capital inflow" : "Net capital outflow"}
              </div>
            </div>

            {/* Today inflow */}
            <div className="glass-card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <ArrowDownLeft size={14} color="#14F195" />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>
                  TODAY INFLOW
                </span>
              </div>
              <div style={{
                fontSize: 22, fontFamily: "'Space Mono', monospace", fontWeight: 700,
                color: "rgba(255,255,255,0.9)", lineHeight: 1.1,
              }}>
                {fmt(data.todayIn)}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
                Bridged into Solana
              </div>
            </div>

            {/* 7-day net */}
            <div className="glass-card" style={{
              padding: "18px 20px",
              background: isWeeklyPositive
                ? "linear-gradient(135deg, rgba(20,241,149,0.05) 0%, transparent 100%)"
                : "linear-gradient(135deg, rgba(255,107,107,0.05) 0%, transparent 100%)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Activity size={14} color="rgba(255,255,255,0.5)" />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>
                  7-DAY NET
                </span>
              </div>
              <div style={{
                fontSize: 22, fontFamily: "'Space Mono', monospace", fontWeight: 700,
                color: isWeeklyPositive ? "#14F195" : "#FF6B6B", lineHeight: 1.1,
              }}>
                {isWeeklyPositive ? "+" : ""}{fmt(data.weeklyNet)}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
                Weekly capital balance
              </div>
            </div>
          </div>

          {/* Chart + Bridge leaderboard */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }} className="flex-col-on-mobile">
            {/* 7-day bar chart */}
            <div className="glass-card" style={{ padding: "20px 22px" }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)",
                  fontFamily: "'DM Sans', sans-serif", marginBottom: 2,
                }}>
                  7-Day Inflow vs Outflow
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono', monospace" }}>
                  DAILY BRIDGE VOLUME TO SOLANA
                </div>
              </div>

              {data.chart.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data.chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "'Space Mono', monospace" }}
                        tickLine={false} axisLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`}
                        tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "'Space Mono', monospace" }}
                        tickLine={false} axisLine={false} width={50}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                      <Bar dataKey="inflow" name="Inflow" radius={[3, 3, 0, 0]} maxBarSize={28}>
                        {data.chart.map((_, i) => (
                          <Cell key={i} fill="rgba(20,241,149,0.5)" />
                        ))}
                      </Bar>
                      <Bar dataKey="outflow" name="Outflow" radius={[3, 3, 0, 0]} maxBarSize={28}>
                        {data.chart.map((_, i) => (
                          <Cell key={i} fill="rgba(255,107,107,0.5)" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Legend */}
                  <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(20,241,149,0.5)" }} />
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>Inflow</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(255,107,107,0.5)" }} />
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>Outflow</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{
                  height: 180, display: "flex", alignItems: "center", justifyContent: "center",
                  color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                }}>
                  No chart data available
                </div>
              )}
            </div>

            {/* Bridge leaderboard */}
            <div className="glass-card" style={{ padding: "20px 22px" }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)",
                  fontFamily: "'DM Sans', sans-serif", marginBottom: 2,
                }}>
                  Top Bridges to Solana
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono', monospace" }}>
                  BY 24H VOLUME
                </div>
              </div>

              {data.topBridges.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {data.topBridges.map((bridge, i) => {
                    const maxVol = data.topBridges[0]?.volume24h ?? 1;
                    const pct = (bridge.volume24h / maxVol) * 100;
                    const bridgeColors = ["#00C2FF", "#14F195", "#9945FF", "#FFB800", "#FF6B6B", "#A8FF78"];
                    const color = bridgeColors[i % bridgeColors.length];
                    return (
                      <div key={bridge.name} style={{
                        padding: "8px 0",
                        borderBottom: i < data.topBridges.length - 1
                          ? "1px solid rgba(255,255,255,0.04)" : "none",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              fontSize: 11, color: "rgba(255,255,255,0.25)",
                              fontFamily: "'Space Mono', monospace", width: 14,
                            }}>
                              {i + 1}
                            </span>
                            <span style={{
                              fontSize: 13, color: "rgba(255,255,255,0.85)",
                              fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                            }}>
                              {bridge.name}
                            </span>
                          </div>
                          <span style={{
                            fontSize: 12, fontFamily: "'Space Mono', monospace",
                            fontWeight: 700, color: "rgba(255,255,255,0.85)",
                          }}>
                            {fmt(bridge.volume24h)}
                          </span>
                        </div>
                        <div style={{
                          height: 2, background: "rgba(255,255,255,0.05)",
                          borderRadius: 1, overflow: "hidden",
                        }}>
                          <div style={{
                            height: "100%", width: `${pct}%`,
                            background: color, opacity: 0.6,
                            borderRadius: 1, transition: "width 0.8s ease",
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{
                  color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13, textAlign: "center", paddingTop: 20,
                }}>
                  No bridge data available
                </div>
              )}
            </div>
          </div>

          <div style={{
            marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.2)",
            fontFamily: "'Space Mono', monospace", textAlign: "right",
          }}>
            Source: DeFiLlama Bridges · Updated {data.fetchedAt.toLocaleTimeString()}
          </div>
        </>
      ) : null}
    </section>
  );
}
