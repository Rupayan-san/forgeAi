"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  Clock,
  Shield,
  Activity,
  CheckCircle2,
  GitBranch,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ArrowUpRight,
} from "lucide-react";

export function FeatureGrid() {
  const [activeTab, setActiveTab] = useState<"cron" | "webhook" | "adaptive">("adaptive");
  const [guardrails, setGuardrails] = useState({
    enforce: true,
    approval: true,
    monitor: true,
  });

  return (
    <section id="features" className="py-24 px-6 relative z-10 max-w-6xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/10 bg-zinc-900/50 text-xs font-mono text-emerald-400 mb-4"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AUTONOMOUS EXECUTION ENGINE</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-4"
        >
          Built for production AI workflows
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-zinc-400 text-base sm:text-lg"
        >
          From event-driven triggers to safety guardrails, manage agent lifecycles with enterprise precision.
        </motion.p>
      </div>

      {/* 3-Column Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {[
          {
            icon: Clock,
            title: "Schedule on signal",
            subtitle: "Event-driven execution",
            description: "Trigger agents automatically via GitHub webhooks, Discord messages, or cron schedules with zero polling latency.",
            badge: "REALTIME",
          },
          {
            icon: Layers,
            title: "Resume with context",
            subtitle: "Persistent memory state",
            description: "Maintain uninterrupted context across long-running task executions using Qdrant vector memory and MongoDB graph storage.",
            badge: "PERSISTENT",
          },
          {
            icon: Shield,
            title: "Run with guardrails",
            subtitle: "Policy enforcement",
            description: "Enforce human-in-the-loop approvals, confidence thresholds, and strict token limits on every LLM action.",
            badge: "ENTERPRISE",
          },
        ].map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.02, borderColor: "rgba(255, 255, 255, 0.25)" }}
            className="group relative bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-7 flex flex-col justify-between transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-emerald-400/50 group-hover:bg-emerald-400/10 transition-colors">
                  <item.icon className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 border border-white/10 rounded-full px-2.5 py-0.5 bg-black/40">
                  {item.badge}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                {item.title}
              </h3>
              <p className="text-xs font-mono text-zinc-400 mb-3">{item.subtitle}</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{item.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Live Agent Pipeline Mockup Card */}
      <motion.div
        id="pipeline"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-zinc-900/60 backdrop-blur-xl border border-white/15 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
                Live Agent Pipeline
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE • 99.9% Uptime
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Autonomous Ingestion & Decision Dispatcher
            </h3>
          </div>

          {/* Trigger Pills */}
          <div className="flex items-center gap-2 bg-black/50 p-1.5 rounded-full border border-white/10">
            {(["cron", "webhook", "adaptive"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all cursor-pointer ${activeTab === tab
                    ? "bg-white text-black font-semibold shadow-md"
                    : "text-zinc-400 hover:text-white"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Mock Pipeline Flow Visual */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
          {/* Col 1: Trigger Event */}
          <div className="bg-black/50 border border-white/10 rounded-xl p-5 font-mono text-xs">
            <div className="flex items-center justify-between text-zinc-400 mb-3 border-b border-white/10 pb-2">
              <span className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-400" />
                <span>1. TRIGGER SIGNAL</span>
              </span>
              <span className="text-[10px] text-emerald-400">active</span>
            </div>
            <div className="space-y-2 text-zinc-300">
              <p><span className="text-zinc-500">Event:</span> push:main (PR #47)</p>
              <p><span className="text-zinc-500">Source:</span> GitHub Webhook</p>
              <p><span className="text-zinc-500">Payload:</span> 42 commits, 3 docs</p>
              <p><span className="text-zinc-500">Latency:</span> 18ms</p>
            </div>
          </div>

          {/* Col 2: Processing & Vector Memory */}
          <div className="bg-black/50 border border-white/10 rounded-xl p-5 font-mono text-xs">
            <div className="flex items-center justify-between text-zinc-400 mb-3 border-b border-white/10 pb-2">
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>2. VECTOR EMBEDDING</span>
              </span>
              <span className="text-[10px] text-emerald-400">1536-dim</span>
            </div>
            <div className="space-y-2 text-zinc-300">
              <p><span className="text-zinc-500">Model:</span> text-embedding-3</p>
              <p><span className="text-zinc-500">Chunks:</span> 128 created</p>
              <p><span className="text-zinc-500">Qdrant ID:</span> <span className="text-emerald-400">forge_proj_90x</span></p>
              <p><span className="text-zinc-500">Handoff metric:</span> 99.4% match</p>
            </div>
          </div>

          {/* Col 3: Guardrails & Action */}
          <div className="bg-black/50 border border-white/10 rounded-xl p-5 font-mono text-xs">
            <div className="flex items-center justify-between text-zinc-400 mb-3 border-b border-white/10 pb-2">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>3. GUARDRAIL POLICIES</span>
              </span>
              <span className="text-[10px] text-emerald-400">enforced</span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setGuardrails(g => ({ ...g, enforce: !g.enforce }))}>
                <span className="text-zinc-300">Enforce schema rules</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${guardrails.enforce ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                  {guardrails.enforce ? "ACTIVE" : "OFF"}
                </span>
              </div>

              <div className="flex items-center justify-between cursor-pointer" onClick={() => setGuardrails(g => ({ ...g, approval: !g.approval }))}>
                <span className="text-zinc-300">Require human approval</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${guardrails.approval ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                  {guardrails.approval ? "ACTIVE" : "OFF"}
                </span>
              </div>

              <div className="flex items-center justify-between cursor-pointer" onClick={() => setGuardrails(g => ({ ...g, monitor: !g.monitor }))}>
                <span className="text-zinc-300">Token usage monitor</span>
                <span className={`text-[10px] px-2 py-0.5 rounded ${guardrails.monitor ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                  {guardrails.monitor ? "ACTIVE" : "OFF"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
