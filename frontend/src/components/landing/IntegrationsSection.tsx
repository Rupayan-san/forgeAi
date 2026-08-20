"use client";

import { motion } from "framer-motion";
import { Layers, Database, Cpu, Layout } from "lucide-react";

export function IntegrationsSection() {
  const categories = [
    {
      title: "DATA SOURCES",
      icon: Layers,
      iconColor: "text-cyan-400",
      items: [
        { name: "GitHub", role: "Commits, PRs, Issues, READMEs" },
        { name: "Discord", role: "Channels, Threads, Consensus" },
        { name: "Markdown Docs", role: "Architecture specs & RFCs" },
      ],
    },
    {
      title: "AI / RETRIEVAL",
      icon: Cpu,
      iconColor: "text-purple-400",
      items: [
        { name: "OpenAI Embeddings", role: "text-embedding-3 vectors" },
        { name: "Groq / Fast LLMs", role: "Sub-second answer synthesis" },
      ],
    },
    {
      title: "STORAGE",
      icon: Database,
      iconColor: "text-emerald-400",
      items: [
        { name: "Qdrant Vector DB", role: "1536-dim dense vector search" },
        { name: "MongoDB", role: "Relational document & entity graph" },
      ],
    },
    {
      title: "FRONTEND & UI",
      icon: Layout,
      iconColor: "text-orange-400",
      items: [
        { name: "Next.js 16 (App Router)", role: "Modern developer UI" },
        { name: "Tailwind CSS + shadcn", role: "Design tokens & interactive components" },
      ],
    },
  ];

  return (
    <section className="py-20 px-6 border-b border-[#262626] relative bg-[#030303]">
      <div className="max-w-[1300px] mx-auto">
        {/* Section Header with Scroll Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <h2 className="text-2xl sm:text-4xl font-normal text-white tracking-tight">
            Integrated with your stack
          </h2>
          <p className="text-sm text-zinc-400 mt-2">
            Engineered with high-performance open standards and production infrastructure.
          </p>
        </motion.div>

        {/* 4 Category Cards with Staggered Scroll Reveal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, idx) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="rounded-xl border border-[#262626] bg-[#0d0d0d] p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <cat.icon className={`w-4 h-4 ${cat.iconColor}`} />
                <span className="text-xs font-mono font-semibold uppercase text-zinc-300">
                  {cat.title}
                </span>
              </div>

              <div className="space-y-3">
                {cat.items.map((item) => (
                  <div key={item.name} className="space-y-0.5">
                    <div className="text-xs font-semibold text-white">{item.name}</div>
                    <div className="text-[11px] text-zinc-500 font-mono">{item.role}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
