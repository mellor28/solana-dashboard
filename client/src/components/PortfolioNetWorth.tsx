/**
 * PortfolioNetWorth — Combined portfolio total card
 * Design: Glassmorphic Space Dashboard
 * Shows total net worth across staked SOL + staked JUP in USD
 * Updates live with every price refresh
 */

import { useMemo } from "react";
import { TrendingUp, Wallet, Layers } from "lucide-react";

interface PortfolioNetWorthProps {
  solPrice: number;
  solStaked: number;
  jupPrice: number;
  jupAmount: number;
  loading?: boolean;
}

export default function PortfolioNetWorth({
  solPrice,
  solStaked,
  jupPrice,
  jupAmount,
  loading,
}: PortfolioNetWorthProps) {
  const solValue = useMemo(() => solStaked * solPrice, [solStaked, solPrice]);
  const jupValue = useMemo(() => jupAmount * jupPrice, [jupAmount, jupPrice]);
  const totalValue = useMemo(() => solValue + jupValue, [solValue, jupValue]);

  const solPct = totalValue > 0 ? (solValue / totalValue) * 100 : 0;
  const jupPct = totalValue > 0 ? (jupValue / totalValue) * 100 : 0;

  const fmt = (n: number) =>
    n >= 1000
      ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `$${n.toFixed(2)}`;

  const fmtSmall = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

  return (
    <div
      id="portfolio"
      className="glass-card"
      style={{
        padding: "24px 28px",
        marginBottom: 28,
        background:
          "linear-gradient(135deg, rgba(20,241,149,0.06) 0%, rgba(153,69,255,0.08) 50%, rgba(6,9,26,0.6) 100%)",
        border: "1px solid rgba(20,241,149,0.2)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow accent */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(20,241,149,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(20,241,149,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Wallet size={18} color="#14F195" />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.95)", fontFamily: "'DM Sans', sans-serif" }}>
              Portfolio Net Worth
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>
              STAKED SOL + STAKED JUP
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <TrendingUp size={14} color="#14F195" />
          <span style={{ fontSize: 11, color: "#14F195", fontFamily: "'Space Mono', monospace" }}>LIVE</span>
        </div>
      </div>

      {/* Total value — big display */}
      <div style={{ marginBottom: 24 }}>
        {loading ? (
          <div style={{ height: 52, background: "rgba(255,255,255,0.05)", borderRadius: 8, width: "60%", animation: "pulse 1.5s ease-in-out infinite" }} />
        ) : (
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              fontFamily: "'Space Mono', monospace",
              background: "linear-gradient(90deg, #14F195 0%, #9945FF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1.1,
            }}
          >
            {fmt(totalValue)}
          </div>
        )}
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
          Total estimated value in USD
        </div>
      </div>

      {/* Breakdown bar */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            height: 8,
            borderRadius: 4,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
            display: "flex",
          }}
        >
          <div
            style={{
              width: `${solPct}%`,
              background: "linear-gradient(90deg, #14F195, #0ac97a)",
              transition: "width 0.6s ease",
            }}
          />
          <div
            style={{
              width: `${jupPct}%`,
              background: "linear-gradient(90deg, #9945FF, #c47aff)",
              transition: "width 0.6s ease",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 11, color: "#14F195", fontFamily: "'Space Mono', monospace" }}>
            SOL {solPct.toFixed(1)}%
          </span>
          <span style={{ fontSize: 11, color: "#9945FF", fontFamily: "'Space Mono', monospace" }}>
            JUP {jupPct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Asset breakdown cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* SOL card */}
        <div
          style={{
            background: "rgba(20,241,149,0.07)",
            border: "1px solid rgba(20,241,149,0.15)",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Layers size={13} color="#14F195" />
            <span style={{ fontSize: 12, color: "#14F195", fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
              SOL STAKED
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#14F195", fontFamily: "'Space Mono', monospace", marginBottom: 2 }}>
            {loading ? "—" : fmt(solValue)}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
            {fmtSmall(solStaked)} SOL @ ${solPrice > 0 ? solPrice.toFixed(2) : "—"}
          </div>
        </div>

        {/* JUP card */}
        <div
          style={{
            background: "rgba(153,69,255,0.07)",
            border: "1px solid rgba(153,69,255,0.15)",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Layers size={13} color="#9945FF" />
            <span style={{ fontSize: 12, color: "#9945FF", fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
              JUP STAKED
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#9945FF", fontFamily: "'Space Mono', monospace", marginBottom: 2 }}>
            {loading ? "—" : fmt(jupValue)}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
            {jupAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} JUP @ ${jupPrice > 0 ? jupPrice.toFixed(4) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
