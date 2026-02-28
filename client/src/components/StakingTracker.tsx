/**
 * StakingTracker component
 * Personal Marinade Finance staking tracker with compound growth projections.
 * Initial stake: 100.22 SOL at 6.10% APY (Marinade Max Yield)
 * Design: Glassmorphic Space Dashboard
 */

import { useState, useMemo } from "react";
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
import {
  TrendingUp,
  Coins,
  Calendar,
  Target,
  Info,
  ExternalLink,
} from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";

const INITIAL_STAKE = 100.22;
const DEFAULT_APY = 6.10;
const MARINADE_URL = "https://marinade.finance";

interface StakingTrackerProps {
  solPrice: number;
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
      month: i === 0
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
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 8,
          }}
        >
          {label}
        </div>
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
            Total Staked
          </div>
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
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
            Rewards Earned
          </div>
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

export default function StakingTracker({ solPrice }: StakingTrackerProps) {
  const [apy, setApy] = useState(DEFAULT_APY);
  const [apyInput, setApyInput] = useState(DEFAULT_APY.toString());
  const [viewMonths, setViewMonths] = useState<12 | 24>(24);

  const projections = useMemo(
    () => generateProjections(INITIAL_STAKE, apy, viewMonths),
    [apy, viewMonths]
  );

  const projections12 = useMemo(
    () => generateProjections(INITIAL_STAKE, apy, 12),
    [apy]
  );
  const projections24 = useMemo(
    () => generateProjections(INITIAL_STAKE, apy, 24),
    [apy]
  );

  const after1Month = projections12[1];
  const after6Months = projections12[6];
  const after12Months = projections12[12];
  const after24Months = projections24[24];

  const dailyReward = (INITIAL_STAKE * apy) / 100 / 365;
  const weeklyReward = dailyReward * 7;
  const monthlyReward = (INITIAL_STAKE * apy) / 100 / 12;

  const animatedStake = useCountUp(INITIAL_STAKE, 1200, 4);

  const handleApyChange = (val: string) => {
    setApyInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      setApy(parsed);
    }
  };

  return (
    <section id="staking" style={{ marginBottom: 32 }}>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
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
            transition: "background 0.2s",
          }}
        >
          <ExternalLink size={12} />
          Marinade Finance
        </a>
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
          style={{
            padding: "22px",
            opacity: 0,
            animationFillMode: "forwards",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(20,241,149,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'Space Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Current Stake
          </div>
          <div
            style={{
              fontSize: 28,
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              color: "#14F195",
              lineHeight: 1.1,
              marginBottom: 4,
            }}
          >
            {animatedStake.toFixed(4)}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            SOL staked
          </div>
          {solPrice > 0 && (
            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "rgba(255,255,255,0.35)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              ≈ ${(INITIAL_STAKE * solPrice).toLocaleString("en-US", { maximumFractionDigits: 0 })} USD
            </div>
          )}
        </div>

        {/* APY with editable input */}
        <div
          className="glass-card animate-fade-in-up stagger-1"
          style={{
            padding: "22px",
            opacity: 0,
            animationFillMode: "forwards",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'Space Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Current APY
            <span title="APY changes over time. Update it here to recalculate projections.">
              <Info size={11} color="rgba(255,255,255,0.3)" style={{ cursor: "help" }} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={apyInput}
              onChange={(e) => handleApyChange(e.target.value)}
              step="0.01"
              min="0.01"
              max="100"
              style={{
                width: 80,
                background: "rgba(20,241,149,0.08)",
                border: "1px solid rgba(20,241,149,0.3)",
                borderRadius: 8,
                padding: "4px 8px",
                fontSize: 26,
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                color: "#14F195",
                outline: "none",
              }}
            />
            <span
              style={{
                fontSize: 26,
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                color: "#14F195",
              }}
            >
              %
            </span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'DM Sans', sans-serif",
              marginTop: 6,
            }}
          >
            Marinade Max Yield · editable
          </div>
        </div>

        {/* Monthly reward */}
        <div
          className="glass-card animate-fade-in-up stagger-2"
          style={{
            padding: "22px",
            opacity: 0,
            animationFillMode: "forwards",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'Space Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Monthly Reward
          </div>
          <div
            style={{
              fontSize: 24,
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              color: "rgba(255,255,255,0.9)",
              lineHeight: 1.1,
              marginBottom: 4,
            }}
          >
            +{monthlyReward.toFixed(4)}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            SOL / month
          </div>
          {solPrice > 0 && (
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "#14F195",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              ≈ ${(monthlyReward * solPrice).toFixed(2)} USD
            </div>
          )}
        </div>

        {/* Annual reward */}
        <div
          className="glass-card animate-fade-in-up stagger-3"
          style={{
            padding: "22px",
            opacity: 0,
            animationFillMode: "forwards",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'Space Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Annual Reward
          </div>
          <div
            style={{
              fontSize: 24,
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              color: "rgba(255,255,255,0.9)",
              lineHeight: 1.1,
              marginBottom: 4,
            }}
          >
            +{(after12Months.rewards).toFixed(4)}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            SOL / year (compounded)
          </div>
          {solPrice > 0 && (
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "#9945FF",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              ≈ ${(after12Months.rewards * solPrice).toFixed(2)} USD
            </div>
          )}
        </div>
      </div>

      {/* Projection chart */}
      <div
        className="glass-card animate-fade-in-up stagger-4"
        style={{
          padding: "24px",
          marginBottom: 16,
          opacity: 0,
          animationFillMode: "forwards",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative glow */}
        <div
          style={{
            position: "absolute",
            right: -80,
            bottom: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(20,241,149,0.05) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -60,
            top: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(153,69,255,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div className="flex items-center justify-between mb-6" style={{ flexWrap: "wrap", gap: 12 }}>
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
              Staking Growth Projection
            </h3>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              COMPOUND INTEREST · {viewMonths}-MONTH FORECAST
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div style={{ width: 10, height: 2, background: "#14F195", borderRadius: 1 }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
                Total SOL
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: 10, height: 2, background: "#9945FF", borderRadius: 1 }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
                Rewards
              </span>
            </div>
            {/* Toggle 12/24 months */}
            <div
              style={{
                display: "flex",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 8,
                padding: 2,
                gap: 2,
              }}
            >
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
          <AreaChart
            data={projections}
            margin={{ top: 5, right: 5, bottom: 0, left: 0 }}
          >
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
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{
                fill: "rgba(255,255,255,0.35)",
                fontSize: 10,
                fontFamily: "'Space Mono', monospace",
              }}
              axisLine={false}
              tickLine={false}
              interval={viewMonths === 12 ? 1 : 3}
            />
            <YAxis
              tick={{
                fill: "rgba(255,255,255,0.35)",
                fontSize: 10,
                fontFamily: "'Space Mono', monospace",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(1)}`}
              width={55}
            />
            <Tooltip content={<ProjectionTooltip solPrice={solPrice} />} />
            <Area
              type="monotone"
              dataKey="sol"
              stroke="#14F195"
              strokeWidth={2.5}
              fill="url(#stakeGradient)"
              dot={false}
              activeDot={{ r: 5, fill: "#14F195", stroke: "rgba(20,241,149,0.3)", strokeWidth: 4 }}
            />
            <Area
              type="monotone"
              dataKey="rewards"
              stroke="#9945FF"
              strokeWidth={1.5}
              fill="url(#rewardGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#9945FF", stroke: "rgba(153,69,255,0.3)", strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Milestone table */}
      <div
        className="glass-card animate-fade-in-up stagger-5"
        style={{
          padding: "24px",
          opacity: 0,
          animationFillMode: "forwards",
        }}
      >
        <div className="flex items-center justify-between mb-4" style={{ flexWrap: "wrap", gap: 8 }}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "rgba(255,255,255,0.9)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Staking Milestones
          </h3>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.35)",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            APY: {apy.toFixed(2)}% · Principal: {INITIAL_STAKE} SOL
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
                const growth = ((data.sol - INITIAL_STAKE) / INITIAL_STAKE) * 100;
                const isYearly = label.includes("Year");
                return (
                  <tr
                    key={label}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: isYearly ? "rgba(20,241,149,0.04)" : "transparent",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = isYearly
                        ? "rgba(20,241,149,0.08)"
                        : "rgba(255,255,255,0.02)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = isYearly
                        ? "rgba(20,241,149,0.04)"
                        : "transparent")
                    }
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        color: isYearly ? "#14F195" : "rgba(255,255,255,0.8)",
                        fontFamily: "'DM Sans', sans-serif",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar
                          size={13}
                          color={isYearly ? "#14F195" : "rgba(255,255,255,0.3)"}
                        />
                        {label}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        fontSize: 14,
                        fontFamily: "'Space Mono', monospace",
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.9)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {data.sol.toFixed(4)} SOL
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        fontSize: 13,
                        fontFamily: "'Space Mono', monospace",
                        color: "#14F195",
                        whiteSpace: "nowrap",
                      }}
                    >
                      +{data.rewards.toFixed(4)} SOL
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        fontSize: 13,
                        fontFamily: "'Space Mono', monospace",
                        color: "rgba(255,255,255,0.5)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {solPrice > 0
                        ? `$${(data.sol * solPrice).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                        : "—"}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        textAlign: "right",
                        fontSize: 12,
                        fontFamily: "'Space Mono', monospace",
                        color: "#9945FF",
                        whiteSpace: "nowrap",
                      }}
                    >
                      +{growth.toFixed(3)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            fontFamily: "'DM Sans', sans-serif",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: 10,
          }}
        >
          * USD value calculated at current SOL price. Actual rewards depend on network conditions and APY changes.
          Projections use compound interest formula. Update the APY field above to reflect current Marinade rates.
        </div>
      </div>
    </section>
  );
}
