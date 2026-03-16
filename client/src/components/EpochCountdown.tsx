/**
 * EpochCountdown — Live Solana epoch progress and countdown to next epoch end.
 *
 * Fetches epoch info from Helius RPC (free tier, no rate limits for getEpochInfo).
 * Solana epoch = 432,000 slots, ~0.4s per slot = ~2 days per epoch.
 * Refreshes every 5 minutes.
 *
 * Design: Glassmorphic Space Dashboard
 */

import { useState, useEffect, useCallback } from "react";
import { Clock, RefreshCw } from "lucide-react";

// Public Solana RPC — no API key required
const HELIUS_RPC = "https://solana-rpc.publicnode.com";
const SLOT_DURATION_S = 0.4; // ~400ms per slot

interface EpochInfo {
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  secondsRemaining: number;
}

async function fetchEpochInfo(): Promise<EpochInfo> {
  const res = await fetch(HELIUS_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getEpochInfo", params: [] }),
  });
  const data = await res.json();
  const r = data.result;
  const slotsRemaining = r.slotsInEpoch - r.slotIndex;
  return {
    epoch: r.epoch,
    slotIndex: r.slotIndex,
    slotsInEpoch: r.slotsInEpoch,
    secondsRemaining: slotsRemaining * SLOT_DURATION_S,
  };
}

function formatDuration(seconds: number): { d: number; h: number; m: number; s: number } {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return { d, h, m, s };
}

interface Props {
  compact?: boolean;
}

export default function EpochCountdown({ compact = false }: Props) {
  const [epochInfo, setEpochInfo] = useState<EpochInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const info = await fetchEpochInfo();
      setEpochInfo(info);
      setCountdown(info.secondsRemaining);
      setLastFetched(new Date());
    } catch (e) {
      // silently fail — countdown just stops
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and every 5 minutes
  useEffect(() => {
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  // Tick down every second
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const progress = epochInfo
    ? ((epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100)
    : 0;

  const { d, h, m, s } = formatDuration(countdown);

  const isNearEnd = countdown < 3600 * 6; // < 6 hours

  if (compact) {
    // Inline pill for use inside the staking section header
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderRadius: 8,
          background: isNearEnd
            ? "rgba(255,165,0,0.1)"
            : "rgba(153,69,255,0.08)",
          border: `1px solid ${isNearEnd ? "rgba(255,165,0,0.25)" : "rgba(153,69,255,0.2)"}`,
        }}
      >
        <Clock size={12} color={isNearEnd ? "#FFA500" : "#9945FF"} />
        {loading ? (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>
            …
          </span>
        ) : (
          <span
            style={{
              fontSize: 11,
              fontFamily: "'Space Mono', monospace",
              color: isNearEnd ? "#FFA500" : "#9945FF",
              fontWeight: 600,
            }}
          >
            Epoch {epochInfo?.epoch} · {d > 0 ? `${d}d ` : ""}{h}h {m}m left
          </span>
        )}
      </div>
    );
  }

  // Full card
  return (
    <div
      className="glass-card"
      style={{
        padding: "20px 24px",
        marginBottom: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(153,69,255,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={15} color="#9945FF" />
          <span
            style={{
              fontSize: 12,
              fontFamily: "'Space Mono', monospace",
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Solana Epoch {loading ? "…" : epochInfo?.epoch}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isNearEnd && !loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 6,
                background: "rgba(255,165,0,0.12)",
                border: "1px solid rgba(255,165,0,0.3)",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#FFA500",
                  boxShadow: "0 0 6px #FFA500",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
              <span style={{ fontSize: 10, color: "#FFA500", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                Epoch ending soon — sync your balance!
              </span>
            </div>
          )}
          <button
            onClick={load}
            title="Refresh epoch info"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <RefreshCw size={11} color="rgba(255,255,255,0.35)" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: "rgba(255,255,255,0.07)",
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            borderRadius: 3,
            background: isNearEnd
              ? "linear-gradient(90deg, #9945FF, #FFA500)"
              : "linear-gradient(90deg, #9945FF, #14F195)",
            transition: "width 1s linear",
          }}
        />
      </div>

      {/* Countdown + stats */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        {/* Countdown digits */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          {loading ? (
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace" }}>
              Loading…
            </span>
          ) : (
            <>
              {d > 0 && (
                <>
                  <span style={{ fontSize: 22, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: isNearEnd ? "#FFA500" : "#9945FF" }}>{d}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif", marginRight: 6 }}>d</span>
                </>
              )}
              <span style={{ fontSize: 22, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: isNearEnd ? "#FFA500" : "#9945FF" }}>{String(h).padStart(2, "0")}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif", marginRight: 4 }}>h</span>
              <span style={{ fontSize: 22, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: isNearEnd ? "#FFA500" : "#9945FF" }}>{String(m).padStart(2, "0")}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif", marginRight: 4 }}>m</span>
              <span style={{ fontSize: 18, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "rgba(153,69,255,0.5)" }}>{String(s).padStart(2, "0")}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif" }}>s</span>
            </>
          )}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", marginLeft: 8 }}>
            until next epoch
          </span>
        </div>

        {/* Progress % */}
        {!loading && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
              {progress.toFixed(1)}%
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>
              {epochInfo?.slotIndex.toLocaleString()} / {epochInfo?.slotsInEpoch.toLocaleString()} slots
            </div>
          </div>
        )}
      </div>

      {lastFetched && (
        <div style={{ marginTop: 8, fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Sans', sans-serif" }}>
          Updated {lastFetched.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </div>
  );
}
