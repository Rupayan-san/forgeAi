"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Zap,
  GitBranch,
  MessageSquare,
  Loader2,
  Folder,
  Trash2,
  Database,
  FileText,
  Clock,
  ChevronRight,
  UserPlus,
  Users,
} from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";
import { DiscordIcon } from "@/components/shared/discord-icon";
import { useProjectStore } from "@/store/use-project-store";
import { useAuthStore } from "@/store/use-auth-store";
import type { Project, ActivityItem } from "@/types";
import { api } from "@/lib/api";

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

function JoinProjectDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleJoin = async () => {
    if (!joinCode.trim() || joinCode.length !== 6) return;
    setIsJoining(true);
    setError("");
    setSuccess(false);
    try {
      await api.post("/projects/join/request", { join_code: joinCode.trim().toUpperCase() });
      setSuccess(true);
      setTimeout(() => {
        setJoinCode("");
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to join project");
    } finally {
      setIsJoining(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="surface relative z-10 w-full max-w-md mx-4 p-6 animate-scale-in">
        <h2 className="text-base font-semibold text-[#fafafa] mb-0.5">Join Project</h2>
        <p className="text-[#525252] text-[13px] mb-5">
          Enter the 6-character code to request access to a project.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-[12px] text-[#525252] mb-1 font-medium">
              Join Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. X8F3A2"
              maxLength={6}
              className="forge-input w-full px-3 py-2 text-[13px] uppercase tracking-widest font-mono"
            />
            {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
            {success && <p className="text-emerald-400 text-xs mt-1.5">Request sent successfully!</p>}
          </div>
        </div>

        <div className="flex gap-2.5 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-md border border-[#262626] text-[#737373] text-[13px] hover:bg-[#111111] hover:text-[#a3a3a3] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={joinCode.trim().length !== 6 || isJoining || success}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#10b981] text-white text-[13px] font-medium hover:bg-[#059669] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isJoining ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
            ) : success ? (
              "Requested!"
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
                Request to Join
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}



function CreateProjectDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [discordGuildId, setDiscordGuildId] = useState("");
  const [maxMembers, setMaxMembers] = useState(10);
  const [aiName, setAiName] = useState("Forge");
  const [aiRole, setAiRole] = useState("Project Assistant");
  const [showAiConfig, setShowAiConfig] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { createProject } = useProjectStore();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await createProject({
        name: name.trim(),
        description: description.trim(),
        github_repo_url: githubUrl.trim(),
        discord_guild_id: discordGuildId.trim(),
        max_members: Number(maxMembers),
        ai_config: {
          name: aiName.trim() || "Forge",
          role: aiRole.trim() || "Project Assistant",
          invocation_phrase: aiName.trim() || "Forge",
        },
      });
      setName("");
      setDescription("");
      setGithubUrl("");
      setDiscordGuildId("");
      setMaxMembers(10);
      setAiName("Forge");
      setAiRole("Project Assistant");
      setShowAiConfig(false);
      onClose();
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="surface relative z-10 w-full max-w-md mx-4 p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-[#fafafa] mb-0.5">New Project Workspace</h2>
        <p className="text-[#525252] text-[13px] mb-5">
          Create a first-class project workspace with integrated AI persona and vector memory.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-[12px] text-[#737373] mb-1 font-medium">
              Project Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Web Engine"
              className="forge-input w-full px-3 py-2 text-[13px]"
              required
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#737373] mb-1 font-medium">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description"
              className="forge-input w-full px-3 py-2 text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#737373] mb-1 font-medium">
              GitHub Repository URL
            </label>
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="forge-input w-full px-3 py-2 text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#737373] mb-1 font-medium flex items-center justify-between">
              <span>Discord Server ID (Guild ID)</span>
              <span className="text-[10px] text-[#525252] font-normal">Optional</span>
            </label>
            <input
              type="text"
              value={discordGuildId}
              onChange={(e) => setDiscordGuildId(e.target.value)}
              placeholder="e.g. 123456789012345678"
              className="forge-input w-full px-3 py-2 text-[13px]"
            />
          </div>

          {/* AI Persona Customization Toggle */}
          <div className="pt-2 border-t border-[#1a1a1a]">
            <button
              type="button"
              onClick={() => setShowAiConfig(!showAiConfig)}
              className="text-[12px] text-[#10b981] hover:text-[#34d399] font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>{showAiConfig ? "− Hide AI Persona Options" : "+ Customize AI Identity & Persona"}</span>
            </button>

            {showAiConfig && (
              <div className="mt-2.5 p-3 rounded-lg bg-[#0a0a0a] border border-[#222] space-y-2.5">
                <div>
                  <label className="block text-[11px] text-[#737373] mb-0.5">AI Display Name</label>
                  <input
                    type="text"
                    value={aiName}
                    onChange={(e) => setAiName(e.target.value)}
                    placeholder="e.g. Atlas, Forge, Hermes"
                    className="forge-input w-full px-2.5 py-1.5 text-[12px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#737373] mb-0.5">AI Role / Persona</label>
                  <input
                    type="text"
                    value={aiRole}
                    onChange={(e) => setAiRole(e.target.value)}
                    placeholder="e.g. Senior Software Architect"
                    className="forge-input w-full px-2.5 py-1.5 text-[12px]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2.5 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-md border border-[#262626] text-[#737373] text-[13px] hover:bg-[#111111] hover:text-[#a3a3a3] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#10b981] text-white text-[13px] font-medium hover:bg-[#059669] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isCreating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                Create Workspace
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({ project }: { project: Project }) {
  const router = useRouter();
  const { deleteProject } = useProjectStore();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteProject(project.project_id);
    } catch {
      setDeleting(false);
    }
  };

  const githubReady = project.ingestion_status.github_backfill_complete;
  const discordReady = project.ingestion_status.discord_backfill_complete;
  const totalChunks =
    project.ingestion_status.github_chunks_count +
    project.ingestion_status.discord_chunks_count;

  return (
    <tr
      onClick={() => router.push(`/project/${project.project_id}`)}
      className="group cursor-pointer"
    >
      <td>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#111111] border border-[#1a1a1a] flex items-center justify-center shrink-0">
            <Folder className="w-3.5 h-3.5 text-[#525252]" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-[#fafafa] text-[13px] font-medium group-hover:text-[#10b981] transition-colors">
              {project.name}
            </span>
          </div>
        </div>
      </td>
      <td>
        {project.github_repo_name ? (
          <span className="text-[#525252] text-[12px] font-mono">{project.github_repo_name}</span>
        ) : (
          <span className="text-[#404040] text-[12px]">—</span>
        )}
      </td>
      <td>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`status-dot ${githubReady ? "status-dot-success" : "status-dot-idle"}`} />
            <span className="text-[11px] text-[#525252]">GitHub</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`status-dot ${discordReady ? "status-dot-success" : "status-dot-idle"}`} />
            <span className="text-[11px] text-[#525252]">Discord</span>
          </div>
        </div>
      </td>
      <td>
        <span className="text-[#737373] text-[13px] font-mono">{totalChunks.toLocaleString()}</span>
      </td>
      <td>
        <span className="text-[#525252] text-[12px]">
          {project.members.length} member{project.members.length !== 1 ? "s" : ""}
        </span>
      </td>
      <td>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-[#525252] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-all cursor-pointer"
          >
            <Trash2 className="w-3 h-3" strokeWidth={1.5} />
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-[#404040] group-hover:text-[#737373] transition-colors" strokeWidth={1.5} />
        </div>
      </td>
    </tr>
  );
}

export default function DashboardPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const { user } = useAuthStore();
  const { projects, isLoading, fetchProjects } = useProjectStore();

  const fetchPendingRequests = useCallback(async () => {
    try {
      const pending = await api.get<Project[]>("/projects/join/pending");
      setPendingProjects(pending || []);
    } catch {
      setPendingProjects([]);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchProjects();
      api.get<Project[]>("/projects/join/pending")
        .then((pending) => setPendingProjects(pending || []))
        .catch(() => setPendingProjects([]));
    }
  }, [user, fetchProjects]);

  useEffect(() => {
    api.get<ActivityItem[]>("/projects/activity/all")
      .then((data) => setActivities(data || []))
      .catch((err) => {
        console.error("Failed to fetch recent activity:", err);
        setActivities([]);
      })
      .finally(() => setIsLoadingActivity(false));
  }, [projects]);

  const totalChunks = projects.reduce(
    (sum, p) =>
      sum +
      p.ingestion_status.github_chunks_count +
      p.ingestion_status.discord_chunks_count,
    0
  );
  const connectedSources = projects.filter(
    (p) =>
      p.ingestion_status.github_backfill_complete ||
      p.ingestion_status.discord_backfill_complete
  ).length;

  return (
    <div className="p-6 lg:p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">
            Dashboard
          </h1>
          <p className="text-[#525252] text-[13px] mt-0.5">
            {projects.length} project{projects.length !== 1 ? "s" : ""} in your workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setJoinDialogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] border border-[#262626] text-[#fafafa] text-[13px] font-medium rounded-md hover:bg-[#1f1f1f] transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#a3a3a3]" strokeWidth={1.5} />
            Join Project
          </button>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#10b981] text-white text-[13px] font-medium rounded-md hover:bg-[#059669] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            New Project
          </button>
        </div>
      </div>

      {/* Pending Join Requests Banner */}
      {pendingProjects.length > 0 && (
        <div className="mb-6 surface p-4 border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
            <h3 className="text-[13px] font-semibold text-amber-300">
              Pending Join Requests ({pendingProjects.length})
            </h3>
          </div>
          <p className="text-[12px] text-[#888] mb-3">
            You requested to join the following project{pendingProjects.length > 1 ? "s" : ""}. They will appear in your active workspace once approved by the project owner.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingProjects.map((proj) => (
              <div
                key={proj.project_id}
                className="bg-[#111] border border-[#222] rounded-md p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-[13px] font-medium text-[#fafafa]">{proj.name}</p>
                  <p className="text-[11px] text-[#666] font-mono mt-0.5">
                    {proj.github_repo_name || "Repository not linked"}
                  </p>
                </div>
                <span className="text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-medium">
                  Awaiting Approval
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Folder, label: "Projects", value: projects.length },
          { icon: Database, label: "Chunks Indexed", value: totalChunks.toLocaleString() },
          { icon: GitBranch, label: "Sources Connected", value: connectedSources },
          { icon: FileText, label: "Decisions", value: "—" },
        ].map((stat) => (
          <div key={stat.label} className="surface p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-3.5 h-3.5 text-[#525252]" strokeWidth={1.5} />
              <span className="text-[11px] text-[#525252] uppercase tracking-wider font-medium">{stat.label}</span>
            </div>
            <p className="text-xl font-semibold text-[#fafafa] tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects table — 2 columns on desktop */}
        <div className="lg:col-span-2">
          <div className="surface overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <h2 className="text-[13px] font-medium text-[#a3a3a3]">Projects</h2>
              <span className="text-[11px] text-[#525252]">{projects.length} total</span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 text-[#10b981] animate-spin" strokeWidth={2} />
              </div>
            ) : projects.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-10 h-10 rounded-md bg-[#111111] border border-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-4 h-4 text-[#10b981]" strokeWidth={1.5} />
                </div>
                <h3 className="text-[14px] font-semibold text-[#fafafa] mb-1">
                  Create your first project
                </h3>
                <p className="text-[#525252] text-[12px] mb-4 max-w-xs mx-auto">
                  Connect your GitHub repository and Discord server to build your team&apos;s knowledge graph.
                </p>
                <button
                  onClick={() => setDialogOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#10b981] text-white text-[13px] font-medium rounded-md hover:bg-[#059669] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                  New Project
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="forge-table">
                  <thead>
                    <tr>
                      <th className="min-w-[180px]">Name</th>
                      <th className="min-w-[140px]">Repository</th>
                      <th className="min-w-[160px]">Status</th>
                      <th>Chunks</th>
                      <th>Members</th>
                      <th className="w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <ProjectRow key={project.project_id} project={project} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
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
                <p className="text-[11px] text-[#404040] mt-1">Create or join a project to get started.</p>
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

      <CreateProjectDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          fetchProjects();
          fetchPendingRequests();
        }}
      />
      <JoinProjectDialog
        isOpen={joinDialogOpen}
        onClose={() => {
          setJoinDialogOpen(false);
          fetchProjects();
          fetchPendingRequests();
        }}
      />
    </div>
  );
}
