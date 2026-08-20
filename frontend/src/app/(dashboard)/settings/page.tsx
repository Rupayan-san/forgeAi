"use client";

import {
  Settings,
  User,
  Key,
  Shield,
  Bell,
  ExternalLink,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Hash,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";
import { useAuthStore } from "@/store/use-auth-store";
import { useState } from "react";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [showApiKey, setShowApiKey] = useState(false);
  const mockApiKey = "forge_sk_a3f2d1e4b5c6d7e8f9...";

  return (
    <div className="p-6 lg:p-8 max-w-[800px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">Settings</h1>
        <p className="text-[#525252] text-[13px] mt-0.5">
          Manage your account and integrations
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile section */}
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
                  className="w-14 h-14 rounded-lg"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-[#171717]" />
              )}
              <div>
                <p className="text-[15px] font-medium text-[#fafafa]">
                  {user?.name || "—"}
                </p>
                <p className="text-[13px] text-[#525252]">@{user?.github_username || "—"}</p>
                <p className="text-[12px] text-[#404040] mt-0.5">{user?.email || "No email"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Integrations section */}
        <div className="surface overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1a1a1a]">
            <h2 className="text-[13px] font-medium text-[#a3a3a3] flex items-center gap-2">
              <Key className="w-3.5 h-3.5" strokeWidth={1.5} />
              Integrations
            </h2>
          </div>
          <div className="divide-y divide-[#0f0f0f]">
            {/* GitHub */}
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-[#111111] border border-[#1a1a1a] flex items-center justify-center">
                  <GithubIcon className="w-4 h-4 text-[#a3a3a3]" size={16} />
                </div>
                <div>
                  <p className="text-[13px] text-[#fafafa] font-medium">GitHub</p>
                  <p className="text-[11px] text-[#525252]">Repository access and webhook ingestion</p>
                </div>
              </div>
              <span className="forge-badge forge-badge-success">
                <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                Connected
              </span>
            </div>
            {/* Discord */}
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-[#111111] border border-[#1a1a1a] flex items-center justify-center">
                  <Hash className="w-4 h-4 text-[#a3a3a3]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[13px] text-[#fafafa] font-medium">Discord</p>
                  <p className="text-[11px] text-[#525252]">Bot for channel message ingestion</p>
                </div>
              </div>
              <span className="forge-badge forge-badge-neutral">
                <Circle className="w-3 h-3" strokeWidth={2} />
                Not connected
              </span>
            </div>
            {/* Agora */}
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-[#111111] border border-[#1a1a1a] flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#a3a3a3]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] text-[#fafafa] font-medium">Agora RTC</p>
                  <p className="text-[11px] text-[#525252]">Voice AI conversational interface</p>
                </div>
              </div>
              <span className="forge-badge forge-badge-neutral">
                <Circle className="w-3 h-3" strokeWidth={2} />
                Not configured
              </span>
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
              Use this key to access the Forge API programmatically.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 forge-input px-3 py-2 text-[12px] font-mono flex items-center">
                {showApiKey ? mockApiKey : "forge_sk_•••••••••••••••••"}
              </div>
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="w-8 h-8 rounded-md flex items-center justify-center text-[#525252] hover:text-[#737373] hover:bg-[#111111] transition-colors cursor-pointer"
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />}
              </button>
              <button
                className="w-8 h-8 rounded-md flex items-center justify-center text-[#525252] hover:text-[#737373] hover:bg-[#111111] transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="surface overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1a1a1a]">
            <h2 className="text-[13px] font-medium text-[#a3a3a3] flex items-center gap-2">
              <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
              Notifications
            </h2>
          </div>
          <div className="divide-y divide-[#0f0f0f]">
            {[
              { label: "Ingestion completed", description: "When GitHub or Discord backfill finishes", enabled: true },
              { label: "New decisions extracted", description: "When AI finds new architectural decisions", enabled: true },
              { label: "Weekly summary", description: "A weekly digest of project activity", enabled: false },
            ].map((pref) => (
              <div key={pref.label} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-[#fafafa]">{pref.label}</p>
                  <p className="text-[11px] text-[#525252]">{pref.description}</p>
                </div>
                <div
                  className={`w-8 h-[18px] rounded-full relative cursor-pointer transition-colors ${
                    pref.enabled ? "bg-[#10b981]" : "bg-[#262626]"
                  }`}
                >
                  <div
                    className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${
                      pref.enabled ? "left-[18px]" : "left-[2px]"
                    }`}
                  />
                </div>
              </div>
            ))}
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
                  Permanently delete your account and all project data
                </p>
              </div>
              <button className="px-3 py-1.5 rounded-md border border-[rgba(239,68,68,0.3)] text-[#ef4444] text-[12px] font-medium hover:bg-[rgba(239,68,68,0.08)] transition-colors cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
