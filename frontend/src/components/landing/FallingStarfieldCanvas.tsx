"use client";

import { useEffect, useRef } from "react";

export function FallingStarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 500);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement.clientHeight || 500;
    };

    window.addEventListener("resize", handleResize);

    // Falling streaks/stars
    const count = 120;
    const streaks: Array<{ x: number; y: number; length: number; speed: number; opacity: number }> = [];

    for (let i = 0; i < count; i++) {
      streaks.push({
        x: Math.random() * width,
        y: Math.random() * height,
        length: Math.random() * 25 + 10,
        speed: Math.random() * 1.5 + 0.8,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < count; i++) {
        const s = streaks[i];
        s.y += s.speed;
        if (s.y > height) {
          s.y = -s.length;
          s.x = Math.random() * width;
        }

        const gradient = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.length);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
        gradient.addColorStop(1, `rgba(255, 255, 255, ${s.opacity})`);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x, s.y + s.length);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
