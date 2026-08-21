"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const defaultMessages = [
  'Event: Ingested PR #382 "Vector Index Optimization" by @sarah.chen',
  "Parsing AST diff → 14 modified files → 8 entity relations mapped",
  "Vector Search: 4 matching architectural decisions in Qdrant",
  "Entity Linking: Linked PR #382 → Decision #142 → Discord #backend-dev",
  "Knowledge Graph Trace: Depth 3 traversal completed in 42ms",
  "Decision citation verified · Confidence 98.4%",
  "Memory Graph updated: Causal dependency chain refreshed across repo",
  "Source-backed explanation linked to GitHub commit and Discord thread",
  "Idle. Listening for incoming git commits and discord webhooks...",
];

function AnimatedDot({
  path,
  duration,
  delay,
  size,
  opacity,
  color = "#0052FF",
}: {
  path: string;
  duration: number;
  delay: number;
  size: number;
  opacity: number;
  color?: string;
}) {
  return (
    <circle r={size} fill={color} opacity={opacity}>
      <animateMotion
        dur={`${duration}s`}
        repeatCount="indefinite"
        begin={`${delay}s`}
        path={path}
      />
    </circle>
  );
}

function PulsingDot({
  cx,
  cy,
  color,
  duration,
  delay = 0,
}: {
  cx: number;
  cy: number;
  color: string;
  duration: number;
  delay?: number;
}) {
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={2.8}
      fill={color}
      animate={{ opacity: [0.15, 1, 0.15] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function StatusIndicator({
  cx,
  cy,
  color,
  pulsing = false,
  duration = 1.9,
  delay = 0,
}: {
  cx: number;
  cy: number;
  color: string;
  pulsing?: boolean;
  duration?: number;
  delay?: number;
}) {
  if (pulsing) {
    return (
      <motion.circle
        cx={cx}
        cy={cy}
        r={3}
        fill={color}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    );
  }
  return <circle cx={cx} cy={cy} r={3} fill={color} opacity={0.95} />;
}

export interface EnterpriseAIPipelineProps {
  className?: string;
  messages?: string[];
}

export default function EnterpriseAIPipeline({
  className = "",
  messages = defaultMessages,
}: EnterpriseAIPipelineProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => {
      clearInterval(messageInterval);
    };
  }, [messages.length]);

  const paths = {
    p1: "M116,88 L158,88",
    p2: "M268,88 L306,88",
    p3: "M411,88 C425,88 435,50 445,50",
    p4: "M411,88 L445,88",
    p5: "M411,88 C425,88 435,126 445,126",
  };

  return (
    <div className={`bg-[#090909] border border-white/[0.08] rounded-[16px] overflow-hidden font-sans w-full max-w-[620px] mx-auto shadow-2xl ${className}`}>
      {/* Header */}
      <div className="px-[18px] py-[11px] border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-[7px]">
          <motion.span
            className="w-[6px] h-[6px] rounded-full bg-blue-500 inline-block shadow-[0_0_8px_rgba(59,130,246,0.6)]"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-[10px] text-white/40 tracking-[0.1em] font-mono font-semibold">
            ENTITY GRAPH TRACE · REAL-TIME
          </span>
        </div>
        <span className="text-[10px] text-blue-400 font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          5 Graph Nodes Linked
        </span>
      </div>

      {/* SVG Pipeline Visualization */}
      <svg width="100%" viewBox="0 0 580 172" className="block select-none">
        <defs>
          <marker
            id="ma-blue"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path
              d="M2 1.5L7.5 5L2 8.5"
              fill="none"
              stroke="rgba(0,82,255,0.65)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>

        {/* Connection Paths */}
        <path
          d={paths.p1}
          fill="none"
          stroke="rgba(0,82,255,0.28)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
          markerEnd="url(#ma-blue)"
        />
        <path
          d={paths.p2}
          fill="none"
          stroke="rgba(0,82,255,0.28)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
          markerEnd="url(#ma-blue)"
        />
        <path
          d={paths.p3}
          fill="none"
          stroke="rgba(0,82,255,0.22)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
        />
        <path
          d={paths.p4}
          fill="none"
          stroke="rgba(0,82,255,0.22)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
        />
        <path
          d={paths.p5}
          fill="none"
          stroke="rgba(0,82,255,0.22)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
        />

        {/* Animated dots along paths in Dark/Electric Blue */}
        <AnimatedDot path={paths.p1} duration={1.05} delay={0} size={2.5} opacity={1} color="#0052FF" />
        <AnimatedDot path={paths.p1} duration={1.05} delay={0.35} size={1.8} opacity={0.65} color="#0052FF" />
        <AnimatedDot path={paths.p1} duration={1.05} delay={0.7} size={1.3} opacity={0.35} color="#0052FF" />

        <AnimatedDot path={paths.p2} duration={0.88} delay={0.18} size={2.5} opacity={1} color="#0052FF" />
        <AnimatedDot path={paths.p2} duration={0.88} delay={0.62} size={1.8} opacity={0.65} color="#0052FF" />

        <AnimatedDot path={paths.p3} duration={1.3} delay={0.08} size={2.2} opacity={0.9} color="#38bdf8" />
        <AnimatedDot path={paths.p3} duration={1.3} delay={0.65} size={1.5} opacity={0.55} color="#38bdf8" />

        <AnimatedDot path={paths.p4} duration={1.15} delay={0.28} size={2.2} opacity={0.9} color="#0052FF" />
        <AnimatedDot path={paths.p4} duration={1.15} delay={0.85} size={1.5} opacity={0.55} color="#0052FF" />

        <AnimatedDot path={paths.p5} duration={1.4} delay={0.45} size={2.2} opacity={0.9} color="#6366f1" />
        <AnimatedDot path={paths.p5} duration={1.4} delay={1.0} size={1.5} opacity={0.55} color="#6366f1" />

        {/* Git/Discord Ingestion Node */}
        <rect
          x="16"
          y="66"
          width="100"
          height="44"
          rx="8"
          fill="#141414"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.8"
        />
        <text
          x="66"
          y="83"
          textAnchor="middle"
          fontSize="9.5"
          fill="rgba(255,255,255,0.35)"
          fontFamily="monospace"
          letterSpacing=".07em"
        >
          INGESTION
        </text>
        <text
          x="66"
          y="100"
          textAnchor="middle"
          fontSize="11.5"
          fill="rgba(255,255,255,0.9)"
          fontFamily="system-ui"
          fontWeight="500"
        >
          PR #382 Diff
        </text>
        <text
          x="66"
          y="122"
          textAnchor="middle"
          fontSize="8.5"
          fill="rgba(255,255,255,0.25)"
          fontFamily="monospace"
        >
          github.webhook
        </text>

        {/* Vector Store Node */}
        <rect
          x="158"
          y="66"
          width="110"
          height="44"
          rx="8"
          fill="#141414"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.8"
        />
        <text
          x="213"
          y="83"
          textAnchor="middle"
          fontSize="9.5"
          fill="rgba(255,255,255,0.35)"
          fontFamily="monospace"
          letterSpacing=".07em"
        >
          VECTOR STORE
        </text>
        <text
          x="213"
          y="100"
          textAnchor="middle"
          fontSize="11.5"
          fill="rgba(255,255,255,0.9)"
          fontFamily="system-ui"
          fontWeight="500"
        >
          Qdrant 1536-D
        </text>
        <text
          x="213"
          y="122"
          textAnchor="middle"
          fontSize="8.5"
          fill="rgba(255,255,255,0.25)"
          fontFamily="monospace"
        >
          cosine-sim 0.94
        </text>

        {/* Central Knowledge Graph Node - Dark Blue Theme */}
        <rect
          x="306"
          y="53"
          width="105"
          height="70"
          rx="10"
          fill="#050D1C"
          stroke="#0052FF"
          strokeWidth="1.2"
        />
        <rect x="318" y="53.5" width="80" height="1" rx="0.5" fill="rgba(51,117,255,0.6)" />
        <text
          x="358"
          y="76"
          textAnchor="middle"
          fontSize="9"
          fill="rgba(51,117,255,0.85)"
          fontFamily="monospace"
          letterSpacing=".07em"
          fontWeight="600"
        >
          ENTITY ENGINE
        </text>
        <text
          x="358"
          y="95"
          textAnchor="middle"
          fontSize="12"
          fill="#fff"
          fontFamily="system-ui"
          fontWeight="600"
        >
          Knowledge Graph
        </text>
        <PulsingDot cx={346} cy={110} color="#0052FF" duration={1.2} delay={0} />
        <PulsingDot cx={358} cy={110} color="#0052FF" duration={1.2} delay={0.4} />
        <PulsingDot cx={370} cy={110} color="#0052FF" duration={1.2} delay={0.8} />
        <text
          x="358"
          y="139"
          textAnchor="middle"
          fontSize="8.5"
          fill="rgba(0,82,255,0.55)"
          fontFamily="monospace"
        >
          forge.graph.v2
        </text>

        {/* Output Linked Nodes */}
        {/* Node 1: Author */}
        <rect
          x="445"
          y="35"
          width="122"
          height="30"
          rx="7"
          fill="#111"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.6"
        />
        <text
          x="494"
          y="53.5"
          textAnchor="middle"
          fontSize="10"
          fill="rgba(255,255,255,0.8)"
          fontFamily="system-ui"
        >
          Author: @sarah
        </text>
        <StatusIndicator cx={555} cy={43} color="#38bdf8" />

        {/* Node 2: MongoDB Schema */}
        <rect
          x="445"
          y="73"
          width="122"
          height="30"
          rx="7"
          fill="#111"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.6"
        />
        <text
          x="494"
          y="91.5"
          textAnchor="middle"
          fontSize="10"
          fill="rgba(255,255,255,0.8)"
          fontFamily="system-ui"
        >
          MongoDB Schema
        </text>
        <StatusIndicator cx={555} cy={81} color="#0052FF" pulsing duration={1.9} />

        {/* Node 3: GitHub Discussion */}
        <rect
          x="445"
          y="111"
          width="122"
          height="30"
          rx="7"
          fill="#111"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.6"
        />
        <text
          x="494"
          y="129.5"
          textAnchor="middle"
          fontSize="10"
          fill="rgba(255,255,255,0.8)"
          fontFamily="system-ui"
        >
          Discussion #18
        </text>
        <StatusIndicator cx={555} cy={119} color="#6366f1" pulsing duration={2.2} delay={0.35} />
      </svg>

      {/* Real-time Message Ticker */}
      <div className="border-t border-white/[0.06] px-[18px] py-[9px] h-[52px]">
        <div className="flex gap-2 items-start h-full">
          <span className="text-blue-500 font-mono text-[13px] leading-[1.5] shrink-0 font-bold">
            ›
          </span>
          <div className="relative flex-1 overflow-hidden h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={messageIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.25 }}
                className="font-mono text-[11px] text-zinc-300 leading-[1.55] absolute inset-0"
              >
                {messages[messageIndex]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Illustrative Product Metrics Footer */}
      <div className="border-t border-white/[0.06] px-[18px] py-[10px] flex gap-[22px] items-center bg-[#070707]">
        <div>
          <div className="text-[9px] text-zinc-500 tracking-[0.09em] font-mono mb-[2px]">GRAPH TRACES</div>
          <div className="text-[15px] text-zinc-200 font-mono font-semibold">
            1,497
          </div>
        </div>
        <div>
          <div className="text-[9px] text-zinc-500 tracking-[0.09em] font-mono mb-[2px]">CONFIDENCE</div>
          <div className="text-[15px] text-blue-400 font-mono font-semibold">98.4%</div>
        </div>
        <div>
          <div className="text-[9px] text-zinc-500 tracking-[0.09em] font-mono mb-[2px]">LATENCY</div>
          <div className="text-[15px] text-zinc-200 font-mono font-semibold">42ms</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[9px] text-zinc-500 tracking-[0.09em] font-mono mb-[2px]">STORAGE</div>
          <div className="text-[10px] text-blue-400/90 font-mono font-semibold">Qdrant · MongoDB</div>
        </div>
      </div>
    </div>
  );
}
export { EnterpriseAIPipeline };
