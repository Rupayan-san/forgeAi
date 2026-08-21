"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Eye, Sparkles, Brain, Code, Terminal, Clock, ShieldAlert } from "lucide-react";

interface AgentActivity {
  id: string;
  agentName: string;
  model: string;
  avatar: string;
  action: string;
  timestamp: string;
  status: "pending_approval" | "completed" | "executing";
  details: string;
}

const initialActivities: AgentActivity[] = [
  {
    id: "act-1",
    agentName: "Claude 3.7 Sonnet",
    model: "claude-3-7-sonnet",
    avatar: "🧠",
    action: "Extracted Architectural Decision from PR #142",
    timestamp: "2 mins ago",
    status: "pending_approval",
    details: "Detected migration from Redis to Qdrant vector memory. Required confidence score 96%.",
  },
  {
    id: "act-2",
    agentName: "Gemini 2.5 Pro",
    model: "gemini-2.5-pro",
    avatar: "✨",
    action: "Synthesized Discord discussion in #architecture",
    timestamp: "14 mins ago",
    status: "completed",
    details: "Logged 18 participant viewpoints and decision rationale regarding auth middleware.",
  },
  {
    id: "act-3",
    agentName: "Codex Agent",
    model: "gpt-4o-mini",
    avatar: "⚡",
    action: "Backfilled 85 GitHub Commits to Knowledge Graph",
    timestamp: "1 hour ago",
    status: "completed",
    details: "Generated 340 vector chunks into collection `forge_proj_prod`.",
  },
];

export function AgentActivityFeed() {
  const [activities, setActivities] = useState(initialActivities);

  const handleApprove = (id: string) => {
    setActivities((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "completed" } : item
      )
    );
  };

  const handleDismiss = (id: string) => {
    setActivities((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <section id="insights" className="py-24 px-6 relative z-10 max-w-5xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-zinc-900/50 text-xs font-mono text-emerald-400 mb-4"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>AGENT INBOX & ACTIVITY FEED</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4"
        >
          Realtime agent execution feed
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-zinc-400 text-base"
        >
          Inspect model reasoning, review auto-extracted decisions, and approve pending agent actions.
        </motion.p>
      </div>

      {/* Activity Card Stack */}
      <div className="space-y-4">
        <AnimatePresence>
          {activities.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
              whileHover={{ scale: 1.01 }}
              className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 transition-all duration-200 shadow-md hover:shadow-lg hover:border-white/20"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-lg shrink-0">
                    {item.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-semibold text-white">
                        {item.agentName}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 border border-white/10 rounded-full px-2 py-0.5 bg-black/40">
                        {item.model}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        {item.timestamp}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-zinc-200 mt-1">
                      {item.action}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 font-mono">
                      {item.details}
                    </p>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {item.status === "pending_approval" ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-amber-400 border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> PENDING APPROVAL
                      </span>
                      <button
                        onClick={() => handleApprove(item.id)}
                        className="px-3 py-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleDismiss(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-white rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> EXECUTED
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
