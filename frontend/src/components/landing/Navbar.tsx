"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Menu, X, ArrowUpRight } from "lucide-react";
import { GlowingBorderButton } from "./GlowingBorderButton";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const targetId = href.substring(1);
      const targetElem = document.getElementById(targetId);
      if (targetElem) {
        const navHeight = 54;
        const elemPosition = targetElem.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = Math.max(0, elemPosition - navHeight);

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
      setMobileOpen(false);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? "bg-transparent backdrop-blur-md border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
          : "bg-[#030303]/90 backdrop-blur-md border-b border-[#262626]"
        }`}
    >
      {/* Corner crosshairs decoration */}
      <div className="absolute top-0 left-4 text-white/20 text-[10px] font-mono select-none pointer-events-none">+</div>
      <div className="absolute top-0 right-4 text-white/20 text-[10px] font-mono select-none pointer-events-none">+</div>
      <div className="absolute bottom-0 left-4 text-white/20 text-[10px] font-mono select-none pointer-events-none">+</div>
      <div className="absolute bottom-0 right-4 text-white/20 text-[10px] font-mono select-none pointer-events-none">+</div>

      <div className="max-w-[1400px] mx-auto px-6 h-12 sm:h-13 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-6 h-6 rounded-md bg-zinc-900 border border-white/15 flex items-center justify-center group-hover:border-white/40 transition-colors shadow-sm">
            <Zap className="w-3 h-3 text-zinc-200" strokeWidth={2} />
          </div>
          <span className="text-sm font-bold tracking-wider uppercase font-sans text-white">FORGE AI</span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-7">
          <a
            href="#about"
            onClick={(e) => scrollToSection(e, "#about")}
            className="text-[12px] font-normal text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Overview
          </a>
          <a
            href="#demo"
            onClick={(e) => scrollToSection(e, "#demo")}
            className="text-[12px] font-normal text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Live Demo
          </a>
          <a
            href="#features"
            onClick={(e) => scrollToSection(e, "#features")}
            className="text-[12px] font-normal text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Memory Engine
          </a>
          <a
            href="#decisions"
            onClick={(e) => scrollToSection(e, "#decisions")}
            className="text-[12px] font-normal text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Decisions
          </a>
          <a
            href="#testimonials"
            onClick={(e) => scrollToSection(e, "#testimonials")}
            className="text-[12px] font-normal text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Impact
          </a>
        </nav>

        {/* Right CTA Button */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-[12px] text-zinc-400 hover:text-white transition-colors px-2"
          >
            Sign in
          </Link>
          <GlowingBorderButton
            href="/login"
            innerClassName="px-4 py-1.5 text-[11px]"
          >
            TRY DEMO
          </GlowingBorderButton>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-zinc-300 hover:text-white p-1 cursor-pointer"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[#070707]/95 border-b border-[#262626] px-6 py-4 space-y-3">
          <a
            href="#features"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-zinc-400 hover:text-white py-1"
          >
            Features
          </a>
          <a
            href="#decisions"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-zinc-400 hover:text-white py-1"
          >
            Decisions
          </a>
          <a
            href="#architecture"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-zinc-400 hover:text-white py-1"
          >
            Stack
          </a>
          <a
            href="#demo"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-zinc-400 hover:text-white py-1"
          >
            Live Engine
          </a>
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center py-2 text-sm text-zinc-400"
            >
              Sign in
            </Link>
            <GlowingBorderButton
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="w-full text-center"
              innerClassName="py-2.5 text-xs"
            >
              TRY DEMO
            </GlowingBorderButton>
          </div>
        </div>
      )}
    </header>
  );
}
