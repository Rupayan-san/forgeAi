"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { WireframeVortexCanvas } from "./WireframeVortexCanvas";
import { TechMarquee } from "./TechMarquee";
import { GlowingBorderButton } from "./GlowingBorderButton";

export function Hero() {
  return (
    <section id="about" className="relative min-h-[720px] flex flex-col justify-between pt-32 pb-10 overflow-hidden border-b border-[#262626] bg-[#030303]">
      {/* 3D Wireframe Vortex Canvas Background with Silver Sheen */}
      <WireframeVortexCanvas />

      {/* Hero Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center my-auto">
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl sm:text-7xl md:text-[80px] font-normal tracking-tight text-white leading-[1.05] mb-6 font-sans"
        >
          Ask your project <span className="text-zinc-400 font-normal">why</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed font-normal"
        >
          Forge connects your GitHub and Discord activity into living project memory, giving you source-backed answers about your code and decisions.
        </motion.p>

        {/* Dual CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14"
        >
          <GlowingBorderButton
            href="/login"
            className="w-full sm:w-auto"
            innerClassName="px-8 py-3 text-xs"
          >
            TRY THE LIVE DEMO
          </GlowingBorderButton>
          <Link
            href="#demo"
            className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black text-xs font-bold tracking-wider uppercase transition-all duration-200 shadow-lg"
          >
            EXPLORE MEMORY GRAPH
          </Link>
        </motion.div>
      </div>

      {/* Infinite Rolling Tech Stack Strip */}
      <TechMarquee />
    </section>
  );
}
