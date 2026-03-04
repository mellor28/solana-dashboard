/**
 * AdoptionMetrics component — TVL only
 * Shows Solana DeFi Total Value Locked chart (90-day trend).
 * Design: Glassmorphic Space Dashboard
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { type TvlDataPoint, type SolanaDetailData } from "@/hooks/useCryptoData";
import { useCountUp } from "@/hooks/useCountUp";

interface AdoptionMetricsProps {
  solanaTvl: TvlDataPoint[];
  solanaDetail: SolanaDetailData | null;
  loading: boolean;
}

function TvlTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "rgba(13,21,48,0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(153,69,255,0.25)",
          borderRadius: 10,
          padding: "10px 14px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.5)",
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 16,
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700,
            color: "#9945FF",
          }}
        >
          ${Number(payload[0].value).toFixed(2)}B
        </div>
      </div>
    );
  }
  return null;
}

export default function AdoptionMetrics({
  solanaTvl,
  loading,
}: AdoptionMetricsProps) {
  const currentTvl = solanaTvl.length > 0 ? solanaTvl[solanaTvl.length - 1].tvl : 0;
  const prevTvl = solanaTvl.length > 7 ? solanaTvl[solanaTvl.length - 8].tvl : 0;
  const tvlChange = prevTvl > 0 ? ((currentTvl - prevTvl) / prevTvl) * 100 : 0;

  const animatedTvl = useCountUp(currentTvl, 1200, 2);

  return (
    <section id="adoption" style={{ marginBottom: 32 }}>
      {/* TVL Card — full width */}
      <div
        className="glass-card animate-fade-in-up"
        style={{
          padding: "24px",
          opacity: 0,
          animationFillMode: "forwards",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "rgba(255,255,255,0.95)",
                fontFamily: "'DM Sans', sans-serif",
                marginBottom: 2,
              }}
            >
              Total Value Locked
            </h3>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              SOLANA DEFI TVL · 90-DAY TREND
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background:
                tvlChange >= 0
                  ? "rgba(20,241,149,0.12)"
                  : "rgba(255,107,107,0.12)",
              border: `1px solid ${tvlChange >= 0 ? "rgba(20,241,149,0.25)" : "rgba(255,107,107,0.25)"}`,
              borderRadius: 8,
              padding: "4px 12px",
              fontSize: 13,
              color: tvlChange >= 0 ? "#14F195" : "#FF6B6B",
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
            }}
          >
            {tvlChange >= 0 ? "+" : ""}
            {tvlChange.toFixed(1)}% 7d
          </div>
        </div>

        <div
          style={{
            fontSize: 36,
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700,
            color: "#9945FF",
            marginBottom: 20,
          }}
        >
          ${animatedTvl.toFixed(2)}B
        </div>

        {loading && solanaTvl.length === 0 ? (
          <div
            style={{
              height: 180,
              background: "rgba(255,255,255,0.04)",
              borderRadius: 8,
            }}
          />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={solanaTvl}
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9945FF" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#9945FF" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{
                  fill: "rgba(255,255,255,0.3)",
                  fontSize: 9,
                  fontFamily: "'Space Mono', monospace",
                }}
                axisLine={false}
                tickLine={false}
                interval={14}
              />
              <YAxis
                tick={{
                  fill: "rgba(255,255,255,0.3)",
                  fontSize: 9,
                  fontFamily: "'Space Mono', monospace",
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}B`}
                width={42}
              />
              <Tooltip content={<TvlTooltip />} />
              <Area
                type="monotone"
                dataKey="tvl"
                stroke="#9945FF"
                strokeWidth={2}
                fill="url(#tvlGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
