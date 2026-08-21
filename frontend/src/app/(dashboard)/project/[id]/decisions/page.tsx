"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { api } from "@/lib/api";
import { getSourceConfig } from "@/lib/sourceTypes";

interface ConflictInfo {
  other_decision_id: string;
  other_decision_text: string;
  relationship: "conflict" | "supersedes";
  explanation: string;
}

interface Decision {
  decision_id: string;
  project_id: string;
  decision_text: string;
  reasoning: string;
  alternatives_considered?: string[];
  participants?: string[];
  source_type: string;
  source_id: string;
  source_url?: string;
  timestamp?: string;
  extracted_at?: string;
  confidence_score?: number;
  conflicts?: ConflictInfo[];
}

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
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const fetchDecisions = async () => {
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
  };

  useEffect(() => {
    if (projectId) {
      fetchDecisions();
    }
  }, [projectId]);

  const handleExtract = async () => {
    setIsExtracting(true);
    setExtractMessage("");
    try {
      const result = await api.post<{ message: string; count: number }>(
        `/projects/${projectId}/decisions/extract`
      );
      setExtractMessage(result.message || "Decisions extracted successfully");
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

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = decisions.filter((d) => {
    if (sourceFilter === "all") return true;
    const norm = (d.source_type || "").toLowerCase();
    if (sourceFilter === "pr") return norm.includes("pr");
    if (sourceFilter === "commit") return norm.includes("commit");
    if (sourceFilter === "discord") return norm.includes("discord");
    return norm === sourceFilter;
  });



  return (
    <div className="p-6 lg:p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">Decision Log</h1>
          <p className="text-[#525252] text-[13px] mt-0.5">
            AI-extracted architectural and product decisions with verified sources
          </p>
        </div>
        <div className="flex items-center gap-3">
          {extractMessage && (
            <span className="text-[12px] text-[#10b981] font-mono animate-pulse">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#10b981] text-white text-[13px] font-medium hover:bg-[#059669] transition-colors disabled:opacity-40 cursor-pointer"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#262626] text-[#fafafa] text-[13px] font-medium hover:bg-[#141414] transition-colors disabled:opacity-40 cursor-pointer"
            title={decisions.length < 2 ? "Need at least 2 decisions" : "Scan for contradicting decisions"}
          >
            {isDetectingConflicts ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
            )}
            Detect Conflicts
          </button>

          {/* View toggle */}
          <div className="flex items-center rounded-md border border-[#1a1a1a] overflow-hidden">
            <button
              onClick={() => setView("timeline")}
              title="Timeline view"
              className={`px-2.5 py-1.5 text-[12px] transition-colors cursor-pointer ${
                view === "timeline"
                  ? "bg-[#111111] text-[#fafafa]"
                  : "text-[#525252] hover:text-[#737373]"
              }`}
            >
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setView("table")}
              title="Table view"
              className={`px-2.5 py-1.5 text-[12px] transition-colors cursor-pointer ${
                view === "table"
                  ? "bg-[#111111] text-[#fafafa]"
                  : "text-[#525252] hover:text-[#737373]"
              }`}
            >
              <List className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5">
        <Filter className="w-3.5 h-3.5 text-[#525252]" strokeWidth={1.5} />
        {[
          { key: "all", label: "All" },
          { key: "pr", label: "Pull Requests" },
          { key: "commit", label: "Commits" },
          { key: "discord", label: "Discord" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSourceFilter(key)}
            className={`px-2.5 py-1 rounded-md text-[12px] transition-colors cursor-pointer ${
              sourceFilter === key
                ? "bg-[#111111] text-[#fafafa] border border-[#262626]"
                : "text-[#525252] hover:text-[#737373] border border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="text-[11px] text-[#404040] ml-2">{filtered.length} decisions</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-5 h-5 text-[#10b981] animate-spin" strokeWidth={2} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface p-12 text-center">
          <FileText className="w-8 h-8 text-[#525252] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-[14px] font-medium text-[#fafafa] mb-1">No decisions found</h3>
          <p className="text-[#525252] text-[12px] max-w-sm mx-auto mb-4">
            Click &ldquo;Extract Decisions&rdquo; above to parse commits, PR discussions, and chats into structured memory.
          </p>
          <button
            onClick={handleExtract}
            disabled={isExtracting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#10b981] text-white text-[13px] font-medium rounded-md hover:bg-[#059669] transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
            Extract Now
          </button>
        </div>
      ) : view === "timeline" ? (
        /* Timeline view */
        <div className="space-y-3">
          {filtered.map((decision, i) => {
            const config = getSourceConfig(decision.source_type);
            const Icon = config.icon;
            const confidence = decision.confidence_score !== undefined ? decision.confidence_score : 0.9;
            const confidencePct = Math.round(confidence * 100);
            const isExpanded = expandedIds.has(decision.decision_id);
            const alternatives = decision.alternatives_considered || [];
            const participants = decision.participants || [];

            return (
              <div key={decision.decision_id || i} className="surface p-5 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center"
                      style={{ background: `${config.color}15` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: config.color }} strokeWidth={1.5} />
                    </div>
                    {i < filtered.length - 1 && (
                      <div className="w-px h-full min-h-[40px] bg-[#1a1a1a] mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[14px] font-medium text-[#fafafa] leading-snug">
                          {decision.decision_text}
                        </h3>
                        {decision.conflicts && decision.conflicts.length > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/25 text-[10px] text-red-400 font-medium shrink-0"
                            title={decision.conflicts.map((c) => c.explanation).join(" | ")}
                          >
                            <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                            {decision.conflicts[0].relationship === "conflict" ? "Conflicts" : "Superseded"}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleExpand(decision.decision_id)}
                        className="text-[#525252] hover:text-[#fafafa] transition-colors p-1 rounded cursor-pointer shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
                        ) : (
                          <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                        )}
                      </button>
                    </div>

                    <p className="text-[12px] text-[#737373] leading-relaxed mb-3">
                      {decision.reasoning}
                    </p>

                    {/* Alternatives if present or expanded */}
                    {alternatives.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] text-[#404040] uppercase tracking-wider font-medium mb-1">
                          Alternatives considered
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {alternatives.map((alt, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-[#111111] border border-[#1a1a1a] text-[11px] text-[#737373]"
                            >
                              {alt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Conflict Explanation Block */}
                    {decision.conflicts && decision.conflicts.length > 0 && (
                      <div className="mb-3 p-2.5 rounded-md bg-red-500/5 border border-red-500/20">
                        <p className="text-[10px] text-red-400 uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                          Conflicting with {decision.conflicts.length} other decision{decision.conflicts.length !== 1 ? "s" : ""}
                        </p>
                        {decision.conflicts.map((c, idx) => (
                          <div key={idx} className="text-[11px] text-[#a3a3a3] mb-1 last:mb-0">
                            <span className="text-red-400 font-medium">
                              {c.relationship === "conflict" ? "Conflicts with" : "Superseded by"}:
                            </span>{" "}
                            &ldquo;{c.other_decision_text}&rdquo; — {c.explanation}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Meta Row */}
                    <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-white/5">
                      <span className="forge-badge forge-badge-neutral">
                        <Icon className="w-3 h-3" strokeWidth={2} />
                        {config.label} #{decision.source_id}
                      </span>
                      {participants.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#404040]" strokeWidth={2} />
                          <span className="text-[11px] text-[#737373]">
                            {participants.join(", ")}
                          </span>
                        </div>
                      )}
                      {decision.timestamp && (
                        <span className="text-[11px] text-[#404040]" suppressHydrationWarning>
                          {new Date(decision.timestamp).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                      {/* Confidence */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <div className="w-12 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${confidencePct}%`,
                              background: confidencePct > 85 ? "#10b981" : confidencePct > 70 ? "#f59e0b" : "#ef4444",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-[#525252] font-mono">{confidencePct}%</span>
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
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="forge-table">
              <thead>
                <tr>
                  <th className="min-w-[280px]">Decision</th>
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

                  return (
                    <tr key={decision.decision_id || i} className="cursor-pointer">
                      <td>
                        <span className="text-[#fafafa] text-[13px] font-medium block">
                          {decision.decision_text}
                        </span>
                        {decision.reasoning && (
                          <span className="text-[#525252] text-[11px] line-clamp-1 mt-0.5">
                            {decision.reasoning}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="forge-badge forge-badge-neutral">
                          <Icon className="w-3 h-3" strokeWidth={2} />
                          {config.label}
                        </span>
                      </td>
                      <td>
                        <span className="text-[12px] text-[#525252]">
                          {participants.length > 0 ? `${participants.length} members` : "—"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div className="w-10 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${confidencePct}%`,
                                background: confidencePct > 85 ? "#10b981" : confidencePct > 70 ? "#f59e0b" : "#ef4444",
                              }}
                            />
                          </div>
                          <span className="text-[11px] text-[#525252] font-mono">{confidencePct}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-[12px] text-[#525252]" suppressHydrationWarning>
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
