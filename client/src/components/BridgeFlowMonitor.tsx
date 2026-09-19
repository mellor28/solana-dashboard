/**
 * BridgeFlowMonitor — Solana capital flows via Wormhole
 * Design: Glassmorphic Space Dashboard
 *
 * Inflow  = other chain → Solana (arriving on Solana)
 * Outflow = Solana → other chain (leaving Solana)
 *
 * Source: api.wormholescan.io (free, CORS-open). Default window is 7d.
 */

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Activity } from "lucide-react";
import {
  WORMHOLE_AVALANCHE_CHAIN_ID,
  WORMHOLE_SOLANA_CHAIN_ID,
  wormholeChainName,
} from "@/lib/wormholeChains";

const REFRESH_MS = 15 * 60_000;
const CACHE_KEY = "solana_wormhole_flow_cache_v3";
const SOL = WORMHOLE_SOLANA_CHAIN_ID;
const AVAX = WORMHOLE_AVALANCHE_CHAIN_ID;

interface ChainFlow {
  chainId: number;
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
  inflows: ChainFlow[];
  outflows: ChainFlow[];
  avax: ChainFlow;
  fetchedAt: string;
}

function fmt(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function emptyFlow(chainId: number): ChainFlow {
  return { chainId, name: wormholeChainName(chainId), inflow: 0, outflow: 0, net: 0 };
}

function withAvax(rows: ChainFlow[], key: "inflow" | "outflow"): ChainFlow[] {
  const top = rows.filter((r) => r[key] > 0).slice(0, 6);
  const avax = rows.find((r) => r.chainId === AVAX);
  if (avax && !top.some((r) => r.chainId === AVAX)) {
    return [...top, avax];
  }
  return top;
}

async function loadWormholeData(): Promise<BridgeData> {
  const res = await fetch("https://api.wormholescan.io/api/v1/x-chain-activity?timeSpan=7d");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const txs: any[] = data.txs ?? [];

  const outflowsByChain: Record<number, number> = {};
  const solOut = txs.find((t: any) => Number(t.chain) === SOL);
  solOut?.destinations.forEach((d: any) => {
    const dest = Number(d.chain);
    if (dest === SOL) return; // ignore Solana → Solana
    outflowsByChain[dest] = parseFloat(d.volume || 0);
  });

  const inflowsByChain: Record<number, number> = {};
  txs.forEach((t: any) => {
    const src = Number(t.chain);
    if (src === SOL) return;
    t.destinations.forEach((d: any) => {
      if (Number(d.chain) === SOL) {
        inflowsByChain[src] = (inflowsByChain[src] ?? 0) + parseFloat(d.volume || 0);
      }
    });
  });

  const allChainIds = new Set([
    ...Object.keys(inflowsByChain).map(Number),
    ...Object.keys(outflowsByChain).map(Number),
    AVAX,
  ]);

  const counterparts: ChainFlow[] = Array.from(allChainIds).map((cid) => {
    const inflow = inflowsByChain[cid] ?? 0;
    const outflow = outflowsByChain[cid] ?? 0;
    return {
      chainId: cid,
      name: wormholeChainName(cid),
      inflow,
      outflow,
      net: inflow - outflow,
    };
  });

  const totalIn = counterparts.reduce((s, r) => s + r.inflow, 0);
  const totalOut = counterparts.reduce((s, r) => s + r.outflow, 0);
  const avax = counterparts.find((r) => r.chainId === AVAX) ?? emptyFlow(AVAX);

  const solanaRow: ChainFlow = {
    chainId: SOL,
    name: "Solana",
    inflow: totalIn,
    outflow: totalOut,
    net: totalIn - totalOut,
  };

  const others = counterparts
    .filter((r) => r.chainId !== SOL)
    .sort((a, b) => b.inflow + b.outflow - (a.inflow + a.outflow));

  const chartOthers = others.filter((r) => r.inflow > 0 || r.outflow > 0).slice(0, 7);
  if (!chartOthers.some((r) => r.chainId === AVAX)) {
    chartOthers.push(avax);
  }

  const result: BridgeData = {
    todayNet: totalIn - totalOut,
    todayIn: totalIn,
    todayOut: totalOut,
    chart: [solanaRow, ...chartOthers],
    inflows: withAvax([...others].sort((a, b) => b.inflow - a.inflow), "inflow"),
    outflows: withAvax([...others].sort((a, b) => b.outflow - a.outflow), "outflow"),
    avax,
    fetchedAt: new Date().toISOString(),
  };

  localStorage.setItem(CACHE_KEY, JSON.stringify(result));
  return result;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const inflow = payload.find((p: any) => p.dataKey === "inflow")?.value ?? 0;
  const outflow = payload.find((p: any) => p.dataKey === "outflow")?.value ?? 0;
  const isSolana = label === "Solana";
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
      <div style={{ color: "#14F195", marginBottom: 2 }}>
        {isSolana ? "Arriving on Solana" : `Into Solana from ${label}`}: {fmt(inflow)}
      </div>
      <div style={{ color: "#FF6B6B", marginBottom: 2 }}>
        {isSolana ? "Leaving Solana" : `Out of Solana to ${label}`}: {fmt(outflow)}
      </div>
    </div>
  );
}

function FlowList({
  title,
  rows,
  direction,
}: {
  title: string;
  rows: ChainFlow[];
  direction: "in" | "out";
}) {
  const color = direction === "in" ? "#14F195" : "#FF6B6B";
  return (
    <div>
      <div style={{
        fontSize: 11,
        color: "rgba(255,255,255,0.4)",
        fontFamily: "'Space Mono', monospace",
        marginBottom: 10,
        letterSpacing: "0.04em",
      }}>
        {title}
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>No flows in this window.</div>
      ) : (
        rows.map((row) => {
          const amount = direction === "in" ? row.inflow : row.outflow;
          const isAvax = row.chainId === AVAX;
          return (
            <div
              key={`${direction}-${row.chainId}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                background: isAvax ? "rgba(232,65,66,0.08)" : "transparent",
                margin: isAvax ? "0 -8px" : 0,
                paddingLeft: isAvax ? 8 : 0,
                paddingRight: isAvax ? 8 : 0,
                borderRadius: isAvax ? 8 : 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.85)",
                  fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: "nowrap",
                }}>
                  {direction === "in" ? `${row.name} → Solana` : `Solana → ${row.name}`}
                </span>
                {isAvax && (
                  <span style={{
                    fontSize: 9,
                    fontFamily: "'Space Mono', monospace",
                    color: "#E84142",
                    border: "1px solid rgba(232,65,66,0.4)",
                    borderRadius: 4,
                    padding: "1px 5px",
                  }}>
                    AVAX
                  </span>
                )}
              </div>
              <span style={{
                fontSize: 13,
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                color,
                flexShrink: 0,
              }}>
                {fmt(amount)}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function BridgeFlowMonitor() {
  const [data, setData] = useState<BridgeData | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
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
    } catch {
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
  const avaxNet = data?.avax.net ?? 0;

  return (
    <section id="bridge-flows" style={{ marginBottom: 32 }}>
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
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.05em",
            color: "#14F195",
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#14F195", boxShadow: "0 0 8px #14F195" }} />
            SOLANA · 7D · WORMHOLE SCAN
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

      <div className="glass-card" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: 280 }}>
            <Activity className="animate-pulse mb-4" size={40} color="#14F195" />
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "'Space Mono', monospace" }}>
              COLLECTING BRIDGE DATA...
            </div>
          </div>
        ) : error && !data ? (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: 280 }}>
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
          <>
            <div style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.45)",
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: 18,
              lineHeight: 1.45,
            }}>
              Green = arriving <strong style={{ color: "#14F195" }}>on Solana</strong>.
              Red = leaving Solana <strong style={{ color: "#FF6B6B" }}>to another chain</strong>.
              A red Near bar means Solana → Near, not Near → Solana.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 12,
                marginBottom: 22,
              }}
              className="flex-col-on-mobile"
            >
              <div className="glass-card" style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", marginBottom: 6 }}>
                  SOLANA NET (7D)
                </div>
                <div style={{
                  fontSize: 22,
                  fontWeight: 800,
                  fontFamily: "'Space Mono', monospace",
                  color: isNetPositive ? "#14F195" : "#FF6B6B",
                }}>
                  {isNetPositive ? "+" : ""}{fmt(data?.todayNet ?? 0)}
                </div>
              </div>
              <div className="glass-card" style={{ padding: "14px 16px", background: "rgba(20,241,149,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>INTO SOLANA</span>
                  <ArrowDownLeft size={14} color="#14F195" />
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Space Mono', monospace", color: "white" }}>
                  {fmt(data?.todayIn ?? 0)}
                </div>
              </div>
              <div className="glass-card" style={{ padding: "14px 16px", background: "rgba(255,107,107,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>OUT OF SOLANA</span>
                  <ArrowUpRight size={14} color="#FF6B6B" />
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Space Mono', monospace", color: "white" }}>
                  {fmt(data?.todayOut ?? 0)}
                </div>
              </div>
              <div className="glass-card" style={{ padding: "14px 16px", background: "rgba(232,65,66,0.06)", border: "1px solid rgba(232,65,66,0.25)" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", marginBottom: 6 }}>
                  AVAX ↔ SOL
                </div>
                <div style={{
                  fontSize: 22,
                  fontWeight: 800,
                  fontFamily: "'Space Mono', monospace",
                  color: avaxNet >= 0 ? "#14F195" : "#FF6B6B",
                }}>
                  {avaxNet >= 0 ? "+" : ""}{fmt(avaxNet)}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", marginTop: 4 }}>
                  In {fmt(data?.avax.inflow ?? 0)} · Out {fmt(data?.avax.outflow ?? 0)}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>
                SOLANA FIRST · THEN LARGEST COUNTERPARTIES
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: "#14F195" }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Into Solana</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: "#FF6B6B" }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Out of Solana</span>
                </div>
              </div>
            </div>

            <div style={{ height: 320, marginBottom: 24 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.chart}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                  barGap={2}
                  barCategoryGap="18%"
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => fmt(Number(v))}
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "'Space Mono', monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={88}
                    tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="inflow" name="Into Solana" fill="#14F195" fillOpacity={0.85} radius={[0, 4, 4, 0]} barSize={10} />
                  <Bar dataKey="outflow" name="Out of Solana" fill="#FF6B6B" fillOpacity={0.85} radius={[0, 4, 4, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}
              className="flex-col-on-mobile"
            >
              <FlowList title="BIGGEST INFLOWS · INTO SOLANA" rows={data?.inflows ?? []} direction="in" />
              <FlowList title="BIGGEST OUTFLOWS · OUT OF SOLANA" rows={data?.outflows ?? []} direction="out" />
            </div>

            {error && (
              <div style={{ fontSize: 10, color: "rgba(255,184,0,0.6)", marginTop: 12, fontStyle: "italic" }}>
                * {error}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
