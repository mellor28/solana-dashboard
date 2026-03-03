/**
 * NewsFeed — Live crypto news feed widget
 * Design: Glassmorphic Space Dashboard
 * Fetches latest headlines from CryptoCompare News API (free, no key, CORS wildcard)
 * Shows SOL-focused news by default, with toggle to general crypto news.
 * Auto-refreshes every 10 minutes.
 */

import { useState, useEffect, useCallback } from "react";
import { Newspaper, ExternalLink, RefreshCw, Clock } from "lucide-react";

interface NewsItem {
  title: string;
  url: string;
  publishedOn: number;
  source: string;
  body?: string;
}

// CryptoCompare News API — free tier, CORS wildcard, no key required
const BASE_URL = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN";
const SOURCES = [
  { label: "Solana", url: `${BASE_URL}&categories=SOL&limit=8` },
  { label: "Crypto", url: `${BASE_URL}&limit=8` },
];

function timeAgo(ts: number): string {
  const diffMs = Date.now() - ts * 1000;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

function truncate(text: string, maxLen: number): string {
  if (!text) return "";
  const clean = text.replace(/<[^>]*>/g, "").trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + "…" : clean;
}

export default function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [sourceIdx, setSourceIdx] = useState(0);

  const fetchNews = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);

      const src = SOURCES[sourceIdx];
      try {
        const res = await fetch(src.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.Data && data.Data.length > 0) {
          const items: NewsItem[] = data.Data.slice(0, 7).map(
            (item: {
              title: string;
              url: string;
              published_on: number;
              source_info?: { name?: string };
              source?: string;
              body?: string;
            }) => ({
              title: item.title,
              url: item.url,
              publishedOn: item.published_on,
              source: item.source_info?.name ?? item.source ?? "CryptoCompare",
              body: item.body ? truncate(item.body, 120) : undefined,
            })
          );
          setNews(items);
          setLastFetched(new Date());
          setError(null);
        } else {
          setError("No news available at this time");
        }
      } catch (err) {
        setError("Unable to load news — will retry shortly");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [sourceIdx]
  );

  // Initial load
  useEffect(() => {
    setLoading(true);
    setNews([]);
    fetchNews();
  }, [sourceIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => fetchNews(), 10 * 60_000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  const currentSource = SOURCES[sourceIdx];

  return (
    <div
      id="news"
      className="glass-card"
      style={{ padding: "22px 24px", marginBottom: 28 }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(20,241,149,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Newspaper size={18} color="#14F195" />
          </div>
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "rgba(255,255,255,0.95)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Crypto News
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {currentSource.label.toUpperCase()} · AUTO-REFRESH 10m
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Source toggle tabs */}
          <div
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {SOURCES.map((src, idx) => (
              <button
                key={src.label}
                onClick={() => setSourceIdx(idx)}
                style={{
                  padding: "5px 12px",
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: "'Space Mono', monospace",
                  border: "none",
                  background:
                    idx === sourceIdx
                      ? "rgba(20,241,149,0.15)"
                      : "transparent",
                  color:
                    idx === sourceIdx
                      ? "#14F195"
                      : "rgba(255,255,255,0.4)",
                  transition: "all 0.15s ease",
                }}
              >
                {src.label}
              </button>
            ))}
          </div>
          {/* Refresh button */}
          <button
            onClick={() => fetchNews(true)}
            disabled={refreshing}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "rgba(255,255,255,0.6)",
              fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <RefreshCw
              size={13}
              style={{
                animation: refreshing ? "spin 1s linear infinite" : "none",
              }}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* News list */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 64,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "rgba(255,107,107,0.8)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {news.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                padding: "12px 14px",
                borderRadius: 10,
                textDecoration: "none",
                background: "transparent",
                border: "1px solid transparent",
                transition: "all 0.18s ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                  "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                  "transparent";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
                  >
                    {/* Rank badge */}
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "'Space Mono', monospace",
                        color:
                          idx === 0 ? "#14F195" : "rgba(255,255,255,0.2)",
                        fontWeight: 700,
                        minWidth: 18,
                        paddingTop: 2,
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div>
                      {/* Title */}
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: idx === 0 ? 600 : 500,
                          color:
                            idx === 0
                              ? "rgba(255,255,255,0.92)"
                              : "rgba(255,255,255,0.75)",
                          fontFamily: "'DM Sans', sans-serif",
                          lineHeight: 1.4,
                          marginBottom: 4,
                        }}
                      >
                        {item.title}
                      </div>
                      {/* Body excerpt for top 3 */}
                      {item.body && idx < 3 && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "rgba(255,255,255,0.35)",
                            fontFamily: "'DM Sans', sans-serif",
                            lineHeight: 1.4,
                            marginBottom: 4,
                          }}
                        >
                          {item.body}
                        </div>
                      )}
                      {/* Meta row */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Clock size={10} color="rgba(255,255,255,0.25)" />
                        <span
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.3)",
                            fontFamily: "'Space Mono', monospace",
                          }}
                        >
                          {timeAgo(item.publishedOn)}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: "rgba(20,241,149,0.5)",
                            fontFamily: "'Space Mono', monospace",
                          }}
                        >
                          {item.source}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <ExternalLink
                  size={13}
                  color="rgba(255,255,255,0.2)"
                  style={{ flexShrink: 0, marginTop: 3 }}
                />
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Footer */}
      {lastFetched && !loading && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.2)",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            Fetched {lastFetched.toLocaleTimeString()}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.2)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Click headline to read full article
          </span>
        </div>
      )}
    </div>
  );
}
