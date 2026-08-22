"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  GitCommit,
  HelpCircle,
  Shield,
  Loader2,
  Code2,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  ProjectStateSnapshot,
  ProjectRisk,
  RiskStatus,
  ConsistencyIssue,
  KnowledgeGap,
  ProjectTimelineEvent,
  SemanticChangeGroup,
} from "@/types";

export default function ProjectIntelligencePage() {
  const { id: projectId } = useParams() as { id: string };

  const [activeTab, setActiveTab] = useState<
    "overview" | "changes" | "consistency" | "risks" | "gaps" | "timeline"
  >("overview");

  const [stateSnapshot, setStateSnapshot] = useState<ProjectStateSnapshot | null>(null);
  const [changes, setChanges] = useState<SemanticChangeGroup[]>([]);
  const [consistencyIssues, setConsistencyIssues] = useState<ConsistencyIssue[]>([]);
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>([]);
  const [timeline, setTimeline] = useState<ProjectTimelineEvent[]>([]);
  const [timelineFilter, setTimelineFilter] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadIntelligenceData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [snap, chg, cons, rsk, gap, time] = await Promise.allSettled([
        api.get<ProjectStateSnapshot>(`/projects/${projectId}/intelligence/state`),
        api.get<SemanticChangeGroup[]>(`/projects/${projectId}/intelligence/changes`),
        api.get<ConsistencyIssue[]>(`/projects/${projectId}/intelligence/consistency`),
        api.get<ProjectRisk[]>(`/projects/${projectId}/intelligence/risks`),
        api.get<KnowledgeGap[]>(`/projects/${projectId}/intelligence/gaps`),
        api.get<ProjectTimelineEvent[]>(
          `/projects/${projectId}/intelligence/timeline${
            timelineFilter ? `?type=${timelineFilter}` : ""
          }`
        ),
      ]);

      if (snap.status === "fulfilled") setStateSnapshot(snap.value);
      if (chg.status === "fulfilled") setChanges(chg.value || []);
      if (cons.status === "fulfilled") setConsistencyIssues(cons.value || []);
      if (rsk.status === "fulfilled") setRisks(rsk.value || []);
      if (gap.status === "fulfilled") setKnowledgeGaps(gap.value || []);
      if (time.status === "fulfilled") setTimeline(time.value || []);
    } catch (err) {
      console.error("Failed to load project intelligence:", err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, timelineFilter]);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      if (!projectId || ignore) return;
      await loadIntelligenceData();
    }
    fetchData();
    return () => {
      ignore = true;
    };
  }, [projectId, loadIntelligenceData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await api.post(`/projects/${projectId}/intelligence/refresh`);
      await loadIntelligenceData();
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRiskStatus = async (riskId: string, nextStatus: RiskStatus) => {
    try {
      await api.patch(`/projects/${projectId}/intelligence/risks/${riskId}`, {
        status: nextStatus,
      });
      setRisks((prev) =>
        prev.map((r) => (r.risk_id === riskId ? { ...r, status: nextStatus } : r))
      );
    } catch (err) {
      console.error("Failed to update risk status:", err);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0a] text-[#ededed] overflow-y-auto">
      {/* Top Header */}
      <div className="border-b border-[#262626] bg-[#111111] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#fafafa] flex items-center gap-2">
              Project Intelligence
              {stateSnapshot && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border ${
                    stateSnapshot.health_status === "HEALTHY"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : stateSnapshot.health_status === "ATTENTION"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-red-500/10 text-red-400 border-red-500/30"
                  }`}
                >
                  {stateSnapshot.health_status}
                </span>
              )}
            </h1>
            <p className="text-xs text-[#737373]">
              Derived point-in-time project state & cross-system evidence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#fafafa] border border-[#333333] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
            {isRefreshing ? "Analyzing Evidence..." : "Refresh Intelligence"}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center border-b border-[#262626] bg-[#0d0d0d] px-6 gap-6 text-xs shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`py-3 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "overview"
              ? "border-emerald-500 text-[#fafafa]"
              : "border-transparent text-[#737373] hover:text-[#a3a3a3]"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Overview & State
        </button>
        <button
          onClick={() => setActiveTab("changes")}
          className={`py-3 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "changes"
              ? "border-emerald-500 text-[#fafafa]"
              : "border-transparent text-[#737373] hover:text-[#a3a3a3]"
          }`}
        >
          <GitCommit className="w-3.5 h-3.5" />
          Recent Changes ({changes.length})
        </button>
        <button
          onClick={() => setActiveTab("consistency")}
          className={`py-3 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "consistency"
              ? "border-emerald-500 text-[#fafafa]"
              : "border-transparent text-[#737373] hover:text-[#a3a3a3]"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Consistency & Drift ({consistencyIssues.length})
        </button>
        <button
          onClick={() => setActiveTab("risks")}
          className={`py-3 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "risks"
              ? "border-emerald-500 text-[#fafafa]"
              : "border-transparent text-[#737373] hover:text-[#a3a3a3]"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Risks & Blockers ({risks.length})
        </button>
        <button
          onClick={() => setActiveTab("gaps")}
          className={`py-3 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "gaps"
              ? "border-emerald-500 text-[#fafafa]"
              : "border-transparent text-[#737373] hover:text-[#a3a3a3]"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
          Knowledge Gaps ({knowledgeGaps.length})
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`py-3 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "timeline"
              ? "border-emerald-500 text-[#fafafa]"
              : "border-transparent text-[#737373] hover:text-[#a3a3a3]"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Timeline
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 max-w-6xl w-full mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 text-xs text-[#737373]">
            <Loader2 className="w-6 h-6 animate-spin mb-3 text-emerald-400" />
            Analyzing project evidence across Constitution, Decisions, Code, and Meetings...
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === "overview" && stateSnapshot && (
              <div className="space-y-6">
                {/* Health & Summary Banner */}
                <div className="p-5 rounded-2xl bg-[#141414] border border-[#262626] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#262626]">
                    <div>
                      <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider block">
                        Current Development Phase
                      </span>
                      <h2 className="text-base font-semibold text-emerald-400 mt-0.5">
                        {stateSnapshot.current_phase}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#a3a3a3]">
                      <span>
                        <strong className="text-[#fafafa]">{stateSnapshot.active_decisions_count}</strong> Active Decisions
                      </span>
                      <span>
                        <strong className="text-[#fafafa]">{stateSnapshot.open_action_items_count}</strong> Open Actions
                      </span>
                      <span>
                        <strong className="text-red-400">{stateSnapshot.blocked_work.length}</strong> Blockers
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-[#ededed] leading-relaxed bg-[#1a1a1a] p-3.5 rounded-xl border border-[#282828]">
                    {stateSnapshot.project_summary}
                  </p>

                  {/* Health Reasons */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-[#737373] uppercase tracking-wider">
                      Health Analysis Signals:
                    </span>
                    <ul className="space-y-1 text-xs text-[#a3a3a3]">
                      {stateSnapshot.health_reasons.map((r, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Grid: Active vs Completed Work */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Active Work */}
                  <div className="p-5 rounded-xl bg-[#141414] border border-[#262626]">
                    <h3 className="text-xs font-semibold text-[#fafafa] mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Active In-Progress Work
                    </h3>
                    <ul className="space-y-2">
                      {stateSnapshot.active_work.length === 0 ? (
                        <li className="text-xs text-[#737373] italic">No active work logged.</li>
                      ) : (
                        stateSnapshot.active_work.map((w, idx) => (
                          <li
                            key={idx}
                            className="text-xs p-2.5 rounded-lg bg-[#1a1a1a] border border-[#262626] text-[#ededed]"
                          >
                            {w}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>

                  {/* Completed Work */}
                  <div className="p-5 rounded-xl bg-[#141414] border border-[#262626]">
                    <h3 className="text-xs font-semibold text-[#fafafa] mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Recently Delivered Milestones
                    </h3>
                    <ul className="space-y-2">
                      {stateSnapshot.completed_work.length === 0 ? (
                        <li className="text-xs text-[#737373] italic">No completed work logged yet.</li>
                      ) : (
                        stateSnapshot.completed_work.map((w, idx) => (
                          <li
                            key={idx}
                            className="text-xs p-2.5 rounded-lg bg-[#1a1a1a] border border-[#262626] text-[#a3a3a3] line-through-none"
                          >
                            {w}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>

                {/* Technical Stack Breakdown */}
                <div className="p-5 rounded-xl bg-[#141414] border border-[#262626]">
                  <h3 className="text-xs font-semibold text-[#fafafa] mb-3 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-blue-400" />
                    Standardized Technical Stack
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    {Object.entries(stateSnapshot.technical_stack).map(([category, items]) => (
                      <div key={category} className="p-3 rounded-lg bg-[#181818] border border-[#262626]">
                        <span className="text-[10px] font-mono text-[#737373] uppercase">{category}</span>
                        <p className="font-medium text-[#ededed] mt-1">
                          {items.length > 0 ? items.join(", ") : "None specified"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Changes Tab */}
            {activeTab === "changes" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-[#262626]">
                  <h2 className="text-sm font-semibold text-[#fafafa]">Semantic Development Changes</h2>
                  <p className="text-xs text-[#737373]">
                    High-level grouped changes synthesized from meetings, commits, and deliverables
                  </p>
                </div>
                {changes.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#737373] bg-[#141414] rounded-xl border border-[#262626]">
                    No semantic change groups detected yet.
                  </div>
                ) : (
                  changes.map((g) => (
                    <div
                      key={g.group_id}
                      className="p-4 rounded-xl bg-[#141414] border border-[#262626] space-y-2 hover:border-[#333333] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-[#fafafa] flex items-center gap-2">
                          <GitCommit className="w-4 h-4 text-emerald-400" />
                          {g.title}
                        </h4>
                        <span className="text-[10px] font-mono text-[#737373]">
                          {new Date(g.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-[#a3a3a3] leading-relaxed">{g.summary}</p>
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-[#262626] text-emerald-300 font-mono">
                        {g.area}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Consistency & Drift Tab */}
            {activeTab === "consistency" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-[#262626]">
                  <h2 className="text-sm font-semibold text-[#fafafa]">Consistency & Drift Verification</h2>
                  <p className="text-xs text-[#737373]">
                    Automated comparison between documented decisions, Constitution rules, and codebase evidence
                  </p>
                </div>
                {consistencyIssues.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#737373] bg-[#141414] rounded-xl border border-[#262626]">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    All active decisions and Constitution rules align with project implementation.
                  </div>
                ) : (
                  consistencyIssues.map((iss) => (
                    <div
                      key={iss.issue_id}
                      className="p-4 rounded-xl bg-[#141414] border border-amber-500/30 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-amber-300 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-amber-400" />
                          {iss.title}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {iss.issue_type}
                        </span>
                      </div>
                      <p className="text-xs text-[#ededed]">{iss.description}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-2 border-t border-[#262626]">
                        <div className="p-2.5 rounded bg-[#181818] border border-[#262626]">
                          <span className="text-[#737373] block mb-0.5">Documented Claim:</span>
                          <span className="text-[#fafafa] font-mono">{iss.documented_claim}</span>
                        </div>
                        <div className="p-2.5 rounded bg-[#181818] border border-[#262626]">
                          <span className="text-[#737373] block mb-0.5">Observed Evidence:</span>
                          <span className="text-amber-300">{iss.observed_evidence}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Risks & Blockers Tab */}
            {activeTab === "risks" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-[#262626]">
                  <h2 className="text-sm font-semibold text-[#fafafa]">Evidence-Based Project Risks</h2>
                  <p className="text-xs text-[#737373]">
                    Blockers, overdue action items, and unresolved technical questions with source traceability
                  </p>
                </div>
                {risks.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#737373] bg-[#141414] rounded-xl border border-[#262626]">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    No active risks or blockers detected for this project.
                  </div>
                ) : (
                  risks.map((r) => {
                    const isResolved = r.status === "RESOLVED";
                    return (
                      <div
                        key={r.risk_id}
                        className={`p-4 rounded-xl border transition-all space-y-3 ${
                          isResolved
                            ? "bg-[#141414]/50 border-[#262626] opacity-60"
                            : r.severity === "HIGH" || r.severity === "CRITICAL"
                            ? "bg-red-950/10 border-red-500/40"
                            : "bg-[#141414] border-[#262626]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4
                            className={`text-xs font-semibold flex items-center gap-2 ${
                              r.severity === "HIGH" ? "text-red-400" : "text-[#fafafa]"
                            }`}
                          >
                            <AlertTriangle className="w-4 h-4" />
                            {r.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                                r.severity === "HIGH"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }`}
                            >
                              {r.severity}
                            </span>
                            <button
                              onClick={() =>
                                handleRiskStatus(
                                  r.risk_id,
                                  isResolved ? "OPEN" : "RESOLVED"
                                )
                              }
                              className="text-[11px] px-2.5 py-1 rounded bg-[#262626] hover:bg-[#333333] text-[#fafafa] flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3 text-emerald-400" />
                              {isResolved ? "Reopen" : "Resolve"}
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-[#a3a3a3]">{r.impact_explanation}</p>

                        {/* Evidence */}
                        {r.evidence && r.evidence.length > 0 && (
                          <div className="p-2.5 rounded bg-[#181818] border border-[#262626] text-[11px] text-[#737373]">
                            <span className="font-semibold text-[#a3a3a3] block mb-1">Source Evidence:</span>
                            {r.evidence.map((ev, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-emerald-400 font-mono">[{String(ev.source_type || "evidence")}]</span>
                                <span>{String(ev.title || ev.question || ev.source_id)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Knowledge Gaps Tab */}
            {activeTab === "gaps" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-[#262626]">
                  <h2 className="text-sm font-semibold text-[#fafafa]">Project Knowledge Gaps</h2>
                  <p className="text-xs text-[#737373]">
                    Areas where Forge identified missing architecture records or unassigned tasks
                  </p>
                </div>
                {knowledgeGaps.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#737373] bg-[#141414] rounded-xl border border-[#262626]">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    Zero knowledge gaps detected. Project records are comprehensive.
                  </div>
                ) : (
                  knowledgeGaps.map((g) => (
                    <div
                      key={g.gap_id}
                      className="p-4 rounded-xl bg-[#141414] border border-blue-500/30 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-[#fafafa] flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-blue-400" />
                          {g.area}
                        </h4>
                        <span className="text-[10px] font-mono text-[#737373]">
                          {new Date(g.detected_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-[#a3a3a3]">{g.description}</p>
                      <div className="pt-2 border-t border-[#262626] text-xs text-blue-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span>Recommended Action: {g.suggested_action}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === "timeline" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#262626]">
                  <div>
                    <h2 className="text-sm font-semibold text-[#fafafa]">Unified Project Timeline</h2>
                    <p className="text-xs text-[#737373]">
                      Chronological stream across Decisions, Meetings, Actions, and Constitution updates
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 text-xs">
                    {["", "DECISION", "MEETING", "ACTION_ITEM", "CONSTITUTION"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setTimelineFilter(f)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                          timelineFilter === f
                            ? "bg-emerald-600 text-white"
                            : "bg-[#1c1c1c] text-[#a3a3a3] hover:text-[#fafafa]"
                        }`}
                      >
                        {f === "" ? "All" : f}
                      </button>
                    ))}
                  </div>
                </div>

                {timeline.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#737373] bg-[#141414] rounded-xl border border-[#262626]">
                    No timeline events recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[#262626]">
                    {timeline.map((ev) => (
                      <div key={ev.event_id} className="relative flex items-start gap-4 pl-8">
                        <div className="absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full bg-[#1c1c1c] border-2 border-emerald-500" />
                        <div className="flex-1 p-3.5 rounded-xl bg-[#141414] border border-[#262626] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#fafafa]">{ev.title}</span>
                            <span className="text-[10px] font-mono text-[#737373]">
                              {new Date(ev.timestamp).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {ev.description && (
                            <p className="text-xs text-[#a3a3a3]">{ev.description}</p>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#262626] text-emerald-300 font-mono">
                              {ev.event_type}
                            </span>
                            <span className="text-[10px] text-[#737373]">By {ev.author}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
