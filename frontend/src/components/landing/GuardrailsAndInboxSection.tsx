"use client";

import { motion } from "framer-motion";
import { GitPullRequest, Hash, Sparkles } from "lucide-react";

export function GuardrailsAndInboxSection() {
  return (
    <section id="decisions" className="py-24 px-6 border-b border-[#262626] relative bg-[#030303]">
      <div className="max-w-[1300px] mx-auto">
        {/* 2-Column Section Header with Scroll Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-16"
        >
          <div>
            <h2 className="text-3xl sm:text-5xl font-normal text-white tracking-tight">
              Automated decision extraction.
            </h2>
            <h2 className="text-3xl sm:text-5xl font-normal text-zinc-500 tracking-tight mt-1">
              Raw chat into structured memory.
            </h2>
          </div>
          <div className="lg:pt-2">
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-lg">
              Developers discuss architecture in Discord and PRs. Forge automatically identifies when a decision is reached, parses the reasoning, and stores it in your project memory.
            </p>
          </div>
        </motion.div>

        {/* Transformation Visual Container with Scroll Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="rounded-2xl border border-[#262626] bg-[#0d0d0d] p-6 sm:p-10 shadow-xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 lg:gap-8 items-center">
            {/* Left: Raw Project Activity (5 cols) */}
            <div className="lg:col-span-5 space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10 text-xs sm:text-[13px] font-mono">
                <span className="text-zinc-300 uppercase font-semibold">RAW PROJECT ACTIVITY (BEFORE)</span>
                <span className="text-zinc-400">#backend-dev</span>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-[#050505] border border-[#262626] space-y-4 font-mono">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="text-zinc-200 font-semibold text-xs sm:text-[13px]">@sarah.chen (Discord)</span>
                    <span className="text-[11px]">10:24 AM</span>
                  </div>
                  <p className="text-zinc-300 text-xs sm:text-[13px] leading-relaxed">
                    &ldquo;Should we use Mongo or Postgres for the transactional user balance ledger? Mongo is already in our stack, but ACID multi-document txns are getting messy with concurrent webhooks.&rdquo;
                  </p>
                </div>

                <div className="space-y-1.5 pt-3.5 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span className="text-zinc-200 font-semibold text-xs sm:text-[13px]">@alex.kumar (PR #382 Review)</span>
                    <span className="text-[11px]">11:15 AM</span>
                  </div>
                  <p className="text-zinc-300 text-xs sm:text-[13px] leading-relaxed">
                    &ldquo;Let&apos;s go with PostgreSQL. Strong consistency, standard row locking, and we can reuse our existing RDS cluster. Merging in PR #382.&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Center Extraction Button with Dual-Tone Amber-Blue Glow */}
            <div className="lg:col-span-1 flex flex-col items-center justify-center text-center my-4 lg:my-0 relative">
              {/* Outer ambient dual-color dotted glow */}
              <div className="relative flex items-center justify-center p-6">
                {/* Left warm amber/orange glow */}
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-r from-orange-600/35 via-amber-500/20 to-transparent blur-2xl rounded-full pointer-events-none" />
                {/* Right electric blue glow */}
                <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-l from-blue-600/45 via-cyan-500/20 to-transparent blur-2xl rounded-full pointer-events-none" />

                {/* Ambient dot matrix backdrop with smooth radial feathered fadeout */}
                <div className="absolute -inset-3 bg-[radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:5px_5px] [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_72%)] opacity-70 pointer-events-none" />

                {/* Button Outer Border with Dual Tone Gradient */}
                <div className="relative p-[1.2px] rounded-[15px] bg-gradient-to-r from-orange-500/70 via-zinc-700/60 to-blue-500/80 shadow-[0_0_20px_rgba(249,115,22,0.25),0_0_25px_rgba(37,99,235,0.3)]">
                  {/* Button Body */}
                  <div className="px-5 py-2.5 rounded-[14px] bg-[#111317] flex items-center justify-center gap-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] select-none">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="text-white font-sans text-xs sm:text-[13px] font-medium tracking-normal">
                      Extract
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Structured Project Memory (5 cols) */}
            <div className="lg:col-span-5 space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10 text-xs sm:text-[13px] font-mono">
                <span className="text-white uppercase font-bold">STRUCTURED PROJECT MEMORY (FORGE)</span>
                <span className="text-zinc-300 text-xs px-2.5 py-0.5 rounded bg-white/5 border border-white/10 font-medium">96% Confidence</span>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-[#383838] space-y-4 font-sans shadow-[0_0_25px_rgba(255,255,255,0.04)]">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">DECISION:</span>
                  <p className="text-sm sm:text-base font-semibold text-white mt-1 leading-snug">
                    Use PostgreSQL for transactional ledger and user balance data.
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">REASON:</span>
                  <p className="text-xs sm:text-[13px] text-zinc-300 mt-1 leading-relaxed">
                    Requires strict ACID guarantees with row-level locking to eliminate webhook race conditions; leverages existing RDS infrastructure.
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded bg-white/5 border border-white/15 text-zinc-200 flex items-center gap-1.5 font-medium">
                    <GitPullRequest className="w-3.5 h-3.5 text-zinc-400" />
                    PR #382
                  </span>
                  <span className="px-2.5 py-1 rounded bg-white/5 border border-white/15 text-zinc-200 flex items-center gap-1.5 font-medium">
                    <Hash className="w-3.5 h-3.5 text-zinc-400" />
                    #backend-dev
                  </span>
                  <span className="text-zinc-400 ml-auto text-[11px]">Participants: Sarah Chen, Alex Kumar</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
