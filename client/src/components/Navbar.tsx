/**
 * Navbar component
 * Sticky top bar with logo, section links, live SOL ticker, and refresh.
 * Collapses to a hamburger on small screens. Highlights the in-view section.
 */

import { Menu, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, type CSSProperties } from "react";
import LiveDot from "@/components/LiveDot";

interface NavbarProps {
  lastUpdated: Date | null;
  onRefresh: () => void;
  loading: boolean;
  solPrice?: number;
  solChange?: number;
  live?: boolean;
}

const NAV_ITEMS = [
  { label: "Market", href: "#market-overview" },
  { label: "Network", href: "#network" },
  { label: "TVL", href: "#adoption" },
  { label: "DeFi", href: "#defi" },
  { label: "Stables", href: "#stablecoins" },
  { label: "Bridges", href: "#bridge-flows" },
  { label: "Chains", href: "#chain-comparison" },
];

export default function Navbar({
  lastUpdated,
  onRefresh,
  loading,
  solPrice,
  solChange,
  live = false,
}: NavbarProps) {
  const [spinning, setSpinning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState<string>("");

  const handleRefresh = () => {
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 1500);
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "--:--:--";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  useEffect(() => {
    const ids = NAV_ITEMS.map((item) => item.href.slice(1));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: [0, 0.15, 0.4] }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const linkStyle = (href: string, inMenu = false): CSSProperties => {
    const isActive = active === href.slice(1);
    return {
      color: isActive ? "#14F195" : "rgba(255,255,255,0.62)",
      fontSize: inMenu ? 16 : 13,
      fontFamily: "'DM Sans', sans-serif",
      fontWeight: isActive ? 600 : 500,
      textDecoration: "none",
      transition: "color 0.15s ease",
      position: "relative",
      padding: inMenu ? "10px 4px" : undefined,
      display: inMenu ? "block" : undefined,
    };
  };

  const NavLinks = ({ inMenu = false }: { inMenu?: boolean }) => (
    <>
      {NAV_ITEMS.map((item) => (
        <a
          key={item.label}
          href={item.href}
          aria-current={active === item.href.slice(1) ? "location" : undefined}
          style={linkStyle(item.href, inMenu)}
          onClick={() => setMenuOpen(false)}
          onMouseEnter={(e) => {
            if (active !== item.href.slice(1)) {
              (e.currentTarget as HTMLElement).style.color = "#14F195";
            }
          }}
          onMouseLeave={(e) => {
            if (active !== item.href.slice(1)) {
              (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.62)";
            }
          }}
        >
          {item.label}
        </a>
      ))}
    </>
  );

  const solPositive = (solChange ?? 0) >= 0;

  return (
    <nav
      style={{
        background: "rgba(6, 9, 26, 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div className="container">
        <div className="flex items-center justify-between py-3 gap-3">
          {/* Logo + Title */}
          <a href="#overview" className="flex items-center gap-3" style={{ textDecoration: "none", minWidth: 0 }}>
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
              <svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden>
                <path d="M2 12.5H14.5L18 9.5H5.5L2 12.5Z" fill="white" fillOpacity="0.9" />
                <path d="M2 6.5H14.5L18 3.5H5.5L2 6.5Z" fill="white" fillOpacity="0.9" />
                <path d="M5.5 9.5H18L14.5 6.5H2L5.5 9.5Z" fill="white" fillOpacity="0.7" />
              </svg>
            </div>
            <div className="min-w-0">
              <div
                className="font-bold text-white"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, lineHeight: 1.2 }}
              >
                <span className="sm:hidden">Solana</span>
                <span className="hidden sm:inline">Solana Dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <LiveDot on={live} />
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.35)",
                    fontFamily: "'Space Mono', monospace",
                    letterSpacing: "0.05em",
                  }}
                  className="hidden sm:inline"
                >
                  MARKET · NETWORK
                </span>
              </div>
            </div>
          </a>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-5">
            <NavLinks />
          </div>

          {/* Ticker + refresh + hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {solPrice != null && solPrice > 0 && (
              <div
                className="hidden sm:flex items-center gap-2"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  padding: "4px 10px",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.9)",
                  }}
                >
                  ${solPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {solChange != null && (
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "'Space Mono', monospace",
                      fontWeight: 700,
                      color: solPositive ? "#14F195" : "#FF6B6B",
                    }}
                  >
                    {solPositive ? "+" : ""}
                    {solChange.toFixed(2)}%
                  </span>
                )}
              </div>
            )}

            {lastUpdated && (
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.35)",
                  fontFamily: "'Space Mono', monospace",
                }}
                className="hidden xl:block"
              >
                {formatTime(lastUpdated)}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              aria-label="Refresh dashboard data"
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
                  animation: spinning || loading ? "spin 1s linear infinite" : "none",
                }}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <button
              type="button"
              className="flex lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: 8,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div
            className="lg:hidden"
            style={{
              padding: "4px 0 16px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <NavLinks inMenu />
          </div>
        )}
      </div>
    </nav>
  );
}
