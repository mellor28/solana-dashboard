/**
 * SolanaDeFiEcosystem — Live DeFi stats from DeFiLlama
 * Design: Glassmorphic Space Dashboard
 *
 * Left panel: Top Solana DEX 24h volume leaderboard (DeFiLlama /overview/dexs)
 * Right panel: Top native Solana DeFi protocols by TVL (DeFiLlama /protocols)
 * Refreshes every 5 minutes.
 */

import { useState, useEffect, useCallback } from "react";
import { BarChart2, Layers, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

const REFRESH_MS = 5 * 60_000;

interface DexEntry {
  name: string;
  vol24h: number;
  vol7d: number;
}

interface ProtocolEntry {
  name: string;
  tvl: number;
  change1d: number | null;
  category: string;
}

interface EcosystemData {
  totalDexVol24h: number;
  totalDexVol7d: number;
  totalFees24h: number;
  topDexes: DexEntry[];
  topProtocols: ProtocolEntry[];
  fetchedAt: Date;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Liquid Staking": "#14F195",
  "Lending": "#9945FF",
  "Dexs": "#00C2FF",
  "Derivatives": "#FFB800",
  "Bridge": "#FF6B6B",
  "RWA": "#A8FF78",
  "Risk Curators": "#78FFD6",
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? "#888";
}

function fmt(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

async function loadEcosystem(): Promise<EcosystemData> {
  const [dexRes, feesRes, protRes] = await Promise.all([
    fetch(
      "https://api.llama.fi/overview/dexs/Solana?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume"
    ),
    fetch(
      "https://api.llama.fi/overview/fees/Solana?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyFees"
    ),
    fetch("https://api.llama.fi/protocols"),
  ]);

  const dexData = await dexRes.json();
  const feesData = await feesRes.json();
  const protData: any[] = await protRes.json();

  // DEX leaderboard
  const dexProtocols: any[] = dexData.protocols ?? [];
  dexProtocols.sort((a, b) => (parseFloat(b.total24h) || 0) - (parseFloat(a.total24h) || 0));
  const topDexes: DexEntry[] = dexProtocols.slice(0, 8).map((p) => ({
    name: p.name,
    vol24h: parseFloat(p.total24h) || 0,
    vol7d: parseFloat(p.total7d) || 0,
  }));

  // Top native Solana protocols
  const solProtos = protData.filter(
    (p) =>
      Array.isArray(p.chains) &&
      p.chains.includes("Solana") &&
      parseFloat(p.tvl || 0) > 10e6 &&
      !["CEX"].includes(p.category)
  );
  solProtos.sort((a, b) => parseFloat(b.tvl || 0) - parseFloat(a.tvl || 0));
  const topProtocols: ProtocolEntry[] = solProtos.slice(0, 8).map((p) => ({
    name: p.name,
    tvl: parseFloat(p.tvl || 0),
    change1d: p.change_1d != null ? parseFloat(p.change_1d) : null,
    category: p.category ?? "Other",
  }));

  return {
    totalDexVol24h: parseFloat(dexData.total24h) || 0,
    totalDexVol7d: parseFloat(dexData.total7d) || 0,
    totalFees24h: parseFloat(feesData.total24h) || 0,
    topDexes,
    topProtocols,
    fetchedAt: new Date(),
  };
}

export default function SolanaDeFiEcosystem() {
  const [data, setData] = useState<EcosystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const d = await loadEcosystem();
      setData(d);
      setError(null);
    } catch (e: any) {
      setError("Failed to load DeFi data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => {
    const id = setInterval(() => load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const maxVol = data ? Math.max(...data.topDexes.map((d) => d.vol24h), 1) : 1;

  return (
    <section id="defi" style={{ marginBottom: 32 }}>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          style={{
            width: 4,
            height: 28,
            background: "linear-gradient(180deg, #00C2FF, #9945FF)",
            borderRadius: 2,
          }}
        />
        <div style={{ flex: 1 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.2,
            }}
          >
            Solana DeFi Ecosystem
          </h2>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            LIVE · DEFILLAMA DATA · REFRESHES 5m
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "6px 12px",
            cursor: refreshing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: "rgba(255,255,255,0.6)",
            fontSize: 12,
            fontFamily: "'DM Sans', sans-serif",
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw
            size={13}
            style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}
          />
          Refresh
        </button>
      </div>

      {/* Summary stats row */}
      {data && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {[
            { label: "DEX Volume 24h", value: fmt(data.totalDexVol24h), color: "#00C2FF", icon: BarChart2 },
            { label: "DEX Volume 7d", value: fmt(data.totalDexVol7d), color: "#9945FF", icon: BarChart2 },
            { label: "Protocol Fees 24h", value: fmt(data.totalFees24h), color: "#14F195", icon: Layers },
          ].map(({ label, value, color, icon: Icon }) => (
            <div
              key={label}
              className="glass-card"
              style={{ padding: "16px 20px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Icon size={14} color={color} />
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: "'Space Mono', monospace",
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </span>
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 700,
                  color,
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
        className="flex-col-on-mobile"
      >
        {/* DEX Volume Leaderboard */}
        <div className="glass-card" style={{ padding: "20px 22px" }}>
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                fontFamily: "'DM Sans', sans-serif",
                marginBottom: 2,
              }}
            >
              DEX Volume Leaderboard
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              24H TRADING VOLUME
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 38,
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 6,
                    animation: "pulse 1.5s ease-in-out infinite",
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              ))}
            </div>
          ) : error ? (
            <div style={{ color: "rgba(255,107,107,0.7)", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
              {error}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(data?.topDexes ?? []).map((dex, i) => {
                const pct = (dex.vol24h / maxVol) * 100;
                return (
                  <div key={dex.name}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span
                          style={{
                            fontSize: 10,
                            color: "rgba(255,255,255,0.25)",
                            fontFamily: "'Space Mono', monospace",
                            width: 16,
                            textAlign: "right",
                          }}
                        >
                          {i + 1}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: "rgba(255,255,255,0.8)",
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 500,
                          }}
                        >
                          {dex.name}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: "'Space Mono', monospace",
                          fontWeight: 700,
                          color: "#00C2FF",
                        }}
                      >
                        {fmt(dex.vol24h)}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 3,
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: i === 0
                            ? "linear-gradient(90deg, #00C2FF, #9945FF)"
                            : "rgba(0,194,255,0.45)",
                          borderRadius: 2,
                          transition: "width 0.8s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Protocols by TVL */}
        <div className="glass-card" style={{ padding: "20px 22px" }}>
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(255,255,255,0.9)",
                fontFamily: "'DM Sans', sans-serif",
                marginBottom: 2,
              }}
            >
              Top Protocols by TVL
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.35)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              NATIVE SOLANA DEFI
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 38,
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 6,
                    animation: "pulse 1.5s ease-in-out infinite",
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              ))}
            </div>
          ) : error ? (
            <div style={{ color: "rgba(255,107,107,0.7)", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
              {error}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {(data?.topProtocols ?? []).map((proto, i) => {
                const isPos = (proto.change1d ?? 0) >= 0;
                return (
                  <div
                    key={proto.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom:
                        i < (data?.topProtocols.length ?? 0) - 1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.2)",
                          fontFamily: "'Space Mono', monospace",
                          width: 14,
                          textAlign: "right",
                        }}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "rgba(255,255,255,0.85)",
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 500,
                            lineHeight: 1.3,
                          }}
                        >
                          {proto.name}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: categoryColor(proto.category),
                            fontFamily: "'Space Mono', monospace",
                            opacity: 0.7,
                          }}
                        >
                          {proto.category}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontFamily: "'Space Mono', monospace",
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.85)",
                        }}
                      >
                        {fmt(proto.tvl)}
                      </div>
                      {proto.change1d != null && (
                        <div
                          style={{
                            fontSize: 10,
                            color: isPos ? "#14F195" : "#FF6B6B",
                            fontFamily: "'Space Mono', monospace",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 2,
                          }}
                        >
                          {isPos ? (
                            <TrendingUp size={9} />
                          ) : (
                            <TrendingDown size={9} />
                          )}
                          {isPos ? "+" : ""}
                          {proto.change1d.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {data && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: "rgba(255,255,255,0.2)",
            fontFamily: "'Space Mono', monospace",
            textAlign: "right",
          }}
        >
          Source: DeFiLlama · Updated {data.fetchedAt.toLocaleTimeString()}
        </div>
      )}
    </section>
  );
}
