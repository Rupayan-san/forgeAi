"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  GitPullRequest,
  Hash,
  GitCommit,
  Sparkles,
  Calendar,
  Users,
} from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";

export function MagicMomentDemo() {
  const [activeTab, setActiveTab] = useState<"pr" | "discord" | "commit">("pr");

  return (
    <section id="demo" className="py-20 px-6 border-b border-[#262626] relative z-10 bg-[#030303]">
      <div className="max-w-[1300px] mx-auto">
        {/* Section Header with Scroll Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2 className="text-3xl sm:text-5xl font-normal text-white tracking-tight mb-4">
            Trace every decision to its <span className="text-zinc-400 font-normal">source</span>.
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Forge traces decisions through commits, PR discussions, and Discord threads to return verified answers with original source evidence.
          </p>
        </motion.div>

        {/* Large Magic Moment Visual Container with Scroll Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="rounded-2xl border border-[#262626] bg-[#0d0d0d] shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden"
        >
          {/* Top Window Header / MacBook Nav Bar */}
          <div className="flex flex-wrap items-center justify-between px-5 sm:px-6 py-3.5 border-b border-[#262626] bg-[#070707]/95 backdrop-blur-md text-xs font-mono gap-3">
            <div className="flex items-center gap-3">
              {/* Traffic Light Buttons */}
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/60 cursor-pointer transition-transform hover:scale-110" />
                <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/60 cursor-pointer transition-transform hover:scale-110" />
                <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/60 cursor-pointer transition-transform hover:scale-110" />
              </div>
              {/* Repo & Environment Pill */}
              <div className="flex items-center gap-1.5 ml-2 px-3 py-1 rounded-md bg-white/[0.04] border border-white/10 text-[11px] text-zinc-400">
                <span className="font-semibold text-zinc-300">forge-memory</span>
                <span className="text-zinc-600">//</span>
                <span>repo:</span>
                <span className="text-zinc-300 font-medium">cloudscale/core</span>
                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-white/5 text-zinc-400 border border-white/10 text-[9px]">
                  main
                </span>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black border border-emerald-500/40 text-[11px] font-mono tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-emerald-400">EVIDENCE ENGINE ONLINE</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Step 1: The Question */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-[10px]">1</span>
                <span className="font-semibold text-zinc-300">QUESTION ASKED BY DEVELOPER</span>
              </div>
              <div className="p-4 sm:p-5 rounded-xl bg-[#050505] border border-[#262626] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 text-base sm:text-lg text-white font-medium">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 text-sm shrink-0 font-mono font-bold">
                    ?
                  </div>
                  <span>&ldquo;Why did we switch from Redis to PostgreSQL for the leaderboard?&rdquo;</span>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 px-3 py-1 rounded-full bg-white/5 border border-white/10 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                  Voice / Chat Query
                </span>
              </div>
            </div>

            {/* Step 2: Forge Answer */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-zinc-200 text-black font-bold flex items-center justify-center text-[10px]">2</span>
                <span className="font-semibold">FORGE ANSWER (GROUNDED IN PROJECT MEMORY)</span>
              </div>
              <div className="p-5 sm:p-6 rounded-xl bg-[#121212] border border-[#353535] shadow-[0_0_30px_rgba(255,255,255,0.03)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
                      <Zap className="w-3 h-3 text-zinc-200" strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
                      Decision Rationale Extracted
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Mar 14, 2024
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Users className="w-3.5 h-3.5 text-zinc-500" /> Alex Kumar, Sarah Chen
                    </span>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-sans">
                  The switch from Redis sorted sets to PostgreSQL was decided during the <strong className="text-white">v2.4 architecture review (PR #184)</strong>. While Redis provided sub-millisecond writes, the team required <strong className="text-zinc-100 font-semibold">ACID transactional consistency</strong> with the user billing ledger and historical rank audit queries, which caused out-of-sync race conditions in Redis.
                </p>

                {/* Clickable Citation Badges */}
                <div className="pt-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-2 font-semibold">
                    VERIFIED EVIDENCE CITATIONS (CLICK TO INSPECT SOURCE):
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={() => setActiveTab("pr")}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-mono transition-all cursor-pointer ${activeTab === "pr"
                        ? "bg-zinc-800 border-zinc-400 text-white shadow-[0_0_15px_rgba(255,255,255,0.06)]"
                        : "bg-black/50 border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
                        }`}
                    >
                      <GithubIcon className="w-3.5 h-3.5 text-white" size={14} />
                      <GitPullRequest className="w-3 h-3 text-zinc-300" />
                      <span className="font-semibold">PR #184: migrate to postgres schema</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-200 border border-white/10">
                        Decision source
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab("discord")}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-mono transition-all cursor-pointer ${activeTab === "discord"
                        ? "bg-zinc-800 border-zinc-400 text-white shadow-[0_0_15px_rgba(255,255,255,0.06)]"
                        : "bg-black/50 border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
                        }`}
                    >
                      <Hash className="w-3 h-3 text-zinc-300" />
                      <span className="font-semibold">Discord #backend-architecture</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-200 border border-white/10">
                        Original discussion
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab("commit")}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-mono transition-all cursor-pointer ${activeTab === "commit"
                        ? "bg-zinc-800 border-zinc-400 text-white shadow-[0_0_15px_rgba(255,255,255,0.06)]"
                        : "bg-black/50 border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
                        }`}
                    >
                      <GitCommit className="w-3.5 h-3.5 text-zinc-300" />
                      <span className="font-semibold">Commit 4f9e18b</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-200 border border-white/10">
                        Supports answer
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Interactive Evidence Inspector */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-[10px]">3</span>
                <span className="font-semibold">
                  EVIDENCE PROOF ({activeTab === "pr" ? "GITHUB PULL REQUEST" : activeTab === "discord" ? "DISCORD TEAM DISCUSSION" : "GIT COMMIT DIFF"})
                </span>
              </div>

              {activeTab === "pr" && (
                <div className="p-5 rounded-xl bg-[#080808] border border-[#262626] font-mono text-xs text-zinc-300 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between text-zinc-400 border-b border-white/10 pb-2.5">
                    <span className="text-white font-semibold flex items-center gap-2">
                      <GithubIcon className="w-3.5 h-3.5" size={14} />
                      github.com/cloudscale/core/pull/184
                    </span>
                    <span className="text-zinc-200 bg-white/10 px-2 py-0.5 rounded text-[10px] border border-white/15">MERGED • Mar 14, 2024</span>
                  </div>
                  <p className="text-zinc-400">
                    <span className="text-zinc-200 font-semibold">@alex-kumar</span> wrote in PR description:
                  </p>
                  <blockquote className="pl-3.5 border-l-2 border-zinc-500 text-zinc-300 italic bg-white/[0.02] py-2 rounded-r leading-relaxed">
                    &ldquo;Replaces the Redis sorted set implementation with a partitioned Postgres table. We ran into consistency anomalies where refunds were not reflected in real-time leaderboard ranks. Postgres window functions give us auditability without sacrificing query performance.&rdquo;
                  </blockquote>
                </div>
              )}

              {activeTab === "discord" && (
                <div className="p-5 rounded-xl bg-[#080808] border border-[#262626] font-mono text-xs text-zinc-300 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between text-zinc-400 border-b border-white/10 pb-2.5">
                    <span className="text-zinc-200 font-semibold flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-zinc-400" />
                      Discord #backend-architecture (Thread: &ldquo;Redis vs Postgres consistency&rdquo;)
                    </span>
                    <span className="text-zinc-500 text-[10px]">18 MESSAGES INDEXED</span>
                  </div>
                  <div className="space-y-2">
                    <p><span className="text-zinc-300 font-semibold">@sarah.chen:</span> &ldquo;Redis is fast, but handling dual writes between Redis and our billing DB is giving us sync headaches.&rdquo;</p>
                    <p><span className="text-zinc-300 font-semibold">@alex-kumar:</span> &ldquo;Agreed. Benchmarked Postgres indexes with 500k rows—latencies are under 12ms, well within our 50ms SLA. Let&apos;s migrate in PR #184.&rdquo;</p>
                  </div>
                </div>
              )}

              {activeTab === "commit" && (
                <div className="p-5 rounded-xl bg-[#080808] border border-[#262626] font-mono text-xs text-zinc-300 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between text-zinc-400 border-b border-white/10 pb-2.5">
                    <span className="text-zinc-200 font-semibold flex items-center gap-2">
                      <GitCommit className="w-3.5 h-3.5 text-zinc-400" />
                      commit 4f9e18b4e72c
                    </span>
                    <span className="text-zinc-500 text-[10px]">Authored by @alex-kumar</span>
                  </div>
                  <div className="bg-black/60 p-3 rounded border border-white/5 space-y-1 text-[11px] text-zinc-300">
                    <p className="text-zinc-200 font-mono">+ const leaderboardQuery = &apos;SELECT user_id, RANK() OVER (ORDER BY score DESC) FROM ledger_scores&apos;;</p>
                    <p className="text-zinc-500 font-mono">- await redisClient.zadd(&apos;leaderboard&apos;, userScore, userId);</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
