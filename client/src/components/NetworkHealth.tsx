/**
 * NetworkHealth — Solana Network Health panel
 * Design: Glassmorphic Space Dashboard
 * Shows live TPS, current slot, validator count, congestion status
 * + 12-hour TPS history chart (720 x 60s samples from publicnode RPC)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Activity, Cpu, Server, Zap, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

// publicnode has CORS wildcard (*) and supports getRecentPerformanceSamples
const PUBLICNODE_URL = "https://solana-rpc.publicnode.com";
const HELIUS_URL = `https://mainnet.helius-rpc.com/?api-key=d34a711e-1e25-489a-8652-2d8709d22b4c`;

interface NetworkData {
  slot: number;
  tps: number;
  nonVoteTps: number;
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  blockHeight: number;
  totalValidators: number;
  activeValidators: number;
  delinquentValidators: number;
  totalTxCount: number;
  fetchedAt: Date;
}

interface TpsPoint {
  time: string;       // "HH:MM" label
  tps: number;        // total TPS
  nonVoteTps: number; // non-vote TPS
}

async function rpcPost(url: string, method: string, params: unknown[] = []) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

function getCongestionStatus(tps: number): {
  label: string;
  color: string;
  icon: React.ReactNode;
  bg: string;
} {
  if (tps >= 3000) {
    return { label: "High Load", color: "#FF6B6B", icon: <XCircle size={14} />, bg: "rgba(255,107,107,0.1)" };
  } else if (tps >= 1500) {
    return { label: "Moderate", color: "#FFB800", icon: <AlertTriangle size={14} />, bg: "rgba(255,184,0,0.1)" };
  } else {
    return { label: "Healthy", color: "#14F195", icon: <CheckCircle size={14} />, bg: "rgba(20,241,149,0.1)" };
  }
}

function StatBox({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12,
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: color ?? "rgba(255,255,255,0.4)" }}>{icon}</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", letterSpacing: "0.04em" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color ?? "rgba(255,255,255,0.9)", fontFamily: "'Space Mono', monospace" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif" }}>{sub}</div>
      )}
    </div>
  );
}

// Custom tooltip for the TPS chart
function TpsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.find((p: any) => p.dataKey === "tps")?.value ?? 0;
  const nonVote = payload.find((p: any) => p.dataKey === "nonVoteTps")?.value ?? 0;
  return (
    <div style={{
      background: "rgba(10,10,20,0.92)",
      border: "1px solid rgba(153,69,255,0.3)",
      borderRadius: 8,
      padding: "8px 12px",
      fontFamily: "'Space Mono', monospace",
      fontSize: 11,
    }}>
      <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "#14F195" }}>Total: {total.toLocaleString()} TPS</div>
      <div style={{ color: "#9945FF" }}>Non-vote: {nonVote.toLocaleString()} TPS</div>
    </div>
  );
}

export default function NetworkHealth() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [tpsHistory, setTpsHistory] = useState<TpsPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Keep a rolling buffer of live TPS points appended every 30s
  const liveBuffer = useRef<TpsPoint[]>([]);

  // Fetch 12-hour TPS history from publicnode (720 samples × 60s = 12h)
  const fetchTpsHistory = useCallback(async () => {
    try {
      const samples: Array<{
        numTransactions: number;
        numNonVoteTransactions: number;
        samplePeriodSecs: number;
        numSlots: number;
      }> = await rpcPost(PUBLICNODE_URL, "getRecentPerformanceSamples", [720]);

      // Samples are newest-first; reverse so oldest is left on chart
      const reversed = [...samples].reverse();
      const now = Date.now();
      const totalMs = reversed.length * 60_000;

      const points: TpsPoint[] = reversed.map((s, i) => {
        const ts = new Date(now - totalMs + i * 60_000);
        const hh = ts.getHours().toString().padStart(2, "0");
        const mm = ts.getMinutes().toString().padStart(2, "0");
        const tps = s.samplePeriodSecs > 0 ? Math.round(s.numTransactions / s.samplePeriodSecs) : 0;
        const nonVoteTps = s.samplePeriodSecs > 0 ? Math.round(s.numNonVoteTransactions / s.samplePeriodSecs) : 0;
        return { time: `${hh}:${mm}`, tps, nonVoteTps };
      });

      liveBuffer.current = points;
      setTpsHistory(points);
    } catch {
      // silently fail — chart just won't show
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Fetch current live stats
  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [perfSamples, epochInfo, voteAccounts] = await Promise.all([
        rpcPost(HELIUS_URL, "getRecentPerformanceSamples", [5]),
        rpcPost(HELIUS_URL, "getEpochInfo"),
        rpcPost(HELIUS_URL, "getVoteAccounts"),
      ]);

      const avgTps = perfSamples.reduce(
        (sum: number, s: { numTransactions: number; samplePeriodSecs: number }) =>
          sum + s.numTransactions / s.samplePeriodSecs, 0
      ) / perfSamples.length;

      const avgNonVoteTps = perfSamples.reduce(
        (sum: number, s: { numNonVoteTransactions: number; samplePeriodSecs: number }) =>
          sum + s.numNonVoteTransactions / s.samplePeriodSecs, 0
      ) / perfSamples.length;

      const activeValidators = voteAccounts.current?.length ?? 0;
      const delinquentValidators = voteAccounts.delinquent?.length ?? 0;

      const newPoint: TpsPoint = {
        time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        tps: Math.round(avgTps),
        nonVoteTps: Math.round(avgNonVoteTps),
      };

      // Append live point to the rolling buffer (keep last 720)
      liveBuffer.current = [...liveBuffer.current.slice(-719), newPoint];
      setTpsHistory([...liveBuffer.current]);

      setData({
        slot: epochInfo.absoluteSlot,
        tps: Math.round(avgTps),
        nonVoteTps: Math.round(avgNonVoteTps),
        epoch: epochInfo.epoch,
        slotIndex: epochInfo.slotIndex,
        slotsInEpoch: epochInfo.slotsInEpoch,
        blockHeight: epochInfo.blockHeight,
        totalValidators: activeValidators + delinquentValidators,
        activeValidators,
        delinquentValidators,
        totalTxCount: epochInfo.transactionCount,
        fetchedAt: new Date(),
      });
      setError(null);
    } catch {
      setError("Unable to fetch network data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTpsHistory();
    fetchData();
    const interval = setInterval(() => fetchData(), 30_000);
    // Refresh full history every 30 minutes
    const histInterval = setInterval(() => fetchTpsHistory(), 30 * 60_000);
    return () => { clearInterval(interval); clearInterval(histInterval); };
  }, [fetchData, fetchTpsHistory]);

  const congestion = data ? getCongestionStatus(data.tps) : null;
  const epochProgress = data ? (data.slotIndex / data.slotsInEpoch) * 100 : 0;

  const fmtNum = (n: number) =>
    n >= 1_000_000_000 ? `${(n / 1_000_000_000).toFixed(2)}B`
    : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : String(n);

  // Downsample for display: show every 4th point for 720→180 points (cleaner chart)
  const chartData = tpsHistory.filter((_, i) => i % 4 === 0);
  const avgTps = chartData.length > 0 ? Math.round(chartData.reduce((s, p) => s + p.tps, 0) / chartData.length) : 0;
  const maxTps = chartData.length > 0 ? Math.max(...chartData.map(p => p.tps)) : 0;

  // X-axis: show every ~30th downsampled point (≈ every 2 hours)
  const xTicks = chartData
    .map((p, i) => ({ ...p, i }))
    .filter(p => p.i % 30 === 0)
    .map(p => p.time);

  return (
    <div id="network" className="glass-card" style={{ padding: "22px 24px", marginBottom: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(153,69,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Activity size={18} color="#9945FF" />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.95)", fontFamily: "'DM Sans', sans-serif" }}>
              Solana Network Health
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>
              LIVE · REFRESHES EVERY 30s
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {congestion && (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              background: congestion.bg,
              border: `1px solid ${congestion.color}40`,
              borderRadius: 20, padding: "4px 10px",
              color: congestion.color, fontSize: 12,
              fontFamily: "'Space Mono', monospace",
            }}>
              {congestion.icon}
              {congestion.label}
            </div>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "6px 10px",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              color: "rgba(255,255,255,0.6)", fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 90, background: "rgba(255,255,255,0.04)", borderRadius: 12, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: "20px", textAlign: "center", color: "rgba(255,107,107,0.8)", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
          {error} — check network connection
        </div>
      ) : data ? (
        <>
          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }} className="network-grid">
            <StatBox icon={<Zap size={13} />} label="TOTAL TPS" value={fmtNum(data.tps)} sub={`${fmtNum(data.nonVoteTps)} non-vote`} color="#14F195" />
            <StatBox icon={<Cpu size={13} />} label="CURRENT SLOT" value={fmtNum(data.slot)} sub={`Block #${fmtNum(data.blockHeight)}`} color="#9945FF" />
            <StatBox icon={<Server size={13} />} label="VALIDATORS" value={String(data.activeValidators)} sub={`${data.delinquentValidators} delinquent`} color="#FFB800" />
            <StatBox icon={<Activity size={13} />} label="EPOCH" value={String(data.epoch)} sub={`${data.slotIndex.toLocaleString()} / ${data.slotsInEpoch.toLocaleString()} slots`} color="#14F195" />
          </div>

          {/* TPS History Chart */}
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: "16px 16px 8px",
            marginBottom: 16,
          }}>
            {/* Chart header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", fontFamily: "'DM Sans', sans-serif" }}>
                  TPS History
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace" }}>
                  LAST 12 HOURS · 60s SAMPLES
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace" }}>AVG</div>
                  <div style={{ fontSize: 13, color: "#14F195", fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
                    {avgTps.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace" }}>PEAK</div>
                  <div style={{ fontSize: 13, color: "#FFB800", fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
                    {maxTps.toLocaleString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: "#14F195" }} />
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>Total</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: "#9945FF" }} />
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>Non-vote</span>
                  </div>
                </div>
              </div>
            </div>

            {historyLoading ? (
              <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace" }}>
                  Loading 12h history…
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tpsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14F195" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#14F195" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="nvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9945FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#9945FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    ticks={xTicks}
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "'Space Mono', monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "'Space Mono', monospace" }}
                    axisLine={false}
                    tickLine={false}
                    width={38}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)}
                  />
                  <Tooltip content={<TpsTooltip />} />
                  {/* Average reference line */}
                  {avgTps > 0 && (
                    <ReferenceLine
                      y={avgTps}
                      stroke="rgba(255,255,255,0.15)"
                      strokeDasharray="4 4"
                      label={{ value: "avg", fill: "rgba(255,255,255,0.25)", fontSize: 9, fontFamily: "'Space Mono', monospace", position: "insideTopRight" }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="tps"
                    stroke="#14F195"
                    strokeWidth={1.5}
                    fill="url(#tpsGrad)"
                    dot={false}
                    activeDot={{ r: 3, fill: "#14F195" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="nonVoteTps"
                    stroke="#9945FF"
                    strokeWidth={1.5}
                    fill="url(#nvGrad)"
                    dot={false}
                    activeDot={{ r: 3, fill: "#9945FF" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Epoch progress bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>
                EPOCH {data.epoch} PROGRESS
              </span>
              <span style={{ fontSize: 11, color: "#14F195", fontFamily: "'Space Mono', monospace" }}>
                {epochProgress.toFixed(1)}%
              </span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                width: `${epochProgress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #14F195, #9945FF)",
                borderRadius: 3,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>

          {/* Total transactions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif" }}>
              All-time transactions processed
            </span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
              {fmtNum(data.totalTxCount)}
            </span>
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'Space Mono', monospace", textAlign: "right" }}>
            Updated {data.fetchedAt.toLocaleTimeString()}
          </div>
        </>
      ) : null}
    </div>
  );
}
