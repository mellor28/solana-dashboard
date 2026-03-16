/**
 * EpochBanner — Full-width epoch countdown strip for the top of the dashboard.
 * Design: Glassmorphic Space Dashboard
 *
 * Reuses the same Helius RPC fetch as EpochCountdown but renders as a
 * horizontal banner: epoch number | countdown digits | progress bar | slot info
 *
 * Ticks every second. Refreshes from RPC every 5 minutes.
 */

import { useState, useEffect, useCallback } from "react";
import { Clock, RefreshCw } from "lucide-react";

// Public Solana RPC — no API key required
const HELIUS_RPC = "https://solana-rpc.publicnode.com";
const SLOT_DURATION_S = 0.4;

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

function formatDuration(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return { d, h, m, s };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function EpochBanner() {
  const [epochInfo, setEpochInfo] = useState<EpochInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(0);

  const load = useCallback(async () => {
    try {
      const info = await fetchEpochInfo();
      setEpochInfo(info);
      setCountdown(info.secondsRemaining);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => {
    const id = setInterval(load, 5 * 60_000);
    return () => clearInterval(id);
  }, [load]);

  // Tick every second
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const progress = epochInfo ? (epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100 : 0;
  const { d, h, m, s } = formatDuration(countdown);
  const isNearEnd = countdown < 3600 * 6; // < 6 hours remaining

  const accentColor = isNearEnd ? "#FFA500" : "#9945FF";
  const accentGlow = isNearEnd ? "rgba(255,165,0,0.15)" : "rgba(153,69,255,0.12)";
  const accentBorder = isNearEnd ? "rgba(255,165,0,0.25)" : "rgba(153,69,255,0.2)";

  return (
    <div
      className="glass-card"
      style={{
        padding: "14px 24px",
        marginBottom: 20,
        background: `linear-gradient(135deg, ${accentGlow} 0%, rgba(6,9,26,0.6) 100%)`,
        borderColor: accentBorder,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle background glow orb */}
      <div style={{
        position: "absolute",
        top: -40,
        right: 60,
        width: 160,
        height: 160,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${accentGlow} 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Main row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
        position: "relative",
      }}>
        {/* Epoch label */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
          <Clock size={14} color={accentColor} />
          <span style={{
            fontSize: 11,
            fontFamily: "'Space Mono', monospace",
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            Epoch
          </span>
          <span style={{
            fontSize: 15,
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700,
            color: accentColor,
          }}>
            {loading ? "…" : epochInfo?.epoch}
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

        {/* Countdown digits */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 3, flexShrink: 0 }}>
          {loading ? (
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace" }}>
              Loading…
            </span>
          ) : (
            <>
              {d > 0 && (
                <>
                  <span style={{ fontSize: 20, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: accentColor }}>{d}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif", marginRight: 5 }}>d</span>
                </>
              )}
              <span style={{ fontSize: 20, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: accentColor }}>{pad(h)}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif", marginRight: 3 }}>h</span>
              <span style={{ fontSize: 20, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: accentColor }}>{pad(m)}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif", marginRight: 3 }}>m</span>
              <span style={{ fontSize: 17, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: `${accentColor}88` }}>{pad(s)}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif" }}>s</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif", marginLeft: 8 }}>
                until next epoch
              </span>
            </>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

        {/* Progress bar + pct — takes remaining space */}
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace" }}>
              PROGRESS
            </span>
            <span style={{ fontSize: 12, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
              {loading ? "…" : `${progress.toFixed(1)}%`}
            </span>
          </div>
          <div style={{
            height: 4,
            borderRadius: 2,
            background: "rgba(255,255,255,0.07)",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${progress}%`,
              borderRadius: 2,
              background: isNearEnd
                ? "linear-gradient(90deg, #9945FF, #FFA500)"
                : "linear-gradient(90deg, #9945FF, #14F195)",
              transition: "width 1s linear",
              boxShadow: `0 0 6px ${accentColor}40`,
            }} />
          </div>
          {epochInfo && (
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'Space Mono', monospace", marginTop: 3 }}>
              {epochInfo.slotIndex.toLocaleString()} / {epochInfo.slotsInEpoch.toLocaleString()} slots
            </div>
          )}
        </div>

        {/* Near-end warning */}
        {isNearEnd && !loading && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 6,
            background: "rgba(255,165,0,0.1)",
            border: "1px solid rgba(255,165,0,0.3)",
            flexShrink: 0,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#FFA500",
              boxShadow: "0 0 6px #FFA500",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 10, color: "#FFA500", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
              Epoch ending soon
            </span>
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={load}
          title="Refresh epoch info"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6, padding: "5px 8px",
            cursor: "pointer", display: "flex", alignItems: "center",
            flexShrink: 0,
          }}
        >
          <RefreshCw size={11} color="rgba(255,255,255,0.35)" />
        </button>
      </div>
    </div>
  );
}
