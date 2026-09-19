/**
 * useCountUp hook
 * Animates a number from 0 to a target value over a specified duration.
 * Design: Glassmorphic Space Dashboard
 */

import { useState, useEffect, useRef } from "react";

export function useCountUp(
  target: number,
  duration = 1200,
  decimals = 2
): number {
  const [current, setCurrent] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const prevTargetRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) return;

    const startValue = prevTargetRef.current;
    prevTargetRef.current = target;
    startTimeRef.current = null;

    // First real value: snap immediately so live prices don't count up from $0
    if (startValue === 0) {
      const factor = Math.pow(10, decimals);
      setCurrent(Math.round(target * factor) / factor);
      return;
    }

    // Live ticks (websocket) are tiny — tween them quickly so the price stays current
    const delta = Math.abs(target - startValue);
    const relative = delta / Math.max(Math.abs(target), 1);
    const animDuration = relative < 0.02 ? Math.min(220, duration) : duration;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / animDuration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = startValue + (target - startValue) * eased;
      
      const factor = Math.pow(10, decimals);
      setCurrent(Math.round(value * factor) / factor);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, decimals]);

  return current;
}
