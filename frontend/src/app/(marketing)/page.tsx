"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { MagicMomentDemo } from "@/components/landing/MagicMomentDemo";
import { StatefulExecutionSection } from "@/components/landing/StatefulExecutionSection";
import { DurableAutonomySection } from "@/components/landing/DurableAutonomySection";
import { GuardrailsAndInboxSection } from "@/components/landing/GuardrailsAndInboxSection";
import { WhyForgeSection } from "@/components/landing/WhyForgeSection";
import { ArchitectureSection } from "@/components/landing/ArchitectureSection";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { WhatForgeEliminatesSection } from "@/components/landing/WhatForgeEliminatesSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black overflow-x-hidden">
      {/* Viewport Frame with subtle ambient glow and corner crosshairs */}
      <div className="fixed inset-0 pointer-events-none z-50 border border-white/5 shadow-[inset_0_0_120px_rgba(0,30,90,0.25)]" />

      {/* Top Fixed Header */}
      <Navbar />

      {/* 1. Hero Section: "Ask your project why" */}
      <Hero />

      {/* 2. Magic Moment Demonstration: Question -> Answer -> Evidence */}
      <MagicMomentDemo />

      {/* 3. Ingestion Timeline: GitHub, Discord, Vector RAG */}
      <StatefulExecutionSection />

      {/* 4. Knowledge Graph Relationships & Provenance Citations */}
      <DurableAutonomySection />

      {/* 5. Raw Activity -> Structured Decision Extraction */}
      <GuardrailsAndInboxSection />

      {/* 6. Why Forge? vs Traditional AI / Generic RAG */}
      <WhyForgeSection />

      {/* 7. Technical Architecture Pipeline */}
      <ArchitectureSection />

      {/* 8. Categorized Integrations Stack */}
      <IntegrationsSection />

      {/* 9. What Forge Eliminates (Without vs With Forge) */}
      <WhatForgeEliminatesSection />

      {/* 10. Final Call to Action */}
      <CTASection />

      {/* 11. Footer */}
      <Footer />
    </main>
  );
}
