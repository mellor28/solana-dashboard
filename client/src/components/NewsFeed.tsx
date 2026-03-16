/**
 * NewsFeed — Watcher.Guru live news feed
 * Design: Glassmorphic Space Dashboard
 *
 * Fetches from Watcher.Guru RSS via rss2json.com (free, CORS wildcard).
 * Rolling window: max 10 articles. On each refresh, new articles are
 * prepended and any beyond 10 are dropped — old news disappears automatically.
 * Auto-refreshes every 5 minutes.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Newspaper, ExternalLink, RefreshCw, Clock } from "lucide-react";
import { formatTime } from "@/lib/utils";

const MAX_ARTICLES = 10;
const REFRESH_INTERVAL_MS = 5 * 60_000; // 5 minutes
const RSS2JSON_URL =
  "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwatcher.guru%2Fnews%2Ffeed&count=10";

interface NewsItem {
  guid: string;
  title: string;
  link: string;
  pubDate: string; // "2026-03-03 19:27:59"
  thumbnail: string;
  description: string;
}

function timeAgo(pubDate: string): string {
  // pubDate format: "2026-03-03 19:27:59"
  const ts = new Date(pubDate.replace(" ", "T") + "Z").getTime();
  if (isNaN(ts)) return pubDate;
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").trim();
}

function truncate(text: string, maxLen: number): string {
  const clean = stripHtml(text);
  return clean.length > maxLen ? clean.slice(0, maxLen) + "…" : clean;
}

export default function NewsFeed() {
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  // Track which guids are "new" (added in the latest fetch) for highlight animation
  const [newGuids, setNewGuids] = useState<Set<string>>(new Set());
  const seenGuidsRef = useRef<Set<string>>(new Set());

  const fetchNews = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch(RSS2JSON_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status !== "ok") throw new Error(data.message ?? "Feed error");

      const incoming: NewsItem[] = (data.items ?? []).map((item: any) => ({
        guid: item.guid || item.link,
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        thumbnail: item.thumbnail || "",
        description: item.description || "",
      }));

      // Merge: prepend genuinely new items, keep rolling window of MAX_ARTICLES
      setArticles((prev) => {
        const prevGuids = new Set(prev.map((a) => a.guid));
        const fresh = incoming.filter((a) => !prevGuids.has(a.guid));
        const merged = [...fresh, ...prev].slice(0, MAX_ARTICLES);

        // Track new guids for flash animation
        const freshGuids = new Set(fresh.map((a) => a.guid));
        if (freshGuids.size > 0) {
          setNewGuids(freshGuids);
          setTimeout(() => setNewGuids(new Set()), 2000);
        }

        // Update seen set
        merged.forEach((a) => seenGuidsRef.current.add(a.guid));
        return merged;
      });

      setLastFetched(new Date());
      setError(null);
    } catch (err: any) {
      setError("Unable to load news — will retry shortly");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchNews();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(() => fetchNews(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchNews]);

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
              border: "1px solid rgba(20,241,149,0.2)",
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
              Watcher.Guru News
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              LIVE · MAX 10 · AUTO-REFRESH 5m
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Article count badge */}
          {articles.length > 0 && !loading && (
            <div
              style={{
                background: "rgba(20,241,149,0.1)",
                border: "1px solid rgba(20,241,149,0.2)",
                borderRadius: 20,
                padding: "3px 10px",
                fontSize: 11,
                color: "#14F195",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {articles.length}/{MAX_ARTICLES}
            </div>
          )}
          {/* Refresh button */}
          <button
            onClick={() => fetchNews(true)}
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
              transition: "opacity 0.15s",
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

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 60,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          style={{
            padding: "24px",
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
          {articles.map((item, idx) => {
            const isNew = newGuids.has(item.guid);
            return (
              <a
                key={item.guid}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "11px 12px",
                  borderRadius: 10,
                  textDecoration: "none",
                  background: isNew
                    ? "rgba(20,241,149,0.06)"
                    : "transparent",
                  border: isNew
                    ? "1px solid rgba(20,241,149,0.15)"
                    : "1px solid transparent",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = "rgba(255,255,255,0.04)";
                  el.style.borderColor = "rgba(255,255,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = isNew
                    ? "rgba(20,241,149,0.06)"
                    : "transparent";
                  el.style.borderColor = isNew
                    ? "rgba(20,241,149,0.15)"
                    : "transparent";
                }}
              >
                {/* Thumbnail */}
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt=""
                    style={{
                      width: 52,
                      height: 40,
                      objectFit: "cover",
                      borderRadius: 6,
                      flexShrink: 0,
                      opacity: 0.85,
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 52,
                      height: 40,
                      borderRadius: 6,
                      flexShrink: 0,
                      background: "rgba(255,255,255,0.04)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontFamily: "'Space Mono', monospace",
                        color: "rgba(255,255,255,0.15)",
                        fontWeight: 700,
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                )}

                {/* Text content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: idx === 0 ? 600 : 500,
                      color:
                        idx === 0
                          ? "rgba(255,255,255,0.92)"
                          : "rgba(255,255,255,0.75)",
                      fontFamily: "'DM Sans', sans-serif",
                      lineHeight: 1.4,
                      marginBottom: 4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {isNew && (
                      <span
                        style={{
                          display: "inline-block",
                          background: "#14F195",
                          color: "#06091a",
                          fontSize: 9,
                          fontFamily: "'Space Mono', monospace",
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: 3,
                          marginRight: 6,
                          verticalAlign: "middle",
                        }}
                      >
                        NEW
                      </span>
                    )}
                    {item.title}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Clock size={10} color="rgba(255,255,255,0.2)" />
                    <span
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.3)",
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      {timeAgo(item.pubDate)}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "rgba(20,241,149,0.45)",
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      watcher.guru
                    </span>
                  </div>
                </div>

                <ExternalLink
                  size={13}
                  color="rgba(255,255,255,0.18)"
                  style={{ flexShrink: 0, marginTop: 4 }}
                />
              </a>
            );
          })}
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
            Updated {formatTime(lastFetched)}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.2)",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            New articles replace old ones automatically
          </span>
        </div>
      )}
    </div>
  );
}
