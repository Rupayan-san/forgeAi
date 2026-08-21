"use client";

import Link from "next/link";
import React from "react";

interface GlowingBorderButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  onClick?: () => void;
}

export function GlowingBorderButton({
  href,
  children,
  className = "",
  innerClassName = "px-7 py-3 text-xs",
  onClick,
}: GlowingBorderButtonProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative inline-flex p-[1.5px] overflow-hidden rounded-full group focus:outline-none transition-transform hover:scale-[1.02] active:scale-[0.98] ${className}`}
    >
      {/* Revolving 360-degree border glow beam */}
      <span className="absolute inset-[-1000%] animate-[spin_2.8s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_65%,rgba(255,255,255,0.4)_80%,rgba(255,255,255,1)_92%,transparent_100%)]" />

      {/* Button Interior */}
      <span
        className={`relative inline-flex items-center justify-center w-full h-full rounded-full bg-[#0a0a0a] text-zinc-200 group-hover:text-white group-hover:bg-[#121212] font-semibold tracking-wider uppercase transition-colors duration-200 shadow-inner ${innerClassName}`}
      >
        {children}
      </span>
    </Link>
  );
}
