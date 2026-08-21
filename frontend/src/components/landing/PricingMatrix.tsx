"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

export function PricingMatrix() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");

  const plans = [
    {
      name: "Starter",
      description: "For individual developers & side projects.",
      priceMonthly: "$0",
      priceYearly: "$0",
      unit: "forever",
      features: [
        "1 Connected GitHub Repo",
        "Up to 5,000 Vector Chunks",
        "Community Discord Access",
        "Standard Query Latency",
      ],
      cta: "Get Started Free",
      highlighted: false,
    },
    {
      name: "Basic",
      description: "For small teams needing persistent project memory.",
      priceMonthly: "$19",
      priceYearly: "$15",
      unit: "per month",
      features: [
        "5 Connected GitHub Repos",
        "1 Discord Server Sync",
        "50,000 Vector Chunks",
        "Sub-Second Vector Search",
        "Decision Log Auto-Extraction",
      ],
      cta: "Start Basic Trial",
      highlighted: false,
    },
    {
      name: "Team",
      description: "For engineering teams running autonomous AI agents.",
      priceMonthly: "$15",
      priceYearly: "$12",
      unit: "per seat / mo",
      features: [
        "Unlimited Repos & Discord",
        "500,000 Vector Chunks",
        "Custom Safety Guardrails",
        "Realtime Agent Pipeline Inbox",
        "Priority Groq & OpenAI Inference",
        "Dedicated Slack Support",
      ],
      cta: "Start Team Trial",
      highlighted: true,
      badge: "MOST POPULAR",
    },
    {
      name: "Enterprise",
      description: "Custom deployments & SOC2 compliance.",
      priceMonthly: "Custom",
      priceYearly: "Custom",
      unit: "tailored SLA",
      features: [
        "Self-Hosted Qdrant & Mongo",
        "Dedicated VPC Instance",
        "Custom LLM Fine-Tuning",
        "Zero Data Retention Guarantee",
        "24/7 Dedicated Solutions Engineer",
        "SSO & SAML Authentication",
      ],
      cta: "Contact Sales",
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 px-6 relative z-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/10 bg-zinc-900/50 text-xs font-mono text-emerald-400 mb-4"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>TRANSPARENT PRICING</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-4"
        >
          Scale memory with your agents
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-zinc-400 text-base"
        >
          Choose the right plan for your codebase size and execution volume.
        </motion.p>

        {/* Monthly / Yearly Toggle */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <span className={`text-xs font-medium ${billingPeriod === "monthly" ? "text-white" : "text-zinc-500"}`}>
            Monthly Billing
          </span>
          <button
            onClick={() => setBillingPeriod((prev) => (prev === "monthly" ? "yearly" : "monthly"))}
            className="w-12 h-6 rounded-full bg-zinc-800 border border-white/15 p-1 relative transition-colors cursor-pointer"
          >
            <motion.div
              className="w-4 h-4 rounded-full bg-emerald-400"
              animate={{ x: billingPeriod === "yearly" ? 24 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={`text-xs font-medium flex items-center gap-1.5 ${billingPeriod === "yearly" ? "text-white" : "text-zinc-500"}`}>
            Yearly Billing
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold">
              20% OFF
            </span>
          </span>
        </div>
      </div>

      {/* 4-Tier Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan, idx) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.08 }}
            whileHover={{ scale: 1.02 }}
            className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 ${plan.highlighted
                ? "bg-zinc-900/90 border-2 border-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.15)]"
                : "bg-zinc-900/50 backdrop-blur-md border border-white/10 hover:border-white/20"
              }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-black font-mono text-[10px] font-bold tracking-wider uppercase">
                {plan.badge}
              </div>
            )}

            <div>
              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <p className="text-xs text-zinc-400 min-h-[32px] mb-4">{plan.description}</p>

              <div className="mb-6 pb-6 border-b border-white/10">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    {billingPeriod === "yearly" ? plan.priceYearly : plan.priceMonthly}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">/{plan.unit}</span>
                </div>
              </div>

              {/* Feature Checklist */}
              <ul className="space-y-2.5 mb-8 text-xs text-zinc-300">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={2.5} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/login"
              className={`w-full py-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${plan.highlighted
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                }`}
            >
              <span>{plan.cta}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
