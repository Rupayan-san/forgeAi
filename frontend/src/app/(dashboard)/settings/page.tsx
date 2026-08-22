"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Shield,
  AlertTriangle,
  ExternalLink,
  Bot,
  Sparkles,
  Trash2,
} from "lucide-react";
import { DiscordIcon } from "@/components/shared/discord-icon";
import { useProjectStore } from "@/store/use-project-store";
import { useAuthStore } from "@/store/use-auth-store";
import { api } from "@/lib/api";
import { MemberDetail, ProjectAIConfig } from "@/types";

type JoinRequest = {
  request_id: string;
  user_id: string;
  user_name: string;
  github_username: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const currentProject = useProjectStore((state) => state.currentProject);
  const projects = useProjectStore((state) => state.projects);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);
  const fetchProject = useProjectStore((state) => state.fetchProject);
  const updateProjectSettings = useProjectStore((state) => state.updateProjectSettings);
  const updateAIConfig = useProjectStore((state) => state.updateAIConfig);
  const updateMemberRole = useProjectStore((state) => state.updateMemberRole);
  const removeMember = useProjectStore((state) => state.removeMember);
  const inviteMember = useProjectStore((state) => state.inviteMember);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<"general" | "ai" | "team" | "account">("general");

  // Track project ID for state sync
  const [syncedProjectId, setSyncedProjectId] = useState<string | null>(null);

  // General Project form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [discordGuildId, setDiscordGuildId] = useState("");
  const [maxMembers, setMaxMembers] = useState(10);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalMessage, setGeneralMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // AI Persona form
  const [aiName, setAiName] = useState("Forge");
  const [aiRole, setAiRole] = useState("Project Assistant");
  const [aiInvocationPhrase, setAiInvocationPhrase] = useState("Forge");
  const [isSavingAI, setIsSavingAI] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Team state
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [inviteUsername, setInviteUsername] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  // Account / API Key
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const mockApiKey = "forge_sk_a3f2d1e4b5c6d7e8f921";

  // Danger Zone: Delete Project
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  // Sync form inputs when current project changes during render
  if (currentProject && currentProject.project_id !== syncedProjectId) {
    setSyncedProjectId(currentProject.project_id);
    setName(currentProject.name || "");
    setDescription(currentProject.description || "");
    setGithubRepoUrl(currentProject.github_repo_url || "");
    setDiscordGuildId(currentProject.discord_guild_id || "");
    setMaxMembers(currentProject.max_members || 10);

    const ai = currentProject.ai_config || {
      name: "Forge",
      role: "Project Assistant",
      invocation_phrase: "Forge",
    };
    setAiName(ai.name || "Forge");
    setAiRole(ai.role || "Project Assistant");
    setAiInvocationPhrase(ai.invocation_phrase || "Forge");
  }

  // Auto-fetch projects on load
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!currentProject && projects.length > 0) {
      setCurrentProject(projects[0]);
    }
  }, [currentProject, projects, setCurrentProject]);

  const isOwner =
    currentProject?.user_role === "owner" ||
    user?.user_id === currentProject?.owner_id ||
    (currentProject?.member_roles && user?.user_id && currentProject.member_roles[user.user_id] === "owner");

  // Fetch pending requests if owner
  useEffect(() => {
    if (currentProject && isOwner && activeTab === "team") {
      api
        .get<JoinRequest[]>(`/projects/${currentProject.project_id}/join/requests`)
        .then(setPendingRequests)
        .catch(console.error);
    }
  }, [currentProject, isOwner, activeTab]);

  // Save General Settings
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    setIsSavingGeneral(true);
    setGeneralMessage(null);

    try {
      await updateProjectSettings(currentProject.project_id, {
        name: name.trim(),
        description: description.trim(),
        github_repo_url: githubRepoUrl.trim(),
        discord_guild_id: discordGuildId.trim(),
        max_members: Number(maxMembers),
      });
      setGeneralMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (err: unknown) {
      console.error(err);
      setGeneralMessage({ type: "error", text: (err as Error).message || "Failed to save settings." });
    } finally {
      setIsSavingGeneral(false);
      setTimeout(() => setGeneralMessage(null), 4000);
    }
  };

  // Save AI Persona Configuration
  const handleSaveAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;

    if (!aiName.trim() || !aiRole.trim() || !aiInvocationPhrase.trim()) {
      setAiMessage({ type: "error", text: "All AI persona fields are required." });
      return;
    }

    setIsSavingAI(true);
    setAiMessage(null);

    try {
      const config: ProjectAIConfig = {
        name: aiName.trim(),
        role: aiRole.trim(),
        invocation_phrase: aiInvocationPhrase.trim(),
      };
      await updateAIConfig(currentProject.project_id, config);
      setAiMessage({ type: "success", text: "AI persona configuration updated!" });
    } catch (err: unknown) {
      console.error(err);
      setAiMessage({ type: "error", text: (err as Error).message || "Failed to update AI configuration." });
    } finally {
      setIsSavingAI(false);
      setTimeout(() => setAiMessage(null), 4000);
    }
  };

  // Invite Member
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !inviteUsername.trim()) return;

    setIsInviting(true);
    setInviteMessage(null);
    try {
      await inviteMember(currentProject.project_id, inviteUsername.trim());
      setInviteMessage({ type: "success", text: `Invited @${inviteUsername.trim()} successfully!` });
      setInviteUsername("");
    } catch (err: unknown) {
      setInviteMessage({ type: "error", text: (err as Error).message || "Failed to invite member" });
    } finally {
      setIsInviting(false);
      setTimeout(() => setInviteMessage(null), 4000);
    }
  };

  // Change Member Role
  const handleRoleChange = async (member: MemberDetail, newRole: "owner" | "member") => {
    if (!currentProject || member.role === newRole) return;
    setChangingRoleId(member.user_id);
    try {
      await updateMemberRole(currentProject.project_id, member.user_id, newRole);
    } catch (err: unknown) {
      console.error(err);
      alert((err as Error).message || "Failed to update member role");
    } finally {
      setChangingRoleId(null);
    }
  };

  // Remove Member
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!currentProject) return;
    if (!confirm(`Are you sure you want to remove ${memberName} from this project?`)) return;
    try {
      await removeMember(currentProject.project_id, memberId);
    } catch (err: unknown) {
      console.error(err);
      alert((err as Error).message || "Failed to remove member");
    }
  };

  // Approve / Reject Join Request
  const handleRequestAction = async (userId: string, action: "approve" | "reject") => {
    if (!currentProject) return;
    try {
      await api.post(`/projects/${currentProject.project_id}/join/requests/${userId}/${action}`);
      setPendingRequests((prev) => prev.filter((r) => r.user_id !== userId && r.request_id !== userId));
      if (action === "approve") {
        await fetchProject(currentProject.project_id, true);
      }
    } catch (err: unknown) {
      console.error(err);
      alert((err as Error).message || `Failed to ${action} request`);
    }
  };

  // Delete Project
  const handleDeleteProject = async () => {
    if (!currentProject) return;
    if (deleteConfirmName !== currentProject.name) {
      alert("Project name does not match confirmation.");
      return;
    }

    setIsDeletingProject(true);
    try {
      await deleteProject(currentProject.project_id);
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Failed to delete project:", err);
      alert((err as Error).message || "Failed to delete project.");
      setIsDeletingProject(false);
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
    <div className="p-6 lg:p-8 max-w-[920px]">
      {/* Header & Project Selector */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">Project Settings</h1>
          <p className="text-[#737373] text-[13px] mt-0.5">
            Configure workspace settings, AI persona, team permissions, and credentials
          </p>
        </div>
        {projects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#737373]">Workspace:</span>
            <select
              value={currentProject?.project_id || ""}
              onChange={(e) => {
                const found = projects.find((p) => p.project_id === e.target.value);
                if (found) setCurrentProject(found);
              }}
              className="forge-input px-3 py-1.5 text-[12px] bg-[#141414] border border-[#262626] rounded-md text-[#fafafa]"
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
      <div className="flex gap-2 border-b border-[#1a1a1a] mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-3 px-3 text-[13px] font-medium transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "general"
              ? "border-[#10b981] text-[#fafafa]"
              : "border-transparent text-[#525252] hover:text-[#a3a3a3]"
          }`}
        >
          <SettingsIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
          General Settings
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`pb-3 px-3 text-[13px] font-medium transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "ai"
              ? "border-[#10b981] text-[#fafafa]"
              : "border-transparent text-[#525252] hover:text-[#a3a3a3]"
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-[#10b981]" strokeWidth={1.5} />
          AI Persona & Identity
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`pb-3 px-3 text-[13px] font-medium transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "team"
              ? "border-[#10b981] text-[#fafafa]"
              : "border-transparent text-[#525252] hover:text-[#a3a3a3]"
          }`}
        >
          <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
          Team & Permissions
          {currentProject?.join_requests && currentProject.join_requests.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("account")}
          className={`pb-3 px-3 text-[13px] font-medium transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === "account"
              ? "border-[#10b981] text-[#fafafa]"
              : "border-transparent text-[#525252] hover:text-[#a3a3a3]"
          }`}
        >
          <User className="w-3.5 h-3.5" strokeWidth={1.5} />
          Account & Danger Zone
        </button>
      </div>

      {/* Tab 1: General Settings */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveGeneral} className="space-y-6">
          {!isOwner && (
            <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] text-[#737373] text-[12px] flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <span>You are viewing settings as a Member. Only Owners can update project metadata and connected sources.</span>
            </div>
          )}

          <div className="surface p-5 space-y-4">
            <h2 className="text-[13px] font-medium text-[#a3a3a3] border-b border-[#1a1a1a] pb-3">
              Project Information
            </h2>

            <div className="space-y-1.5">
              <label className="block text-[12px] text-[#737373] font-medium">Project Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isOwner}
                className="forge-input w-full px-3 py-2 text-[13px] disabled:opacity-50"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] text-[#737373] font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isOwner}
                placeholder="What is your team building in this project?"
                className="forge-input w-full px-3 py-2 text-[13px] min-h-[80px] disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] text-[#737373] font-medium">Maximum Members Allowed</label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxMembers}
                onChange={(e) => setMaxMembers(Math.max(1, Number(e.target.value)))}
                disabled={!isOwner}
                className="forge-input w-full px-3 py-2 text-[13px] disabled:opacity-50"
              />
              <p className="text-[11px] text-[#525252]">Allowed between 1 and 100 members.</p>
            </div>
          </div>

          <div className="surface p-5 space-y-4">
            <h2 className="text-[13px] font-medium text-[#a3a3a3] border-b border-[#1a1a1a] pb-3">
              Connected Sources
            </h2>

            <div className="space-y-1.5">
              <label className="block text-[12px] text-[#737373] font-medium">GitHub Repository URL</label>
              <input
                type="url"
                value={githubRepoUrl}
                onChange={(e) => setGithubRepoUrl(e.target.value)}
                disabled={!isOwner}
                placeholder="https://github.com/owner/repo"
                className="forge-input w-full px-3 py-2 text-[13px] disabled:opacity-50"
              />
              <p className="text-[11px] text-[#525252]">
                Repository code and commit history are indexed into vector memory.
              </p>
            </div>

            <div className="space-y-2 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between">
                <label className="block text-[12px] text-[#737373] font-medium flex items-center gap-1.5">
                  <DiscordIcon size={14} className="text-[#5865F2]" />
                  Discord Server ID (Guild ID)
                </label>
                <a
                  href="https://discord.com/oauth2/authorize?permissions=68608&scope=bot%20applications.commands"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#5865F2] hover:text-[#7983f5] transition-colors"
                >
                  Invite Bot to Server
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="text"
                value={discordGuildId}
                onChange={(e) => setDiscordGuildId(e.target.value)}
                disabled={!isOwner}
                placeholder="e.g. 123456789012345678"
                className="forge-input w-full px-3 py-2 text-[13px] font-mono disabled:opacity-50"
              />
            </div>
          </div>

          {isOwner && (
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSavingGeneral}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#10b981] hover:bg-[#059669] text-white text-[13px] font-medium transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isSavingGeneral ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
                ) : (
                  <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
                )}
                Save General Settings
              </button>

              {generalMessage && (
                <span
                  className={`text-[12px] font-medium ${
                    generalMessage.type === "error" ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {generalMessage.text}
                </span>
              )}
            </div>
          )}
        </form>
      )}

      {/* Tab 2: AI Persona & Identity */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          {!isOwner && (
            <div className="p-3 rounded-lg bg-[#141414] border border-[#262626] text-[#737373] text-[12px] flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <span>You are viewing AI configuration as a Member. Only Owners can customize the Project AI Persona.</span>
            </div>
          )}

          {/* AI Interactive Persona Preview */}
          <div className="surface p-5 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-[#0d0d0d] to-[#0a0a0a] rounded-xl">
            <div className="flex items-center justify-between mb-3 border-b border-[#222] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-[#10b981] flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold text-[#fafafa]">AI Persona Identity Preview</h2>
                  <p className="text-[11px] text-[#737373]">How your AI identifies across Q&A, meetings, and group chat</p>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Live Preview
              </span>
            </div>

            <div className="p-4 rounded-lg bg-[#080808] border border-[#1a1a1a] space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#fafafa]">{aiName || "Forge"}</span>
                <span className="text-[11px] text-[#10b981] bg-[rgba(16,185,129,0.1)] px-1.5 py-0.25 rounded font-mono">
                  @{aiInvocationPhrase || "Forge"}
                </span>
                <span className="text-[11px] text-[#737373]">· {aiRole || "Project Assistant"}</span>
              </div>
              <p className="text-[12px] text-[#a3a3a3] leading-relaxed">
                &ldquo;Hello team! I am <strong className="text-[#fafafa]">{aiName || "Forge"}</strong>, your{" "}
                <span className="text-emerald-400 font-medium">{aiRole || "Project Assistant"}</span>. You can invoke me anytime
                by typing <code className="text-[#10b981] font-mono">@{aiInvocationPhrase || "Forge"}</code> in chat or speaking during
                voice meetings.&rdquo;
              </p>
            </div>
          </div>

          {/* AI Settings Form */}
          <form onSubmit={handleSaveAI} className="surface p-5 space-y-4">
            <h2 className="text-[13px] font-medium text-[#a3a3a3] border-b border-[#1a1a1a] pb-3">
              Configure Persona
            </h2>

            <div className="space-y-1.5">
              <label className="block text-[12px] text-[#737373] font-medium">AI Display Name *</label>
              <input
                type="text"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                disabled={!isOwner}
                placeholder="e.g. Atlas, Forge, Hermes, Jarvis"
                className="forge-input w-full px-3 py-2 text-[13px] disabled:opacity-50"
                required
              />
              <p className="text-[11px] text-[#525252]">The conversational name your AI assistant will respond as.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] text-[#737373] font-medium">AI Role / Persona *</label>
              <input
                type="text"
                value={aiRole}
                onChange={(e) => setAiRole(e.target.value)}
                disabled={!isOwner}
                placeholder="e.g. Senior Software Architect, Security Lead, Project Assistant"
                className="forge-input w-full px-3 py-2 text-[13px] disabled:opacity-50"
                required
              />
              <p className="text-[11px] text-[#525252]">Defines the tone, depth, and domain expertise of the AI.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12px] text-[#737373] font-medium">Invocation Phrase *</label>
              <input
                type="text"
                value={aiInvocationPhrase}
                onChange={(e) => setAiInvocationPhrase(e.target.value)}
                disabled={!isOwner}
                placeholder="e.g. Atlas, Forge, Assistant"
                className="forge-input w-full px-3 py-2 text-[13px] font-mono disabled:opacity-50"
                required
              />
              <p className="text-[11px] text-[#525252]">The keyword or handle teammates will use to invoke this assistant.</p>
            </div>

            {isOwner && (
              <div className="pt-3 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSavingAI}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#10b981] hover:bg-[#059669] text-white text-[13px] font-medium transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {isSavingAI ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                  Save AI Persona
                </button>

                {aiMessage && (
                  <span
                    className={`text-[12px] font-medium ${
                      aiMessage.type === "error" ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {aiMessage.text}
                  </span>
                )}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Tab 3: Team Management */}
      {activeTab === "team" && (
        <div className="space-y-6">
          {/* Join Code Card */}
          <div className="surface p-5">
            <h2 className="text-[13px] font-medium text-[#a3a3a3] mb-1.5">Project Join Code</h2>
            <p className="text-[12px] text-[#737373] mb-4">
              Share this 6-character code with your team members to request access.
            </p>
            <div className="flex items-center gap-3 bg-[#0d0d0d] p-3 rounded-lg border border-[#1a1a1a] w-fit">
              <span className="text-2xl font-mono tracking-widest text-[#10b981] font-bold">
                {currentProject?.join_code || "------"}
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

          {/* Pending Join Requests */}
          {isOwner && pendingRequests.length > 0 && (
            <div className="surface p-5 border border-amber-500/30 bg-amber-500/5 rounded-xl">
              <h2 className="text-[13px] font-medium text-[#fafafa] mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                Pending Join Requests ({pendingRequests.length})
              </h2>
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div
                    key={req.request_id || req.user_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#0e0e0e] border border-[#222]"
                  >
                    <div>
                      <p className="text-[#fafafa] font-medium text-[13px]">{req.user_name}</p>
                      <p className="text-[#737373] text-[11px]">@{req.github_username}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRequestAction(req.user_id || req.request_id, "reject")}
                        className="px-2.5 py-1.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleRequestAction(req.user_id || req.request_id, "approve")}
                        className="px-3 py-1.5 rounded-md bg-[#10b981] hover:bg-[#059669] text-white text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Direct Invite (Owner Only) */}
          {isOwner && (
            <div className="surface p-5">
              <h2 className="text-[13px] font-medium text-[#a3a3a3] mb-3">Direct Invite by GitHub Username</h2>
              <form onSubmit={handleInvite} className="flex flex-col gap-2.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    placeholder="e.g. torvalds"
                    className="forge-input flex-1 px-3 py-2 text-[13px]"
                  />
                  <button
                    type="submit"
                    disabled={isInviting || !inviteUsername.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#10b981] hover:bg-[#059669] text-white text-[13px] font-medium transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {isInviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    Invite
                  </button>
                </div>
                {inviteMessage && (
                  <span
                    className={`text-[12px] ${
                      inviteMessage.type === "error" ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {inviteMessage.text}
                  </span>
                )}
              </form>
            </div>
          )}

          {/* Members List with Role Management */}
          <div className="surface p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-3">
              <h2 className="text-[13px] font-medium text-[#a3a3a3]">
                Project Members ({currentProject?.members?.length || 0} / {currentProject?.max_members || 10})
              </h2>
            </div>

            <div className="space-y-2">
              {currentProject?.member_details?.map((member) => (
                <div
                  key={member.user_id}
                  className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.github_username || ""}
                        className="w-8 h-8 rounded-full shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#171717] border border-[#262626] flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                        {(member.github_username || "??").substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#fafafa] truncate">
                        {member.name || member.github_username}
                      </p>
                      <p className="text-[11px] text-[#737373] truncate">@{member.github_username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isOwner && member.user_id !== currentProject?.owner_id ? (
                      <select
                        value={member.role}
                        disabled={changingRoleId === member.user_id}
                        onChange={(e) => handleRoleChange(member, e.target.value as "owner" | "member")}
                        className="text-[11px] bg-[#141414] border border-[#262626] rounded px-2 py-1 text-[#a3a3a3] hover:text-[#fafafa] cursor-pointer"
                      >
                        <option value="member">Member</option>
                        <option value="owner">Owner</option>
                      </select>
                    ) : (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded font-mono ${
                          member.role === "owner"
                            ? "text-[#10b981] bg-[rgba(16,185,129,0.1)] border border-emerald-500/20"
                            : "text-[#737373] bg-[#141414] border border-[#222]"
                        }`}
                      >
                        {member.role === "owner" ? "Owner" : "Member"}
                      </span>
                    )}

                    {isOwner && member.user_id !== currentProject?.owner_id && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id, member.github_username)}
                        className="p-1 text-[#525252] hover:text-red-400 rounded transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Account & Danger Zone */}
      {activeTab === "account" && (
        <div className="space-y-6">
          {/* Profile */}
          <div className="surface overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a]">
              <h2 className="text-[13px] font-medium text-[#a3a3a3] flex items-center gap-2">
                <User className="w-3.5 h-3.5" strokeWidth={1.5} />
                User Profile
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
                  <p className="text-[14px] font-medium text-[#fafafa]">{user?.name || "—"}</p>
                  <p className="text-[12px] text-[#737373]">@{user?.github_username || "—"}</p>
                  <p className="text-[11px] text-[#525252] mt-0.5">{user?.email || "No email"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* API Key section */}
          <div className="surface overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a]">
              <h2 className="text-[13px] font-medium text-[#a3a3a3] flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
                API Access Token
              </h2>
            </div>
            <div className="p-5">
              <p className="text-[12px] text-[#737373] mb-3">
                Use this API key to interact with Forge REST endpoints programmatically.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 forge-input px-3 py-2 text-[12px] font-mono flex items-center">
                  {showApiKey ? mockApiKey : "forge_sk_••••••••••••••••••••"}
                </div>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="px-3 py-2 rounded-md bg-[#141414] border border-[#262626] text-[#737373] hover:text-[#fafafa] text-[12px] transition-colors cursor-pointer"
                >
                  {showApiKey ? "Hide" : "Reveal"}
                </button>
                <button
                  onClick={copyApiKey}
                  className="px-3 py-2 rounded-md bg-[#141414] border border-[#262626] text-[#737373] hover:text-[#10b981] text-[12px] transition-colors cursor-pointer flex items-center gap-1"
                >
                  {apiKeyCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone: Delete Project (Owner Only) */}
          {isOwner && currentProject && (
            <div className="surface overflow-hidden border-red-500/30 bg-red-950/5">
              <div className="px-5 py-3 border-b border-red-500/20 bg-red-500/5">
                <h2 className="text-[13px] font-semibold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" strokeWidth={1.5} />
                  Danger Zone — Delete Project
                </h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[13px] text-[#fafafa] font-medium">Delete this project</p>
                  <p className="text-[12px] text-[#737373] mt-0.5">
                    Once deleted, all vector memories, chat history, decisions, and settings associated with{" "}
                    <strong className="text-[#fafafa]">{currentProject.name}</strong> will be permanently destroyed.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[12px] text-[#737373]">
                    Please type <strong className="text-red-400 font-mono">{currentProject.name}</strong> to confirm:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={deleteConfirmName}
                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                      placeholder={currentProject.name}
                      className="forge-input flex-1 px-3 py-2 text-[13px] border-red-500/30"
                    />
                    <button
                      onClick={handleDeleteProject}
                      disabled={deleteConfirmName !== currentProject.name || isDeletingProject}
                      className="px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                    >
                      {isDeletingProject ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Delete Project
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
