"use client";

import React, { useEffect, useState } from "react";
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
  Trash2,
  Network,
  Folder,
  UserPlus,
  X,
  Check,
  RefreshCw,
} from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";
import { DiscordIcon } from "@/components/shared/discord-icon";
import { DiscordConnectDialog } from "@/components/project/discord-connect-dialog";
import { useProjectStore } from "@/store/use-project-store";
import { useAuthStore } from "@/store/use-auth-store";
import { api } from "@/lib/api";
import { ActivityItem } from "@/types";

function formatRelativeTime(isoString: string): string {
  if (!isoString) return "Just now";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Recently";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  const currentProject = useProjectStore((state) => state.currentProject);
  const fetchProject = useProjectStore((state) => state.fetchProject);
  const isLoading = useProjectStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [discordModalOpen, setDiscordModalOpen] = useState(false);
  const [processingJoinId, setProcessingJoinId] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  const isOwner = user?.user_id === currentProject?.owner_id;

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

  const handleApproveRequest = async (applicantId: string) => {
    setProcessingJoinId(applicantId);
    try {
      await api.post(`/projects/${projectId}/join/requests/${applicantId}/approve`);
      await fetchProject(projectId, true);
    } catch (err) {
      console.error("Failed to approve join request:", err);
      alert("Failed to approve join request.");
    } finally {
      setProcessingJoinId(null);
    }
  };

  const handleRejectRequest = async (applicantId: string) => {
    setProcessingJoinId(applicantId);
    try {
      await api.post(`/projects/${projectId}/join/requests/${applicantId}/reject`);
      await fetchProject(projectId, true);
    } catch (err) {
      console.error("Failed to reject join request:", err);
      alert("Failed to reject join request.");
    } finally {
      setProcessingJoinId(null);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
      setIsLoadingActivity(true);
      api.get<ActivityItem[]>(`/projects/${projectId}/activity`)
        .then((data) => setActivities(data || []))
        .catch((err) => {
          console.error("Failed to fetch project activity:", err);
          setActivities([]);
        })
        .finally(() => setIsLoadingActivity(false));
    }
  }, [projectId, fetchProject]);

  const handleSyncGithub = async () => {
    setIsSyncing(true);
    setSyncMessage("");
    try {
      await api.post(`/projects/${projectId}/ingest/github`);
      setSyncMessage("Sync started! Processing in background...");
      await fetchProject(projectId, true);
    } catch (err) {
      console.error("Failed to start sync", err);
      setSyncMessage("Failed to start sync.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(""), 5000);
    }
  };

  if (isLoading && !currentProject) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 text-[#10b981] animate-spin" strokeWidth={2} />
      </div>
    );
  }

  if (!currentProject || currentProject.project_id !== projectId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-12 h-12 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-center mb-3">
          <Folder className="w-6 h-6 text-[#525252]" strokeWidth={1.5} />
        </div>
        <h2 className="text-base font-semibold text-[#fafafa] mb-1">Project Not Found</h2>
        <p className="text-sm text-[#737373] max-w-sm mb-5">
          This project may not exist, or you might not be a member yet.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-md bg-[#10b981] text-white text-xs font-medium hover:bg-[#059669] transition-colors"
        >
          Return to Dashboard
        </Link>
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
      href: `/project/${projectId}/group-chat`,
      icon: Users,
      title: "Team Group Chat",
      description: "Chat with teammates. Decisions and configs are auto-indexed to memory",
    },
    {
      href: `/project/${projectId}/voice`,
      icon: Mic,
      title: "Voice Meeting Room",
      description: "Host team meetings, transcribe discussions, and save filtered key decisions",
    },
    {
      href: `/project/${projectId}/decisions`,
      icon: FileText,
      title: "Decision Log",
      description: "AI-extracted architectural decisions from your team",
    },
    {
      href: `/project/${projectId}/graph`,
      icon: Network,
      title: "Knowledge Graph",
      description: "Visualize how decisions connect to source files, messages, and people",
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1200px]">
      {/* Project Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">{p.name}</h1>
              {p.join_code && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#141414] border border-[#262626] text-[#10b981]">
                  Join Code: {p.join_code}
                </span>
              )}
            </div>
            <p className="text-[#525252] text-[13px] mt-0.5">
              {p.description || "No description provided"}
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

      {/* Pending Join Requests Banner (Owner only) */}
      {isOwner && p.join_requests && p.join_requests.length > 0 && (
        <div className="surface mb-6 p-4 border border-amber-500/30 bg-amber-500/5 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <UserPlus className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-[13px] font-semibold text-[#fafafa]">
                Pending Join Requests ({p.join_requests.length})
              </h2>
            </div>
            <span className="text-[11px] text-amber-400 font-mono">
              Action Required
            </span>
          </div>

          <div className="space-y-2">
            {(p.join_request_details && p.join_request_details.length > 0
              ? p.join_request_details
              : p.join_requests.map((uid) => ({ user_id: uid, github_username: uid, name: "Applicant", avatar_url: null }))
            ).map((applicant) => (
              <div
                key={applicant.user_id}
                className="flex items-center justify-between p-3 rounded-lg bg-[#0e0e0e] border border-[#222]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {applicant.avatar_url ? (
                    <img
                      src={applicant.avatar_url}
                      alt={applicant.github_username || ""}
                      className="w-7 h-7 rounded-full shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[10px] text-white shrink-0 font-bold">
                      {(applicant.github_username || "??").substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#fafafa] truncate">
                      {applicant.name || applicant.github_username}
                    </p>
                    <p className="text-[11px] text-[#525252] truncate">
                      @{applicant.github_username || applicant.user_id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRejectRequest(applicant.user_id)}
                    disabled={processingJoinId === applicant.user_id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[12px] font-medium transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApproveRequest(applicant.user_id)}
                    disabled={processingJoinId === applicant.user_id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#10b981] hover:bg-[#059669] text-white text-[12px] font-medium transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {processingJoinId === applicant.user_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ingestion & Team Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        {/* GitHub Ingestion */}
        <div className="surface p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <GithubIcon className="w-4 h-4 text-[#a3a3a3]" size={16} />
              <span className="text-[13px] font-medium text-[#fafafa]">GitHub</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncGithub}
                disabled={isSyncing || !p?.github_repo_url}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#141414] hover:bg-[#1f1f1f] text-[11px] font-medium text-[#fafafa] border border-[#262626] transition-colors disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} strokeWidth={1.5} />
                Sync
              </button>
              {p?.ingestion_status?.github_backfill_complete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
              ) : (
                <Circle className="w-4 h-4 text-[#404040]" strokeWidth={1.5} />
              )}
            </div>
          </div>
          <p className="text-[12px] text-[#525252]">
            {syncMessage ? (
              <span className="text-[#10b981] font-mono animate-pulse">{syncMessage}</span>
            ) : p?.ingestion_status?.github_backfill_complete ? (
              `${p?.ingestion_status?.github_chunks_count || 0} chunks indexed`
            ) : p?.github_repo_url ? (
              "Ready to sync repository..."
            ) : (
              "Not connected"
            )}
          </p>
        </div>

        {/* Discord Ingestion */}
        <div className="surface p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DiscordIcon className="w-4 h-4 text-[#5865F2]" size={16} />
              <span className="text-[13px] font-medium text-[#fafafa]">Discord</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDiscordModalOpen(true)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  p?.discord_guild_id
                    ? "bg-[#141414] hover:bg-[#1f1f1f] text-[#fafafa] border border-[#262626]"
                    : "bg-[#5865F2] hover:bg-[#4752C4] text-white"
                }`}
              >
                {p?.discord_guild_id ? "Configure" : "Connect"}
              </button>
              {p?.ingestion_status?.discord_backfill_complete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
              ) : (
                <Circle className={`w-4 h-4 ${p?.discord_guild_id ? "text-emerald-500/70" : "text-[#404040]"}`} strokeWidth={1.5} />
              )}
            </div>
          </div>
          <p className="text-[12px] text-[#525252]">
            {p?.ingestion_status?.discord_backfill_complete
              ? `${p?.ingestion_status?.discord_chunks_count || 0} chunks indexed`
              : p?.discord_guild_id
                ? "Listening for messages..."
                : "Not connected — click Connect to link server"}
          </p>
        </div>

        {/* Team Members */}
        <div className="surface p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#a3a3a3]" strokeWidth={1.5} />
              <span className="text-[13px] font-medium text-[#fafafa]">Team Members</span>
            </div>
            <span className="text-[11px] text-[#525252] font-mono">
              {p?.members?.length || 0} / {p?.max_members || 10} max
            </span>
          </div>

          <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1">
            {p?.member_details?.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.github_username || ""} className="w-4 h-4 rounded-full shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[8px] text-white shrink-0 font-bold">
                      {(member.github_username || "??").substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[11px] text-[#a3a3a3] truncate font-medium">
                    {member.github_username || member.user_id}
                  </span>
                  {member.user_id === p?.owner_id && (
                    <span className="text-[9px] font-semibold text-[#10b981] bg-[rgba(16,185,129,0.1)] px-1 py-0.25 rounded shrink-0">
                      Owner
                    </span>
                  )}
                </div>
                {p?.owner_id === user?.user_id && member.user_id !== p?.owner_id && (
                  <button
                    onClick={() => handleKick(member.user_id)}
                    className="text-[#404040] hover:text-red-400 p-0.5 rounded cursor-pointer transition-colors"
                    title="Remove Member"
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            ))}
          </div>
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
            <DiscordIcon className="w-3.5 h-3.5 text-[#525252]" size={14} />
            <span className="text-[11px] text-[#525252] uppercase tracking-wider font-medium">Discord</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`status-dot ${p.ingestion_status.discord_backfill_complete ? "status-dot-success" : p.discord_guild_id ? "status-dot-success" : "status-dot-idle"}`} />
            <span className="text-[13px] text-[#a3a3a3]">
              {p.ingestion_status.discord_backfill_complete
                ? `${p.ingestion_status.discord_chunks_count} indexed`
                : p.discord_guild_id ? "Listening" : "Not connected"}
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
            <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <h2 className="text-[13px] font-medium text-[#a3a3a3]">Recent Activity</h2>
              <span className="text-[10px] text-[#525252] font-mono">Live</span>
            </div>
            {isLoadingActivity ? (
              <div className="p-6 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-[#10b981] animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-[12px] text-[#525252]">No recent activity recorded yet.</p>
                <p className="text-[11px] text-[#404040] mt-1">Sync GitHub or start chatting to see updates.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#0f0f0f] max-h-[420px] overflow-y-auto">
                {activities.map((item) => (
                  <div key={item.id} className="px-4 py-3 hover:bg-[#0f0f0f] transition-colors">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded bg-[#111111] border border-[#1a1a1a] flex items-center justify-center mt-0.5 shrink-0">
                        {item.type === "decision" ? (
                          <FileText className="w-3 h-3 text-purple-400" strokeWidth={1.5} />
                        ) : item.type === "discord" ? (
                          <DiscordIcon size={12} className="text-[#5865F2]" />
                        ) : item.type === "chat" ? (
                          <MessageSquare className="w-3 h-3 text-blue-400" strokeWidth={1.5} />
                        ) : item.type === "member" ? (
                          <Users className="w-3 h-3 text-amber-400" strokeWidth={1.5} />
                        ) : (
                          <GithubIcon size={12} className="text-[#10b981]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-[#a3a3a3] leading-snug line-clamp-2" title={item.title}>
                          {item.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] text-[#525252] font-medium">{item.source}</span>
                          <span className="text-[10px] text-[#333]">·</span>
                          <span className="text-[10px] text-[#404040]">{formatRelativeTime(item.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Discord Connect Dialog */}
      <DiscordConnectDialog
        isOpen={discordModalOpen}
        onClose={() => setDiscordModalOpen(false)}
        projectId={projectId}
        currentGuildId={p?.discord_guild_id}
        onSuccess={() => fetchProject(projectId, true)}
      />
    </div>
  );
}
