"use client";

import { motion } from "framer-motion";
import { Quote, Sparkles, Star } from "lucide-react";

const testimonials = [
  {
    quote: "Forge transformed how our engineering team tracks architectural decisions. Instead of digging through months of Discord threads, we just ask our memory agent.",
    metric: "80% AUTOMATED",
    metricDesc: "Decision Extraction",
    author: "Sarah Chen",
    role: "Staff Engineer",
    company: "Vercel Ecosystem Partner",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
  },
  {
    quote: "The Qdrant vector memory integration with Agora voice allows our tech leads to query the codebase during commuting or code reviews hands-free. Truly revolutionary.",
    metric: "10x FASTER",
    metricDesc: "Context Retrieval",
    author: "Alex Kumar",
    role: "VP of Engineering",
    company: "Nexus Labs",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
  },
  {
    quote: "We connected 14 microservices and our main Discord server in under 5 minutes. Zero context loss when onboarding new developers.",
    metric: "0% LOSS",
    metricDesc: "Onboarding Context",
    author: "Jordan Lee",
    role: "Lead Architect",
    company: "HyperScale DB",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 px-6 relative z-10 max-w-6xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/10 bg-zinc-900/50 text-xs font-mono text-emerald-400 mb-4"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>DEVELOPER TESTIMONIALS</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-4"
        >
          Trusted by technical teams
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-zinc-400 text-base"
        >
          Hear how engineering leaders rely on Forge for project memory & decision management.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((item, idx) => (
          <motion.div
            key={item.author}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-7 flex flex-col justify-between transition-all duration-300 shadow-md hover:border-white/20"
          >
            <div>
              {/* Metric Banner */}
              <div className="mb-6 p-4 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xl font-extrabold font-mono text-emerald-400">{item.metric}</div>
                  <div className="text-[10px] font-mono text-zinc-400 uppercase">{item.metricDesc}</div>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                  ))}
                </div>
              </div>

              {/* Quote */}
              <p className="text-sm text-zinc-300 leading-relaxed italic mb-6">
                &quot;{item.quote}&quot;
              </p>
            </div>

            {/* Author */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <img
                src={item.avatar}
                alt={item.author}
                className="w-10 h-10 rounded-full object-cover border border-white/20"
              />
              <div>
                <h4 className="text-sm font-semibold text-white">{item.author}</h4>
                <p className="text-xs text-zinc-400">{item.role} • <span className="text-zinc-500">{item.company}</span></p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
