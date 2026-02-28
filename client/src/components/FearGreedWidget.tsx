/**
 * FearGreedWidget
 *
 * Design: Glassmorphic Space Dashboard
 * - Displays the Crypto Fear & Greed Index from Alternative.me API
 * - Shows current value with animated arc gauge, classification label,
 *   and a 30-day sparkline trend
 * - Color-coded: Extreme Fear (red) → Fear (orange) → Neutral (yellow)
 *   → Greed (lime) → Extreme Greed (green)
 */

import { useEffect, useState, useCallback } from "react";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, RefreshCw } from "lucide-react";

interface FngDataPoint {
  value: number;
  classification: string;
  timestamp: number;
  date: string;
}

interface FngState {
  current: FngDataPoint | null;
  history: FngDataPoint[];
  loading: boolean;
  error: boolean;
}

function getColor(value: number): string {
  if (value <= 25) return "#ef4444";   // Extreme Fear — red
  if (value <= 40) return "#f97316";   // Fear — orange
  if (value <= 60) return "#eab308";   // Neutral — yellow
  if (value <= 75) return "#84cc16";   // Greed — lime
  return "#22c55e";                     // Extreme Greed — green
}

function getGlowColor(value: number): string {
  if (value <= 25) return "rgba(239,68,68,0.4)";
  if (value <= 40) return "rgba(249,115,22,0.4)";
  if (value <= 60) return "rgba(234,179,8,0.4)";
  if (value <= 75) return "rgba(132,204,22,0.4)";
  return "rgba(34,197,94,0.4)";
}

// SVG arc gauge — draws a semicircle arc from left to right
function ArcGauge({ value }: { value: number }) {
  const color = getColor(value);
  const pct = value / 100;

  // Arc parameters
  const cx = 80, cy = 72, r = 58;
  const startAngle = Math.PI;           // 180° (left)
  const endAngle = 0;                   // 0° (right)
  const totalAngle = Math.PI;           // 180° sweep

  const valueAngle = Math.PI - pct * totalAngle; // from left going right

  const x1 = cx + r * Math.cos(Math.PI);
  const y1 = cy + r * Math.sin(Math.PI);
  const x2 = cx + r * Math.cos(valueAngle);
  const y2 = cy + r * Math.sin(valueAngle);

  const largeArc = pct > 0.5 ? 1 : 0;

  const bgX1 = cx + r * Math.cos(Math.PI);
  const bgY1 = cy + r * Math.sin(Math.PI);
  const bgX2 = cx + r * Math.cos(0);
  const bgY2 = cy + r * Math.sin(0);

  return (
    <svg width="160" height="90" viewBox="0 0 160 90" className="overflow-visible">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Background track */}
      <path
        d={`M ${bgX1} ${bgY1} A ${r} ${r} 0 0 1 ${bgX2} ${bgY2}`}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Value arc */}
      {pct > 0 && (
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          filter="url(#glow)"
          style={{ transition: "all 0.8s ease" }}
        />
      )}
      {/* Needle dot */}
      <circle
        cx={x2}
        cy={y2}
        r="6"
        fill={color}
        filter="url(#glow)"
        style={{ transition: "all 0.8s ease" }}
      />
      {/* Center value text */}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fill={color}
        fontSize="26"
        fontFamily="'Space Mono', monospace"
        fontWeight="700"
        filter="url(#glow)"
      >
        {value}
      </text>
      {/* Scale labels */}
      <text x="10" y="86" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="'DM Sans', sans-serif">Fear</text>
      <text x="118" y="86" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="'DM Sans', sans-serif">Greed</text>
    </svg>
  );
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-xs">
        <p className="text-white/60">{d.date}</p>
        <p style={{ color: getColor(d.value) }} className="font-mono font-bold">
          {d.value} — {d.classification}
        </p>
      </div>
    );
  }
  return null;
};

export default function FearGreedWidget() {
  const [state, setState] = useState<FngState>({
    current: null,
    history: [],
    loading: true,
    error: false,
  });

  const fetchFng = useCallback(async () => {
    try {
      const res = await fetch("https://api.alternative.me/fng/?limit=30&format=json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const points: FngDataPoint[] = (json.data as any[]).map((d) => ({
        value: parseInt(d.value),
        classification: d.value_classification,
        timestamp: parseInt(d.timestamp) * 1000,
        date: new Date(parseInt(d.timestamp) * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      }));
      // API returns newest first — reverse for chart
      const chronological = [...points].reverse();
      setState({
        current: points[0],
        history: chronological,
        loading: false,
        error: false,
      });
    } catch {
      setState((prev) => ({ ...prev, loading: false, error: true }));
    }
  }, []);

  useEffect(() => {
    fetchFng();
    const interval = setInterval(fetchFng, 60 * 60 * 1000); // refresh hourly
    return () => clearInterval(interval);
  }, [fetchFng]);

  const { current, history, loading, error } = state;
  const color = current ? getColor(current.value) : "#9945FF";
  const glowColor = current ? getGlowColor(current.value) : "rgba(153,69,255,0.3)";

  return (
    <div
      className="glass-card rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: "rgba(13,17,23,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color }} />
            <span className="text-xs font-mono tracking-widest text-white/40 uppercase">
              Fear &amp; Greed Index
            </span>
          </div>
          <p className="text-[10px] text-white/25 mt-0.5">Crypto Market Sentiment · Alternative.me</p>
        </div>
        <button
          onClick={fetchFng}
          className="text-white/30 hover:text-white/70 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center text-white/40 text-sm py-8">Unable to load index</div>
      ) : current ? (
        <>
          {/* Gauge + classification */}
          <div className="flex flex-col items-center gap-1">
            <ArcGauge value={current.value} />
            <div
              className="text-sm font-bold tracking-wide mt-1 px-3 py-0.5 rounded-full"
              style={{
                color,
                background: glowColor,
                border: `1px solid ${color}40`,
              }}
            >
              {current.classification}
            </div>
            <p className="text-[10px] text-white/30 mt-1">
              Updated {new Date(current.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>

          {/* 30-day sparkline */}
          {history.length > 1 && (
            <div>
              <p className="text-[10px] font-mono tracking-widest text-white/30 uppercase mb-2">
                30-Day Trend
              </p>
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={history} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <defs>
                    <linearGradient id="fngGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={1.5}
                    fill="url(#fngGrad)"
                    dot={false}
                    activeDot={{ r: 3, fill: color }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Scale reference */}
          <div className="grid grid-cols-5 gap-0.5 mt-1">
            {[
              { label: "Extreme Fear", range: "0–25", color: "#ef4444" },
              { label: "Fear", range: "26–40", color: "#f97316" },
              { label: "Neutral", range: "41–60", color: "#eab308" },
              { label: "Greed", range: "61–75", color: "#84cc16" },
              { label: "Extreme Greed", range: "76–100", color: "#22c55e" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-0.5">
                <div className="w-full h-1 rounded-full" style={{ background: s.color }} />
                <span className="text-[8px] text-white/25 text-center leading-tight hidden sm:block">{s.range}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
