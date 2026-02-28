/**
 * StakeSinceTracker
 *
 * Design: Glassmorphic Space Dashboard
 * - SOL green (#14F195) + electric purple (#9945FF) accents
 * - Space Mono for numbers, DM Sans for UI text
 *
 * Tracks:
 * - Days staked since user-entered start date
 * - Estimated rewards earned to date (compound interest from start date)
 * - Effective annualised return since inception
 * - Daily reward rate
 * - Cumulative reward chart from stake date to today
 */

import { useState, useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CalendarDays, TrendingUp, Coins, Clock } from "lucide-react";

const INITIAL_STAKE = 100.22;
const STORAGE_KEY = "sol_stake_start_date";

function loadSavedDate(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveDate(date: string) {
  try {
    localStorage.setItem(STORAGE_KEY, date);
  } catch {}
}

interface DailyPoint {
  date: string;
  rewards: number;
  total: number;
}

function buildDailyHistory(startDate: Date, apy: number): DailyPoint[] {
  const dailyRate = apy / 100 / 365;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const points: DailyPoint[] = [];
  const diffMs = today.getTime() - start.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (totalDays <= 0) return [];

  // Sample at most 90 points for chart performance
  const step = Math.max(1, Math.floor(totalDays / 90));

  for (let d = 0; d <= totalDays; d += step) {
    const compounded = INITIAL_STAKE * Math.pow(1 + dailyRate, d);
    const rewards = compounded - INITIAL_STAKE;
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    points.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      rewards: parseFloat(rewards.toFixed(4)),
      total: parseFloat(compounded.toFixed(4)),
    });
  }

  // Always include today as last point
  const lastCompounded = INITIAL_STAKE * Math.pow(1 + dailyRate, totalDays);
  const lastRewards = lastCompounded - INITIAL_STAKE;
  const lastDate = new Date(today);
  const lastPoint = {
    date: lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    rewards: parseFloat(lastRewards.toFixed(4)),
    total: parseFloat(lastCompounded.toFixed(4)),
  };
  if (points.length === 0 || points[points.length - 1].date !== lastPoint.date) {
    points.push(lastPoint);
  }

  return points;
}

const CustomTooltip = ({ active, payload, label, solPrice }: any) => {
  if (active && payload && payload.length) {
    const rewards = payload[0]?.value ?? 0;
    const total = payload[1]?.value ?? 0;
    return (
      <div
        style={{
          background: "rgba(13,21,48,0.97)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(20,241,149,0.2)",
          borderRadius: 10,
          padding: "10px 14px",
          minWidth: 150,
        }}
      >
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif" }}>Rewards Earned</div>
          <div style={{ fontSize: 15, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#14F195" }}>
            +{rewards.toFixed(4)} SOL
          </div>
          {solPrice > 0 && (
            <div style={{ fontSize: 11, color: "rgba(20,241,149,0.5)", fontFamily: "'Space Mono', monospace" }}>
              ≈ ${(rewards * solPrice).toFixed(2)}
            </div>
          )}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 4, marginTop: 4 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif" }}>Total Staked</div>
          <div style={{ fontSize: 13, fontFamily: "'Space Mono', monospace", color: "rgba(255,255,255,0.7)" }}>
            {total.toFixed(4)} SOL
          </div>
        </div>
      </div>
    );
  }
  return null;
};

interface StakeSinceTrackerProps {
  apy: number;
  solPrice: number;
}

export default function StakeSinceTracker({ apy, solPrice }: StakeSinceTrackerProps) {
  const [dateInput, setDateInput] = useState<string>(() => loadSavedDate());
  const [editing, setEditing] = useState(!loadSavedDate());

  const startDate = useMemo(() => {
    if (!dateInput) return null;
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }, [dateInput]);

  const handleDateChange = useCallback((val: string) => {
    setDateInput(val);
    saveDate(val);
  }, []);

  const handleConfirm = useCallback(() => {
    if (startDate) setEditing(false);
  }, [startDate]);

  // Core calculations
  const { daysStaked, rewardsEarned, totalNow, dailyReward, effectiveApy } = useMemo(() => {
    if (!startDate) return { daysStaked: 0, rewardsEarned: 0, totalNow: INITIAL_STAKE, dailyReward: 0, effectiveApy: 0 };
    const today = new Date();
    const diffMs = today.getTime() - startDate.getTime();
    const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const dailyRate = apy / 100 / 365;
    const total = INITIAL_STAKE * Math.pow(1 + dailyRate, days);
    const rewards = total - INITIAL_STAKE;
    const daily = INITIAL_STAKE * dailyRate;
    // Effective APY from actual growth
    const effectiveA = days > 0 ? ((rewards / INITIAL_STAKE) / days) * 365 * 100 : apy;
    return {
      daysStaked: days,
      rewardsEarned: rewards,
      totalNow: total,
      dailyReward: daily,
      effectiveApy: effectiveA,
    };
  }, [startDate, apy]);

  const history = useMemo(() => {
    if (!startDate || daysStaked <= 0) return [];
    return buildDailyHistory(startDate, apy);
  }, [startDate, apy, daysStaked]);

  const weeksStaked = Math.floor(daysStaked / 7);
  const monthsStaked = Math.floor(daysStaked / 30.44);

  return (
    <div
      className="glass-card animate-fade-in-up stagger-4"
      style={{
        padding: 24,
        opacity: 0,
        animationFillMode: "forwards",
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5" style={{ flexWrap: "wrap", gap: 10 }}>
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays size={15} color="#14F195" />
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Stake Since Date
            </h3>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono', monospace", marginTop: 2 }}>
            CUMULATIVE REWARDS SINCE INCEPTION
          </p>
        </div>

        {/* Date input / edit button */}
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateInput}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => handleDateChange(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(20,241,149,0.3)",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 13,
                color: "rgba(255,255,255,0.85)",
                fontFamily: "'Space Mono', monospace",
                outline: "none",
                colorScheme: "dark",
              }}
            />
            <button
              onClick={handleConfirm}
              disabled={!startDate}
              style={{
                background: startDate ? "rgba(20,241,149,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${startDate ? "rgba(20,241,149,0.4)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                color: startDate ? "#14F195" : "rgba(255,255,255,0.3)",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                cursor: startDate ? "pointer" : "not-allowed",
                transition: "all 0.15s",
              }}
            >
              Confirm
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              Since{" "}
              {startDate?.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <button
              onClick={() => setEditing(true)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 11,
                color: "rgba(255,255,255,0.45)",
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              Edit date
            </button>
          </div>
        )}
      </div>

      {/* Prompt when no date set */}
      {!startDate && (
        <div
          style={{
            textAlign: "center",
            padding: "32px 16px",
            color: "rgba(255,255,255,0.3)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: 12,
          }}
        >
          <CalendarDays size={28} color="rgba(20,241,149,0.3)" style={{ margin: "0 auto 10px" }} />
          <p>Enter the date you first staked to see your cumulative rewards since inception.</p>
        </div>
      )}

      {/* Stats when date is set */}
      {startDate && daysStaked > 0 && (
        <>
          {/* Key stats row */}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              marginBottom: 20,
            }}
          >
            {/* Days staked */}
            <div
              style={{
                background: "rgba(20,241,149,0.06)",
                border: "1px solid rgba(20,241,149,0.15)",
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={11} color="rgba(20,241,149,0.6)" />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Time Staked
                </span>
              </div>
              <div style={{ fontSize: 22, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#14F195", lineHeight: 1.1 }}>
                {daysStaked}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
                days{weeksStaked > 0 ? ` · ${weeksStaked}w` : ""}{monthsStaked > 0 ? ` · ${monthsStaked}mo` : ""}
              </div>
            </div>

            {/* Rewards earned */}
            <div
              style={{
                background: "rgba(153,69,255,0.07)",
                border: "1px solid rgba(153,69,255,0.2)",
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Coins size={11} color="rgba(153,69,255,0.7)" />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Rewards Earned
                </span>
              </div>
              <div style={{ fontSize: 22, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#9945FF", lineHeight: 1.1 }}>
                +{rewardsEarned.toFixed(4)}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
                SOL{solPrice > 0 ? ` · ≈ $${(rewardsEarned * solPrice).toFixed(2)}` : ""}
              </div>
            </div>

            {/* Current total */}
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={11} color="rgba(255,255,255,0.4)" />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Est. Total Now
                </span>
              </div>
              <div style={{ fontSize: 22, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "rgba(255,255,255,0.85)", lineHeight: 1.1 }}>
                {totalNow.toFixed(4)}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
                SOL{solPrice > 0 ? ` · ≈ $${(totalNow * solPrice).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : ""}
              </div>
            </div>

            {/* Daily reward */}
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <CalendarDays size={11} color="rgba(255,255,255,0.4)" />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Daily Reward
                </span>
              </div>
              <div style={{ fontSize: 22, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "rgba(255,255,255,0.85)", lineHeight: 1.1 }}>
                +{dailyReward.toFixed(5)}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
                SOL / day{solPrice > 0 ? ` · ≈ $${(dailyReward * solPrice).toFixed(3)}` : ""}
              </div>
            </div>
          </div>

          {/* Effective APY badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(20,241,149,0.07)",
              border: "1px solid rgba(20,241,149,0.18)",
              borderRadius: 8,
              padding: "6px 14px",
              marginBottom: 20,
            }}
          >
            <TrendingUp size={12} color="#14F195" />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif" }}>
              Effective annualised return since inception:
            </span>
            <span style={{ fontSize: 14, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#14F195" }}>
              {effectiveApy.toFixed(2)}%
            </span>
          </div>

          {/* Cumulative rewards chart */}
          {history.length > 1 && (
            <div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Cumulative Rewards Since {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="sinceRewardGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9945FF" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#9945FF" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "'Space Mono', monospace" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: "'Space Mono', monospace" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `+${v.toFixed(3)}`}
                    width={58}
                  />
                  <Tooltip content={<CustomTooltip solPrice={solPrice} />} />
                  <Area
                    type="monotone"
                    dataKey="rewards"
                    stroke="#9945FF"
                    strokeWidth={2}
                    fill="url(#sinceRewardGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#9945FF", stroke: "rgba(153,69,255,0.3)", strokeWidth: 3 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="rgba(20,241,149,0.4)"
                    strokeWidth={1}
                    fill="none"
                    dot={false}
                    activeDot={{ r: 3, fill: "#14F195" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Sans', sans-serif", marginTop: 8 }}>
                Purple area = cumulative rewards earned. Green line = total staked balance. Based on {apy.toFixed(2)}% APY compounded daily. Estimates only.
              </p>
            </div>
          )}

          {/* Zero days message */}
          {daysStaked === 0 && (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, padding: "16px 0" }}>
              Stake date is today — check back tomorrow to see your first rewards.
            </div>
          )}
        </>
      )}
    </div>
  );
}
