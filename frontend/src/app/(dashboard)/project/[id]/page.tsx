"use client";

import { useEffect, useState } from "react";
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
  RefreshCw,
  Users,
  Trash2,
} from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";
import { useProjectStore } from "@/store/use-project-store";
import { useAuthStore } from "@/store/use-auth-store";
import { api } from "@/lib/api";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  const currentProject = useProjectStore((state) => state.currentProject);
  const fetchProject = useProjectStore((state) => state.fetchProject);
  const isLoading = useProjectStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const handleKick = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member from the project?")) return;
    try {
      await api.delete(`/projects/${projectId}/members/${memberId}`);
      await fetchProject(projectId);
    } catch (err) {
      console.error("Failed to kick member:", err);
      alert("Failed to remove member.");
    }
  };

  useEffect(() => {
    fetchProject(projectId);
  }, [projectId]);

  const handleSyncGithub = async () => {
    setIsSyncing(true);
    setSyncMessage("");
    try {
      await api.post(`/projects/${projectId}/ingest/github`);
      setSyncMessage("Sync started! Processing in background...");
      // Re-fetch project to update status
      await fetchProject(projectId, true);
    } catch (err) {
      console.error("Failed to start sync", err);
      setSyncMessage("Failed to start sync.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(""), 5000);
    }
  };

  if (!currentProject) {
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
      href: `/project/${projectId}/group-chat`,
      icon: Users,
      title: "Team Group Chat",
      description: "Chat with teammates. Decisions and configs are auto-indexed to memory",
      ready: true,
    },
    {
      href: `/project/${projectId}/voice`,
      icon: Mic,
      title: "Voice Meeting Room",
      description: "Host team meetings, transcribe discussions, and save filtered key decisions",
      ready: true,
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

      {/* Ingestion & Team Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <GithubIcon className="w-5 h-5 text-[rgba(255,255,255,0.7)]" size={20} />
              <span className="text-sm font-medium text-white">GitHub</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncGithub}
                disabled={isSyncing || !p?.github_repo_url}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-xs font-medium text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} strokeWidth={1.5} />
                Sync
              </button>
              {p?.ingestion_status?.github_backfill_complete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
              ) : (
                <Circle className="w-4 h-4 text-[rgba(255,255,255,0.2)]" strokeWidth={1.5} />
              )}
            </div>
          </div>
          <p className="text-xs text-[rgba(255,255,255,0.4)]">
            {syncMessage ? (
              <span className="text-[#818CF8] font-medium animate-pulse">{syncMessage}</span>
            ) : p?.ingestion_status?.github_backfill_complete ? (
              `${p?.ingestion_status?.github_chunks_count || 0} chunks indexed`
            ) : p?.github_repo_url ? (
              "Ready to sync repository..."
            ) : (
              "Not connected"
            )}
          </p>
        </div>

        <div className="glass p-5">
          <div className="flex items-center gap-3 mb-3">
            <Hash className="w-5 h-5 text-[rgba(255,255,255,0.7)]" strokeWidth={1.5} />
            <span className="text-sm font-medium text-white">Discord</span>
            {p?.ingestion_status?.discord_backfill_complete ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" strokeWidth={1.5} />
            ) : (
              <Circle className="w-4 h-4 text-[rgba(255,255,255,0.2)] ml-auto" strokeWidth={1.5} />
            )}
          </div>
          <p className="text-xs text-[rgba(255,255,255,0.4)]">
            {p?.ingestion_status?.discord_backfill_complete
              ? `${p?.ingestion_status?.discord_chunks_count || 0} chunks indexed`
              : p?.discord_guild_id
                ? "Listening for messages..."
                : "Not connected"}
          </p>
        </div>

        {/* Team Members Management */}
        <div className="glass p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-[rgba(255,255,255,0.7)]" strokeWidth={1.5} />
              <span className="text-sm font-medium text-white">Team Members</span>
            </div>
            <span className="text-xs text-[rgba(255,255,255,0.4)]">
              {p?.members?.length || 0} / {p?.max_members || 10} max
            </span>
          </div>
          
          <div className="space-y-2.5 max-h-[92px] overflow-y-auto pr-1">
            {p?.member_details?.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.github_username || ""} className="w-5 h-5 rounded-full shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-[9px] text-white shrink-0 font-bold">
                      {(member.github_username || "??").substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-[rgba(255,255,255,0.85)] truncate font-medium">
                    {member.github_username || member.user_id}
                  </span>
                  {member.user_id === p?.owner_id && (
                    <span className="text-[9px] font-semibold text-[#818CF8] bg-[rgba(99,102,241,0.12)] px-1 py-0.25 rounded shrink-0">Owner</span>
                  )}
                </div>
                {p?.owner_id === user?.user_id && member.user_id !== p?.owner_id && (
                  <button
                    onClick={() => handleKick(member.user_id)}
                    className="text-[rgba(255,255,255,0.3)] hover:text-red-400 p-0.5 rounded cursor-pointer transition-colors"
                    title="Remove Member"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            ))}
          </div>
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
