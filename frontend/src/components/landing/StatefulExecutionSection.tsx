"use client";

import { motion } from "framer-motion";
import { GitBranch, MessageSquare, Brain, Folder, Hash, Search } from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";

export function StatefulExecutionSection() {
  return (
    <section id="features" className="py-24 px-6 border-b border-[#262626] relative bg-[#030303]">
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
              Passive ingestion.
            </h2>
            <h2 className="text-3xl sm:text-5xl font-normal text-zinc-500 tracking-tight mt-1">
              Forge remembers every commit &amp; debate.
            </h2>
          </div>
          <div className="lg:pt-2">
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-lg">
              Forge is the continuous vector memory runtime for software teams — indexing repository commits, pull requests, issues, and Discord threads without changing how your team works.
            </p>
          </div>
        </motion.div>

        {/* Full Dashboard Mockup Window with Scroll Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="rounded-2xl border border-[#262626] bg-[#0d0d0d] shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden mb-16"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[480px]">
            {/* Sidebar */}
            <div className="md:col-span-3 border-r border-[#262626] p-5 bg-[#080808] flex flex-col justify-between text-xs">
              <div className="space-y-6">
                {/* Brand header in sidebar */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white text-[10px] font-bold">F</div>
                    <span className="font-semibold text-white">Forge Workspace</span>
                    <span className="text-[10px] text-zinc-500">▾</span>
                  </div>
                  <Search className="w-3.5 h-3.5 text-zinc-400" />
                </div>

                {/* Primary Nav: Projects */}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-2.5 mb-2">Projects ▾</div>
                  <div className="space-y-1 text-zinc-400 font-medium">
                    <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded bg-zinc-800 text-white font-semibold cursor-pointer border border-zinc-700/50">
                      <Folder className="w-3.5 h-3.5 text-zinc-200" />
                      <span>ecommerce-engine</span>
                    </div>
                    <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
                      <Folder className="w-3.5 h-3.5 text-zinc-500" />
                      <span>auth-microservice</span>
                    </div>
                    <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
                      <Folder className="w-3.5 h-3.5 text-zinc-500" />
                      <span>payment-gateway</span>
                    </div>
                  </div>
                </div>

                {/* Connected Ingestion Sources */}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-2.5 mb-2">Data Sources ▾</div>
                  <div className="space-y-1.5 text-zinc-400 text-[11px] px-2.5 font-mono">
                    <div className="flex items-center justify-between text-zinc-300">
                      <span className="flex items-center gap-1.5">
                        <GithubIcon className="w-3 h-3 text-zinc-400" size={12} />
                        <span>github.com/org/repo</span>
                      </span>
                      <span className="text-zinc-300 text-[9px] px-1.5 py-0.2 rounded bg-white/5 border border-white/10">SYNCED</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-300">
                      <span className="flex items-center gap-1.5">
                        <Hash className="w-3 h-3 text-zinc-400" />
                        <span>#architecture</span>
                      </span>
                      <span className="text-zinc-300 text-[9px] px-1.5 py-0.2 rounded bg-white/5 border border-white/10">ACTIVE</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-300">
                      <span className="flex items-center gap-1.5">
                        <Brain className="w-3 h-3 text-zinc-400" />
                        <span>Qdrant Vector DB</span>
                      </span>
                      <span className="text-zinc-300 text-[9px] px-1.5 py-0.2 rounded bg-white/5 border border-white/10">READY</span>
                    </div>
                  </div>
                </div>

                {/* Qdrant Vector Stats */}
                <div className="pt-3 border-t border-white/10">
                  <div className="text-[10px] font-mono text-zinc-500">
                    <div>Qdrant Collection: <span className="text-zinc-300">forge_eco_v1</span></div>
                    <div>Chunks: <span className="text-zinc-200 font-semibold">14,280</span> embedded</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline View */}
            <div className="md:col-span-9 p-6 overflow-x-auto bg-[#0d0d0d]">
              {/* Timeline Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-[11px] font-mono text-zinc-500">
                <div className="flex gap-16 font-semibold text-zinc-400">
                  <span>RECENT COMMITS &amp; THREADS</span>
                </div>
                <div className="flex gap-8 text-zinc-600">
                  <span>AST PARSE</span>
                  <span>CHUNK &amp; EMBED</span>
                  <span>DECISION EXTRACT</span>
                  <span>VECTOR INDEX</span>
                </div>
              </div>

              {/* Ingestion Stream Tracks */}
              <div className="py-6 space-y-7">
                {/* Stream 1 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-sm bg-zinc-200" />
                    <span className="text-xs font-semibold text-white">PR #47: GraphQL migration for mobile dashboard</span>
                    <span className="text-[10px] font-mono text-zinc-500">GitHub PR Ingestion</span>
                  </div>
                  <div className="relative h-10 bg-black/50 border border-white/10 rounded-lg flex items-center px-4 overflow-hidden">
                    <div className="absolute inset-y-0 left-0 right-1/3 bg-gradient-to-r from-cyan-950/50 via-cyan-900/30 to-transparent rounded" />
                    <div className="relative z-10 flex items-center justify-between w-full text-[11px] font-mono text-zinc-400 px-4">
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-white font-medium">
                        ◇ Diff Analysis
                      </span>
                      <span className="flex items-center gap-1.5 text-zinc-400">◆ 48 Chunks Indexed</span>
                      <span className="text-zinc-400">✓ Decision Extracted</span>
                    </div>
                  </div>
                </div>

                {/* Stream 2 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-sm bg-zinc-400" />
                    <span className="text-xs font-semibold text-white">Discord: PostgreSQL vs MongoDB for analytics</span>
                    <span className="text-[10px] font-mono text-zinc-500">#architecture channel</span>
                  </div>
                  <div className="relative h-10 bg-black/50 border border-white/10 rounded-lg flex items-center px-4 overflow-hidden">
                    <div className="absolute inset-y-0 left-1/4 right-1/4 bg-gradient-to-r from-indigo-950/50 via-indigo-900/30 to-transparent rounded" />
                    <div className="relative z-10 flex items-center justify-between w-full text-[11px] font-mono text-zinc-400 px-4">
                      <span className="text-zinc-500">◇ 24 Messages</span>
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-white font-medium">
                        ◆ Context Synthesized
                      </span>
                      <span className="text-zinc-500">Score 94%</span>
                    </div>
                  </div>
                </div>

                {/* Stream 3 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-sm bg-zinc-300" />
                    <span className="text-xs font-semibold text-white">Commit a3f2d1e: Rate limiting at gateway level</span>
                    <span className="text-[10px] font-mono text-zinc-500">Git Commit Ingestion</span>
                  </div>
                  <div className="relative h-10 bg-black/50 border border-white/10 rounded-lg flex items-center px-4 overflow-hidden">
                    <div className="absolute inset-y-0 left-1/3 right-12 bg-gradient-to-r from-rose-950/50 via-rose-900/30 to-transparent rounded" />
                    <div className="relative z-10 flex items-center justify-between w-full text-[11px] font-mono text-zinc-400 px-4">
                      <span className="text-zinc-500">◇ Code Diffs</span>
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-500/20 text-white font-medium">
                        ◆ Qdrant Vector Stored
                      </span>
                      <span className="text-zinc-500">1536-dim</span>
                    </div>
                  </div>
                </div>

                {/* Stream 4 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-sm bg-zinc-500" />
                    <span className="text-xs font-semibold text-white">Chat query: Database migration roadmap</span>
                    <span className="text-[10px] font-mono text-zinc-500">FastAPI RAG Inference</span>
                  </div>
                  <div className="relative h-10 bg-black/50 border border-white/10 rounded-lg flex items-center px-4 overflow-hidden">
                    <div className="relative z-10 flex items-center justify-between w-full text-[11px] font-mono text-zinc-400 px-4">
                      <span className="text-zinc-500">◇ Semantic Search</span>
                      <span className="text-zinc-400">◆ Verified Citations Linked</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3 Sub-Features Row with Staggered Scroll Reveal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: 0, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <GitBranch className="w-4 h-4 text-zinc-300" />
              <span>Passive GitHub Ingestion.</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Commits, pull requests, issues, and READMEs are embedded automatically on push.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <MessageSquare className="w-4 h-4 text-zinc-300" />
              <span>Discord Context Capture.</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Extracts key technical debates and architectural choices from your Discord channels.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <Brain className="w-4 h-4 text-zinc-300" />
              <span>Grounded Decision Retrieval.</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Query architectural choices and rationale via sub-second vector search with verified original source evidence.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
