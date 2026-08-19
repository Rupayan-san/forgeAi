"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Zap,
  MessageSquare,
  Mic,
  FileText,
  ArrowRight,
  GitBranch,
  GitPullRequest,
  Hash,
  Brain,
  Search,
  Volume2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";

const features = [
  {
    icon: GitBranch,
    title: "GitHub Ingestion",
    description:
      "Automatically ingests commits, PRs, issues, and READMEs. Every change is embedded and searchable instantly.",
    gradient: "from-[#6366F1]/20 to-[#6366F1]/5",
  },
  {
    icon: MessageSquare,
    title: "Discord Capture",
    description:
      "Reads your Discord server's history — every debate, decision, and context that never makes it into code.",
    gradient: "from-[#818CF8]/20 to-[#818CF8]/5",
  },
  {
    icon: Mic,
    title: "Voice Q&A",
    description:
      "Ask questions by speaking. Agora Conversational AI handles real-time speech with sub-second latency.",
    gradient: "from-[#A5B4FC]/20 to-[#A5B4FC]/5",
  },
  {
    icon: FileText,
    title: "Decision Log",
    description:
      "AI automatically extracts every architectural and product decision into a structured, searchable timeline.",
    gradient: "from-[#6366F1]/20 to-[#6366F1]/5",
  },
];

const workflowSteps = [
  {
    icon: GitBranch,
    label: "Connect",
    description: "Link GitHub repo & Discord server",
  },
  {
    icon: Brain,
    label: "Ingest",
    description: "AI builds your knowledge graph",
  },
  {
    icon: Search,
    label: "Query",
    description: "Ask anything about your project",
  },
  {
    icon: Volume2,
    label: "Speak",
    description: "Voice-native conversation with AI",
  },
];

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0D1117] via-[#0A0F1A] to-[#0D1117]" />

      {/* Animated orbs */}
      <div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20 animate-float"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle, rgba(129,140,248,0.25) 0%, transparent 70%)",
          animation: "float 8s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute top-2/3 left-1/3 w-64 h-64 rounded-full opacity-10"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)",
          animation: "float 10s ease-in-out infinite 2s",
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass border-b border-[rgba(255,255,255,0.08)]"
          : "bg-transparent"
      }`}
      style={{ borderRadius: 0 }}
    >
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#6366F1] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <span className="text-lg font-semibold text-white">Forge</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-[rgba(255,255,255,0.5)] hover:text-white text-sm transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-[rgba(255,255,255,0.5)] hover:text-white text-sm transition-colors"
          >
            How it works
          </a>
          <a
            href="#sources"
            className="text-[rgba(255,255,255,0.5)] hover:text-white text-sm transition-colors"
          >
            Sources
          </a>
        </div>

        <Link
          href="/login"
          className="flex items-center gap-2 px-5 py-2 bg-[#6366F1] text-white text-sm font-medium rounded-xl hover:bg-[#4F46E5] transition-all duration-200 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
        >
          Get Started
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
        </Link>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-40 pb-24 px-8">
      <div className="max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.1)] mb-8 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-[#818CF8]" strokeWidth={1.5} />
          <span className="text-[#818CF8] text-xs font-medium tracking-wide">
            Built for EchoSphere Hackathon
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6 animate-fade-in-up">
          <span className="text-white">Your team&apos;s</span>
          <br />
          <span className="gradient-text">memory, always on.</span>
        </h1>

        {/* Subhead */}
        <p
          className="text-lg md:text-xl text-[rgba(255,255,255,0.6)] max-w-2xl mx-auto mb-10 leading-relaxed opacity-0 animate-fade-in-up stagger-2"
        >
          Forge ingests your GitHub and Discord, builds a living knowledge
          graph, and lets you query everything your team has ever discussed —
          by voice or text.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up stagger-3">
          <Link
            href="/login"
            className="flex items-center gap-2.5 px-8 py-3.5 bg-[#6366F1] text-white font-medium rounded-xl hover:bg-[#4F46E5] transition-all duration-200 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:-translate-y-0.5"
          >
            <GithubIcon className="w-4.5 h-4.5" size={18} />
            Connect GitHub to Start
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 px-8 py-3.5 glass glass-hover text-[rgba(255,255,255,0.8)] font-medium cursor-pointer"
          >
            See how it works
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          </a>
        </div>

        {/* Floating indicators */}
        <div className="relative mt-20 max-w-3xl mx-auto opacity-0 animate-fade-in-up stagger-4">
          <div className="glass p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <div className="w-3 h-3 rounded-full bg-[#10B981]" />
              <span className="text-[rgba(255,255,255,0.3)] text-xs ml-2 font-mono">
                forge — project memory
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-[rgba(99,102,241,0.2)] flex items-center justify-center mt-0.5 shrink-0">
                  <Mic className="w-3 h-3 text-[#818CF8]" strokeWidth={1.5} />
                </div>
                <p className="text-[rgba(255,255,255,0.5)] text-sm text-left">
                  &quot;Why did we switch from REST to GraphQL for the user service?&quot;
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-[rgba(99,102,241,0.15)] flex items-center justify-center mt-0.5 shrink-0">
                  <Sparkles
                    className="w-3 h-3 text-[#6366F1]"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="text-left">
                  <p className="text-[rgba(255,255,255,0.8)] text-sm">
                    Based on the team&apos;s Discord discussion on March 15 and PR
                    #47, the switch was driven by the need for more flexible
                    data fetching on the mobile client. Alex noted that REST
                    was causing over-fetching issues...
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[rgba(99,102,241,0.15)] text-[#818CF8] text-xs">
                      <GitPullRequest
                        className="w-3 h-3"
                        strokeWidth={1.5}
                      />
                      PR #47
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[rgba(99,102,241,0.15)] text-[#818CF8] text-xs">
                      <Hash className="w-3 h-3" strokeWidth={1.5} />
                      #architecture
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Everything your team forgets,
            <br />
            <span className="gradient-text-indigo">Forge remembers.</span>
          </h2>
          <p className="text-[rgba(255,255,255,0.5)] max-w-xl mx-auto">
            Zero behavior change required. Connect your tools, and Forge
            passively builds your project&apos;s living memory.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`glass glass-hover p-8 opacity-0 animate-fade-in-up stagger-${i + 1}`}
            >
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5`}
              >
                <feature.icon
                  className="w-5 h-5 text-[#818CF8]"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-[rgba(255,255,255,0.6)] text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How Forge Works
          </h2>
          <p className="text-[rgba(255,255,255,0.5)] max-w-lg mx-auto">
            From connection to conversation in minutes, not days.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {workflowSteps.map((step, i) => (
            <div key={step.label} className="relative">
              <div
                className={`glass p-6 text-center opacity-0 animate-fade-in-up stagger-${i + 1}`}
              >
                <div className="w-14 h-14 rounded-2xl bg-[rgba(99,102,241,0.12)] flex items-center justify-center mx-auto mb-4">
                  <step.icon
                    className="w-6 h-6 text-[#6366F1]"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="text-xs text-[#818CF8] font-medium tracking-widest uppercase mb-2">
                  Step {i + 1}
                </div>
                <h3 className="text-white font-semibold mb-1">{step.label}</h3>
                <p className="text-[rgba(255,255,255,0.5)] text-sm">
                  {step.description}
                </p>
              </div>
              {/* Connector line */}
              {i < workflowSteps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-[rgba(255,255,255,0.1)]" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SourcesSection() {
  return (
    <section id="sources" className="py-24 px-8">
      <div className="max-w-5xl mx-auto">
        <div className="glass p-12 md:p-16 text-center relative overflow-hidden">
          {/* Glow effect */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 opacity-30 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse, rgba(99,102,241,0.4) 0%, transparent 70%)",
            }}
          />

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 relative z-10">
            Grounded in your actual context
          </h2>
          <p className="text-[rgba(255,255,255,0.6)] max-w-xl mx-auto mb-10 relative z-10">
            Every answer comes with citations. Forge shows you exactly which
            commit, PR, issue, or Discord message the answer came from.
          </p>

          <div className="flex flex-wrap justify-center gap-3 relative z-10">
            {[
              { icon: GitBranch, label: "Commits" },
              { icon: GitPullRequest, label: "Pull Requests" },
              { icon: FileText, label: "Issues" },
              { icon: FileText, label: "README" },
              { icon: Hash, label: "Discord Messages" },
            ].map((source) => (
              <div
                key={source.label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]"
              >
                <source.icon
                  className="w-4 h-4 text-[#818CF8]"
                  strokeWidth={1.5}
                />
                <span className="text-[rgba(255,255,255,0.7)] text-sm">
                  {source.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-24 px-8">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Stop losing knowledge.
          <br />
          <span className="gradient-text-indigo">Start forging memory.</span>
        </h2>
        <p className="text-[rgba(255,255,255,0.5)] mb-8 max-w-lg mx-auto">
          Connect your GitHub and Discord in 2 minutes. No behavior change
          needed from your team.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2.5 px-10 py-4 bg-[#6366F1] text-white font-medium rounded-xl text-lg hover:bg-[#4F46E5] transition-all duration-200 hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:-translate-y-0.5"
        >
          <Zap className="w-5 h-5" strokeWidth={1.5} />
          Get Started Free
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.06)] py-8 px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#6366F1] flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" strokeWidth={1.5} />
          </div>
          <span className="text-sm text-[rgba(255,255,255,0.4)]">
            Forge — AI Project Memory
          </span>
        </div>
        <p className="text-xs text-[rgba(255,255,255,0.3)]">
          Built for the EchoSphere Hackathon 2025
        </p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="relative">
      <AnimatedBackground />
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <SourcesSection />
      <CTASection />
      <Footer />
    </main>
  );
}
