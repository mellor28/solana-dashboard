/**
 * AdoptionMetrics component
 * Solana adoption section: TVL chart, network stats, DeFi metrics.
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
  BarChart,
  Bar,
} from "recharts";
import { Layers, Zap, Users, Globe, TrendingUp, Award } from "lucide-react";
import { type TvlDataPoint, type SolanaDetailData, formatCurrency } from "@/hooks/useCryptoData";
import { useCountUp } from "@/hooks/useCountUp";

interface AdoptionMetricsProps {
  solanaTvl: TvlDataPoint[];
  solanaDetail: SolanaDetailData | null;
  loading: boolean;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "#14F195",
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  delay?: number;
}) {
  return (
    <div
      className="glass-card animate-fade-in-up"
      style={{
        padding: "20px",
        animationDelay: `${delay}ms`,
        opacity: 0,
        animationFillMode: "forwards",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${color}18`,
            border: `1px solid ${color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={18} color={color} />
        </div>
      </div>
      <div
        style={{
          fontSize: 22,
          fontFamily: "'Space Mono', monospace",
          fontWeight: 700,
          color: "rgba(255,255,255,0.95)",
          marginBottom: 4,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.45)",
          fontFamily: "'DM Sans', sans-serif",
          marginBottom: sub ? 4 : 0,
        }}
      >
        {label}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 11,
            color,
            fontFamily: "'Space Mono', monospace",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
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

// Solana ecosystem stats (static/estimated data for items not available via free API)
const ECOSYSTEM_STATS = [
  { label: "Active Validators", value: "1,700+", icon: Layers, color: "#14F195" },
  { label: "TPS Capacity", value: "65,000", icon: Zap, color: "#9945FF" },
  { label: "DeFi Protocols", value: "200+", icon: Globe, color: "#00C2FF" },
  { label: "NFT Collections", value: "50,000+", icon: Award, color: "#FFB800" },
];

export default function AdoptionMetrics({
  solanaTvl,
  solanaDetail,
  loading,
}: AdoptionMetricsProps) {
  const currentTvl = solanaTvl.length > 0 ? solanaTvl[solanaTvl.length - 1].tvl : 0;
  const prevTvl = solanaTvl.length > 7 ? solanaTvl[solanaTvl.length - 8].tvl : 0;
  const tvlChange = prevTvl > 0 ? ((currentTvl - prevTvl) / prevTvl) * 100 : 0;

  const animatedTvl = useCountUp(currentTvl, 1200, 2);

  const twitterFollowers = solanaDetail?.community_data?.twitter_followers ?? 0;
  const githubStars = solanaDetail?.developer_data?.stars ?? 0;
  const commitCount = solanaDetail?.developer_data?.commit_count_4_weeks ?? 0;

  return (
    <section id="adoption" style={{ marginBottom: 32 }}>
      <div className="flex items-center gap-3 mb-6">
        <div
          style={{
            width: 4,
            height: 28,
            background: "linear-gradient(180deg, #9945FF, #14F195)",
            borderRadius: 2,
          }}
        />
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.2,
            }}
          >
            Solana Adoption
          </h2>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            NETWORK GROWTH & ECOSYSTEM METRICS
          </div>
        </div>
      </div>

      {/* TVL + Ecosystem grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* TVL Card */}
        <div
          className="glass-card animate-fade-in-up"
          style={{
            padding: "24px",
            gridColumn: "span 1",
            opacity: 0,
            animationFillMode: "forwards",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.9)",
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
                SOLANA DEFI TVL (90 DAYS)
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
                padding: "4px 10px",
                fontSize: 12,
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
              fontSize: 32,
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              color: "#9945FF",
              marginBottom: 16,
            }}
          >
            ${animatedTvl.toFixed(2)}B
          </div>

          {loading && solanaTvl.length === 0 ? (
            <div
              style={{
                height: 140,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 8,
              }}
            />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart
                data={solanaTvl}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
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

        {/* Community & Dev stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <MetricCard
            icon={Users}
            label="Twitter Followers"
            value={
              twitterFollowers > 0
                ? `${(twitterFollowers / 1e6).toFixed(1)}M`
                : "3.2M+"
            }
            sub="@solana"
            color="#00C2FF"
            delay={50}
          />
          <MetricCard
            icon={TrendingUp}
            label="GitHub Stars"
            value={githubStars > 0 ? `${(githubStars / 1e3).toFixed(1)}K` : "13K+"}
            sub="solana-labs"
            color="#9945FF"
            delay={100}
          />
          <MetricCard
            icon={Zap}
            label="Dev Commits (4w)"
            value={commitCount > 0 ? `${commitCount}` : "450+"}
            sub="Active development"
            color="#14F195"
            delay={150}
          />
          <MetricCard
            icon={Globe}
            label="ATH Price"
            value={
              solanaDetail?.market_data?.ath?.usd
                ? `$${solanaDetail.market_data.ath.usd.toFixed(0)}`
                : "$293"
            }
            sub={`${(solanaDetail?.market_data?.ath_change_percentage?.usd ?? -30).toFixed(1)}% from ATH`}
            color="#FFB800"
            delay={200}
          />
        </div>
      </div>

      {/* Ecosystem stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {ECOSYSTEM_STATS.map((stat, i) => (
          <div
            key={stat.label}
            className="glass-card animate-fade-in-up"
            style={{
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              animationDelay: `${i * 60}ms`,
              opacity: 0,
              animationFillMode: "forwards",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${stat.color}15`,
                border: `1px solid ${stat.color}25`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <stat.icon size={16} color={stat.color} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.9)",
                  lineHeight: 1.2,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
