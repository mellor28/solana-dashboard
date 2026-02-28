/**
 * ParticleBackground component
 * Renders an animated star particle field on a canvas element.
 * Design: Glassmorphic Space Dashboard — slow drifting particles
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

    const colors = ["#ffffff", "#14F195", "#9945FF", "#00C2FF"];
    const particles: Particle[] = [];
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Create particles
    for (let i = 0; i < 120; i++) {
      const isSolana = Math.random() < 0.15;
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: isSolana ? Math.random() * 2 + 1 : Math.random() * 1.5 + 0.3,
        speedX: (Math.random() - 0.5) * 0.15,
        speedY: (Math.random() - 0.5) * 0.15,
        opacity: Math.random() * 0.6 + 0.1,
        color: isSolana
          ? colors[Math.floor(Math.random() * 3) + 1]
          : colors[0],
      });
    }

    const draw = () => {
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

        // Move
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around
        if (p.x < -5) p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;
        if (p.y < -5) p.y = canvas.height + 5;
        if (p.y > canvas.height + 5) p.y = -5;
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="particle-canvas"
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
