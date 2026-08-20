"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Users, Settings as SettingsIcon, Check, X, UserPlus, Copy } from "lucide-react";
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
  
  const [activeTab, setActiveTab] = useState<"general" | "team">("general");

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

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  const isOwner = user?.user_id === currentProject.owner_id;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
    if (!inviteUsername.trim()) return;
    
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
    try {
      await api.post(`/projects/${currentProject.project_id}/join/requests/${requestId}/${action}`);
      setPendingRequests(prev => prev.filter(r => r.request_id !== requestId));
      if (action === "approve") {
        await fetchProject(currentProject.project_id, true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyJoinCode = () => {
    if (currentProject.join_code) {
      navigator.clipboard.writeText(currentProject.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-6">Project Settings</h1>
      
      {/* Tabs */}
      <div className="flex gap-4 border-b border-[rgba(255,255,255,0.1)] mb-8">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-4 px-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "general" 
              ? "border-[#6366F1] text-white" 
              : "border-transparent text-[rgba(255,255,255,0.5)] hover:text-white"
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          General Settings
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`pb-4 px-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "team" 
              ? "border-[#6366F1] text-white" 
              : "border-transparent text-[rgba(255,255,255,0.5)] hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          Team Management
        </button>
      </div>

      {activeTab === "general" && (
        <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
          <div className="glass p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white">General Information</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-[rgba(255,255,255,0.7)]">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#6366F1] transition-colors"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[rgba(255,255,255,0.7)]">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#6366F1] transition-colors min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[rgba(255,255,255,0.7)]">Maximum Members Allowed</label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxMembers}
                onChange={(e) => setMaxMembers(Math.max(1, Number(e.target.value)))}
                disabled={!isOwner}
                className="w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#6366F1] transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          <div className="glass p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white">Integrations</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-[rgba(255,255,255,0.7)]">GitHub Repository URL</label>
              <input
                type="url"
                value={githubRepoUrl}
                onChange={(e) => setGithubRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#6366F1] transition-colors"
              />
              <p className="text-xs text-[rgba(255,255,255,0.4)]">
                Changing this requires running the GitHub Sync again on the overview page.
              </p>
            </div>

            <div className="space-y-2 pt-4 border-t border-[rgba(255,255,255,0.05)]">
              <label className="text-sm font-medium text-[rgba(255,255,255,0.7)]">Discord Server ID (Guild ID)</label>
              <input
                type="text"
                value={discordGuildId}
                onChange={(e) => setDiscordGuildId(e.target.value)}
                placeholder="e.g. 123456789012345678"
                className="w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#6366F1] transition-colors"
              />
              <p className="text-xs text-[rgba(255,255,255,0.4)]">
                Enable Developer Mode in Discord, right-click your server name, and select "Copy Server ID".
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <Save className="w-4 h-4" strokeWidth={1.5} />
              )}
              Save Settings
            </button>
            
            {message && (
              <span className={`text-sm font-medium ${message.includes("Failed") ? "text-red-400" : "text-emerald-400"}`}>
                {message}
              </span>
            )}
          </div>
        </form>
      )}

      {activeTab === "team" && (
        <div className="space-y-6 max-w-3xl">
          {isOwner && (
            <>
              {/* Join Code */}
              <div className="glass p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Project Join Code</h2>
                <p className="text-sm text-[rgba(255,255,255,0.6)] mb-4">
                  Share this code with your team members so they can request to join.
                </p>
                <div className="flex items-center gap-4 bg-[rgba(0,0,0,0.2)] p-4 rounded-xl border border-[rgba(255,255,255,0.1)] w-fit">
                  <span className="text-4xl font-mono tracking-widest text-[#6366F1] font-bold">
                    {currentProject.join_code || "------"}
                  </span>
                  <button 
                    onClick={copyJoinCode}
                    className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors text-white"
                    title="Copy Join Code"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Pending Requests */}
              <div className="glass p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Pending Join Requests</h2>
                {pendingRequests.length === 0 ? (
                  <p className="text-sm text-[rgba(255,255,255,0.5)]">No pending requests.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map(req => (
                      <div key={req.request_id} className="flex items-center justify-between p-3 rounded-lg bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)]">
                        <div>
                          <p className="text-white font-medium text-sm">{req.user_name}</p>
                          <p className="text-[rgba(255,255,255,0.5)] text-xs">@{req.github_username}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleRequestAction(req.request_id, "approve")}
                            className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleRequestAction(req.request_id, "reject")}
                            className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invite Member */}
              <div className="glass p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Invite Member</h2>
                <form onSubmit={handleInvite} className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      placeholder="GitHub Username"
                      className="flex-1 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#6366F1] transition-colors text-sm"
                    />
                    <button
                      type="submit"
                      disabled={isInviting || !inviteUsername.trim()}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-medium transition-colors disabled:opacity-50 text-sm"
                    >
                      {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Invite
                    </button>
                  </div>
                  {inviteMessage && (
                    <span className={`text-sm ${inviteMessage.includes("Failed") ? "text-red-400" : "text-emerald-400"}`}>
                      {inviteMessage}
                    </span>
                  )}
                </form>
              </div>
            </>
          )}

          {/* Members List */}
          <div className="glass p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Project Members ({currentProject.members?.length || 0})</h2>
            <div className="space-y-2">
              {currentProject.members?.map(memberId => (
                <div key={memberId} className="p-3 rounded-lg bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                  <span className="text-white text-sm font-medium">{memberId}</span>
                  {memberId === currentProject.owner_id && (
                    <span className="text-xs bg-[#6366F1]/20 text-[#818CF8] px-2 py-1 rounded">Owner</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
