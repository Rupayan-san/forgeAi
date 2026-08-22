"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Filter,
  List,
  Clock,
  Users,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { getSourceConfig } from "@/lib/sourceTypes";
import { Decision, DecisionStatus } from "@/types";

export default function DecisionsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractMessage, setExtractMessage] = useState("");
  const [isDetectingConflicts, setIsDetectingConflicts] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"timeline" | "table">("timeline");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const fetchDecisions = useCallback(async () => {
    try {
      const data = await api.get<Decision[]>(
        `/projects/${projectId}/decisions`
      );
      setDecisions(data || []);
    } catch (err) {
      console.error("Failed to load decisions", err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let isMounted = true;
    if (projectId) {
      api.get<Decision[]>(`/projects/${projectId}/decisions`)
        .then((data) => {
          if (isMounted) {
            setDecisions(data || []);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error("Failed to load decisions", err);
            setIsLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const handleExtract = async () => {
    setIsExtracting(true);
    setExtractMessage("");
    try {
      const result = await api.post<{ message: string; count: number }>(
        `/projects/${projectId}/decisions/extract`
      );
      setExtractMessage(result.message || "Decisions extracted and reconciled");
      await fetchDecisions();
    } catch (err) {
      console.error(err);
      setExtractMessage("Failed to extract decisions.");
    } finally {
      setIsExtracting(false);
      setTimeout(() => setExtractMessage(""), 5000);
    }
  };

  const handleDetectConflicts = async () => {
    setIsDetectingConflicts(true);
    setConflictMessage("");
    try {
      const result = await api.post<{ message: string; count: number }>(
        `/projects/${projectId}/decisions/detect-conflicts`
      );
      setConflictMessage(result.message || "Conflict detection complete");
      await fetchDecisions();
    } catch (err) {
      console.error(err);
      setConflictMessage("Failed to detect conflicts.");
    } finally {
      setIsDetectingConflicts(false);
      setTimeout(() => setConflictMessage(""), 5000);
    }
  };

  const handleStatusUpdate = async (decisionId: string, newStatus: DecisionStatus) => {
    setIsUpdatingStatus(decisionId);
    try {
      await api.put(`/projects/${projectId}/decisions/${decisionId}/status`, {
        status: newStatus,
      });
      await fetchDecisions();
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Status counts
  const activeCount = decisions.filter((d) => (d.status || "ACTIVE") === "ACTIVE").length;
  const conflictCount = decisions.filter((d) => d.status === "CONFLICTED").length;
  const supersededCount = decisions.filter((d) => d.status === "SUPERSEDED").length;

  const filtered = decisions.filter((d) => {
    // 1. Status Filter
    const currentStatus = d.status || "ACTIVE";
    if (statusFilter !== "ALL" && currentStatus !== statusFilter) {
      return false;
    }

    // 2. Source Filter
    if (sourceFilter === "all") return true;
    const norm = (d.source_type || "").toLowerCase();
    if (sourceFilter === "github") return norm.includes("github") || norm.includes("file") || norm.includes("pr") || norm.includes("commit");
    if (sourceFilter === "discord") return norm.includes("discord");
    if (sourceFilter === "chat") return norm.includes("chat");
    return norm === sourceFilter;
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#fafafa] tracking-tight flex items-center gap-2.5">
            Decision Intelligence
            <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Step 5
            </span>
          </h1>
          <p className="text-[#737373] text-[13px] mt-1">
            Structured architectural & product decisions with automatic deduplication, supersession, and conflict resolution.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {extractMessage && (
            <span className="text-[12px] text-emerald-400 font-mono animate-pulse">
              {extractMessage}
            </span>
          )}

          {conflictMessage && (
            <span className="text-[12px] text-amber-400 font-mono animate-pulse">
              {conflictMessage}
            </span>
          )}

          {/* Extract Button */}
          <button
            onClick={handleExtract}
            disabled={isExtracting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-500 transition-colors disabled:opacity-40 cursor-pointer shadow-sm"
          >
            {isExtracting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
            )}
            Extract Decisions
          </button>

          {/* Detect Conflicts Button */}
          <button
            onClick={handleDetectConflicts}
            disabled={isDetectingConflicts || decisions.length < 2}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#262626] bg-[#141414] text-[#fafafa] text-[13px] font-medium hover:bg-[#1f1f1f] transition-colors disabled:opacity-40 cursor-pointer"
            title={decisions.length < 2 ? "Need at least 2 decisions" : "Scan for contradicting decisions"}
          >
            {isDetectingConflicts ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" strokeWidth={2} />
            )}
            Scan Conflicts
          </button>

          {/* View toggle */}
          <div className="flex items-center rounded-md border border-[#262626] bg-[#111111] overflow-hidden">
            <button
              onClick={() => setView("timeline")}
              title="Timeline view"
              className={`px-2.5 py-1.5 text-[12px] transition-colors cursor-pointer ${
                view === "timeline"
                  ? "bg-[#222222] text-[#fafafa]"
                  : "text-[#737373] hover:text-[#fafafa]"
              }`}
            >
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setView("table")}
              title="Table view"
              className={`px-2.5 py-1.5 text-[12px] transition-colors cursor-pointer ${
                view === "table"
                  ? "bg-[#222222] text-[#fafafa]"
                  : "text-[#737373] hover:text-[#fafafa]"
              }`}
            >
              <List className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Source Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-[#111111] p-1 rounded-lg border border-[#222222]">
          {[
            { key: "ALL", label: "All Decisions", count: decisions.length },
            { key: "ACTIVE", label: "Active", count: activeCount, color: "text-emerald-400" },
            { key: "CONFLICTED", label: "Conflicted", count: conflictCount, color: "text-red-400" },
            { key: "SUPERSEDED", label: "Superseded", count: supersededCount, color: "text-zinc-400" },
          ].map(({ key, label, count, color }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
                statusFilter === key
                  ? "bg-[#222222] text-[#fafafa] shadow-sm"
                  : "text-[#737373] hover:text-[#fafafa]"
              }`}
            >
              <span>{label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === key
                    ? "bg-[#333333] text-[#fafafa]"
                    : "bg-[#181818] text-[#555555]"
                } ${color || ""}`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Source Dropdown / Buttons */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#525252]" strokeWidth={1.5} />
          {[
            { key: "all", label: "All Sources" },
            { key: "github", label: "GitHub" },
            { key: "discord", label: "Discord" },
            { key: "chat", label: "Project Chat" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSourceFilter(key)}
              className={`px-2.5 py-1 rounded-md text-[12px] transition-colors cursor-pointer ${
                sourceFilter === key
                  ? "bg-[#222222] text-[#fafafa] border border-[#333333]"
                  : "text-[#737373] hover:text-[#fafafa] border border-transparent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" strokeWidth={2} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface p-12 text-center border border-[#222222] rounded-xl">
          <FileText className="w-10 h-10 text-[#525252] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-[15px] font-semibold text-[#fafafa] mb-1">No decisions match filter</h3>
          <p className="text-[#737373] text-[13px] max-w-md mx-auto mb-5">
            Extract decisions from your repository code, discussions, and chat messages into structured project memory.
          </p>
          <button
            onClick={handleExtract}
            disabled={isExtracting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[13px] font-medium rounded-lg hover:bg-emerald-500 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" strokeWidth={2} />
            Extract Decisions Now
          </button>
        </div>
      ) : view === "timeline" ? (
        /* Timeline view */
        <div className="space-y-4">
          {filtered.map((decision, i) => {
            const config = getSourceConfig(decision.source_type);
            const Icon = config.icon;
            const confidence = decision.confidence_score !== undefined ? decision.confidence_score : 0.9;
            const confidencePct = Math.round(confidence * 100);
            const isExpanded = expandedIds.has(decision.decision_id);
            const alternatives = decision.alternatives_considered || [];
            const participants = decision.participants || [];
            const status = decision.status || "ACTIVE";

            return (
              <div
                key={decision.decision_id || i}
                className={`surface p-5 rounded-xl border transition-all ${
                  status === "CONFLICTED"
                    ? "border-red-500/30 bg-red-950/5"
                    : status === "SUPERSEDED"
                    ? "border-zinc-800/80 opacity-75"
                    : "border-[#222222] hover:border-[#333333]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon indicator */}
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        status === "CONFLICTED"
                          ? "bg-red-500/10 text-red-400"
                          : status === "SUPERSEDED"
                          ? "bg-zinc-800 text-zinc-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                            status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                              : status === "CONFLICTED"
                              ? "bg-red-500/10 text-red-400 border border-red-500/25"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}
                        >
                          {status === "ACTIVE" && <CheckCircle2 className="w-3 h-3" strokeWidth={2} />}
                          {status === "CONFLICTED" && <AlertTriangle className="w-3 h-3" strokeWidth={2} />}
                          {status === "SUPERSEDED" && <GitBranch className="w-3 h-3" strokeWidth={2} />}
                          {status}
                        </span>

                        <h3 className="text-[15px] font-semibold text-[#fafafa] leading-snug">
                          {decision.decision_text}
                        </h3>
                      </div>

                      <button
                        onClick={() => toggleExpand(decision.decision_id)}
                        className="text-[#737373] hover:text-[#fafafa] transition-colors p-1 rounded cursor-pointer shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
                        ) : (
                          <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                        )}
                      </button>
                    </div>

                    <p className="text-[13px] text-[#a3a3a3] leading-relaxed mb-3">
                      {decision.reasoning}
                    </p>

                    {/* Supersedes / Superseded by banner */}
                    {decision.supersedes && (
                      <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-[12px] text-emerald-300 flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          <strong>Supersedes older decision:</strong> (ID: {decision.supersedes.slice(0, 8)}...)
                        </span>
                      </div>
                    )}

                    {decision.superseded_by && (
                      <div className="mb-3 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700/50 text-[12px] text-zinc-400 flex items-center gap-2">
                        <GitBranch className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          <strong>Superseded by newer decision:</strong> (ID: {decision.superseded_by.slice(0, 8)}...)
                        </span>
                      </div>
                    )}

                    {/* Conflict Explanation Block */}
                    {decision.conflicts && decision.conflicts.length > 0 && (
                      <div className="mb-3 p-3 rounded-lg bg-red-950/20 border border-red-500/25 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-red-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
                            Conflicting with {decision.conflicts.length} decision{decision.conflicts.length !== 1 ? "s" : ""}
                          </p>

                          {status === "CONFLICTED" && (
                            <button
                              onClick={() => handleStatusUpdate(decision.decision_id, "ACTIVE")}
                              disabled={isUpdatingStatus === decision.decision_id}
                              className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              Resolve to Active
                            </button>
                          )}
                        </div>

                        {decision.conflicts.map((c, idx) => (
                          <div key={idx} className="text-[12px] text-[#d4d4d4] bg-black/30 p-2 rounded border border-red-500/10">
                            <span className="text-red-400 font-medium">
                              {c.relationship === "conflict" ? "Conflict" : c.relationship}:
                            </span>{" "}
                            &ldquo;{c.other_decision_text}&rdquo;
                            {c.explanation && (
                              <p className="text-[11px] text-[#888888] mt-0.5">
                                Reason: {c.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Alternatives considered */}
                    {alternatives.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[11px] text-[#737373] uppercase tracking-wider font-medium mb-1">
                          Alternatives considered
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {alternatives.map((alt, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-[#161616] border border-[#262626] text-[12px] text-[#a3a3a3]"
                            >
                              {alt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meta Row */}
                    <div className="flex items-center gap-4 flex-wrap pt-3 border-t border-[#222222]">
                      <span className="forge-badge forge-badge-neutral text-[11px]">
                        <Icon className="w-3 h-3" strokeWidth={2} />
                        {config.label} #{decision.source_id}
                      </span>

                      {participants.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[12px] text-[#737373]">
                          <Users className="w-3 h-3 text-[#525252]" strokeWidth={2} />
                          <span>{participants.join(", ")}</span>
                        </div>
                      )}

                      {decision.timestamp && (
                        <span className="text-[11px] text-[#525252]" suppressHydrationWarning>
                          {new Date(decision.timestamp).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}

                      {/* Confidence Meter */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <div className="w-12 h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${confidencePct}%`,
                              background: confidencePct > 85 ? "#10b981" : confidencePct > 70 ? "#f59e0b" : "#ef4444",
                            }}
                          />
                        </div>
                        <span className="text-[11px] text-[#737373] font-mono">{confidencePct}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table view */
        <div className="surface overflow-hidden rounded-xl border border-[#222222]">
          <div className="overflow-x-auto">
            <table className="forge-table">
              <thead>
                <tr>
                  <th className="min-w-[280px]">Decision</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Participants</th>
                  <th>Confidence</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((decision, i) => {
                  const config = getSourceConfig(decision.source_type);
                  const Icon = config.icon;
                  const confidence = decision.confidence_score !== undefined ? decision.confidence_score : 0.9;
                  const confidencePct = Math.round(confidence * 100);
                  const participants = decision.participants || [];
                  const status = decision.status || "ACTIVE";

                  return (
                    <tr key={decision.decision_id || i} className="hover:bg-[#141414] transition-colors">
                      <td>
                        <span className="text-[#fafafa] text-[13px] font-medium block">
                          {decision.decision_text}
                        </span>
                        {decision.reasoning && (
                          <span className="text-[#737373] text-[11px] line-clamp-1 mt-0.5">
                            {decision.reasoning}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                              : status === "CONFLICTED"
                              ? "bg-red-500/10 text-red-400 border border-red-500/25"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td>
                        <span className="forge-badge forge-badge-neutral text-[11px]">
                          <Icon className="w-3 h-3" strokeWidth={2} />
                          {config.label}
                        </span>
                      </td>
                      <td>
                        <span className="text-[12px] text-[#737373]">
                          {participants.length > 0 ? participants.join(", ") : "—"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div className="w-10 h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${confidencePct}%`,
                                background: confidencePct > 85 ? "#10b981" : confidencePct > 70 ? "#f59e0b" : "#ef4444",
                              }}
                            />
                          </div>
                          <span className="text-[11px] text-[#737373] font-mono">{confidencePct}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-[12px] text-[#737373]" suppressHydrationWarning>
                          {decision.timestamp
                            ? new Date(decision.timestamp).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
