"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  ArrowLeft,
  ExternalLink,
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
    const sourceId = (d.source_id || "").toLowerCase();

    if (sourceFilter === "pr") {
      return norm.includes("pr") || norm.includes("pull") || sourceId.includes("pr") || sourceId.includes("pull");
    }
    if (sourceFilter === "commit") {
      return (
        norm.includes("commit") ||
        norm.includes("file") ||
        norm.includes("git") ||
        sourceId.includes("/") ||
        sourceId.includes(".") ||
        sourceId.length === 40 ||
        sourceId.length === 7
      );
    }
    if (sourceFilter === "discord") {
      return (
        norm.includes("discord") ||
        norm.includes("chat") ||
        norm.includes("message") ||
        sourceId.includes("discord") ||
        sourceId.includes("channel")
      );
    }
    return norm === sourceFilter;
  });



  return (
    <div className="flex-1 space-y-5 p-5 lg:p-6 max-w-[1400px] w-full mx-auto animate-fade-in bg-background text-foreground transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href={`/project/${projectId}`}
            className="p-2 rounded-lg bg-card hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 shadow-2xs mt-0.5"
            title="Back to Project"
            aria-label="Back to Project"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">Decision Log</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              AI-extracted architectural and product decisions with verified sources
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {extractMessage && (
            <span className="text-xs text-emerald-500 font-mono animate-pulse">
              {extractMessage}
            </span>
          )}

          {conflictMessage && (
            <span className="text-xs text-amber-500 font-mono animate-pulse">
              {conflictMessage}
            </span>
          )}

          {/* Extract Button */}
          <button
            onClick={handleExtract}
            disabled={isExtracting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground border border-border text-xs sm:text-sm font-medium hover:bg-accent transition-colors disabled:opacity-40 cursor-pointer"
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
          <div className="flex items-center rounded-md border border-border bg-card overflow-hidden">
            <button
              onClick={() => setView("timeline")}
              title="Timeline view"
              className={`p-1.5 text-xs transition-colors cursor-pointer ${
                view === "timeline"
                  ? "bg-accent text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setView("table")}
              title="Table view"
              className={`p-1.5 text-xs transition-colors cursor-pointer ${
                view === "table"
                  ? "bg-accent text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        {[
          { key: "all", label: "All" },
          { key: "pr", label: "Pull Requests" },
          { key: "commit", label: "Commits" },
          { key: "discord", label: "Discord" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSourceFilter(key)}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
              sourceFilter === key
                ? "bg-card text-foreground font-semibold border border-border"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-2 font-mono">{filtered.length} decisions</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" strokeWidth={2} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center shadow-2xs">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-60" strokeWidth={1.5} />
          <h3 className="text-sm sm:text-base font-bold text-foreground mb-1">No decisions found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
            Click &ldquo;Extract Decisions&rdquo; above to parse commits, PR discussions, and chats into structured memory.
          </p>
          <button
            onClick={handleExtract}
            disabled={isExtracting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer shadow-xs"
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
              <div key={decision.decision_id || i} className="bg-card border border-border rounded-xl p-4.5 transition-colors shadow-2xs">
                <div className="flex items-start gap-3.5">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${config.color}15` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: config.color }} strokeWidth={1.5} />
                    </div>
                    {i < filtered.length - 1 && (
                      <div className="w-px h-full min-h-[30px] bg-border mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
                          {decision.decision_text}
                        </h3>
                        {decision.conflicts && decision.conflicts.length > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/25 text-[10px] text-rose-500 font-medium shrink-0"
                            title={decision.conflicts.map((c) => c.explanation).join(" | ")}
                          >
                            <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                            {decision.conflicts[0].relationship === "conflict" ? "Conflicts" : "Superseded"}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleExpand(decision.decision_id)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded cursor-pointer shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
                        ) : (
                          <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed mb-2.5">
                      {decision.reasoning}
                    </p>

                    {/* Alternatives if present or expanded */}
                    {alternatives.length > 0 && (
                      <div className="mb-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                          Alternatives considered
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {alternatives.map((alt, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-background border border-border text-[11px] text-muted-foreground"
                            >
                              {alt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Conflict Explanation Block */}
                    {decision.conflicts && decision.conflicts.length > 0 && (
                      <div className="mb-2.5 p-2.5 rounded-md bg-rose-500/5 border border-rose-500/20">
                        <p className="text-[10px] text-rose-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                          Conflicting with {decision.conflicts.length} other decision{decision.conflicts.length !== 1 ? "s" : ""}
                        </p>
                        {decision.conflicts.map((c, idx) => (
                          <div key={idx} className="text-[11px] text-muted-foreground mb-1 last:mb-0">
                            <span className="text-rose-500 font-medium">
                              {c.relationship === "conflict" ? "Conflicts with" : "Superseded by"}:
                            </span>{" "}
                            &ldquo;{c.other_decision_text}&rdquo; — {c.explanation}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Meta Row */}
                    <div className="flex items-center gap-3.5 flex-wrap pt-2 border-t border-border">
                      {decision.source_url ? (
                        <a
                          href={decision.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-background border border-border text-foreground hover:text-emerald-500 hover:border-emerald-500/40 transition-colors font-medium"
                          title={decision.source_url}
                        >
                          <Icon className="w-3 h-3" style={{ color: config.color }} strokeWidth={2} />
                          <span>{config.label}</span>
                          {decision.source_id && (
                            <span className="font-mono text-muted-foreground truncate max-w-[200px]">
                              {decision.source_id.startsWith("#") || decision.source_id.includes("/") ? decision.source_id : `#${decision.source_id}`}
                            </span>
                          )}
                          <ExternalLink className="w-2.5 h-2.5 text-muted-foreground ml-0.5" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-background border border-border text-foreground font-medium">
                          <Icon className="w-3 h-3" style={{ color: config.color }} strokeWidth={2} />
                          <span>{config.label}</span>
                          {decision.source_id && (
                            <span className="font-mono text-muted-foreground truncate max-w-[200px]">
                              {decision.source_id.startsWith("#") || decision.source_id.includes("/") ? decision.source_id : `#${decision.source_id}`}
                            </span>
                          )}
                        </span>
                      )}
                      {participants.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" strokeWidth={2} />
                          <span className="text-[11px] text-muted-foreground">
                            {participants.join(", ")}
                          </span>
                        </div>
                      )}
                      {decision.timestamp && (
                        <span className="text-[11px] text-muted-foreground font-mono" suppressHydrationWarning>
                          {new Date(decision.timestamp).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                      {/* Confidence */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <div className="w-12 h-1 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${confidencePct}%`,
                              background: confidencePct > 85 ? "#10b981" : confidencePct > 70 ? "#f59e0b" : "#ef4444",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">{confidencePct}%</span>
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
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground bg-background uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-2.5 px-4 min-w-[280px]">Decision</th>
                  <th className="py-2.5 px-4">Source</th>
                  <th className="py-2.5 px-4">Participants</th>
                  <th className="py-2.5 px-4">Confidence</th>
                  <th className="py-2.5 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((decision, i) => {
                  const config = getSourceConfig(decision.source_type);
                  const Icon = config.icon;
                  const confidence = decision.confidence_score !== undefined ? decision.confidence_score : 0.9;
                  const confidencePct = Math.round(confidence * 100);
                  const participants = decision.participants || [];

                  return (
                    <tr key={decision.decision_id || i} className="hover:bg-accent/40 transition-colors cursor-pointer">
                      <td className="py-2.5 px-4">
                        <span className="text-foreground text-xs sm:text-sm font-semibold block">
                          {decision.decision_text}
                        </span>
                        {decision.reasoning && (
                          <span className="text-muted-foreground text-xs line-clamp-1 mt-0.5">
                            {decision.reasoning}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {decision.source_url ? (
                          <a
                            href={decision.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-background border border-border text-foreground hover:text-emerald-500 hover:border-emerald-500/40 transition-colors font-medium"
                          >
                            <Icon className="w-3 h-3" style={{ color: config.color }} strokeWidth={2} />
                            <span>{config.label}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-muted-foreground ml-0.5" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-background border border-border text-foreground font-medium">
                            <Icon className="w-3 h-3" style={{ color: config.color }} strokeWidth={2} />
                            <span>{config.label}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-xs text-muted-foreground">
                          {participants.length > 0 ? `${participants.length} members` : "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-10 h-1 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${confidencePct}%`,
                                background: confidencePct > 85 ? "#10b981" : confidencePct > 70 ? "#f59e0b" : "#ef4444",
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">{confidencePct}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-xs text-muted-foreground font-mono" suppressHydrationWarning>
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
