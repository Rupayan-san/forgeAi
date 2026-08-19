"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Mic,
  FileText,
  GitBranch,
  Hash,
  ExternalLink,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";
import { useProjectStore } from "@/store/use-project-store";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { currentProject, fetchProject, isLoading } = useProjectStore();

  useEffect(() => {
    fetchProject(projectId);
  }, [projectId, fetchProject]);

  if (isLoading || !currentProject) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  const p = currentProject;
  const features = [
    {
      href: `/project/${projectId}/chat`,
      icon: MessageSquare,
      title: "Chat Q&A",
      description: "Ask questions about your project and get answers with source citations",
      ready: p.ingestion_status.github_backfill_complete || p.ingestion_status.discord_backfill_complete,
    },
    {
      href: `/project/${projectId}/voice`,
      icon: Mic,
      title: "Voice Assistant",
      description: "Speak to your project knowledge using Agora Conversational AI",
      ready: p.ingestion_status.github_backfill_complete || p.ingestion_status.discord_backfill_complete,
    },
    {
      href: `/project/${projectId}/decisions`,
      icon: FileText,
      title: "Decision Log",
      description: "AI-extracted architectural and product decisions from your team",
      ready: true,
    },
  ];

  return (
    <div className="p-8">
      {/* Project header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">{p.name}</h1>
        <p className="text-[rgba(255,255,255,0.4)] text-sm">
          {p.description || "No description"}
        </p>
        {p.github_repo_url && (
          <a
            href={p.github_repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-[#818CF8] hover:text-[#A5B4FC] transition-colors"
          >
            <GithubIcon className="w-3.5 h-3.5" size={14} />
            {p.github_repo_name}
            <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
          </a>
        )}
      </div>

      {/* Ingestion Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="glass p-5">
          <div className="flex items-center gap-3 mb-3">
            <GithubIcon className="w-5 h-5 text-[rgba(255,255,255,0.7)]" size={20} />
            <span className="text-sm font-medium text-white">GitHub</span>
            {p.ingestion_status.github_backfill_complete ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" strokeWidth={1.5} />
            ) : (
              <Circle className="w-4 h-4 text-[rgba(255,255,255,0.2)] ml-auto" strokeWidth={1.5} />
            )}
          </div>
          <p className="text-xs text-[rgba(255,255,255,0.4)]">
            {p.ingestion_status.github_backfill_complete
              ? `${p.ingestion_status.github_chunks_count} chunks indexed`
              : p.github_repo_url
                ? "Backfill pending..."
                : "Not connected"}
          </p>
        </div>
        <div className="glass p-5">
          <div className="flex items-center gap-3 mb-3">
            <Hash className="w-5 h-5 text-[rgba(255,255,255,0.7)]" strokeWidth={1.5} />
            <span className="text-sm font-medium text-white">Discord</span>
            {p.ingestion_status.discord_backfill_complete ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" strokeWidth={1.5} />
            ) : (
              <Circle className="w-4 h-4 text-[rgba(255,255,255,0.2)] ml-auto" strokeWidth={1.5} />
            )}
          </div>
          <p className="text-xs text-[rgba(255,255,255,0.4)]">
            {p.ingestion_status.discord_backfill_complete
              ? `${p.ingestion_status.discord_chunks_count} chunks indexed`
              : p.discord_bot_active
                ? "Backfill pending..."
                : "Not connected"}
          </p>
        </div>
      </div>

      {/* Feature cards */}
      <h2 className="text-lg font-semibold text-white mb-4">Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href}>
            <div className="glass glass-hover p-6 h-full group">
              <div className="w-10 h-10 rounded-xl bg-[rgba(99,102,241,0.12)] flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-[#818CF8]" strokeWidth={1.5} />
              </div>
              <h3 className="text-white font-semibold mb-1 group-hover:text-[#818CF8] transition-colors">
                {feature.title}
              </h3>
              <p className="text-[rgba(255,255,255,0.4)] text-sm">
                {feature.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
