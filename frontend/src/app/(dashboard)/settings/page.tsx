"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";
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
    <div className="p-6 lg:p-8 max-w-[860px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">Settings</h1>
        <p className="text-[#525252] text-[13px] mt-0.5">
          Manage project configuration, team members, and user credentials
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#1a1a1a] mb-6">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-3 px-3 text-[13px] font-medium transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === "general"
              ? "border-[#10b981] text-[#fafafa]"
              : "border-transparent text-[#525252] hover:text-[#a3a3a3]"
          }`}
        >
          <SettingsIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
          Project Settings
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`pb-3 px-3 text-[13px] font-medium transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === "team"
              ? "border-[#10b981] text-[#fafafa]"
              : "border-transparent text-[#525252] hover:text-[#a3a3a3]"
          }`}
        >
          <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
          Team Management
        </button>
        <button
          onClick={() => setActiveTab("account")}
          className={`pb-3 px-3 text-[13px] font-medium transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === "account"
              ? "border-[#10b981] text-[#fafafa]"
              : "border-transparent text-[#525252] hover:text-[#a3a3a3]"
          }`}
        >
          <User className="w-3.5 h-3.5" strokeWidth={1.5} />
          Account & Credentials
        </button>
      </div>

      {/* Tab 1: General Settings */}
      {activeTab === "general" && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="surface p-5 space-y-4">
            <h2 className="text-[13px] font-medium text-[#a3a3a3] border-b border-[#1a1a1a] pb-3">
              General Information
            </h2>

            <div className="space-y-1.5">
              <label className="block text-[12px] text-[#525252] font-medium">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="forge-input w-full px-3 py-2 text-[13px]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] text-[#525252] font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="forge-input w-full px-3 py-2 text-[13px] min-h-[80px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] text-[#525252] font-medium">Maximum Members Allowed</label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxMembers}
                onChange={(e) => setMaxMembers(Math.max(1, Number(e.target.value)))}
                disabled={!isOwner}
                className="forge-input w-full px-3 py-2 text-[13px] disabled:opacity-40"
              />
            </div>
          </div>

          <div className="surface p-5 space-y-4">
            <h2 className="text-[13px] font-medium text-[#a3a3a3] border-b border-[#1a1a1a] pb-3">
              Connected Sources
            </h2>

            <div className="space-y-1.5">
              <label className="block text-[12px] text-[#525252] font-medium">GitHub Repository URL</label>
              <input
                type="url"
                value={githubRepoUrl}
                onChange={(e) => setGithubRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="forge-input w-full px-3 py-2 text-[13px]"
              />
              <p className="text-[11px] text-[#525252]">
                Changing this requires triggering GitHub Sync on the project overview page.
              </p>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-white/5">
              <label className="block text-[12px] text-[#525252] font-medium">Discord Server ID (Guild ID)</label>
              <input
                type="text"
                value={discordGuildId}
                onChange={(e) => setDiscordGuildId(e.target.value)}
                placeholder="e.g. 123456789012345678"
                className="forge-input w-full px-3 py-2 text-[13px]"
              />
              <p className="text-[11px] text-[#525252]">
                Enable Developer Mode in Discord, right-click your server name, and select &quot;Copy Server ID&quot;.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#10b981] hover:bg-[#059669] text-white text-[13px] font-medium transition-colors disabled:opacity-40 cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
              ) : (
                <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
              Save Settings
            </button>

            {message && (
              <span className={`text-[12px] font-medium ${message.includes("Failed") ? "text-red-400" : "text-emerald-400"}`}>
                {message}
              </span>
            )}
          </div>
        </form>
      )}

      {/* Tab 2: Team Management */}
      {activeTab === "team" && (
        <div className="space-y-6">
          {isOwner && currentProject && (
            <>
              {/* Join Code */}
              <div className="surface p-5">
                <h2 className="text-[13px] font-medium text-[#a3a3a3] mb-1.5">Project Join Code</h2>
                <p className="text-[12px] text-[#525252] mb-4">
                  Share this 6-character code with your team members to request access.
                </p>
                <div className="flex items-center gap-3 bg-[#0d0d0d] p-3 rounded-lg border border-[#1a1a1a] w-fit">
                  <span className="text-2xl font-mono tracking-widest text-[#10b981] font-bold">
                    {currentProject.join_code || "------"}
                  </span>
                  <button
                    onClick={copyJoinCode}
                    className="p-1.5 rounded bg-[#171717] hover:bg-[#222222] text-[#fafafa] transition-colors cursor-pointer"
                    title="Copy Join Code"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#737373]" />}
                  </button>
                </div>
              </div>

              {/* Pending Requests */}
              <div className="surface p-5">
                <h2 className="text-[13px] font-medium text-[#a3a3a3] mb-3">Pending Join Requests</h2>
                {pendingRequests.length === 0 ? (
                  <p className="text-[12px] text-[#525252]">No pending requests at this time.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.request_id}
                        className="flex items-center justify-between p-2.5 rounded-md bg-[#0a0a0a] border border-[#1a1a1a]"
                      >
                        <div>
                          <p className="text-[#fafafa] font-medium text-[13px]">{req.user_name}</p>
                          <p className="text-[#525252] text-[11px]">@{req.github_username}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleRequestAction(req.request_id, "approve")}
                            className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                            title="Approve"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRequestAction(req.request_id, "reject")}
                            className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
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
              <div className="surface p-5">
                <h2 className="text-[13px] font-medium text-[#a3a3a3] mb-3">Direct Invite</h2>
                <form onSubmit={handleInvite} className="flex flex-col gap-2.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      placeholder="GitHub username"
                      className="forge-input flex-1 px-3 py-2 text-[13px]"
                    />
                    <button
                      type="submit"
                      disabled={isInviting || !inviteUsername.trim()}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#10b981] hover:bg-[#059669] text-white text-[13px] font-medium transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      {isInviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                      Invite
                    </button>
                  </div>
                  {inviteMessage && (
                    <span className={`text-[12px] ${inviteMessage.includes("Failed") ? "text-red-400" : "text-emerald-400"}`}>
                      {inviteMessage}
                    </span>
                  )}
                </form>
              </div>
            </>
          )}

          {/* Members List */}
          <div className="surface p-5">
            <h2 className="text-[13px] font-medium text-[#a3a3a3] mb-3">
              Project Members ({currentProject?.members?.length || 0})
            </h2>
            <div className="space-y-1.5">
              {currentProject?.members?.map((memberId) => (
                <div
                  key={memberId}
                  className="p-2.5 rounded-md bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-between"
                >
                  <span className="text-[#fafafa] text-[13px] font-medium">{memberId}</span>
                  {memberId === currentProject.owner_id && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-medium">
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
        <div className="space-y-6">
          {/* Profile */}
          <div className="surface overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a]">
              <h2 className="text-[13px] font-medium text-[#a3a3a3] flex items-center gap-2">
                <User className="w-3.5 h-3.5" strokeWidth={1.5} />
                Profile
              </h2>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name || ""}
                    className="w-12 h-12 rounded-md border border-[#262626]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-md bg-[#171717] border border-[#262626] flex items-center justify-center text-sm font-bold text-white">
                    {(user?.name || "??").substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-[14px] font-medium text-[#fafafa]">
                    {user?.name || "—"}
                  </p>
                  <p className="text-[12px] text-[#525252]">@{user?.github_username || "—"}</p>
                  <p className="text-[11px] text-[#404040] mt-0.5">{user?.email || "No email"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* API Key section */}
          <div className="surface overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a]">
              <h2 className="text-[13px] font-medium text-[#a3a3a3] flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
                API Access
              </h2>
            </div>
            <div className="p-5">
              <p className="text-[12px] text-[#525252] mb-3">
                Use this API key to interact with Forge programmatically via HTTP requests.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 forge-input px-3 py-2 text-[12px] font-mono flex items-center">
                  {showApiKey ? mockApiKey : "forge_sk_••••••••••••••••••••"}
                </div>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-[#525252] hover:text-[#737373] hover:bg-[#111111] transition-colors cursor-pointer"
                  title={showApiKey ? "Hide Key" : "Show Key"}
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />}
                </button>
                <button
                  onClick={copyApiKey}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-[#525252] hover:text-[#10b981] hover:bg-[#111111] transition-colors cursor-pointer"
                  title="Copy API Key"
                >
                  {apiKeyCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
                </button>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="surface overflow-hidden border-[rgba(239,68,68,0.2)]">
            <div className="px-5 py-3 border-b border-[rgba(239,68,68,0.1)]">
              <h2 className="text-[13px] font-medium text-[#ef4444] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />
                Danger Zone
              </h2>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-[#fafafa]">Delete Account</p>
                  <p className="text-[11px] text-[#525252]">
                    Permanently delete your user account and access tokens
                  </p>
                </div>
                <button className="px-3 py-1.5 rounded-md border border-[rgba(239,68,68,0.3)] text-[#ef4444] text-[12px] font-medium hover:bg-[rgba(239,68,68,0.08)] transition-colors cursor-pointer">
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
