"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Cpu } from "lucide-react";

export function ArchitectureSection() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const steps = [
    {
      num: "01",
      title: "Data Sources",
      tech: "GitHub + Discord + Docs",
      desc: "Webhooks and ingestion workers capture commits, PR diffs, and channel discussions in real-time.",
    },
    {
      num: "02",
      title: "Ingestion & Chunking",
      tech: "Syntax & AST Parsers",
      desc: "Parses code diffs, message threads, and markdown files into contextualized semantic chunks.",
    },
    {
      num: "03",
      title: "Entity & Decision Extraction",
      tech: "NLP & Decision Classifier",
      desc: "Identifies architectural choices, tradeoffs, participants, and rationale with confidence scoring.",
    },
    {
      num: "04",
      title: "Graph + Vector Store",
      tech: "Qdrant + MongoDB",
      desc: "1536-dim embeddings stored in Qdrant; relational entity graph metadata stored in MongoDB.",
    },
    {
      num: "05",
      title: "Hybrid Retrieval & Citations",
      tech: "RAG + Vector Retrieval",
      desc: "Sub-300ms vector search delivers answers with verified PR and message citation proofs.",
    },
  ];

  return (
    <section className="py-24 px-6 border-b border-[#262626] relative bg-[#030303] overflow-hidden">
      <div className="max-w-[1300px] mx-auto relative z-10">
        {/* Section Header with dynamic blur on card hover */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          animate={{
            filter: hoveredIdx !== null ? "blur(3px)" : "blur(0px)",
            opacity: hoveredIdx !== null ? 0.35 : 1,
          }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-5xl font-normal text-white tracking-tight">
            The end-to-end memory pipeline
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-2">
            A modular backend designed for continuous ingestion, entity extraction, and sub-300ms citation retrieval.
          </p>
        </motion.div>

        {/* 5-Step Pipeline Grid with interactive focus hover */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {steps.map((step, idx) => {
            const isHovered = hoveredIdx === idx;
            const isOtherHovered = hoveredIdx !== null && !isHovered;

            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                animate={{
                  scale: isHovered ? 1.07 : 1,
                  y: isHovered ? -10 : 0,
                  filter: isOtherHovered ? "blur(3px)" : "blur(0px)",
                  opacity: isOtherHovered ? 0.35 : 1,
                  zIndex: isHovered ? 30 : 1,
                }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={`rounded-xl border bg-[#0d0d0d] p-5 flex flex-col justify-between relative transition-colors duration-150 cursor-pointer ${
                  isHovered
                    ? "border-zinc-300/80 bg-[#141414] shadow-[0_25px_50px_rgba(0,0,0,0.95),0_0_35px_rgba(255,255,255,0.08)] ring-1 ring-white/20"
                    : "border-[#262626] shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3 text-xs font-mono">
                    <span className={`font-bold transition-colors ${isHovered ? "text-white" : "text-zinc-200"}`}>
                      {step.num}
                    </span>
                    {idx < steps.length - 1 && (
                      <span className="hidden md:inline text-zinc-600 text-[10px]">→</span>
                    )}
                  </div>
                  <h3 className={`text-sm font-semibold mb-1 transition-colors ${isHovered ? "text-white" : "text-zinc-100"}`}>
                    {step.title}
                  </h3>
                  <p className="text-[11px] font-mono text-zinc-400 mb-3">{step.tech}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
