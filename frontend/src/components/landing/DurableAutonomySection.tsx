"use client";

import React from "react";
import { motion } from "framer-motion";
import { GitPullRequest, Hash, GitCommit, Sparkles, ShieldCheck } from "lucide-react";
import EnterpriseAIPipeline from "@/components/ui/ai-agent-pipeline";

export function DurableAutonomySection() {

  return (
    <section className="py-24 px-6 border-b border-[#262626] relative bg-[#030303]">
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
              Knowledge graph relationships.
            </h2>
            <h2 className="text-3xl sm:text-5xl font-normal text-zinc-500 tracking-tight mt-1">
              Connecting code, chat &amp; decisions.
            </h2>
          </div>
          <div className="lg:pt-2">
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-lg">
              Forge does not treat documents as isolated text chunks. It builds an interconnected graph linking commits, pull requests, authors, architectural debates, and superseded decisions.
            </p>
          </div>
        </motion.div>

        {/* 2 Side-by-Side Cards Grid with Staggered Scroll Reveal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Readable Knowledge Graph Relationship Chain */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="flex flex-col justify-between"
          >
            <div className="rounded-2xl border border-[#262626] bg-[#0d0d0d] p-3 sm:p-4 shadow-xl mb-6 overflow-hidden">
              <EnterpriseAIPipeline className="w-full" />
            </div>

            {/* Description */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Relational Knowledge Graph</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Connects code commits, PRs, authors, and chat threads so you understand not just what changed, but the exact chain of reasoning behind it.
              </p>
            </div>
          </motion.div>

          {/* Card 2: Source-Verified Differentiator */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="flex flex-col justify-between"
          >
            <div className="rounded-2xl border border-[#262626] bg-[#0d0d0d] p-6 sm:p-7 shadow-xl mb-6 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-zinc-200" />
                  <span className="font-semibold text-white uppercase">WHY CITATIONS MATTER</span>
                </div>
                <span className="text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10">VERIFIABLE PROVENANCE</span>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-zinc-200 font-mono text-[11px] font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                    <span>WHY + WHERE (THE FORGE FORMULA)</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    Standard AI models hallucinate or synthesize unverified assumptions. Forge guarantees that every single claim is anchored to a raw git commit hash, merged pull request, or timestamped team message.
                  </p>
                </div>

                {/* Evidence breakdown items */}
                <div className="space-y-2.5 font-mono text-xs">
                  <div className="p-3 bg-white/[0.02] border border-white/10 rounded-lg flex items-center justify-between">
                    <span className="flex items-center gap-2 text-zinc-200">
                      <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />
                      <span>Pull Request Context</span>
                    </span>
                    <span className="text-zinc-500 text-[11px]">Diffs, reviews, descriptions</span>
                  </div>

                  <div className="p-3 bg-white/[0.02] border border-white/10 rounded-lg flex items-center justify-between">
                    <span className="flex items-center gap-2 text-zinc-200">
                      <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Commit History</span>
                    </span>
                    <span className="text-zinc-500 text-[11px]">Author, timestamp, SHA hash</span>
                  </div>

                  <div className="p-3 bg-white/[0.02] border border-white/10 rounded-lg flex items-center justify-between">
                    <span className="flex items-center gap-2 text-zinc-200">
                      <Hash className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Discord Discussions</span>
                    </span>
                    <span className="text-zinc-500 text-[11px]">Debates, consensus, tradeoffs</span>
                  </div>
                </div>

                <div className="p-3 bg-white/[0.04] border border-white/15 rounded-lg text-zinc-200 font-mono text-[11px]">
                  <span className="text-emerald-400 font-bold mr-1">✓</span> &ldquo;Forge tells you WHY something happened and WHERE that information came from.&rdquo;
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Source-Verified Evidence</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Click any citation chip to open the exact GitHub pull request or Discord thread that generated the decision.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
