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
} from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";
import { useProjectStore } from "@/store/use-project-store";
import { useAuthStore } from "@/store/use-auth-store";
import type { Project } from "@/types";

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
      });
      setName("");
      setDescription("");
      setGithubUrl("");
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="glass relative z-10 w-full max-w-lg mx-4 p-8">
        <h2 className="text-xl font-semibold text-white mb-1">New Project</h2>
        <p className="text-[rgba(255,255,255,0.4)] text-sm mb-6">
          Connect your GitHub repository to start building your project memory.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[rgba(255,255,255,0.5)] mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Project"
              className="glass-input w-full px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-[rgba(255,255,255,0.5)] mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your project"
              className="glass-input w-full px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-[rgba(255,255,255,0.5)] mb-1.5">
              GitHub Repository URL
            </label>
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="glass-input w-full px-4 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] text-sm hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6366F1] text-white text-sm font-medium hover:bg-[#4F46E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <>
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                Create Project
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
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

  return (
    <Link href={`/project/${project.project_id}`}>
      <div className="glass glass-hover p-6 h-full group">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-[rgba(99,102,241,0.15)] flex items-center justify-center">
            <Folder className="w-5 h-5 text-[#818CF8]" strokeWidth={1.5} />
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center justify-center text-[rgba(255,255,255,0.3)] hover:text-red-400 hover:bg-[rgba(239,68,68,0.1)] transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <h3 className="text-white font-semibold mb-1 group-hover:text-[#818CF8] transition-colors">
          {project.name}
        </h3>
        <p className="text-[rgba(255,255,255,0.4)] text-sm mb-4 line-clamp-2">
          {project.description || "No description"}
        </p>

        {/* Status indicators */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${githubReady ? "bg-emerald-400" : "bg-[rgba(255,255,255,0.2)]"}`} />
            <span className="text-[rgba(255,255,255,0.4)]">
              <GithubIcon className="inline w-3 h-3 mr-1" size={12} />
              {githubReady ? "Synced" : "Not connected"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${discordReady ? "bg-emerald-400" : "bg-[rgba(255,255,255,0.2)]"}`} />
            <span className="text-[rgba(255,255,255,0.4)]">
              <MessageSquare className="inline w-3 h-3 mr-1" strokeWidth={1.5} />
              {discordReady ? "Active" : "Not connected"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-[rgba(255,255,255,0.06)]">
          <span className="text-xs text-[rgba(255,255,255,0.3)]">
            {project.members.length} member{project.members.length !== 1 ? "s" : ""}
          </span>
          <ArrowRight className="w-4 h-4 text-[rgba(255,255,255,0.2)] group-hover:text-[#818CF8] transition-colors" strokeWidth={1.5} />
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuthStore();
  const { projects, isLoading } = useProjectStore();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-[rgba(255,255,255,0.4)] text-sm mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""} in your workspace
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#6366F1] text-white text-sm font-medium rounded-xl hover:bg-[#4F46E5] transition-all duration-200 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          New Project
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Folder, label: "Projects", value: projects.length, color: "#6366F1" },
          {
            icon: GitBranch,
            label: "Chunks Indexed",
            value: projects.reduce(
              (sum, p) => sum + (p.ingestion_status.github_chunks_count + p.ingestion_status.discord_chunks_count),
              0
            ),
            color: "#818CF8",
          },
          {
            icon: Brain,
            label: "Sources Connected",
            value: projects.filter(
              (p) => p.ingestion_status.github_backfill_complete || p.ingestion_status.discord_backfill_complete
            ).length,
            color: "#A5B4FC",
          },
        ].map((stat) => (
          <div key={stat.label} className="glass p-5">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${stat.color}20` }}
              >
                <stat.icon
                  className="w-4.5 h-4.5"
                  style={{ color: stat.color }}
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <p className="text-xl font-semibold text-white">{stat.value}</p>
                <p className="text-xs text-[rgba(255,255,255,0.4)]">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Projects grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" strokeWidth={1.5} />
        </div>
      ) : projects.length === 0 ? (
        <div className="glass p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(99,102,241,0.1)] flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-[#6366F1]" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Create your first project
          </h3>
          <p className="text-[rgba(255,255,255,0.4)] text-sm mb-6 max-w-sm mx-auto">
            Connect your GitHub repository and Discord server to build your team&apos;s knowledge graph.
          </p>
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#6366F1] text-white font-medium rounded-xl hover:bg-[#4F46E5] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.project_id} project={project} />
          ))}
        </div>
      )}

      <CreateProjectDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
