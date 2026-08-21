"use client";

import { motion } from "framer-motion";
import { X, Check, Zap } from "lucide-react";

export function WhatForgeEliminatesSection() {
  return (
    <section id="testimonials" className="py-24 px-6 border-b border-[#262626] relative bg-[#030303]">
      <div className="max-w-[1200px] mx-auto">
        {/* Section Header with Scroll Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <h2 className="text-3xl sm:text-5xl font-normal text-white tracking-tight">
            What Forge eliminates
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-2">
            Eliminating tribal knowledge silos and lost engineering context across fast-moving teams.
          </p>
        </motion.div>

        {/* 2 Comparison Cards with Staggered Scroll Reveal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Without Forge */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="rounded-2xl border border-red-500/20 bg-[#0d0d0d] p-7 space-y-6 shadow-lg"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs font-mono font-semibold uppercase text-red-400/90">WITHOUT FORGE</span>
              <span className="text-[10px] font-mono text-zinc-600">Tribal Knowledge</span>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="flex items-start gap-3 p-3 bg-red-500/[0.03] border border-red-500/10 rounded-xl">
                <X className="w-4 h-4 text-red-400/80 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-zinc-200">Search Discord messages manually</h4>
                  <p className="text-zinc-500 text-[11px] mt-0.5">Scrolling through thousands of chat messages trying to find why a database was chosen.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-red-500/[0.03] border border-red-500/10 rounded-xl">
                <X className="w-4 h-4 text-red-400/80 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-zinc-200">Read through dozens of merged PRs</h4>
                  <p className="text-zinc-500 text-[11px] mt-0.5">Hunting through closed PR descriptions and outdated git blame lines.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-red-500/[0.03] border border-red-500/10 rounded-xl">
                <X className="w-4 h-4 text-red-400/80 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-zinc-200">Reconstruct forgotten decisions</h4>
                  <p className="text-zinc-500 text-[11px] mt-0.5">Repeating mistakes because the reasons for past tradeoffs were lost when teammates left.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-red-500/[0.03] border border-red-500/10 rounded-xl">
                <X className="w-4 h-4 text-red-400/80 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-zinc-200">Interrupt senior engineers constantly</h4>
                  <p className="text-zinc-500 text-[11px] mt-0.5">New hires stuck waiting for team leads to explain historical codebase conventions.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* With Forge */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="rounded-2xl border border-[#383838] bg-[#121212] p-7 space-y-6 shadow-[0_0_35px_rgba(255,255,255,0.03)]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs font-mono font-semibold uppercase text-zinc-200">WITH FORGE AI</span>
              <span className="text-[10px] font-mono text-zinc-200 bg-white/10 px-2 py-0.5 rounded border border-white/15">Continuous Memory</span>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="flex items-start gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                <Check className="w-4 h-4 text-zinc-200 shrink-0 mt-0.5" strokeWidth={2.5} />
                <div>
                  <h4 className="font-semibold text-white">Ask Forge directly via Voice or Chat</h4>
                  <p className="text-zinc-400 text-[11px] mt-0.5">Natural language or hands-free conversational queries answered in under 300ms.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                <Check className="w-4 h-4 text-zinc-200 shrink-0 mt-0.5" strokeWidth={2.5} />
                <div>
                  <h4 className="font-semibold text-white">Get immediate synthesized reasoning</h4>
                  <p className="text-zinc-400 text-[11px] mt-0.5">Clear explanations of the tradeoffs, alternatives considered, and consensus reached.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                <Check className="w-4 h-4 text-zinc-200 shrink-0 mt-0.5" strokeWidth={2.5} />
                <div>
                  <h4 className="font-semibold text-white">Trace the exact decision history</h4>
                  <p className="text-zinc-400 text-[11px] mt-0.5">Entity graph showing authors, timestamps, superseded decisions, and affected code.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                <Check className="w-4 h-4 text-zinc-200 shrink-0 mt-0.5" strokeWidth={2.5} />
                <div>
                  <h4 className="font-semibold text-white">Inspect verified evidence with one click</h4>
                  <p className="text-zinc-400 text-[11px] mt-0.5">Every fact points back to raw GitHub PRs, commits, or Discord chat threads.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
