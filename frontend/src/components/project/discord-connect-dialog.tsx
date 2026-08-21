"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
  Hash,
  Copy,
  CheckCircle2,
  HelpCircle,
  Unlink,
} from "lucide-react";
import { DiscordIcon } from "@/components/shared/discord-icon";
import { api } from "@/lib/api";

interface DiscordConnectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  currentGuildId?: string;
  onSuccess: () => void;
}

export function DiscordConnectDialog({
  isOpen,
  onClose,
  projectId,
  currentGuildId = "",
  onSuccess,
}: DiscordConnectDialogProps) {
  const [guildId, setGuildId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedBotLink, setCopiedBotLink] = useState(false);

  // Default bot invite permissions (Read Messages, Send Messages, Read History, Embed Links)
  const botInviteUrl = "https://discord.com/oauth2/authorize?permissions=68608&scope=bot%20applications.commands";

  useEffect(() => {
    if (isOpen) {
      setGuildId(currentGuildId || "");
      setError("");
      setSuccessMsg("");
    }
  }, [isOpen, currentGuildId]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildId.trim()) {
      setError("Please enter a valid Discord Server ID (Guild ID).");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      await api.put(`/projects/${projectId}`, {
        discord_guild_id: guildId.trim(),
      });
      setSuccessMsg("Discord server linked successfully!");
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to link Discord server.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Discord from this project?")) return;
    setIsSaving(true);
    setError("");

    try {
      await api.put(`/projects/${projectId}`, {
        discord_guild_id: "",
      });
      setGuildId("");
      setSuccessMsg("Discord disconnected.");
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to disconnect Discord.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyBotInvite = () => {
    navigator.clipboard.writeText(botInviteUrl);
    setCopiedBotLink(true);
    setTimeout(() => setCopiedBotLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="surface relative z-10 w-full max-w-lg p-6 rounded-xl border border-[#262626] bg-[#0c0c0c] shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5865F2]/10 border border-[#5865F2]/20 flex items-center justify-center text-[#5865F2]">
              <DiscordIcon size={18} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#fafafa] tracking-tight">
                Connect Discord Server
              </h2>
              <p className="text-[12px] text-[#737373]">
                Capture team discussions and architectural decisions directly into memory.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#525252] hover:text-[#a3a3a3] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-4 py-4">
          {/* Step 1 */}
          <div className="p-3.5 rounded-lg bg-[#141414] border border-[#222]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5865F2] font-mono">
                  Step 1
                </span>
                <h3 className="text-[13px] font-medium text-[#fafafa] mt-0.5">
                  Invite Bot to your Server
                </h3>
                <p className="text-[12px] text-[#737373] mt-0.5">
                  Make sure your Discord bot is added to your server with message reading permissions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <a
                href={botInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#5865F2] hover:bg-[#4752C4] text-white text-[12px] font-medium transition-colors cursor-pointer"
              >
                <DiscordIcon size={14} />
                Add Bot to Discord
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={copyBotInvite}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#2c2c2c] bg-[#1a1a1a] hover:bg-[#222] text-[11px] text-[#a3a3a3] transition-colors cursor-pointer"
              >
                {copiedBotLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                Copy Invite Link
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <form onSubmit={handleSave} className="p-3.5 rounded-lg bg-[#141414] border border-[#222] space-y-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#10b981] font-mono">
                Step 2
              </span>
              <label className="block text-[13px] font-medium text-[#fafafa] mt-0.5">
                Enter Discord Server ID (Guild ID)
              </label>
              <p className="text-[12px] text-[#737373] mt-0.5">
                Right-click your server name in Discord and select <strong className="text-[#a3a3a3]">&quot;Copy Server ID&quot;</strong>.
              </p>
            </div>

            <div>
              <div className="relative">
                <Hash className="w-4 h-4 text-[#525252] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                  placeholder="e.g. 1048293758291038291"
                  className="forge-input w-full pl-9 pr-3 py-2 text-[13px] font-mono"
                  required
                />
              </div>
              <p className="text-[11px] text-[#525252] mt-1.5 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 shrink-0" />
                Don&apos;t see &quot;Copy Server ID&quot;? Enable Developer Mode in Discord: Settings &gt; Advanced &gt; Developer Mode.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-1.5 p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#1f1f1f]">
              {currentGuildId ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                >
                  <Unlink className="w-3 h-3" />
                  Disconnect Server
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-md border border-[#262626] text-[#737373] text-[12px] hover:text-[#a3a3a3] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !guildId.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#10b981] hover:bg-[#059669] text-white text-[12px] font-medium transition-colors disabled:opacity-40 cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {currentGuildId ? "Update Connection" : "Connect Discord"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
