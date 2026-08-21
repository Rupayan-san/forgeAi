"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Zap,
  GitBranch,
  MessageSquare,
  Brain,
  ArrowRight,
  Loader2,
  Folder,
  Trash2,
  Database,
  FileText,
  Clock,
  ChevronRight,
  ExternalLink,
  UserPlus,
} from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";
import { useProjectStore } from "@/store/use-project-store";
import { useAuthStore } from "@/store/use-auth-store";
import type { Project } from "@/types";
import { api } from "@/lib/api";

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
    } catch (err: any) {
      setError(err.message || "Failed to join project");
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

// Mock recent activity for demo
const recentActivity = [
  { type: "github", action: "Ingested 42 commits from main", time: "2 min ago", status: "success" },
  { type: "discord", action: "Captured 156 messages from #engineering", time: "12 min ago", status: "success" },
  { type: "decision", action: "Extracted 3 decisions from PR #89", time: "1 hour ago", status: "success" },
  { type: "github", action: "Indexed README.md and 8 issue threads", time: "3 hours ago", status: "success" },
];

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
  const [maxMembers, setMaxMembers] = useState(10);
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
        max_members: Number(maxMembers),
      });
      setName("");
      setDescription("");
      setGithubUrl("");
      setMaxMembers(10);
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
      <div className="surface relative z-10 w-full max-w-md mx-4 p-6 animate-scale-in">
        <h2 className="text-base font-semibold text-[#fafafa] mb-0.5">New Project</h2>
        <p className="text-[#525252] text-[13px] mb-5">
          Connect a GitHub repository to start building your project memory.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-[12px] text-[#525252] mb-1 font-medium">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Project"
              className="forge-input w-full px-3 py-2 text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] text-[#525252] mb-1 font-medium">
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
            <label className="block text-[12px] text-[#525252] mb-1 font-medium">
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
            <label className="block text-sm text-[rgba(255,255,255,0.5)] mb-1.5">
              Maximum Members Allowed
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Math.max(1, Number(e.target.value)))}
              placeholder="10"
              className="glass-input w-full px-4 py-2.5 text-sm"
            />
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
                Create
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({ project }: { project: Project }) {
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
    <Link href={`/project/${project.project_id}`}>
      <tr className="group cursor-pointer">
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
    </Link>
  );
}

export default function DashboardPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const { user } = useAuthStore();
  const { projects, isLoading } = useProjectStore();

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
            <div className="px-4 py-3 border-b border-[#1a1a1a]">
              <h2 className="text-[13px] font-medium text-[#a3a3a3]">Recent Activity</h2>
            </div>
            <div className="divide-y divide-[#0f0f0f]">
              {recentActivity.map((item, i) => (
                <div key={i} className="px-4 py-3 hover:bg-[#0f0f0f] transition-colors">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">
                      <div className="status-dot status-dot-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-[#a3a3a3] leading-snug">{item.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="forge-badge forge-badge-neutral">
                          {item.type}
                        </span>
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

      <CreateProjectDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
      <JoinProjectDialog
        isOpen={joinDialogOpen}
        onClose={() => setJoinDialogOpen(false)}
      />
    </div>
  );
}
