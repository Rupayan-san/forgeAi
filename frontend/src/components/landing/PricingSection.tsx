"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export function PricingSection() {
  const [builderYearly, setBuilderYearly] = useState(false);
  const [teamYearly, setTeamYearly] = useState(false);

  return (
    <section id="pricing" className="py-24 px-6 border-b border-[#262626] relative bg-[#030303]">
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
              Pricing that grows
            </h2>
            <h2 className="text-3xl sm:text-5xl font-normal text-zinc-500 tracking-tight mt-1">
              with your codebase.
            </h2>
          </div>
          <div className="lg:pt-2">
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-lg">
              Start with free project indexing, then scale persistent vector memory across your entire engineering organization.
            </p>
          </div>
        </motion.div>

        {/* 4 Cards Grid with Staggered Scroll Reveal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. Hacker / Free */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: 0, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="rounded-2xl border border-[#262626] bg-[#0d0d0d] p-6 flex flex-col justify-between relative shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-zinc-300">Hacker</span>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">$0</span>
                <span className="text-xs text-zinc-500 font-mono">/ month</span>
              </div>
              <p className="text-xs text-zinc-400 min-h-[36px] mb-6">
                For hackathons and personal side projects.
              </p>
              <Link
                href="/login"
                className="w-full block text-center py-2.5 rounded-full border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold tracking-wider transition-colors mb-6"
              >
                Get Started
              </Link>
              <ul className="space-y-3 text-xs text-zinc-400 font-sans">
                <li className="flex items-center gap-2 text-zinc-300">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>1 Connected GitHub Repo</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Up to 5,000 Vector Chunks</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Chat Q&amp;A with Citations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Community Discord Support</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* 2. Builder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="rounded-2xl border border-white/20 bg-[#111111] p-6 flex flex-col justify-between relative shadow-xl"
          >
            {/* Top metallic highlight border */}
            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-zinc-200">Builder</span>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                  <button
                    onClick={() => setBuilderYearly(!builderYearly)}
                    className={`w-7 h-4 rounded-full transition-colors p-0.5 relative cursor-pointer ${
                      builderYearly ? "bg-zinc-200" : "bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full transition-transform ${
                        builderYearly ? "translate-x-3 bg-black" : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                  <span>Yearly</span>
                  <span className="text-[9px] px-1 bg-white/10 rounded text-zinc-300">Save 20%</span>
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  {builderYearly ? "$15.20" : "$19"}
                </span>
                <span className="text-xs text-zinc-500 font-mono">/ month</span>
              </div>
              <p className="text-xs text-zinc-400 min-h-[36px] mb-6">
                For growing engineering teams needing persistent context.
              </p>
              <Link
                href="/login"
                className="w-full block text-center py-2.5 rounded-full border border-white/30 hover:border-white/60 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold tracking-wider transition-colors mb-6 shadow-sm"
              >
                Get Started
              </Link>
              <ul className="space-y-3 text-xs text-zinc-400 font-sans">
                <li className="flex items-center gap-2 text-zinc-200 font-medium">
                  <Check className="w-3.5 h-3.5 text-zinc-200" />
                  <span>All Hacker features +</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>5 Connected GitHub Repos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>1 Discord Server Ingestion</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>50,000 Vector Chunks</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Automated Decision Extraction</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* 3. Team */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: 0.16, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="rounded-2xl border border-zinc-400/50 bg-[#141414] p-6 flex flex-col justify-between relative shadow-[0_0_35px_rgba(255,255,255,0.04)]"
          >
            {/* Top metallic highlight border */}
            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-zinc-200">Team</span>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
                  <button
                    onClick={() => setTeamYearly(!teamYearly)}
                    className={`w-7 h-4 rounded-full transition-colors p-0.5 relative cursor-pointer ${
                      teamYearly ? "bg-zinc-200" : "bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full transition-transform ${
                        teamYearly ? "translate-x-3 bg-black" : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                  <span>Yearly</span>
                  <span className="text-[9px] px-1 bg-white/10 text-zinc-200 rounded font-semibold">Save 20%</span>
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  {teamYearly ? "$12" : "$15"}
                </span>
                <span className="text-xs text-zinc-500 font-mono">/ seat / month</span>
              </div>
              <p className="text-xs text-zinc-400 min-h-[36px] mb-6">
                For fast-shipping teams putting knowledge on autopilot.
              </p>
              <Link
                href="/login"
                className="w-full block text-center py-2.5 rounded-full border border-white/40 bg-white text-black hover:bg-zinc-200 text-xs font-semibold tracking-wider transition-colors mb-6 shadow-md"
              >
                Get Started
              </Link>
              <ul className="space-y-3 text-xs text-zinc-400 font-sans">
                <li className="flex items-center gap-2 text-zinc-200 font-medium">
                  <Check className="w-3.5 h-3.5 text-zinc-200" />
                  <span>All Builder features +</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Unlimited Repos &amp; Discord</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>500,000 Vector Chunks</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Decision Log Auto-Extraction</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Priority Groq &amp; Qdrant Inference</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* 4. Enterprise */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: 0.24, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="rounded-2xl border border-[#262626] bg-[#0d0d0d] p-6 flex flex-col justify-between relative shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-zinc-300">Enterprise</span>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Custom</span>
              </div>
              <p className="text-xs text-zinc-400 min-h-[36px] mb-6">
                For security-conscious organizations and private VPCs.
              </p>
              <Link
                href="/login"
                className="w-full block text-center py-2.5 rounded-full border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold tracking-wider transition-colors mb-6"
              >
                Contact Sales
              </Link>
              <ul className="space-y-3 text-xs text-zinc-400 font-sans">
                <li className="flex items-center gap-2 text-zinc-200 font-medium">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>All Team features +</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Dedicated VPC Deployment</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Self-Hosted Qdrant &amp; Mongo</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Zero Data Retention Guarantee</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Dedicated Solutions Engineer</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
