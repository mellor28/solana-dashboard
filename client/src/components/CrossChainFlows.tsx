// CrossChainFlows — Solana cross-chain capital flows via Wormhole
// Design: dark glass card, two-panel layout (inflows left, outflows right),
// horizontal bar charts per chain, net flow summary, timespan toggle.
// Source: api.wormholescan.io/api/v1/x-chain-activity (no API key, CORS open)

import { useState, useEffect, useCallback } from "react";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, GitBranch } from "lucide-react";
import { formatTime } from "@/lib/utils";

// Wormhole chain ID → display name + colour
const CHAIN_META: Record<number, { name: string; color: string; logo: string }> = {
  1:  { name: "Solana",   color: "#9945FF", logo: "https://assets.coingecko.com/coins/images/4128/small/solana.png" },
  2:  { name: "Ethereum", color: "#627EEA", logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png" },
  4:  { name: "BSC",      color: "#F0B90B", logo: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png" },
  5:  { name: "Polygon",  color: "#8247E5", logo: "https://assets.coingecko.com/coins/images/4713/small/polygon.png" },
  6:  { name: "Avalanche",color: "#E84142", logo: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png" },
  10: { name: "Fantom",   color: "#1969FF", logo: "https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png" },
  16: { name: "Moonbeam", color: "#53CBC9", logo: "https://assets.coingecko.com/coins/images/22459/small/glmr.png" },
  21: { name: "Sui",      color: "#4DA2FF", logo: "https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg" },
  22: { name: "Aptos",    color: "#00C2FF", logo: "https://assets.coingecko.com/coins/images/26455/small/aptos_round.png" },
  23: { name: "Arbitrum", color: "#28A0F0", logo: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg" },
  24: { name: "Optimism", color: "#FF0420", logo: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png" },
  30: { name: "Base",     color: "#0052FF", logo: "https://assets.coingecko.com/coins/images/32872/small/base.png" },
  32: { name: "Sei",      color: "#9E1F63", logo: "https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png" },
  34: { name: "Scroll",   color: "#FFDBB0", logo: "https://assets.coingecko.com/coins/images/32392/small/scroll.png" },
  36: { name: "Blast",    color: "#FCFC03", logo: "https://assets.coingecko.com/coins/images/35494/small/blast.jpeg" },
  40: { name: "Mantle",   color: "#68CEC1", logo: "https://assets.coingecko.com/coins/images/30980/small/token-logo.png" },
  48: { name: "Linea",    color: "#61DFFF", logo: "https://assets.coingecko.com/coins/images/28206/small/linea-logo.png" },
  50: { name: "Berachain",color: "#8B4513", logo: "https://assets.coingecko.com/coins/images/36417/small/bera.png" },
  52: { name: "Unichain", color: "#FF007A", logo: "https://assets.coingecko.com/coins/images/36417/small/bera.png" },
  // Extended Wormhole chain IDs
  8:  { name: "Algorand",  color: "#00B4D8", logo: "https://assets.coingecko.com/coins/images/4380/small/download.png" },
  38: { name: "Rootstock", color: "#FF9900", logo: "https://assets.coingecko.com/coins/images/5070/small/rsk-logo.png" },
  44: { name: "Neon EVM",  color: "#9945FF", logo: "https://assets.coingecko.com/coins/images/28172/small/neon.png" },
  45: { name: "Terra",     color: "#5493F7", logo: "https://assets.coingecko.com/coins/images/18457/small/luna_new.png" },
  46: { name: "Injective", color: "#00B2FF", logo: "https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png" },
  47: { name: "Osmosis",   color: "#750BBB", logo: "https://assets.coingecko.com/coins/images/16724/small/osmo.png" },
  51: { name: "Xpla",      color: "#00D4FF", logo: "https://assets.coingecko.com/coins/images/28109/small/xpla.png" },
  55: { name: "Kujira",    color: "#E53935", logo: "https://assets.coingecko.com/coins/images/27182/small/kujira.png" },
  59: { name: "Neutron",   color: "#C4C4C4", logo: "https://assets.coingecko.com/coins/images/31274/small/neutron.png" },
  4009: { name: "X Layer", color: "#FF6B00", logo: "https://assets.coingecko.com/coins/images/31274/small/neutron.png" },
};

function chainName(id: number) {
  return CHAIN_META[id]?.name ?? `Chain #${id}`;
}
function chainColor(id: number) {
  return CHAIN_META[id]?.color ?? "#888";
}
function chainLogo(id: number) {
  return CHAIN_META[id]?.logo ?? null;
}

function fmtUSD(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

interface FlowItem {
  chainId: number;
  volume: number;
  pct: number;
}

interface FlowData {
  inflows: FlowItem[];
  outflows: FlowItem[];
  totalIn: number;
  totalOut: number;
  netFlow: number;
  fetchedAt: Date;
}

async function fetchFlows(): Promise<FlowData> {
  const res = await fetch(
    "https://api.wormholescan.io/api/v1/x-chain-activity",
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const txs: Array<{ chain: number; volume: string; destinations: Array<{ chain: number; volume: string; percentage: number }> }> =
    data.txs ?? [];

  // Outflows: Solana (chain 1) as source
  const solSource = txs.find((t) => t.chain === 1);
  const outflows: FlowItem[] = solSource
    ? solSource.destinations
        .filter((d) => d.chain !== 1 && parseFloat(d.volume) > 0)
        .map((d) => ({ chainId: d.chain, volume: parseFloat(d.volume), pct: d.percentage }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 8)
    : [];

  // Inflows: other chains sending to Solana (chain 1)
  const inflowMap: Record<number, number> = {};
  for (const t of txs) {
    if (t.chain === 1) continue;
    for (const dest of t.destinations) {
      if (dest.chain === 1 && parseFloat(dest.volume) > 0) {
        inflowMap[t.chain] = (inflowMap[t.chain] ?? 0) + parseFloat(dest.volume);
      }
    }
  }
  const inflows: FlowItem[] = Object.entries(inflowMap)
    .map(([id, vol]) => ({ chainId: Number(id), volume: vol, pct: 0 }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 8);

  const totalIn = inflows.reduce((s, x) => s + x.volume, 0);
  const totalOut = outflows.reduce((s, x) => s + x.volume, 0);

  // Compute pct for inflows
  inflows.forEach((x) => { x.pct = totalIn > 0 ? (x.volume / totalIn) * 100 : 0; });

  return { inflows, outflows, totalIn, totalOut, netFlow: totalIn - totalOut, fetchedAt: new Date() };
}

function FlowBar({ item, maxVol, direction }: { item: FlowItem; maxVol: number; direction: "in" | "out" }) {
  const barPct = maxVol > 0 ? (item.volume / maxVol) * 100 : 0;
  const color = chainColor(item.chainId);
  const logo = chainLogo(item.chainId);

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {logo && (
            <img
              src={logo}
              alt={chainName(item.chainId)}
              style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "'DM Sans', sans-serif" }}>
            {chainName(item.chainId)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>
            {item.pct.toFixed(1)}%
          </span>
          <span style={{ fontSize: 12, color: color, fontFamily: "'Space Mono', monospace", fontWeight: 700, minWidth: 60, textAlign: "right" }}>
            {fmtUSD(item.volume)}
          </span>
        </div>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            width: `${barPct}%`,
            height: "100%",
            background: direction === "in"
              ? `linear-gradient(90deg, ${color}99, ${color})`
              : `linear-gradient(90deg, ${color}, ${color}99)`,
            borderRadius: 3,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

export default function CrossChainFlows() {
  const [data, setData] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const d = await fetchFlows();
      setData(d);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 15 * 60_000); // refresh every 15 min
    return () => clearInterval(interval);
  }, [load]);

  const netPositive = data ? data.netFlow >= 0 : false;
  const netColor = netPositive ? "#14F195" : "#FF4444";

  return (
    <div id="cross-chain" className="glass-card" style={{ padding: "22px 24px", marginBottom: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(153,69,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <GitBranch size={18} color="#9945FF" />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.95)", fontFamily: "'DM Sans', sans-serif" }}>
              Cross-Chain Capital Flows
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>
              WORMHOLE BRIDGE · SOLANA ↔ OTHER CHAINS
            </div>
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
            color: "rgba(255,255,255,0.6)",
            fontSize: 12,
            cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <RefreshCw size={12} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
          Loading cross-chain flows…
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#FF4444", fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
          Failed to load: {error}
        </div>
      ) : data ? (
        <>
          {/* Net flow summary bar */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${netColor}30`,
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>
                NET FLOW INTO SOLANA (7D VIA WORMHOLE)
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: netColor, fontFamily: "'Space Mono', monospace" }}>
                {netPositive ? "+" : ""}{fmtUSD(data.netFlow)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace", marginBottom: 3 }}>TOTAL IN</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#14F195", fontFamily: "'Space Mono', monospace" }}>{fmtUSD(data.totalIn)}</div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace", marginBottom: 3 }}>TOTAL OUT</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#FF6B6B", fontFamily: "'Space Mono', monospace" }}>{fmtUSD(data.totalOut)}</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'Space Mono', monospace" }}>
              Note: Wormhole-only. LayerZero & Relay<br />move larger volumes but lack chain breakdowns.
            </div>
          </div>

          {/* Two-column flow panels */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Inflows */}
            <div style={{
              background: "rgba(20,241,149,0.03)",
              border: "1px solid rgba(20,241,149,0.1)",
              borderRadius: 12,
              padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <ArrowDownLeft size={14} color="#14F195" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#14F195", fontFamily: "'DM Sans', sans-serif" }}>
                  Inflows to Solana
                </span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace" }}>
                  {fmtUSD(data.totalIn)}
                </span>
              </div>
              {data.inflows.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>No data</div>
              ) : (
                data.inflows.map((item) => (
                  <FlowBar
                    key={item.chainId}
                    item={item}
                    maxVol={data.inflows[0].volume}
                    direction="in"
                  />
                ))
              )}
            </div>

            {/* Outflows */}
            <div style={{
              background: "rgba(255,107,107,0.03)",
              border: "1px solid rgba(255,107,107,0.1)",
              borderRadius: 12,
              padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <ArrowUpRight size={14} color="#FF6B6B" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#FF6B6B", fontFamily: "'DM Sans', sans-serif" }}>
                  Outflows from Solana
                </span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace" }}>
                  {fmtUSD(data.totalOut)}
                </span>
              </div>
              {data.outflows.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>No data</div>
              ) : (
                data.outflows.map((item) => (
                  <FlowBar
                    key={item.chainId}
                    item={item}
                    maxVol={data.outflows[0].volume}
                    direction="out"
                  />
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'Space Mono', monospace" }}>
              Source: Wormhole Scan API · 7-day rolling window
            </span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'Space Mono', monospace" }}>
              Updated {formatTime(data.fetchedAt)}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
