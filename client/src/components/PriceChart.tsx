/**
 * PriceChart component
 * 30-day Solana price history area chart with gradient fill.
 * Design: Glassmorphic Space Dashboard — teal-to-purple gradient area
 */

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
import { type PriceHistoryPoint } from "@/hooks/useCryptoData";

interface PriceChartProps {
  data: PriceHistoryPoint[];
  loading: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "rgba(13,21,48,0.95)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(20,241,149,0.25)",
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
            fontSize: 18,
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700,
            color: "#14F195",
          }}
        >
          ${Number(payload[0].value).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
    );
  }
  return null;
}

export default function PriceChart({ data, loading }: PriceChartProps) {
  const chartData = data.map((d) => ({
    date: new Date(d.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    price: d.price,
  }));

  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices) * 0.98;
  const maxPrice = Math.max(...prices) * 1.02;

  return (
    <div
      className="glass-card"
      style={{ padding: "24px 20px 16px 20px" }}
    >
      <div className="flex items-center justify-between mb-4">
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
            SOL Price History
          </h3>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            30-DAY TREND
          </div>
        </div>
        <div
          style={{
            background: "rgba(20,241,149,0.1)",
            border: "1px solid rgba(20,241,149,0.2)",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 12,
            color: "#14F195",
            fontFamily: "'Space Mono', monospace",
          }}
        >
          USD
        </div>
      </div>

      {loading && data.length === 0 ? (
        <div
          style={{
            height: 220,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.3)",
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Loading chart data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="solGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14F195" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#9945FF" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{
                fill: "rgba(255,255,255,0.35)",
                fontSize: 10,
                fontFamily: "'Space Mono', monospace",
              }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              tick={{
                fill: "rgba(255,255,255,0.35)",
                fontSize: 10,
                fontFamily: "'Space Mono', monospace",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${Math.round(v)}`}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#14F195"
              strokeWidth={2}
              fill="url(#solGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "#14F195",
                stroke: "rgba(20,241,149,0.3)",
                strokeWidth: 4,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
