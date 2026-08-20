"use client";

import { useEffect, useRef } from "react";

interface WireframeVortexProps {
  className?: string;
}

export default function WireframeVortex({ className }: WireframeVortexProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    let step = 0;
    const render = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;

      step += 0.01;
      const numLines = 60;
      const centerY = height / 2;

      for (let i = 0; i < numLines; i++) {
        ctx.beginPath();
        const yOffset = (i - numLines / 2) * 12;
        for (let x = 0; x < width; x += 20) {
          const wave = Math.sin(x * 0.003 + step + i * 0.05) * 60;
          const pinch = Math.sin((x / width) * Math.PI); // hourglass vortex effect
          const y = centerY + yOffset * pinch + wave;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className || "absolute inset-0 w-full h-full pointer-events-none opacity-80 z-0"}
    />
  );
}

export { WireframeVortex, WireframeVortex as WireframeVortexCanvas };
