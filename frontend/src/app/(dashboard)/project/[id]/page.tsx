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
  Clock,
  Database,
  ChevronRight,
  ArrowUpRight,
  GitPullRequest,
  GitCommit,
  Users,
} from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";
import { useProjectStore } from "@/store/use-project-store";

// Mock activity timeline
const mockActivity = [
  {
    type: "commit",
    title: "feat: add user authentication flow",
    source: "GitHub",
    time: "2 hours ago",
    icon: GitCommit,
  },
  {
    type: "pr",
    title: "PR #12: Refactor API middleware",
    source: "GitHub",
    time: "5 hours ago",
    icon: GitPullRequest,
  },
  {
    type: "discord",
    title: "Discussion about database migration strategy",
    source: "Discord #engineering",
    time: "1 day ago",
    icon: Hash,
  },
  {
    type: "decision",
    title: "Decision: Use PostgreSQL for analytics data",
    source: "Extracted from PR #8",
    time: "2 days ago",
    icon: FileText,
  },
];

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
        <Loader2 className="w-5 h-5 text-[#10b981] animate-spin" strokeWidth={2} />
      </div>
    );
  }

  const p = currentProject;
  const totalChunks =
    p.ingestion_status.github_chunks_count +
    p.ingestion_status.discord_chunks_count;

  const features = [
    {
      href: `/project/${projectId}/chat`,
      icon: MessageSquare,
      title: "Chat Q&A",
      description: "Ask questions about your project with source citations",
    },
    {
      href: `/project/${projectId}/voice`,
      icon: Mic,
      title: "Voice Assistant",
      description: "Speak to your project knowledge using Agora AI",
    },
    {
      href: `/project/${projectId}/decisions`,
      icon: FileText,
      title: "Decision Log",
      description: "AI-extracted architectural decisions from your team",
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1200px]">
      {/* Project header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">{p.name}</h1>
            <p className="text-[#525252] text-[13px] mt-0.5">
              {p.description || "No description"}
            </p>
          </div>
          {p.github_repo_url && (
            <a
              href={p.github_repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#262626] text-[#737373] text-[12px] hover:text-[#a3a3a3] hover:bg-[#0a0a0a] transition-colors"
            >
              <GithubIcon className="w-3.5 h-3.5" size={14} />
              {p.github_repo_name}
              <ArrowUpRight className="w-3 h-3" strokeWidth={2} />
            </a>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-3.5 h-3.5 text-[#525252]" strokeWidth={1.5} />
            <span className="text-[11px] text-[#525252] uppercase tracking-wider font-medium">Chunks</span>
          </div>
          <p className="text-xl font-semibold text-[#fafafa] tracking-tight">{totalChunks.toLocaleString()}</p>
        </div>
        <div className="surface p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-3.5 h-3.5 text-[#525252]" strokeWidth={1.5} />
            <span className="text-[11px] text-[#525252] uppercase tracking-wider font-medium">Members</span>
          </div>
          <p className="text-xl font-semibold text-[#fafafa] tracking-tight">{p.members.length}</p>
        </div>
        <div className="surface p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <GithubIcon className="w-3.5 h-3.5 text-[#525252]" size={14} />
            <span className="text-[11px] text-[#525252] uppercase tracking-wider font-medium">GitHub</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`status-dot ${p.ingestion_status.github_backfill_complete ? "status-dot-success" : "status-dot-idle"}`} />
            <span className="text-[13px] text-[#a3a3a3]">
              {p.ingestion_status.github_backfill_complete
                ? `${p.ingestion_status.github_chunks_count} indexed`
                : p.github_repo_url ? "Pending" : "Not connected"}
            </span>
          </div>
        </div>
        <div className="surface p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Hash className="w-3.5 h-3.5 text-[#525252]" strokeWidth={1.5} />
            <span className="text-[11px] text-[#525252] uppercase tracking-wider font-medium">Discord</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`status-dot ${p.ingestion_status.discord_backfill_complete ? "status-dot-success" : "status-dot-idle"}`} />
            <span className="text-[13px] text-[#a3a3a3]">
              {p.ingestion_status.discord_backfill_complete
                ? `${p.ingestion_status.discord_chunks_count} indexed`
                : p.discord_bot_active ? "Pending" : "Not connected"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feature navigation */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-[13px] font-medium text-[#525252] uppercase tracking-wider mb-1">Features</h2>
          {features.map((feature) => (
            <Link key={feature.href} href={feature.href}>
              <div className="surface surface-hover p-4 group flex items-center gap-4">
                <div className="w-9 h-9 rounded-md bg-[#111111] border border-[#1a1a1a] flex items-center justify-center shrink-0">
                  <feature.icon className="w-4 h-4 text-[#10b981]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-medium text-[#fafafa] group-hover:text-[#10b981] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-[12px] text-[#525252]">{feature.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#404040] group-hover:text-[#737373] transition-colors shrink-0" strokeWidth={1.5} />
              </div>
            </Link>
          ))}
        </div>

        {/* Activity timeline */}
        <div className="lg:col-span-1">
          <div className="surface overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a1a1a]">
              <h2 className="text-[13px] font-medium text-[#a3a3a3]">Recent Activity</h2>
            </div>
            <div className="divide-y divide-[#0f0f0f]">
              {mockActivity.map((item, i) => (
                <div key={i} className="px-4 py-3 hover:bg-[#0f0f0f] transition-colors">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded bg-[#111111] border border-[#1a1a1a] flex items-center justify-center mt-0.5 shrink-0">
                      <item.icon className="w-3 h-3 text-[#525252]" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-[#a3a3a3] leading-snug truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[#404040]">{item.source}</span>
                        <span className="text-[10px] text-[#404040]">·</span>
                        <span className="text-[10px] text-[#404040]">{item.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
