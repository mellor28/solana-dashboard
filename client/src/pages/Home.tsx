/**
 * Home page — Solana Dashboard
 * Assembles all dashboard sections: Navbar, Hero, Price Chart, Crypto Table,
 * Adoption Metrics, and Staking Tracker.
 * Design: Glassmorphic Space Dashboard
 * - Deep space background (#06091a)
 * - Glass cards with backdrop blur
 * - Space Mono for numbers, DM Sans for UI
 * - Solana green (#14F195) + electric purple (#9945FF) accents
 */

import { useCryptoData } from "@/hooks/useCryptoData";
import ParticleBackground from "@/components/ParticleBackground";
import Navbar from "@/components/Navbar";
import SolanaHero from "@/components/SolanaHero";
import PriceChart from "@/components/PriceChart";
import CryptoTable from "@/components/CryptoTable";
import AdoptionMetrics from "@/components/AdoptionMetrics";
import StakingTracker from "@/components/StakingTracker";
import FearGreedWidget from "@/components/FearGreedWidget";
import StakeSinceTracker from "@/components/StakeSinceTracker";
import { useMarinadeApy } from "@/hooks/useMarinadeApy";
import { AlertCircle } from "lucide-react";

export default function Home() {
  const {
    solana,
    topCoins,
    solanaHistory,
    solanaTvl,
    solanaDetail,
    loading,
    error,
    lastUpdated,
    refresh,
  } = useCryptoData();

  const priceChange7d = solanaDetail?.market_data?.price_change_percentage_7d;
  const priceChange30d = solanaDetail?.market_data?.price_change_percentage_30d;
  const { apy30d } = useMarinadeApy();
  const activeApy = apy30d?.apy ?? 6.10;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #06091a 0%, #0a0f24 40%, #0d1530 70%, #06091a 100%)",
        position: "relative",
      }}
    >
      {/* Animated particle background */}
      <ParticleBackground />

      {/* Fixed gradient orbs */}
      <div
        style={{
          position: "fixed",
          top: "10%",
          right: "5%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(153,69,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "20%",
          left: "5%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(20,241,149,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Navbar lastUpdated={lastUpdated} onRefresh={refresh} loading={loading} />

        <main className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
          {/* Error banner */}
          {error && (
            <div
              style={{
                background: "rgba(255,184,0,0.1)",
                border: "1px solid rgba(255,184,0,0.25)",
                borderRadius: 10,
                padding: "10px 16px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "#FFB800",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <AlertCircle size={15} />
              {error} Data may be from cache or estimated.
            </div>
          )}

          {/* Hero Section */}
          <SolanaHero
            solana={solana}
            loading={loading}
            priceChange7d={priceChange7d}
            priceChange30d={priceChange30d}
          />

          {/* Price Chart + Quick Stats + Fear & Greed */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
              gap: 16,
              marginBottom: 28,
            }}
            className="flex-col-on-mobile"
          >
            <PriceChart data={solanaHistory} loading={loading} />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              className="glass-card"
              style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.9)",
                    fontFamily: "'DM Sans', sans-serif",
                    marginBottom: 2,
                  }}
                >
                  SOL Quick Stats
                </h3>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  KEY METRICS
                </div>
              </div>

              {[
                {
                  label: "30d Change",
                  value: priceChange30d != null
                    ? `${priceChange30d >= 0 ? "+" : ""}${priceChange30d.toFixed(2)}%`
                    : "—",
                  positive: (priceChange30d ?? 0) >= 0,
                },
                {
                  label: "All-Time High",
                  value: solanaDetail?.market_data?.ath?.usd
                    ? `$${solanaDetail.market_data.ath.usd.toFixed(2)}`
                    : "—",
                  positive: undefined,
                },
                {
                  label: "ATH Distance",
                  value: solanaDetail?.market_data?.ath_change_percentage?.usd != null
                    ? `${solanaDetail.market_data.ath_change_percentage.usd.toFixed(1)}%`
                    : "—",
                  positive: false,
                },
                {
                  label: "Market Cap Rank",
                  value: solana?.market_cap_rank ? `#${solana.market_cap_rank}` : "—",
                  positive: undefined,
                },
                {
                  label: "Circulating Supply",
                  value: solana?.circulating_supply
                    ? `${(solana.circulating_supply / 1e6).toFixed(1)}M SOL`
                    : "—",
                  positive: undefined,
                },
                {
                  label: "24h Volume / MCap",
                  value:
                    solana?.total_volume && solana?.market_cap
                      ? `${((solana.total_volume / solana.market_cap) * 100).toFixed(2)}%`
                      : "—",
                  positive: undefined,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.5)",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {stat.label}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: "'Space Mono', monospace",
                      fontWeight: 700,
                      color:
                        stat.positive === undefined
                          ? "rgba(255,255,255,0.85)"
                          : stat.positive
                          ? "#14F195"
                          : "#FF6B6B",
                    }}
                  >
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>

              {/* Fear & Greed Widget */}
              <FearGreedWidget />
            </div>
          </div>

          {/* Crypto market table */}
          <div style={{ marginBottom: 32 }}>
            <CryptoTable coins={topCoins} loading={loading} />
          </div>

          {/* Adoption Metrics */}
          <AdoptionMetrics
            solanaTvl={solanaTvl}
            solanaDetail={solanaDetail}
            loading={loading}
          />

          {/* Stake Since Date Tracker */}
          <StakeSinceTracker apy={activeApy} solPrice={solana?.current_price ?? 0} />

          {/* Staking Tracker */}
          <StakingTracker solPrice={solana?.current_price ?? 0} />

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              paddingTop: 24,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.25)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              Data from CoinGecko & DeFiLlama · Refreshes every 5 minutes · Not financial advice
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.15)",
                fontFamily: "'DM Sans', sans-serif",
                marginTop: 4,
              }}
            >
              Staking projections are estimates based on compound interest. APY varies with network conditions.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
