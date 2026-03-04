/**
 * Navbar component
 * Top navigation bar with Solana logo, title, last updated time, and refresh button.
 * Design: Glassmorphic Space Dashboard
 */

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface NavbarProps {
  lastUpdated: Date | null;
  onRefresh: () => void;
  loading: boolean;
}

const NAV_ITEMS = [
  { label: "Portfolio", href: "#portfolio" },
  { label: "Market", href: "#market-overview" },
  { label: "Network", href: "#network" },
  { label: "TVL", href: "#adoption" },
  { label: "DeFi", href: "#defi" },
  { label: "Stables", href: "#stablecoins" },
  { label: "Bridges", href: "#bridge-flows" },
  { label: "Chains", href: "#chain-comparison" },
  { label: "Meteora", href: "#meteora" },
  { label: "Staking", href: "#staking" },
];

export default function Navbar({ lastUpdated, onRefresh, loading }: NavbarProps) {
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = () => {
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 1500);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <nav
      style={{
        background: "rgba(6, 9, 26, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div className="container">
        <div className="flex items-center justify-between py-3">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #9945FF, #14F195)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 16px rgba(20,241,149,0.4)",
                flexShrink: 0,
              }}
            >
              {/* Solana-style diagonal lines icon */}
              <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                <path d="M2 12.5H14.5L18 9.5H5.5L2 12.5Z" fill="white" fillOpacity="0.9"/>
                <path d="M2 6.5H14.5L18 3.5H5.5L2 6.5Z" fill="white" fillOpacity="0.9"/>
                <path d="M5.5 9.5H18L14.5 6.5H2L5.5 9.5Z" fill="white" fillOpacity="0.7"/>
              </svg>
            </div>
            <div>
              <div
                className="font-bold text-white"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, lineHeight: 1.2 }}
              >
                Solana Dashboard
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: "0.05em",
                }}
              >
                LIVE MARKET TRACKER
              </div>
            </div>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-5">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.color = "#14F195")
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.6)")
                }
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Last updated + Refresh */}
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.35)",
                  fontFamily: "'Space Mono', monospace",
                }}
                className="hidden sm:block"
              >
                Updated {formatTime(lastUpdated)}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              style={{
                background: "rgba(20,241,149,0.08)",
                border: "1px solid rgba(20,241,149,0.25)",
                color: "#14F195",
                fontSize: 12,
                gap: 6,
              }}
            >
              <RefreshCw
                size={13}
                style={{
                  animation: spinning ? "spin 1s linear" : "none",
                }}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
