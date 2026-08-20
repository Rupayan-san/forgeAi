"use client";

import { motion } from "framer-motion";
import { Clock, Activity, Zap, CheckCircle2 } from "lucide-react";

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 px-6 border-b border-[#262626] relative bg-[#030303]">
      <div className="max-w-[1300px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1 with Scroll Reveal */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="rounded-2xl border border-[#262626] bg-[#0d0d0d] shadow-xl overflow-hidden flex flex-col justify-between"
          >
            <div className="p-8 sm:p-10">
              <blockquote className="text-base sm:text-lg text-zinc-200 leading-relaxed font-normal mb-8 text-center max-w-md mx-auto">
                &ldquo;Forge solved the biggest pain point in our dev team: lost architecture debates. New hires ask our memory agent why decisions were made instead of interrupting senior engineers.&rdquo;
              </blockquote>

              <div className="flex items-center justify-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                  alt="Sarah Chen"
                  className="w-9 h-9 rounded-full object-cover border border-white/20"
                />
                <div className="text-left">
                  <h4 className="text-xs font-semibold text-white">Sarah Chen</h4>
                  <p className="text-[11px] text-zinc-500">Staff Engineer, CloudScale</p>
                </div>
              </div>
            </div>

            {/* Split Metrics Bottom Bar */}
            <div className="grid grid-cols-2 border-t border-white/10 bg-black/40 text-center text-xs font-mono py-4 px-2 divide-x divide-white/10">
              <div className="flex flex-col items-center justify-center gap-1.5 px-3">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300" />
                <span className="text-zinc-300 text-[11px] font-sans">80% of project questions answered autonomously</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1.5 px-3">
                <Activity className="w-3.5 h-3.5 text-zinc-300" />
                <span className="text-zinc-300 text-[11px] font-sans">100% verified source citations</span>
              </div>
            </div>
          </motion.div>

          {/* Card 2 with Scroll Reveal */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="rounded-2xl border border-[#262626] bg-[#0d0d0d] shadow-xl overflow-hidden flex flex-col justify-between"
          >
            <div className="p-8 sm:p-10">
              <blockquote className="text-base sm:text-lg text-zinc-200 leading-relaxed font-normal mb-8 text-center max-w-md mx-auto">
                &ldquo;Having Agora voice search on top of our Qdrant codebase memory is pure magic. I can speak to our repo while reviewing PRs and get exact commit references in milliseconds.&rdquo;
              </blockquote>

              <div className="flex items-center justify-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                  alt="Alex Kumar"
                  className="w-9 h-9 rounded-full object-cover border border-white/20"
                />
                <div className="text-left">
                  <h4 className="text-xs font-semibold text-white">Alex Kumar</h4>
                  <p className="text-[11px] text-zinc-500">VP of Engineering, Horizon Labs</p>
                </div>
              </div>
            </div>

            {/* Split Metrics Bottom Bar */}
            <div className="grid grid-cols-2 border-t border-white/10 bg-black/40 text-center text-xs font-mono py-4 px-2 divide-x divide-white/10">
              <div className="flex flex-col items-center justify-center gap-1.5 px-3">
                <Zap className="w-3.5 h-3.5 text-zinc-300" />
                <span className="text-zinc-300 text-[11px] font-sans">&lt;300ms vector query latency</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1.5 px-3">
                <Clock className="w-3.5 h-3.5 text-zinc-300" />
                <span className="text-zinc-300 text-[11px] font-sans">0 lost architectural decisions</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
