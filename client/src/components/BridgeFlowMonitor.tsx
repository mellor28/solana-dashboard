/**
 * BridgeFlowMonitor — Capital flows into/out of Solana via Wormhole
 * Design: Glassmorphic Space Dashboard
 * 
 * Source: api.wormholescan.io (Free, CORS-open)
 */

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Activity } from "lucide-react";

const REFRESH_MS = 15 * 60_000;
const CACHE_KEY = "solana_wormhole_flow_cache";

interface ChainFlow {
  name: string;
  inflow: number;
  outflow: number;
  net: number;
}

interface BridgeData {
  todayNet: number;
  todayIn: number;
  todayOut: number;
  chart: ChainFlow[];
  fetchedAt: string;
}

const CHAIN_NAMES: Record<number, string> = {
  1: "Solana",
  2: "Ethereum",
  4: "BSC",
  5: "Polygon",
  6: "Avalanche",
  10: "Fantom",
  16: "Moonbeam",
  21: "Sui",
  22: "Aptos",
  23: "Arbitrum",
  24: "Optimism",
  30: "Base",
  32: "Sei",
  34: "Scroll",
  36: "Blast",
  40: "Mantle",
  48: "Linea",
  50: "Berachain",
};

function fmt(n: number, decimals = 0): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(decimals + 1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(decimals)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

async function loadWormholeData(): Promise<BridgeData> {
  const res = await fetch("https://api.wormholescan.io/api/v1/x-chain-activity");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const txs: any[] = data.txs ?? [];

  // Outflows from Solana (Chain ID 1)
  const solOut = txs.find((t: any) => t.chain === 1);
  const outflowsByChain: Record<number, number> = {};
  solOut?.destinations.forEach((d: any) => {
    if (d.chain !== 1) outflowsByChain[d.chain] = parseFloat(d.volume || 0);
  });

  // Inflows to Solana (Chain ID 1)
  const inflowsByChain: Record<number, number> = {};
  txs.forEach((t: any) => {
    if (t.chain === 1) return;
    t.destinations.forEach((d: any) => {
      if (d.chain === 1) {
        inflowsByChain[t.chain] = (inflowsByChain[t.chain] ?? 0) + parseFloat(d.volume || 0);
      }
    });
  });

  // Aggregate by chain for the chart
  const allChainIds = new Set([...Object.keys(inflowsByChain), ...Object.keys(outflowsByChain)]);
  const chart: ChainFlow[] = Array.from(allChainIds)
    .map(id => {
      const cid = parseInt(id as string);
      const inflow = inflowsByChain[cid] ?? 0;
      const outflow = outflowsByChain[cid] ?? 0;
      return {
        name: CHAIN_NAMES[cid] ?? `Chain ${cid}`,
        inflow,
        outflow,
        net: inflow - outflow
      };
    })
    .sort((a, b) => (b.inflow + b.outflow) - (a.inflow + a.outflow))
    .slice(0, 6);

  const totalIn = Object.values(inflowsByChain).reduce((a, b) => a + b, 0);
  const totalOut = Object.values(outflowsByChain).reduce((a, b) => a + b, 0);

  const result = {
    todayNet: totalIn - totalOut,
    todayIn: totalIn,
    todayOut: totalOut,
    chart,
    fetchedAt: new Date().toISOString(),
  };

  localStorage.setItem(CACHE_KEY, JSON.stringify(result));
  return result;
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
    }}>
      <div style={{ color: "rgba(255,255,255,0.8)", marginBottom: 5, fontWeight: 700 }}>{label}</div>
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
  const [data, setData] = useState<BridgeData | null>(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    try { return cached ? JSON.parse(cached) : null; } catch { return null; }
  });
  const [loading, setLoading] = useState(!localStorage.getItem(CACHE_KEY));
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const d = await loadWormholeData();
      setData(d);
      setError(null);
    } catch (e: any) {
      if (localStorage.getItem(CACHE_KEY)) {
        setError("Wormhole API throttled (using cached data).");
      } else {
        setError("Bridge data temporarily unavailable.");
      }
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

  return (
    <section id="bridge-flows" style={{ marginBottom: 32 }}>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div style={{
          width: 4, height: 28,
          background: "linear-gradient(180deg, #9945FF, #14F195)",
          borderRadius: 2,
        }} />
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontSize: 22, fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.2,
          }}>
            Wormhole Bridge Activity
          </h2>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 4,
          }}>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.05em",
              color: "#14F195",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#14F195", boxShadow: "0 0 8px #14F195" }} />
              LIVE · WORMHOLE SCAN · FLOWS · REFRESHES 15m
            </span>
          </div>
        </div>

        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="glass-card hover:bg-white/10 transition-colors"
          style={{
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 8,
          }}
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div
        className="glass-card"
        style={{
          padding: 24,
          minHeight: 340,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ minHeight: 280 }}>
            <Activity className="animate-pulse text-solana-green mb-4" size={40} />
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "'Space Mono', monospace" }}>
              COLLECTING BRIDGE DATA...
            </div>
          </div>
        ) : error && !data ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ minHeight: 280 }}>
            <div style={{ color: "#FF6B6B", fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>
              {error}
            </div>
            <button
              onClick={() => load(true)}
              style={{ fontSize: 12, color: "#14F195", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 32 }} className="flex-col-on-mobile">
            {/* Left side: Stats */}
            <div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", marginBottom: 8 }}>
                  SOLANA NET FLOW (24H)
                </div>
                <div style={{
                  fontSize: 36,
                  fontWeight: 800,
                  fontFamily: "'Space Mono', monospace",
                  color: isNetPositive ? "#14F195" : "#FF6B6B",
                  letterSpacing: "-0.02em",
                }}>
                  {isNetPositive ? "+" : ""}{fmt(data?.todayNet ?? 0, 1)}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="glass-card" style={{ padding: "12px 16px", background: "rgba(20,241,149,0.03)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Inflows</span>
                    <ArrowDownLeft size={16} color="#14F195" />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "white" }}>
                    {fmt(data?.todayIn ?? 0, 1)}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: "12px 16px", background: "rgba(255,107,107,0.03)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Outflows</span>
                    <ArrowUpRight size={16} color="#FF6B6B" />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "white" }}>
                    {fmt(data?.todayOut ?? 0, 1)}
                  </div>
                </div>

                {error && (
                  <div style={{ fontSize: 10, color: "rgba(255,184,0,0.6)", marginTop: 8, fontStyle: "italic" }}>
                    * {error}
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Chart */}
            <div style={{ height: 300 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", marginBottom: 12, textAlign: "right" }}>
                VOLUME BY SOURCE CHAIN
              </div>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={data?.chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={2}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  />
                  <YAxis hide domain={[0, "auto"]} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                  <Bar dataKey="inflow" radius={[4, 4, 0, 0]} barSize={20}>
                    {data?.chart.map((entry, index) => (
                      <Cell key={`cell-in-${index}`} fill="#14F195" fillOpacity={0.8} />
                    ))}
                  </Bar>
                  <Bar dataKey="outflow" radius={[4, 4, 0, 0]} barSize={20}>
                    {data?.chart.map((entry, index) => (
                      <Cell key={`cell-out-${index}`} fill="#FF6B6B" fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 16, justifyContent: "flex-end", marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: "#14F195" }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Inflow</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: "#FF6B6B" }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Outflow</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
