"use client";

import { useEffect, useRef } from "react";

export function ParticleVortexCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Particle system configuration
    const particleCount = Math.min(Math.floor((width * height) / 9000), 120);
    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      speed: number;
      angle: number;
      alpha: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * width * 1.5,
        y: (Math.random() - 0.5) * height * 1.5,
        radius: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.8 + 0.2,
        angle: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove);

    let time = 0;

    const render = () => {
      time += 0.005;
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2 + (mouseX - width / 2) * 0.05;
      const centerY = height / 2 + (mouseY - height / 2) * 0.05;

      // Draw subtle vortex lines
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.angle += 0.002 * p.speed;
        const dist = Math.sqrt(p.x * p.x + p.y * p.y);

        // Orbit and pull slightly inwards/outwards
        const currentAngle = p.angle + time * 0.5;
        const rad = (dist + Math.sin(time + i) * 20);

        const screenX = centerX + Math.cos(currentAngle) * (rad * 0.6);
        const screenY = centerY + Math.sin(currentAngle) * (rad * 0.4);

        ctx.beginPath();
        ctx.arc(screenX, screenY, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.6})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(16, 185, 129, 0.4)";
        ctx.fill();

        // Draw distance connections to nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const currentAngle2 = p2.angle + time * 0.5;
          const rad2 = Math.sqrt(p2.x * p2.x + p2.y * p2.y);
          const screenX2 = centerX + Math.cos(currentAngle2) * (rad2 * 0.6);
          const screenY2 = centerY + Math.sin(currentAngle2) * (rad2 * 0.4);

          const dx = screenX - screenX2;
          const dy = screenY - screenY2;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 110) {
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(screenX2, screenY2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - distance / 110) * 0.08})`;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-80"
    />
  );
}
