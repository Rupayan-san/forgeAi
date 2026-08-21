"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Loader2,
  Save,
  Users,
  Settings as SettingsIcon,
  Check,
  X,
  UserPlus,
  Copy,
  User,
  Key,
  Shield,
  Bell,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Hash,
  Eye,
  EyeOff,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";
import { DiscordIcon } from "@/components/shared/discord-icon";
import { useProjectStore } from "@/store/use-project-store";
import { useAuthStore } from "@/store/use-auth-store";
import { api } from "@/lib/api";

type JoinRequest = {
  request_id: string;
  user_id: string;
  user_name: string;
  github_username: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export default function SettingsPage() {
  const currentProject = useProjectStore((state) => state.currentProject);
  const projects = useProjectStore((state) => state.projects);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);
  const fetchProject = useProjectStore((state) => state.fetchProject);
  const isLoading = useProjectStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<"general" | "team" | "account">("general");

  // General Project form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [discordGuildId, setDiscordGuildId] = useState("");
  const [maxMembers, setMaxMembers] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Team state
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [inviteUsername, setInviteUsername] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Account / API Key
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const mockApiKey = "forge_sk_a3f2d1e4b5c6d7e8f921";

  // Auto-fetch and select first project if none selected
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!currentProject && projects.length > 0) {
      setCurrentProject(projects[0]);
    }
  }, [currentProject, projects, setCurrentProject]);

  // Initialize form when project loads
  useEffect(() => {
    if (currentProject) {
      setName(currentProject.name || "");
      setDescription(currentProject.description || "");
      setGithubRepoUrl(currentProject.github_repo_url || "");
      setDiscordGuildId(currentProject.discord_guild_id || "");
      setMaxMembers(currentProject.max_members || 10);
    }
  }, [currentProject]);

  // Fetch pending requests if owner
  useEffect(() => {
    if (currentProject && user && currentProject.owner_id === user.user_id && activeTab === "team") {
      api.get<JoinRequest[]>(`/projects/${currentProject.project_id}/join/requests`)
        .then(setPendingRequests)
        .catch(console.error);
    }
  }, [currentProject, user, activeTab]);

  const isOwner = user?.user_id === currentProject?.owner_id;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    setIsSaving(true);
    setMessage("");

    try {
      await api.put(`/projects/${currentProject.project_id}`, {
        name,
        description,
        github_repo_url: githubRepoUrl,
        discord_guild_id: discordGuildId,
        max_members: Number(maxMembers),
      });
      setMessage("Settings saved successfully!");
      await fetchProject(currentProject.project_id, true);
    } catch (err) {
      console.error(err);
      setMessage("Failed to save settings.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !inviteUsername.trim()) return;

    setIsInviting(true);
    setInviteMessage("");
    try {
      await api.post(`/projects/${currentProject.project_id}/invite`, { github_username: inviteUsername.trim() });
      setInviteMessage("Invited successfully!");
      setInviteUsername("");
    } catch (err: any) {
      setInviteMessage(err.message || "Failed to invite");
    } finally {
      setIsInviting(false);
      setTimeout(() => setInviteMessage(""), 3000);
    }
  };

  const handleRequestAction = async (requestId: string, action: "approve" | "reject") => {
    if (!currentProject) return;
    try {
      await api.post(`/projects/${currentProject.project_id}/join/requests/${requestId}/${action}`);
      setPendingRequests((prev) => prev.filter((r) => r.request_id !== requestId));
      if (action === "approve") {
        await fetchProject(currentProject.project_id, true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyJoinCode = () => {
    if (currentProject?.join_code) {
      navigator.clipboard.writeText(currentProject.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(mockApiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  return (
    <div className="flex-1 space-y-5 p-5 lg:p-6 max-w-[1400px] w-full mx-auto animate-fade-in bg-background text-foreground transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg bg-card hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 shadow-2xs mt-0.5"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage your workspace parameters, project integrations, team members, and API access
            </p>
          </div>
        </div>
        {projects.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Project:</span>
            <select
              value={currentProject?.project_id || ""}
              onChange={(e) => {
                const found = projects.find((p) => p.project_id === e.target.value);
                if (found) setCurrentProject(found);
              }}
              className="px-3 py-1.5 text-xs bg-card border border-border rounded-md text-foreground focus:outline-hidden focus:border-ring"
            >
              {projects.map((proj) => (
                <option key={proj.project_id} value={proj.project_id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === "general"
              ? "border-emerald-500 text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <SettingsIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
          Project Settings
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === "team"
              ? "border-emerald-500 text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
          Team Management
        </button>
        <button
          onClick={() => setActiveTab("account")}
          className={`pb-2.5 px-3 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === "account"
              ? "border-emerald-500 text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="w-3.5 h-3.5" strokeWidth={1.5} />
          Account & Credentials
        </button>
      </div>

      {/* Tab 1: General Settings */}
      {activeTab === "general" && (
        <form onSubmit={handleSave} className="space-y-4.5 max-w-3xl">
          <div className="bg-card border border-border rounded-xl p-4.5 space-y-3.5 shadow-2xs">
            <h2 className="text-xs sm:text-sm font-bold text-foreground border-b border-border pb-2.5">
              General Information
            </h2>

            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground font-medium">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:border-ring"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:border-ring min-h-[80px]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground font-medium">Maximum Members Allowed</label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxMembers}
                onChange={(e) => setMaxMembers(Math.max(1, Number(e.target.value)))}
                disabled={!isOwner}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:border-ring disabled:opacity-40"
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4.5 space-y-3.5 shadow-2xs">
            <h2 className="text-xs sm:text-sm font-bold text-foreground border-b border-border pb-2.5">
              Connected Sources
            </h2>

            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground font-medium">GitHub Repository URL</label>
              <input
                type="url"
                value={githubRepoUrl}
                onChange={(e) => setGithubRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:border-ring font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Changing this requires triggering GitHub Sync on the project overview page.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="block text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <DiscordIcon size={14} className="text-[#5865F2]" />
                  Discord Server ID (Guild ID)
                </label>
                <a
                  href="https://discord.com/oauth2/authorize?permissions=68608&scope=bot%20applications.commands"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#5865F2] hover:underline"
                >
                  Invite Bot to Server
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="text"
                value={discordGuildId}
                onChange={(e) => setDiscordGuildId(e.target.value)}
                placeholder="e.g. 123456789012345678"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:border-ring font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Enable Developer Mode in Discord (User Settings &gt; Advanced &gt; Developer Mode), right-click your server name, and select &quot;Copy Server ID&quot;.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
              ) : (
                <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
              Save Settings
            </button>

            {message && (
              <span className={`text-xs font-medium ${message.includes("Failed") ? "text-rose-500" : "text-emerald-500"}`}>
                {message}
              </span>
            )}
          </div>
        </form>
      )}

      {/* Tab 2: Team Management */}
      {activeTab === "team" && (
        <div className="space-y-4.5 max-w-3xl">
          {isOwner && currentProject && (
            <>
              {/* Join Code */}
              <div className="bg-card border border-border rounded-xl p-4.5 shadow-2xs">
                <h2 className="text-xs sm:text-sm font-bold text-foreground mb-1">Project Join Code</h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Share this 6-character code with your team members to request access.
                </p>
                <div className="flex items-center gap-3 bg-background p-3 rounded-lg border border-border w-fit">
                  <span className="text-2xl font-mono tracking-widest text-emerald-600 dark:text-emerald-500 font-bold">
                    {currentProject.join_code || "------"}
                  </span>
                  <button
                    onClick={copyJoinCode}
                    className="p-1.5 rounded bg-secondary text-secondary-foreground hover:bg-accent transition-colors cursor-pointer"
                    title="Copy Join Code"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>

              {/* Pending Requests */}
              <div className="bg-card border border-border rounded-xl p-4.5 shadow-2xs">
                <h2 className="text-xs sm:text-sm font-bold text-foreground mb-2.5">Pending Join Requests</h2>
                {pendingRequests.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pending requests at this time.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.request_id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border"
                      >
                        <div>
                          <p className="text-foreground font-semibold text-xs sm:text-sm">{req.user_name}</p>
                          <p className="text-muted-foreground text-[11px] font-mono">@{req.github_username}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleRequestAction(req.request_id, "approve")}
                            className="p-1.5 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                            title="Approve"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRequestAction(req.request_id, "reject")}
                            className="p-1.5 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"
                            title="Reject"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invite Member */}
              <div className="bg-card border border-border rounded-xl p-4.5 shadow-2xs">
                <h2 className="text-xs sm:text-sm font-bold text-foreground mb-2.5">Direct Invite</h2>
                <form onSubmit={handleInvite} className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      placeholder="GitHub username"
                      className="flex-1 px-3 py-2 text-xs sm:text-sm bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:border-ring"
                    />
                    <button
                      type="submit"
                      disabled={isInviting || !inviteUsername.trim()}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
                    >
                      {isInviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                      Invite
                    </button>
                  </div>
                  {inviteMessage && (
                    <span className={`text-xs ${inviteMessage.includes("Failed") ? "text-rose-500" : "text-emerald-500"}`}>
                      {inviteMessage}
                    </span>
                  )}
                </form>
              </div>
            </>
          )}

          {/* Members List */}
          <div className="bg-card border border-border rounded-xl p-4.5 shadow-2xs">
            <h2 className="text-xs sm:text-sm font-bold text-foreground mb-2.5">
              Project Members ({currentProject?.members?.length || 0})
            </h2>
            <div className="space-y-1.5">
              {currentProject?.members?.map((memberId) => (
                <div
                  key={memberId}
                  className="p-2.5 rounded-lg bg-background border border-border flex items-center justify-between"
                >
                  <span className="text-foreground text-xs sm:text-sm font-semibold">{memberId}</span>
                  {memberId === currentProject.owner_id && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 font-mono font-semibold">
                      Owner
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Account & Credentials */}
      {activeTab === "account" && (
        <div className="space-y-4.5 max-w-3xl">
          {/* Profile */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xs">
            <div className="px-4.5 py-3 border-b border-border">
              <h2 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                <User className="w-3.5 h-3.5" strokeWidth={1.5} />
                Profile
              </h2>
            </div>
            <div className="p-4.5">
              <div className="flex items-center gap-4">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name || ""}
                    className="w-12 h-12 rounded-lg border border-border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-accent border border-border flex items-center justify-center text-sm font-bold text-foreground">
                    {(user?.name || "??").substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {user?.name || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">@{user?.github_username || "—"}</p>
                  <p className="text-[11px] text-muted-foreground/75 mt-0.5">{user?.email || "No email"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* API Key section */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xs">
            <div className="px-4.5 py-3 border-b border-border">
              <h2 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
                API Access
              </h2>
            </div>
            <div className="p-4.5">
              <p className="text-xs text-muted-foreground mb-3">
                Use this API key to interact with Forge programmatically via HTTP requests.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 text-xs font-mono bg-background border border-border rounded-md text-foreground flex items-center">
                  {showApiKey ? mockApiKey : "forge_sk_••••••••••••••••••••"}
                </div>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer border border-border"
                  title={showApiKey ? "Hide Key" : "Show Key"}
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />}
                </button>
                <button
                  onClick={copyApiKey}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-emerald-500 hover:bg-accent transition-colors cursor-pointer border border-border"
                  title="Copy API Key"
                >
                  {apiKeyCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
                </button>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-card border border-rose-500/30 rounded-xl overflow-hidden shadow-2xs">
            <div className="px-4.5 py-3 border-b border-rose-500/20 bg-rose-500/5">
              <h2 className="text-xs sm:text-sm font-bold text-rose-500 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />
                Danger Zone
              </h2>
            </div>
            <div className="p-4.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-foreground">Delete Account</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete your user account and access tokens
                  </p>
                </div>
                <button className="px-3 py-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs font-semibold hover:bg-rose-500/20 transition-colors cursor-pointer">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
