/**
 * NetworkHealth — Solana Network Health panel
 * Design: Glassmorphic Space Dashboard
 * Shows live TPS, current slot, validator count, congestion status
 * Fetches from Helius RPC every 30 seconds
 */

import { useState, useEffect, useCallback } from "react";
import { Activity, Cpu, Server, Zap, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

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

async function rpcCall(method: string, params: unknown[] = []) {
  const res = await fetch(HELIUS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  return data.result;
}

function getCongestionStatus(tps: number): {
  label: string;
  color: string;
  icon: React.ReactNode;
  bg: string;
} {
  if (tps >= 3000) {
    return {
      label: "High Load",
      color: "#FF6B6B",
      icon: <XCircle size={14} />,
      bg: "rgba(255,107,107,0.1)",
    };
  } else if (tps >= 1500) {
    return {
      label: "Moderate",
      color: "#FFB800",
      icon: <AlertTriangle size={14} />,
      bg: "rgba(255,184,0,0.1)",
    };
  } else {
    return {
      label: "Healthy",
      color: "#14F195",
      icon: <CheckCircle size={14} />,
      bg: "rgba(20,241,149,0.1)",
    };
  }
}

function StatBox({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: color ?? "rgba(255,255,255,0.4)" }}>{icon}</span>
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            fontFamily: "'Space Mono', monospace",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: color ?? "rgba(255,255,255,0.9)",
          fontFamily: "'Space Mono', monospace",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function NetworkHealth() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      // Parallel fetch: performance samples, epoch info, vote accounts
      const [perfSamples, epochInfo, voteAccounts] = await Promise.all([
        rpcCall("getRecentPerformanceSamples", [5]),
        rpcCall("getEpochInfo"),
        rpcCall("getVoteAccounts"),
      ]);

      // Calculate average TPS from last 5 samples
      const avgTps =
        perfSamples.reduce(
          (sum: number, s: { numTransactions: number; samplePeriodSecs: number }) =>
            sum + s.numTransactions / s.samplePeriodSecs,
          0
        ) / perfSamples.length;

      const avgNonVoteTps =
        perfSamples.reduce(
          (sum: number, s: { numNonVoteTransactions: number; samplePeriodSecs: number }) =>
            sum + s.numNonVoteTransactions / s.samplePeriodSecs,
          0
        ) / perfSamples.length;

      const activeValidators = voteAccounts.current?.length ?? 0;
      const delinquentValidators = voteAccounts.delinquent?.length ?? 0;

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
    } catch (err) {
      setError("Unable to fetch network data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const congestion = data ? getCongestionStatus(data.tps) : null;
  const epochProgress = data ? (data.slotIndex / data.slotsInEpoch) * 100 : 0;

  const fmtNum = (n: number) =>
    n >= 1_000_000_000
      ? `${(n / 1_000_000_000).toFixed(2)}B`
      : n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : String(n);

  return (
    <div
      id="network"
      className="glass-card"
      style={{ padding: "22px 24px", marginBottom: 28 }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(153,69,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: congestion.bg,
                border: `1px solid ${congestion.color}40`,
                borderRadius: 20,
                padding: "4px 10px",
                color: congestion.color,
                fontSize: 12,
                fontFamily: "'Space Mono', monospace",
              }}
            >
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
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "rgba(255,255,255,0.6)",
              fontSize: 12,
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
            <div
              key={i}
              style={{
                height: 90,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 12,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "rgba(255,107,107,0.8)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
          }}
        >
          {error} — check network connection
        </div>
      ) : data ? (
        <>
          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
              marginBottom: 16,
            }}
            className="network-grid"
          >
            <StatBox
              icon={<Zap size={13} />}
              label="TOTAL TPS"
              value={fmtNum(data.tps)}
              sub={`${fmtNum(data.nonVoteTps)} non-vote`}
              color="#14F195"
            />
            <StatBox
              icon={<Cpu size={13} />}
              label="CURRENT SLOT"
              value={fmtNum(data.slot)}
              sub={`Block #${fmtNum(data.blockHeight)}`}
              color="#9945FF"
            />
            <StatBox
              icon={<Server size={13} />}
              label="VALIDATORS"
              value={String(data.activeValidators)}
              sub={`${data.delinquentValidators} delinquent`}
              color="#FFB800"
            />
            <StatBox
              icon={<Activity size={13} />}
              label="EPOCH"
              value={String(data.epoch)}
              sub={`${data.slotIndex.toLocaleString()} / ${data.slotsInEpoch.toLocaleString()} slots`}
              color="#14F195"
            />
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
            <div
              style={{
                height: 6,
                background: "rgba(255,255,255,0.07)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${epochProgress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #14F195, #9945FF)",
                  borderRadius: 3,
                  transition: "width 0.5s ease",
                }}
              />
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

          {/* Last updated */}
          <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'Space Mono', monospace", textAlign: "right" }}>
            Updated {data.fetchedAt.toLocaleTimeString()}
          </div>
        </>
      ) : null}
    </div>
  );
}
