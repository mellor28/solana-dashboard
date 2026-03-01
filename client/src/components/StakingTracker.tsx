/**
 * StakingTracker component
 * Personal Marinade Finance staking tracker with live APY from api.marinade.finance
 * and compound growth projections.
 *
 * Initial stake: 100.22 SOL
 * APY source: Marinade Finance public API — fetched live, refreshes every 15 min.
 * Primary APY: 30-day rolling (most stable signal for projections).
 * User can still override APY manually if desired.
 *
 * Design: Glassmorphic Space Dashboard
 * - SOL green (#14F195) + electric purple (#9945FF) accents
 * - Space Mono for numbers, DM Sans for UI text
 */

import { useState, useMemo, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Calendar,
  ExternalLink,
  Info,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
} from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { useMarinadeApy } from "@/hooks/useMarinadeApy";

const FALLBACK_APY = 6.10;
const MARINADE_URL = "https://marinade.finance";

interface StakingTrackerProps {
  solPrice: number;
  stakeAmount: number;
  originalStake: number;
  rewardsAccumulated: number;
  onStakeAmountChange: (amount: number) => void;
}

function generateProjections(
  principal: number,
  apy: number,
  months: number
): { month: string; monthNum: number; sol: number; rewards: number }[] {
  const monthlyRate = apy / 100 / 12;
  const data = [];
  const now = new Date();
  for (let i = 0; i <= months; i++) {
    const compounded = principal * Math.pow(1 + monthlyRate, i);
    const rewards = compounded - principal;
    const date = new Date(now);
    date.setMonth(date.getMonth() + i);
    data.push({
      month:
        i === 0
          ? "Now"
          : date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      monthNum: i,
      sol: parseFloat(compounded.toFixed(4)),
      rewards: parseFloat(rewards.toFixed(4)),
    });
  }
  return data;
}

function ProjectionTooltip({ active, payload, label, solPrice }: any) {
  if (active && payload && payload.length) {
    const sol = payload[0]?.value ?? 0;
    const rewards = payload[1]?.value ?? 0;
    return (
      <div
        style={{
          background: "rgba(13,21,48,0.97)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(20,241,149,0.25)",
          borderRadius: 12,
          padding: "12px 16px",
          minWidth: 160,
        }}
      >
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>
          {label}
        </div>
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>Total Staked</div>
          <div style={{ fontSize: 16, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#14F195" }}>
            {sol.toFixed(4)} SOL
          </div>
          {solPrice > 0 && (
            <div style={{ fontSize: 12, fontFamily: "'Space Mono', monospace", color: "rgba(255,255,255,0.5)" }}>
              ≈ ${(sol * solPrice).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
          )}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 6, marginTop: 6 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>Rewards Earned</div>
          <div style={{ fontSize: 14, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#9945FF" }}>
            +{rewards.toFixed(4)} SOL
          </div>
          {solPrice > 0 && (
            <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "rgba(153,69,255,0.6)" }}>
              ≈ ${(rewards * solPrice).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export default function StakingTracker({ solPrice, stakeAmount, originalStake, rewardsAccumulated, onStakeAmountChange }: StakingTrackerProps) {
  const [stakeInput, setStakeInput] = useState(stakeAmount.toFixed(4));
  const [isEditingStake, setIsEditingStake] = useState(false);

  const handleStakeConfirm = () => {
    const parsed = parseFloat(stakeInput);
    if (!isNaN(parsed) && parsed > 0) {
      onStakeAmountChange(parsed);
    } else {
      setStakeInput(stakeAmount.toFixed(4));
    }
    setIsEditingStake(false);
  };
  const { apy7d, apy30d, apy1y, loading: apyLoading, error: apyError, lastFetched, refetch } = useMarinadeApy();

  // Primary APY for projections: 30d rolling from Marinade API, fallback to manual
  const liveApy = apy30d?.apy ?? null;
  const [manualApy, setManualApy] = useState<number | null>(null);
  const [apyInput, setApyInput] = useState(FALLBACK_APY.toString());
  const [viewMonths, setViewMonths] = useState<12 | 24>(24);
  const [isManualMode, setIsManualMode] = useState(false);

  // Sync input when live APY arrives
  useEffect(() => {
    if (liveApy !== null && !isManualMode) {
      setApyInput(liveApy.toFixed(2));
    }
  }, [liveApy, isManualMode]);

  const activeApy = isManualMode
    ? (manualApy ?? liveApy ?? FALLBACK_APY)
    : (liveApy ?? FALLBACK_APY);

  const handleApyInput = (val: string) => {
    setApyInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      setManualApy(parsed);
      setIsManualMode(true);
    }
  };

  const resetToLive = () => {
    setIsManualMode(false);
    setManualApy(null);
    if (liveApy !== null) setApyInput(liveApy.toFixed(2));
  };

  const projections = useMemo(
    () => generateProjections(stakeAmount, activeApy, viewMonths),
    [stakeAmount, activeApy, viewMonths]
  );
  const proj12 = useMemo(() => generateProjections(stakeAmount, activeApy, 12), [stakeAmount, activeApy]);
  const proj24 = useMemo(() => generateProjections(stakeAmount, activeApy, 24), [stakeAmount, activeApy]);

  const after1Month = proj12[1];
  const after6Months = proj12[6];
  const after12Months = proj12[12];
  const after24Months = proj24[24];

  const monthlyReward = (stakeAmount * activeApy) / 100 / 12;
  const annualReward = after12Months.rewards;

  const animatedStake = useCountUp(stakeAmount, 1200, 4);

  const formatLastFetched = (d: Date | null) => {
    if (!d) return null;
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <section id="staking" style={{ marginBottom: 32 }}>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6" style={{ flexWrap: "wrap" }}>
        <div
          style={{
            width: 4,
            height: 28,
            background: "linear-gradient(180deg, #14F195, #9945FF)",
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
            My Staking Tracker
          </h2>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            MARINADE FINANCE · MAX YIELD STRATEGY
          </div>
        </div>
        <a
          href={MARINADE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: "auto",
            background: "rgba(20,241,149,0.1)",
            border: "1px solid rgba(20,241,149,0.25)",
            borderRadius: 8,
            padding: "6px 14px",
            fontSize: 12,
            color: "#14F195",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ExternalLink size={12} />
          Marinade Finance
        </a>
      </div>

      {/* Live APY status banner */}
      <div
        style={{
          marginBottom: 16,
          padding: "12px 16px",
          borderRadius: 10,
          background: apyError
            ? "rgba(255,107,107,0.08)"
            : "rgba(20,241,149,0.07)",
          border: `1px solid ${apyError ? "rgba(255,107,107,0.2)" : "rgba(20,241,149,0.18)"}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {apyLoading ? (
          <>
            <RefreshCw size={14} color="#14F195" style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "'DM Sans', sans-serif" }}>
              Fetching live APY from Marinade Finance…
            </span>
          </>
        ) : apyError ? (
          <>
            <WifiOff size={14} color="#FF6B6B" />
            <span style={{ fontSize: 13, color: "#FF6B6B", fontFamily: "'DM Sans', sans-serif" }}>
              Could not reach Marinade API — using manual APY. {apyError}
            </span>
            <button
              onClick={refetch}
              style={{
                marginLeft: "auto",
                background: "rgba(255,107,107,0.15)",
                border: "1px solid rgba(255,107,107,0.3)",
                borderRadius: 6,
                padding: "3px 10px",
                fontSize: 11,
                color: "#FF6B6B",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Retry
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#14F195",
                boxShadow: "0 0 6px #14F195",
                flexShrink: 0,
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#14F195", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                Live APY from Marinade Finance
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>
                · Updated {formatLastFetched(lastFetched)}
              </span>
            </div>

            {/* Multi-period APY pills */}
            <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
              {[
                { label: "7d", value: apy7d?.apy },
                { label: "30d", value: apy30d?.apy, primary: true },
                { label: "1y", value: apy1y?.apy },
              ].map(({ label, value, primary }) => (
                <div
                  key={label}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 6,
                    background: primary ? "rgba(20,241,149,0.15)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${primary ? "rgba(20,241,149,0.3)" : "rgba(255,255,255,0.1)"}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>
                    {label}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: "'Space Mono', monospace",
                      fontWeight: 700,
                      color: primary ? "#14F195" : "rgba(255,255,255,0.7)",
                    }}
                  >
                    {value != null ? `${value.toFixed(2)}%` : "—"}
                  </span>
                </div>
              ))}
              <button
                onClick={refetch}
                title="Refresh APY"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  padding: "3px 8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <RefreshCw size={11} color="rgba(255,255,255,0.4)" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Top stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {/* Current stake */}
        <div
          className="glass-card animate-fade-in-up"
          style={{ padding: "22px", opacity: 0, animationFillMode: "forwards", position: "relative", overflow: "hidden" }}
        >
          <div
            style={{
              position: "absolute", top: -20, right: -20, width: 80, height: 80,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(20,241,149,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Current Stake</span>
            <button
              onClick={() => { setIsEditingStake(true); setStakeInput(stakeAmount.toFixed(4)); }}
              style={{ fontSize: 10, color: "rgba(20,241,149,0.6)", background: "rgba(20,241,149,0.08)", border: "1px solid rgba(20,241,149,0.2)", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
            >Update</button>
          </div>
          {isEditingStake ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <input
                type="number"
                value={stakeInput}
                onChange={(e) => setStakeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleStakeConfirm(); if (e.key === "Escape") { setIsEditingStake(false); setStakeInput(stakeAmount.toFixed(4)); } }}
                autoFocus
                step="0.0001"
                min="0.0001"
                style={{ width: 110, background: "rgba(20,241,149,0.1)", border: "1px solid rgba(20,241,149,0.4)", borderRadius: 8, padding: "4px 8px", fontSize: 20, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#14F195", outline: "none" }}
              />
              <button onClick={handleStakeConfirm} style={{ fontSize: 11, color: "#14F195", background: "rgba(20,241,149,0.15)", border: "1px solid rgba(20,241,149,0.3)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Save</button>
            </div>
          ) : (
            <div style={{ fontSize: 28, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#14F195", lineHeight: 1.1, marginBottom: 4 }}>
              {animatedStake.toFixed(4)}
            </div>
          )}
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif" }}>
            SOL staked
          </div>
          {solPrice > 0 && (
            <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono', monospace" }}>
              ≈ ${(stakeAmount * solPrice).toLocaleString("en-US", { maximumFractionDigits: 0 })} USD
            </div>
          )}
          {rewardsAccumulated > 0 && (
            <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "rgba(20,241,149,0.07)", border: "1px solid rgba(20,241,149,0.15)" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif", marginBottom: 2 }}>Rewards accumulated</div>
              <div style={{ fontSize: 14, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#14F195" }}>
                +{rewardsAccumulated.toFixed(4)} SOL
              </div>
              {solPrice > 0 && (
                <div style={{ fontSize: 11, color: "rgba(20,241,149,0.5)", fontFamily: "'Space Mono', monospace" }}>
                  ≈ +${(rewardsAccumulated * solPrice).toLocaleString("en-US", { maximumFractionDigits: 2 })} USD
                </div>
              )}
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
                vs original {originalStake.toFixed(4)} SOL
              </div>
            </div>
          )}
        </div>

        {/* APY card — live feed + manual override */}
        <div
          className="glass-card animate-fade-in-up stagger-1"
          style={{ padding: "22px", opacity: 0, animationFillMode: "forwards" }}
        >
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
            {isManualMode ? "Manual APY" : "Live APY (30d)"}
            {!isManualMode && !apyError && !apyLoading && (
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#14F195", boxShadow: "0 0 4px #14F195", marginLeft: 2 }} />
            )}
            <span title="30-day rolling APY from Marinade's mSOL price appreciation. Edit to override.">
              <Info size={11} color="rgba(255,255,255,0.3)" style={{ cursor: "help", marginLeft: 2 }} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={apyInput}
              onChange={(e) => handleApyInput(e.target.value)}
              step="0.01"
              min="0.01"
              max="100"
              style={{
                width: 80,
                background: isManualMode ? "rgba(255,184,0,0.08)" : "rgba(20,241,149,0.08)",
                border: `1px solid ${isManualMode ? "rgba(255,184,0,0.3)" : "rgba(20,241,149,0.3)"}`,
                borderRadius: 8,
                padding: "4px 8px",
                fontSize: 26,
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                color: isManualMode ? "#FFB800" : "#14F195",
                outline: "none",
              }}
            />
            <span style={{ fontSize: 26, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: isManualMode ? "#FFB800" : "#14F195" }}>
              %
            </span>
          </div>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
            {isManualMode ? (
              <button
                onClick={resetToLive}
                style={{
                  fontSize: 11,
                  color: "#14F195",
                  fontFamily: "'DM Sans', sans-serif",
                  background: "rgba(20,241,149,0.1)",
                  border: "1px solid rgba(20,241,149,0.2)",
                  borderRadius: 5,
                  padding: "2px 8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <CheckCircle2 size={10} />
                Reset to live
              </button>
            ) : (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Sans', sans-serif" }}>
                Marinade Max Yield · auto-updated
              </span>
            )}
          </div>
        </div>

        {/* Monthly reward */}
        <div className="glass-card animate-fade-in-up stagger-2" style={{ padding: "22px", opacity: 0, animationFillMode: "forwards" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Monthly Reward
          </div>
          <div style={{ fontSize: 24, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "rgba(255,255,255,0.9)", lineHeight: 1.1, marginBottom: 4 }}>
            +{monthlyReward.toFixed(4)}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>SOL / month</div>
          {solPrice > 0 && (
            <div style={{ marginTop: 4, fontSize: 12, color: "#14F195", fontFamily: "'Space Mono', monospace" }}>
              ≈ ${(monthlyReward * solPrice).toFixed(2)} USD
            </div>
          )}
        </div>

        {/* Annual reward */}
        <div className="glass-card animate-fade-in-up stagger-3" style={{ padding: "22px", opacity: 0, animationFillMode: "forwards" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Annual Reward
          </div>
          <div style={{ fontSize: 24, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "rgba(255,255,255,0.9)", lineHeight: 1.1, marginBottom: 4 }}>
            +{annualReward.toFixed(4)}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>SOL / year (compounded)</div>
          {solPrice > 0 && (
            <div style={{ marginTop: 4, fontSize: 12, color: "#9945FF", fontFamily: "'Space Mono', monospace" }}>
              ≈ ${(annualReward * solPrice).toFixed(2)} USD
            </div>
          )}
        </div>
      </div>

      {/* Projection chart */}
      <div
        className="glass-card animate-fade-in-up stagger-4"
        style={{ padding: "24px", marginBottom: 16, opacity: 0, animationFillMode: "forwards", position: "relative", overflow: "hidden" }}
      >
        <div
          style={{
            position: "absolute", right: -80, bottom: -80, width: 300, height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(20,241,149,0.05) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div className="flex items-center justify-between mb-6" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.9)", fontFamily: "'DM Sans', sans-serif", marginBottom: 2 }}>
              Staking Growth Projection
            </h3>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>
              COMPOUND INTEREST · {viewMonths}-MONTH FORECAST · APY {activeApy.toFixed(2)}%
            </div>
          </div>
          <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
            <div className="flex items-center gap-2">
              <div style={{ width: 10, height: 2, background: "#14F195", borderRadius: 1 }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>Total SOL</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: 10, height: 2, background: "#9945FF", borderRadius: 1 }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>Rewards</span>
            </div>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 2, gap: 2 }}>
              {([12, 24] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMonths(m)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: viewMonths === m ? "rgba(20,241,149,0.2)" : "transparent",
                    color: viewMonths === m ? "#14F195" : "rgba(255,255,255,0.4)",
                    transition: "all 0.15s",
                  }}
                >
                  {m}M
                </button>
              ))}
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={projections} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="stakeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14F195" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#14F195" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="rewardGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9945FF" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#9945FF" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "'Space Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              interval={viewMonths === 12 ? 1 : 3}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "'Space Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(1)}`}
              width={55}
            />
            <Tooltip content={<ProjectionTooltip solPrice={solPrice} />} />
            <Area type="monotone" dataKey="sol" stroke="#14F195" strokeWidth={2.5} fill="url(#stakeGradient)" dot={false} activeDot={{ r: 5, fill: "#14F195", stroke: "rgba(20,241,149,0.3)", strokeWidth: 4 }} />
            <Area type="monotone" dataKey="rewards" stroke="#9945FF" strokeWidth={1.5} fill="url(#rewardGradient)" dot={false} activeDot={{ r: 4, fill: "#9945FF", stroke: "rgba(153,69,255,0.3)", strokeWidth: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Milestone table */}
      <div className="glass-card animate-fade-in-up stagger-5" style={{ padding: "24px", opacity: 0, animationFillMode: "forwards" }}>
        <div className="flex items-center justify-between mb-4" style={{ flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.9)", fontFamily: "'DM Sans', sans-serif" }}>
            Staking Milestones
          </h3>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono', monospace" }}>
            APY: {activeApy.toFixed(2)}% · Principal: {stakeAmount.toFixed(4)} SOL
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Period", "Total SOL", "Rewards Earned", "USD Value*", "Growth"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 16px",
                      textAlign: h === "Period" ? "left" : "right",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.35)",
                      fontFamily: "'Space Mono', monospace",
                      fontWeight: 400,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "1 Month", data: after1Month },
                { label: "6 Months", data: after6Months },
                { label: "12 Months (1 Year)", data: after12Months },
                { label: "24 Months (2 Years)", data: after24Months },
              ].map(({ label, data }) => {
                const growth = ((data.sol - stakeAmount) / stakeAmount) * 100;
                const isYearly = label.includes("Year");
                return (
                  <tr
                    key={label}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: isYearly ? "rgba(20,241,149,0.04)" : "transparent",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = isYearly ? "rgba(20,241,149,0.08)" : "rgba(255,255,255,0.02)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = isYearly ? "rgba(20,241,149,0.04)" : "transparent")}
                  >
                    <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: isYearly ? "#14F195" : "rgba(255,255,255,0.8)", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
                      <div className="flex items-center gap-2">
                        <Calendar size={13} color={isYearly ? "#14F195" : "rgba(255,255,255,0.3)"} />
                        {label}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 14, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap" }}>
                      {data.sol.toFixed(4)} SOL
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, fontFamily: "'Space Mono', monospace", color: "#14F195", whiteSpace: "nowrap" }}>
                      +{data.rewards.toFixed(4)} SOL
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 13, fontFamily: "'Space Mono', monospace", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
                      {solPrice > 0 ? `$${(data.sol * solPrice).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontSize: 12, fontFamily: "'Space Mono', monospace", color: "#9945FF", whiteSpace: "nowrap" }}>
                      +{growth.toFixed(3)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Sans', sans-serif", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
          * USD value at current SOL price. APY sourced from Marinade Finance API (30-day rolling mSOL price appreciation).
          Projections use compound interest. You can override the APY field above — click "Reset to live" to restore the live feed.
        </div>
      </div>
    </section>
  );
}
