/**
 * PriceChart component
 * Solana price history area chart with 7D / 30D / 90D range selector.
 * Design: Glassmorphic Space Dashboard — teal-to-purple gradient area
 */

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { type PriceHistoryPoint } from "@/hooks/useCryptoData";

interface PriceChartProps {
  data: PriceHistoryPoint[];
  loading: boolean;
}

type Range = 7 | 30 | 90;

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
  const [range, setRange] = useState<Range>(30);

  const sliced = useMemo(() => {
    if (data.length === 0) return [];
    return data.slice(-range);
  }, [data, range]);

  const chartData = sliced.map((d) => ({
    date: new Date(d.timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    price: d.price,
  }));

  const prices = chartData.map((d) => d.price);
  const minRaw = prices.length ? Math.min(...prices) : 0;
  const maxRaw = prices.length ? Math.max(...prices) : 0;
  const minPrice = prices.length ? minRaw * 0.98 : 0;
  const maxPrice = prices.length ? maxRaw * 1.02 : 1;
  const first = prices[0] ?? 0;
  const last = prices[prices.length - 1] ?? 0;
  const periodChange = first > 0 ? ((last - first) / first) * 100 : 0;
  const periodPositive = periodChange >= 0;

  const xInterval = range === 7 ? 0 : range === 30 ? 4 : 12;

  return (
    <div
      className="glass-card"
      style={{ padding: "24px 20px 16px 20px", display: "flex", flexDirection: "column", height: "100%" }}
    >
      <div className="flex items-center justify-between mb-3 gap-3" style={{ flexWrap: "wrap" }}>
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
              color: periodPositive ? "#14F195" : "#FF6B6B",
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
            }}
          >
            {prices.length === 0
              ? `${range}-DAY TREND`
              : `${periodPositive ? "+" : ""}${periodChange.toFixed(2)}% · ${range}D`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              padding: 3,
              gap: 2,
            }}
            role="tablist"
            aria-label="Chart range"
          >
            {([7, 30, 90] as Range[]).map((r) => {
              const selected = range === r;
              return (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setRange(r)}
                  style={{
                    background: selected ? "rgba(20,241,149,0.15)" : "transparent",
                    border: selected ? "1px solid rgba(20,241,149,0.35)" : "1px solid transparent",
                    color: selected ? "#14F195" : "rgba(255,255,255,0.5)",
                    borderRadius: 6,
                    padding: "3px 9px",
                    fontSize: 11,
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 700,
                  }}
                >
                  {r}D
                </button>
              );
            })}
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
      </div>

      {prices.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 10,
            fontSize: 11,
            fontFamily: "'Space Mono', monospace",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          <span>
            LOW <span style={{ color: "rgba(255,255,255,0.85)" }}>${minRaw.toFixed(2)}</span>
          </span>
          <span>
            HIGH <span style={{ color: "rgba(255,255,255,0.85)" }}>${maxRaw.toFixed(2)}</span>
          </span>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 220 }}>
      {loading && data.length === 0 ? (
        <div
          style={{
            height: "100%",
            minHeight: 220,
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
      ) : chartData.length === 0 ? (
        <div
          style={{
            height: "100%",
            minHeight: 220,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.35)",
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          No price history available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
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
              interval={xInterval}
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
    </div>
  );
}
