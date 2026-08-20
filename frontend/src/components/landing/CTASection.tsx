"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FallingStarfieldCanvas } from "./FallingStarfieldCanvas";
import { GlowingBorderButton } from "./GlowingBorderButton";

export function CTASection() {
  return (
    <section className="relative min-h-[540px] flex flex-col justify-center items-center py-24 px-6 border-b border-[#262626] overflow-hidden bg-[#030303]">
      {/* Falling starfield canvas */}
      <FallingStarfieldCanvas />

      {/* Content with Scroll Reveal */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="relative z-10 max-w-3xl mx-auto text-center"
      >
        {/* Headline */}
        <h2 className="text-4xl sm:text-6xl font-normal text-white tracking-tight leading-[1.1] mb-6">
          Stop losing project context.<br />
          <span className="text-zinc-400 font-normal">Start forging team memory.</span>
        </h2>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed font-normal">
          Connect your GitHub repository and Discord server in 2 minutes. Experience instant, source-backed answers for your entire team.
        </p>

        {/* Dual CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <GlowingBorderButton
            href="/login"
            className="w-full sm:w-auto"
            innerClassName="px-8 py-3 text-xs"
          >
            TRY THE LIVE DEMO
          </GlowingBorderButton>
          <Link
            href="#features"
            className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#F5F5F7] hover:bg-white text-black text-xs font-bold tracking-wider uppercase transition-all duration-200 shadow-lg"
          >
            EXPLORE MEMORY GRAPH
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
