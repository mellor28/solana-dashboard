/**
 * ParticleBackground component
 * Renders an animated star particle field on a canvas element.
 * Pauses when the tab is hidden and respects prefers-reduced-motion.
 */

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const colors = ["#ffffff", "#14F195", "#9945FF", "#00C2FF"];
    const particles: Particle[] = [];
    let animId: number;
    let running = true;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = reducedMotion
      ? 24
      : window.innerWidth < 768
        ? 48
        : 96;

    for (let i = 0; i < count; i++) {
      const isSolana = Math.random() < 0.15;
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: isSolana ? Math.random() * 2 + 1 : Math.random() * 1.5 + 0.3,
        speedX: reducedMotion ? 0 : (Math.random() - 0.5) * 0.15,
        speedY: reducedMotion ? 0 : (Math.random() - 0.5) * 0.15,
        opacity: Math.random() * 0.6 + 0.1,
        color: isSolana
          ? colors[Math.floor(Math.random() * 3) + 1]
          : colors[0],
      });
    }

    const paint = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle =
          p.color === "#ffffff"
            ? `rgba(255,255,255,${p.opacity})`
            : p.color === "#14F195"
            ? `rgba(20,241,149,${p.opacity})`
            : p.color === "#9945FF"
            ? `rgba(153,69,255,${p.opacity})`
            : `rgba(0,194,255,${p.opacity})`;
        ctx.fill();

        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < -5) p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;
        if (p.y < -5) p.y = canvas.height + 5;
        if (p.y > canvas.height + 5) p.y = -5;
      });
    };

    const draw = () => {
      if (!running) return;
      paint();
      if (!reducedMotion) animId = requestAnimationFrame(draw);
    };

    paint();
    if (!reducedMotion) draw();

    const onVisibility = () => {
      if (reducedMotion) return;
      if (document.visibilityState === "hidden") {
        running = false;
        cancelAnimationFrame(animId);
      } else {
        running = true;
        draw();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="particle-canvas"
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.7,
      }}
    />
  );
}
