"use client";

import Link from "next/link";
import { Zap, ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-black text-white relative">
      {/* Hatched / Striped pattern separator bar */}
      <div
        className="h-6 w-full border-b border-white/10"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 1px, transparent 1px, transparent 10px)",
        }}
      />

      <div className="max-w-[1300px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-10 pb-16 border-b border-white/10">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-cyan-400" strokeWidth={2} />
              </div>
              <span className="text-sm font-bold tracking-wider uppercase font-sans">FORGE AI</span>
            </div>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              Voice-native AI project memory for engineering teams. Ingests GitHub commits, pull requests, and Discord threads into a living vector knowledge graph.
            </p>
            <div className="flex items-center gap-4 text-xs text-zinc-500 pt-2 font-mono">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Discord</a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Twitter</a>
            </div>
          </div>

          {/* Col 1: Product */}
          <div>
            <h4 className="text-xs font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-3 text-xs text-zinc-400">
              <li><a href="#features" className="hover:text-white transition-colors">GitHub Ingestion</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Discord Sync</a></li>
              <li><a href="#decisions" className="hover:text-white transition-colors">Decision Log</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Col 2: Developers */}
          <div>
            <h4 className="text-xs font-semibold text-white mb-4">Developers</h4>
            <ul className="space-y-3 text-xs text-zinc-400">
              <li><a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors inline-flex items-center gap-1">FastAPI Docs <ArrowUpRight className="w-3 h-3" /></a></li>
              <li><a href="https://qdrant.tech" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors inline-flex items-center gap-1">Qdrant Vector DB <ArrowUpRight className="w-3 h-3" /></a></li>
              <li><a href="https://agora.io" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors inline-flex items-center gap-1">Agora Voice AI <ArrowUpRight className="w-3 h-3" /></a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
            </ul>
          </div>

          {/* Col 3: Company */}
          <div>
            <h4 className="text-xs font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-3 text-xs text-zinc-400">
              <li><a href="#about" className="hover:text-white transition-colors">About Forge</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Hackathon Story</a></li>
              <li>
                <a href="#" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <span>Careers</span>
                  <span className="px-1.5 py-0.2 bg-white text-black font-semibold text-[9px] rounded-full">Hiring</span>
                </a>
              </li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Col 4: Legal */}
          <div>
            <h4 className="text-xs font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3 text-xs text-zinc-400">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-mono">
          <p>© 2026 Forge AI. Built for Prasunethon 2026 Hackathon.</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-zinc-400">All vector memory &amp; ingestion systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
