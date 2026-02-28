/**
 * SolanaHero component
 * Full-width hero section showing Solana price, 24h change, market cap, volume.
 * Design: Glassmorphic Space Dashboard — gradient background, large mono price
 */

import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3 } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { formatCurrency, formatNumber, type CoinData } from "@/hooks/useCryptoData";

interface SolanaHeroProps {
  solana: CoinData | null;
  loading: boolean;
  priceChange7d?: number;
  priceChange30d?: number;
}

function StatBadge({
  label,
  value,
  icon: Icon,
  positive,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  positive?: boolean;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 140,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background:
            positive === undefined
              ? "rgba(20,241,149,0.12)"
              : positive
              ? "rgba(20,241,149,0.12)"
              : "rgba(255,107,107,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon
          size={16}
          color={
            positive === undefined
              ? "#14F195"
              : positive
              ? "#14F195"
              : "#FF6B6B"
          }
        />
      </div>
      <div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            fontFamily: "'DM Sans', sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 14,
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700,
            color:
              positive === undefined
                ? "rgba(255,255,255,0.9)"
                : positive
                ? "#14F195"
                : "#FF6B6B",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export default function SolanaHero({ solana, loading, priceChange7d, priceChange30d }: SolanaHeroProps) {
  const animatedPrice = useCountUp(solana?.current_price ?? 0, 1200, 2);
  const isPositive = (solana?.price_change_percentage_24h ?? 0) >= 0;

  return (
    <div
      id="overview"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 20,
        marginBottom: 24,
        minHeight: 260,
      }}
    >
      {/* Background image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663391148550/9YjZ5ypezntyiqzvBbZ3Lv/sol-hero-bg-D38vWkW3JRVMsMsb5TEN4t.webp)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.6,
        }}
      />
      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(6,9,26,0.85) 0%, rgba(13,21,48,0.7) 50%, rgba(6,9,26,0.6) 100%)",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "32px 36px",
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Price */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                style={{
                  background: "linear-gradient(135deg, #9945FF, #14F195)",
                  borderRadius: "50%",
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 20px rgba(20,241,149,0.4)",
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="18" viewBox="0 0 20 16" fill="none">
                  <path d="M2 12.5H14.5L18 9.5H5.5L2 12.5Z" fill="white" fillOpacity="0.9"/>
                  <path d="M2 6.5H14.5L18 3.5H5.5L2 6.5Z" fill="white" fillOpacity="0.9"/>
                  <path d="M5.5 9.5H18L14.5 6.5H2L5.5 9.5Z" fill="white" fillOpacity="0.7"/>
                </svg>
              </div>
              <div>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "white",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Solana
                </span>
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.45)",
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  SOL / USD
                </span>
              </div>
            </div>

            {loading && !solana ? (
              <div
                style={{
                  width: 220,
                  height: 64,
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ) : (
              <div className="flex items-baseline gap-4">
                <div
                  className="mono-number"
                  style={{
                    fontSize: 56,
                    fontWeight: 700,
                    color: "white",
                    lineHeight: 1,
                    textShadow: "0 0 30px rgba(20,241,149,0.3)",
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  ${animatedPrice.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: isPositive
                      ? "rgba(20,241,149,0.15)"
                      : "rgba(255,107,107,0.15)",
                    border: `1px solid ${isPositive ? "rgba(20,241,149,0.3)" : "rgba(255,107,107,0.3)"}`,
                    borderRadius: 8,
                    padding: "4px 10px",
                  }}
                >
                  {isPositive ? (
                    <TrendingUp size={14} color="#14F195" />
                  ) : (
                    <TrendingDown size={14} color="#FF6B6B" />
                  )}
                  <span
                    style={{
                      fontSize: 14,
                      fontFamily: "'Space Mono', monospace",
                      fontWeight: 700,
                      color: isPositive ? "#14F195" : "#FF6B6B",
                    }}
                  >
                    {isPositive ? "+" : ""}
                    {(solana?.price_change_percentage_24h ?? 0).toFixed(2)}%
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    24h
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Stats grid */}
          <div className="flex flex-wrap gap-3">
            <StatBadge
              label="Market Cap"
              value={formatCurrency(solana?.market_cap ?? 0)}
              icon={DollarSign}
            />
            <StatBadge
              label="24h Volume"
              value={formatCurrency(solana?.total_volume ?? 0)}
              icon={BarChart3}
            />
            <StatBadge
              label="7d Change"
              value={`${(priceChange7d ?? solana?.price_change_percentage_7d_in_currency ?? 0) >= 0 ? "+" : ""}${(priceChange7d ?? solana?.price_change_percentage_7d_in_currency ?? 0).toFixed(2)}%`}
              icon={TrendingUp}
              positive={(priceChange7d ?? solana?.price_change_percentage_7d_in_currency ?? 0) >= 0}
            />
            <StatBadge
              label="Circulating"
              value={`${formatNumber(solana?.circulating_supply ?? 0)} SOL`}
              icon={Activity}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
