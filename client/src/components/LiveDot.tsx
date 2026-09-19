/**
 * LiveDot — compact LIVE / POLLING indicator used in the navbar and hero.
 */

interface LiveDotProps {
  on: boolean;
  label?: boolean;
}

export default function LiveDot({ on, label = true }: LiveDotProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
      title={on ? "Receiving live Binance prices" : "Waiting for live price stream"}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: on ? "#14F195" : "rgba(255,255,255,0.28)",
          boxShadow: on ? "0 0 8px rgba(20,241,149,0.8)" : "none",
          animation: on ? "pulse 1.8s ease-in-out infinite" : "none",
          flexShrink: 0,
        }}
      />
      {label && (
        <span
          style={{
            fontSize: 10,
            fontFamily: "'Space Mono', monospace",
            color: on ? "#14F195" : "rgba(255,255,255,0.35)",
            letterSpacing: "0.08em",
            fontWeight: 700,
          }}
        >
          {on ? "LIVE" : "POLL"}
        </span>
      )}
    </span>
  );
}
