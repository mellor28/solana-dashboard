/**
 * JupiterWidget — shows staked JUP balance and net worth.
 * Uses live JUP price from Binance. Staked amount is manually set (2636.29 JUP).
 * Design: Glassmorphic Space Dashboard
 */

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

const STAKED_JUP = 2636.29;
const JUP_LOGO = "https://static.jup.ag/jup/icon.png";

export default function JupiterWidget() {
  const [jupPrice, setJupPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          "https://api.binance.com/api/v3/ticker/24hr?symbol=JUPUSDT"
        );
        const data = await res.json();
        setJupPrice(parseFloat(data.lastPrice));
        setChange24h(parseFloat(data.priceChangePercent));
      } catch {
        // fallback: try CoinGecko
        try {
          const res2 = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=jupiter-exchange-solana&vs_currencies=usd&include_24hr_change=true"
          );
          const d2 = await res2.json();
          const info = d2["jupiter-exchange-solana"];
          if (info) {
            setJupPrice(info.usd);
            setChange24h(info.usd_24h_change);
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const netWorthUsd = jupPrice ? STAKED_JUP * jupPrice : null;
  const isPositive = change24h !== null && change24h >= 0;

  return (
    <section id="jupiter" style={{ marginBottom: 32 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 3, height: 28, background: "linear-gradient(180deg, #C7F284 0%, #14F195 100%)", borderRadius: 2 }} />
        <div>
          <h2 style={{ fontSize: 20, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: "#fff", margin: 0 }}>
            Jupiter Staking
          </h2>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
            JUP · LOCKED VOTER ESCROW
          </p>
        </div>
        <a
          href="https://vote.jup.ag"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            color: "#C7F284",
            textDecoration: "none",
            background: "rgba(199,242,132,0.08)",
            border: "1px solid rgba(199,242,132,0.2)",
            borderRadius: 8,
            padding: "5px 12px",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
          }}
        >
          <ExternalLink size={12} />
          Jupiter Vote
        </a>
      </div>

      {/* Main card */}
      <div
        className="glass-card"
        style={{
          padding: "28px",
          background: "linear-gradient(135deg, rgba(199,242,132,0.04) 0%, rgba(20,241,149,0.03) 100%)",
          border: "1px solid rgba(199,242,132,0.12)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div style={{
          position: "absolute", top: -40, right: -40, width: 180, height: 180,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(199,242,132,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, position: "relative" }}>

          {/* Staked JUP */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <img src={JUP_LOGO} alt="JUP" style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(199,242,132,0.3)" }} />
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Staked JUP
                </div>
                <div style={{ fontSize: 10, color: "rgba(199,242,132,0.5)", fontFamily: "'DM Sans', sans-serif" }}>
                  Locked Voter Escrow
                </div>
              </div>
            </div>
            <div style={{ fontSize: 36, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#C7F284", lineHeight: 1 }}>
              {STAKED_JUP.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
              JUP tokens staked
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: "rgba(255,255,255,0.06)", alignSelf: "stretch", display: "none" }} className="divider-vertical" />

          {/* Live JUP price */}
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Live JUP Price
            </div>
            {loading ? (
              <div style={{ fontSize: 28, fontFamily: "'Space Mono', monospace", color: "rgba(255,255,255,0.2)" }}>—</div>
            ) : jupPrice !== null ? (
              <>
                <div style={{ fontSize: 36, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                  ${jupPrice.toFixed(4)}
                </div>
                {change24h !== null && (
                  <div style={{
                    marginTop: 6,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: isPositive ? "rgba(20,241,149,0.1)" : "rgba(255,107,107,0.1)",
                    border: `1px solid ${isPositive ? "rgba(20,241,149,0.2)" : "rgba(255,107,107,0.2)"}`,
                    fontSize: 12,
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 700,
                    color: isPositive ? "#14F195" : "#FF6B6B",
                  }}>
                    {isPositive ? "▲" : "▼"} {Math.abs(change24h).toFixed(2)}% 24h
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>Price unavailable</div>
            )}
          </div>

          {/* Net Worth */}
          <div style={{
            padding: "20px",
            borderRadius: 12,
            background: "rgba(199,242,132,0.06)",
            border: "1px solid rgba(199,242,132,0.15)",
          }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
              Net Worth (USD)
            </div>
            {loading ? (
              <div style={{ fontSize: 28, fontFamily: "'Space Mono', monospace", color: "rgba(255,255,255,0.2)" }}>—</div>
            ) : netWorthUsd !== null ? (
              <>
                <div style={{ fontSize: 32, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#C7F284", lineHeight: 1 }}>
                  ${netWorthUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 12, color: "rgba(199,242,132,0.5)", fontFamily: "'DM Sans', sans-serif", marginTop: 6 }}>
                  {STAKED_JUP.toLocaleString()} JUP × ${jupPrice!.toFixed(4)}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>Calculating...</div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
