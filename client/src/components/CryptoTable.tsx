/**
 * CryptoTable component
 * Displays top 8 cryptocurrencies with price, market cap, 24h/7d change.
 * Design: Glassmorphic Space Dashboard
 */

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, type CoinData } from "@/hooks/useCryptoData";

interface CryptoTableProps {
  coins: CoinData[];
  loading: boolean;
}

type SortKey = "rank" | "price" | "chg24h" | "chg7d" | "chg30d" | "mcap";

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} style={{ padding: "12px 16px" }}>
          <div
            style={{
              height: 16,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 4,
              width: i === 2 ? 120 : 70,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

function ChangeCell({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        color: isPositive ? "#14F195" : "#FF6B6B",
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {isPositive ? "+" : ""}
      {value.toFixed(2)}%
    </div>
  );
}

function sortValue(coin: CoinData, key: SortKey): number {
  switch (key) {
    case "rank":
      return coin.market_cap_rank || 9999;
    case "price":
      return coin.current_price;
    case "chg24h":
      return coin.price_change_percentage_24h;
    case "chg7d":
      return coin.price_change_percentage_7d_in_currency ?? 0;
    case "chg30d":
      return coin.price_change_percentage_30d_in_currency ?? 0;
    case "mcap":
      return coin.market_cap;
  }
}

export default function CryptoTable({ coins, loading }: CryptoTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "rank" ? "asc" : "desc");
    }
  };

  const sorted = useMemo(() => {
    const copy = [...coins];
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return copy;
  }, [coins, sortKey, sortDir]);

  const headers: { label: string; key: SortKey | null; align: "left" | "right" }[] = [
    { label: "#", key: "rank", align: "left" },
    { label: "Asset", key: null, align: "left" },
    { label: "Price", key: "price", align: "right" },
    { label: "24h", key: "chg24h", align: "right" },
    { label: "7d", key: "chg7d", align: "right" },
    { label: "30d", key: "chg30d", align: "right" },
    { label: "Market Cap", key: "mcap", align: "right" },
  ];

  return (
    <div id="market-overview" className="glass-card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 12px 20px" }}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 2,
          }}
        >
          Market Overview
        </h3>
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.4)",
            fontFamily: "'Space Mono', monospace",
          }}
        >
          LIVE PRICES · CLICK HEADERS TO SORT
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {headers.map((h) => {
                const active = h.key === sortKey;
                return (
                <th
                  key={h.label}
                  onClick={() => h.key && toggleSort(h.key)}
                  onKeyDown={(e) => {
                    if (h.key && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      toggleSort(h.key);
                    }
                  }}
                  role={h.key ? "button" : undefined}
                  tabIndex={h.key ? 0 : undefined}
                  style={{
                    padding: "8px 16px",
                    textAlign: h.align,
                    fontSize: 11,
                    color: active ? "#14F195" : "rgba(255,255,255,0.35)",
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 400,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                    cursor: h.key ? "pointer" : "default",
                    userSelect: "none",
                  }}
                >
                  {h.label}
                  {active && (sortDir === "asc" ? " ↑" : " ↓")}
                </th>
              );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && coins.length === 0
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              : sorted.map((coin) => (
                  <tr
                    key={coin.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      transition: "background 0.15s",
                      background:
                        coin.id === "solana"
                          ? "rgba(20,241,149,0.04)"
                          : "transparent",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        coin.id === "solana"
                          ? "rgba(20,241,149,0.08)"
                          : "rgba(255,255,255,0.03)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        coin.id === "solana"
                          ? "rgba(20,241,149,0.04)"
                          : "transparent")
                    }
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.35)",
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      {coin.market_cap_rank}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div className="flex items-center gap-2">
                        <img
                          src={coin.image}
                          alt={coin.name}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color:
                                coin.id === "solana"
                                  ? "#14F195"
                                  : "rgba(255,255,255,0.9)",
                              fontFamily: "'DM Sans', sans-serif",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {coin.name}
                            {coin.id === "solana" && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 9,
                                  background: "rgba(20,241,149,0.15)",
                                  border: "1px solid rgba(20,241,149,0.3)",
                                  borderRadius: 4,
                                  padding: "1px 5px",
                                  color: "#14F195",
                                  fontFamily: "'Space Mono', monospace",
                                  verticalAlign: "middle",
                                }}
                              >
                                FOCUS
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "rgba(255,255,255,0.35)",
                              fontFamily: "'Space Mono', monospace",
                            }}
                          >
                            {coin.symbol.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontSize: 13,
                        fontFamily: "'Space Mono', monospace",
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.9)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ${coin.current_price < 1
                          ? coin.current_price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 })
                          : coin.current_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <ChangeCell value={coin.price_change_percentage_24h} />
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <ChangeCell
                        value={coin.price_change_percentage_7d_in_currency ?? 0}
                      />
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <ChangeCell
                        value={coin.price_change_percentage_30d_in_currency ?? 0}
                      />
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontSize: 12,
                        fontFamily: "'Space Mono', monospace",
                        color: "rgba(255,255,255,0.6)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatCurrency(coin.market_cap)}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
