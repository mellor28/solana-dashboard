/**
 * SolanaStakingOverview — Network-wide staking stats
 * Design: Glassmorphic Space Dashboard
 *
 * Data sources (all CORS-open from browser):
 *  - publicnode.com Solana RPC: getVoteAccounts (total staked, validator count)
 *  - publicnode.com Solana RPC: getSupply (circulating supply)
 *  - Jito MEV API: epoch MEV rewards, MEV per lamport
 *  - Marinade APY API: 1y APY
 *  - Derived: staking ratio, estimated annual yield
 *
 * Refreshes every 2 minutes.
 */

import { useState, useEffect, useCallback } from "react";
import { Shield, Percent, Users, Coins, RefreshCw, Lock, Zap } from "lucide-react";
import { formatTime } from "@/lib/utils";

const REFRESH_MS = 2 * 60_000;
const RPC = "https://solana.publicnode.com";

interface StakingData {
  totalStakedSol: number;
  activeValidators: number;
  delinquentValidators: number;
  circulatingSupply: number;
  totalSupply: number;
  stakingRatio: number;
  marinadeApy: number;
  jitoMevEpoch: number;
  jitoMevLamports: number; // total MEV lamports this epoch
  fetchedAt: Date;
}

async function rpc(method: string, params: any[]): Promise<any> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  return data.result;
}

async function loadStakingData(): Promise<StakingData> {
  const [voteRes, supplyRes, marinadeRes, jitoRes] = await Promise.allSettled([
    rpc("getVoteAccounts", [{ commitment: "finalized" }]),
    rpc("getSupply", [{ excludeNonCirculatingAccountsList: true }]),
    fetch("https://api.marinade.finance/msol/apy/1y").then((r) => r.json()),
    fetch("https://kobe.mainnet.jito.network/api/v1/mev_rewards").then((r) => r.json()),
  ]);

  // Vote accounts
  const voteData = voteRes.status === "fulfilled" ? voteRes.value : null;
  const current: any[] = voteData?.current ?? [];
  const delinquent: any[] = voteData?.delinquent ?? [];
  const totalStakedSol = current.reduce((s: number, v: any) => s + (v.activatedStake ?? 0), 0) / 1e9;

  // Supply
  const supplyVal = supplyRes.status === "fulfilled" ? supplyRes.value?.value : null;
  const circulatingSupply = (supplyVal?.circulating ?? 0) / 1e9;
  const totalSupply = (supplyVal?.total ?? 0) / 1e9;
  const stakingRatio = circulatingSupply > 0 ? totalStakedSol / circulatingSupply : 0;

  // Marinade APY
  const marinadeApy =
    marinadeRes.status === "fulfilled" ? (marinadeRes.value?.value ?? 0) * 100 : 0;

  // Jito MEV
  const jitoData = jitoRes.status === "fulfilled" ? jitoRes.value : null;
  const jitoMevEpoch = jitoData?.epoch ?? 0;
  const jitoMevLamports = jitoData?.total_network_mev_lamports ?? 0;

  return {
    totalStakedSol,
    activeValidators: current.length,
    delinquentValidators: delinquent.length,
    circulatingSupply,
    totalSupply,
    stakingRatio,
    marinadeApy,
    jitoMevEpoch,
    jitoMevLamports,
    fetchedAt: new Date(),
  };
}

function fmtSol(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="glass-card" style={{ padding: "18px 20px" }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: `${color}15`,
          border: `1px solid ${color}25`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Icon size={16} color={color} />
      </div>
      <div
        style={{
          fontSize: 20,
          fontFamily: "'Space Mono', monospace",
          fontWeight: 700,
          color: "rgba(255,255,255,0.92)",
          lineHeight: 1.2,
          marginBottom: 3,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.4)",
          fontFamily: "'DM Sans', sans-serif",
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
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

export default function SolanaStakingOverview() {
  const [data, setData] = useState<StakingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const d = await loadStakingData();
      setData(d);
      setError(null);
    } catch (e: any) {
      setError("Failed to load staking data");
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

  // MEV in SOL
  const jitoMevSol = data ? data.jitoMevLamports / 1e9 : 0;

  return (
    <section id="staking-overview" style={{ marginBottom: 32 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          style={{
            width: 4,
            height: 28,
            background: "linear-gradient(180deg, #14F195, #9945FF)",
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
            Network Staking Overview
          </h2>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            LIVE · SOLANA RPC + JITO + MARINADE · REFRESHES 2m
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

      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 100,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 12,
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          className="glass-card"
          style={{
            padding: 20,
            color: "rgba(255,107,107,0.7)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : data ? (
        <>
          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatCard
              icon={Lock}
              label="Total Staked"
              value={`${fmtSol(data.totalStakedSol)} SOL`}
              sub={`${(data.stakingRatio * 100).toFixed(1)}% of supply staked`}
              color="#14F195"
            />
            <StatCard
              icon={Percent}
              label="Marinade APY (1y)"
              value={`${data.marinadeApy.toFixed(2)}%`}
              sub="Liquid staking yield"
              color="#9945FF"
            />
            <StatCard
              icon={Users}
              label="Active Validators"
              value={data.activeValidators.toLocaleString()}
              sub={`${data.delinquentValidators} delinquent`}
              color="#00C2FF"
            />
            <StatCard
              icon={Coins}
              label="Circulating Supply"
              value={`${fmtSol(data.circulatingSupply)} SOL`}
              sub={`Total: ${fmtSol(data.totalSupply)} SOL`}
              color="#FFB800"
            />
            <StatCard
              icon={Zap}
              label="Jito MEV (epoch)"
              value={`${jitoMevSol.toFixed(0)} SOL`}
              sub={`Epoch #${data.jitoMevEpoch}`}
              color="#FF6B6B"
            />
            <StatCard
              icon={Shield}
              label="Non-Staked Supply"
              value={`${fmtSol(data.circulatingSupply - data.totalStakedSol)} SOL`}
              sub="Liquid / not staked"
              color="#A8FF78"
            />
          </div>

          {/* Staking ratio bar */}
          <div className="glass-card" style={{ padding: "16px 20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.6)",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Network Staking Ratio (Staked ÷ Circulating Supply)
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 700,
                  color: "#14F195",
                }}
              >
                {(data.stakingRatio * 100).toFixed(1)}%
              </span>
            </div>
            <div
              style={{
                height: 8,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(data.stakingRatio * 100, 100)}%`,
                  background: "linear-gradient(90deg, #14F195, #9945FF)",
                  borderRadius: 4,
                  transition: "width 1s ease",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 6,
                fontSize: 10,
                color: "rgba(255,255,255,0.25)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "rgba(255,255,255,0.2)",
              fontFamily: "'Space Mono', monospace",
              textAlign: "right",
            }}
          >
            Source: Solana RPC (publicnode) · Jito · Marinade · Updated {formatTime(data.fetchedAt)}
          </div>
        </>
      ) : null}
    </section>
  );
}
