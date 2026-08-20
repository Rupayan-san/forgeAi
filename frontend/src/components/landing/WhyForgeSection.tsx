"use client";

import { motion } from "framer-motion";
import { Check, X, Sparkles, HelpCircle } from "lucide-react";

export function WhyForgeSection() {
  return (
    <section className="py-20 px-6 border-b border-[#262626] relative bg-[#030303]">
      <div className="max-w-[1100px] mx-auto">
        {/* Section Header with Scroll Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <h2 className="text-3xl sm:text-5xl font-normal text-white tracking-tight">
            More than RAG
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-2 leading-relaxed">
            Traditional RAG searches flat document chunks. Forge connects code changes, discussions, and decisions into a living relational memory graph.
          </p>
        </motion.div>

        {/* 2 Comparison Cards with Staggered Scroll Reveal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Traditional AI Card */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 sm:p-7 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs font-mono font-semibold uppercase text-zinc-400">Traditional AI / Generic RAG</span>
              <span className="text-[10px] font-mono text-zinc-600">Static Search</span>
            </div>

            <ul className="space-y-3.5 text-xs text-zinc-400">
              <li className="flex items-start gap-2.5">
                <X className="w-4 h-4 text-red-400/80 shrink-0 mt-0.5" />
                <span>Knows only what you manually paste or upload into a prompt</span>
              </li>
              <li className="flex items-start gap-2.5">
                <X className="w-4 h-4 text-red-400/80 shrink-0 mt-0.5" />
                <span>Answers from flat, isolated text documents without context</span>
              </li>
              <li className="flex items-start gap-2.5">
                <X className="w-4 h-4 text-red-400/80 shrink-0 mt-0.5" />
                <span>Limited project history and zero awareness of team discussions</span>
              </li>
              <li className="flex items-start gap-2.5">
                <X className="w-4 h-4 text-red-400/80 shrink-0 mt-0.5" />
                <span>Weak decision context; cannot explain why an old pattern changed</span>
              </li>
            </ul>
          </motion.div>

          {/* Forge AI Card */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="rounded-2xl border border-[#383838] bg-[#121212] p-6 sm:p-7 space-y-4 shadow-[0_0_30px_rgba(255,255,255,0.03)]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-zinc-200" />
                <span className="text-xs font-mono font-semibold uppercase text-white">Forge Autonomous Memory</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-200 font-semibold bg-white/10 border border-white/15 px-2 py-0.5 rounded">
                Relational &amp; Continuous
              </span>
            </div>

            <ul className="space-y-3.5 text-xs text-zinc-200">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Continuously ingests GitHub and Discord activity passively</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Connects code changes + team discussions + architectural decisions</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Preserves historical reasoning and why previous choices were made</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Provides source-backed answers with clickable commit and PR citations</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>Maintains causal relationships between project events over time</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
