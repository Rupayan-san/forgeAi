"use client";

import { useState } from "react";
import {
  FileText,
  GitPullRequest,
  GitCommit,
  Hash,
  ChevronDown,
  ArrowUpRight,
  Filter,
  List,
  Clock,
  Users,
  AlertCircle,
} from "lucide-react";

// Mock decisions
const mockDecisions = [
  {
    id: "1",
    decision_text: "Switch from REST to GraphQL for the user service API",
    reasoning: "REST was causing over-fetching on the mobile dashboard. GraphQL allows clients to request exactly the data they need, reducing payload sizes by ~60%.",
    alternatives: ["Keep REST with field selection", "Use gRPC for internal services"],
    participants: ["Sarah Chen", "Alex Kumar", "Jordan Lee"],
    source_type: "pr" as const,
    source_id: "47",
    source_url: "#",
    timestamp: "2024-03-15T14:30:00Z",
    confidence: 0.92,
  },
  {
    id: "2",
    decision_text: "Use PostgreSQL instead of MongoDB for analytics data",
    reasoning: "Analytics queries require complex joins and aggregations. PostgreSQL's query optimizer handles these patterns significantly better than MongoDB's aggregation pipeline.",
    alternatives: ["ClickHouse for analytics", "Keep MongoDB with materialized views"],
    participants: ["Alex Kumar", "Pat Williams"],
    source_type: "discord" as const,
    source_id: "eng-456",
    source_url: "#",
    timestamp: "2024-03-12T10:15:00Z",
    confidence: 0.87,
  },
  {
    id: "3",
    decision_text: "Implement rate limiting at the API gateway level",
    reasoning: "Per-service rate limiting was inconsistent and hard to manage. Moving to gateway-level gives us centralized control and better visibility into usage patterns.",
    alternatives: ["Per-service rate limiting", "Client-side throttling only"],
    participants: ["Jordan Lee", "Sarah Chen"],
    source_type: "commit" as const,
    source_id: "a3f2d1e",
    source_url: "#",
    timestamp: "2024-03-10T16:45:00Z",
    confidence: 0.78,
  },
  {
    id: "4",
    decision_text: "Adopt trunk-based development with short-lived feature branches",
    reasoning: "Long-lived branches were causing painful merge conflicts. Team agreed to keep branches under 2 days and use feature flags for incomplete work.",
    alternatives: ["Git Flow", "GitHub Flow with longer branches"],
    participants: ["Pat Williams", "Alex Kumar", "Sarah Chen", "Jordan Lee"],
    source_type: "discord" as const,
    source_id: "eng-789",
    source_url: "#",
    timestamp: "2024-03-08T09:00:00Z",
    confidence: 0.95,
  },
];

const sourceTypeConfig = {
  pr: { icon: GitPullRequest, label: "Pull Request", color: "#3b82f6" },
  commit: { icon: GitCommit, label: "Commit", color: "#10b981" },
  discord: { icon: Hash, label: "Discord", color: "#a855f7" },
  issue: { icon: AlertCircle, label: "Issue", color: "#f59e0b" },
};

export default function DecisionsPage() {
  const [view, setView] = useState<"timeline" | "table">("timeline");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const filtered = sourceFilter === "all"
    ? mockDecisions
    : mockDecisions.filter((d) => d.source_type === sourceFilter);

  return (
    <div className="p-6 lg:p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">Decision Log</h1>
          <p className="text-[#525252] text-[13px] mt-0.5">
            AI-extracted architectural and product decisions from your team
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-md border border-[#1a1a1a] overflow-hidden">
            <button
              onClick={() => setView("timeline")}
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
        {["all", "pr", "commit", "discord"].map((type) => (
          <button
            key={type}
            onClick={() => setSourceFilter(type)}
            className={`px-2.5 py-1 rounded-md text-[12px] transition-colors cursor-pointer ${
              sourceFilter === type
                ? "bg-[#111111] text-[#fafafa] border border-[#262626]"
                : "text-[#525252] hover:text-[#737373] border border-transparent"
            }`}
          >
            {type === "all" ? "All" : sourceTypeConfig[type as keyof typeof sourceTypeConfig]?.label}
          </button>
        ))}
        <span className="text-[11px] text-[#404040] ml-2">{filtered.length} decisions</span>
      </div>

      {/* Timeline view */}
      {view === "timeline" ? (
        <div className="space-y-3">
          {filtered.map((decision, i) => {
            const config = sourceTypeConfig[decision.source_type];
            const Icon = config.icon;
            const confidencePct = Math.round(decision.confidence * 100);

            return (
              <div
                key={decision.id}
                className={`surface p-5 opacity-0 animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}
              >
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
                    <h3 className="text-[14px] font-medium text-[#fafafa] mb-1.5">
                      {decision.decision_text}
                    </h3>
                    <p className="text-[12px] text-[#525252] leading-relaxed mb-3">
                      {decision.reasoning}
                    </p>

                    {/* Alternatives */}
                    {decision.alternatives.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] text-[#404040] uppercase tracking-wider font-medium mb-1">
                          Alternatives considered
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {decision.alternatives.map((alt) => (
                            <span
                              key={alt}
                              className="px-2 py-0.5 rounded bg-[#111111] border border-[#1a1a1a] text-[11px] text-[#525252]"
                            >
                              {alt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="forge-badge forge-badge-neutral">
                        <Icon className="w-3 h-3" strokeWidth={2} />
                        {config.label} #{decision.source_id}
                      </span>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#404040]" strokeWidth={2} />
                        <span className="text-[11px] text-[#404040]">
                          {decision.participants.join(", ")}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#404040]" suppressHydrationWarning>
                        {new Date(decision.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {/* Confidence */}
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${confidencePct}%`,
                              background: confidencePct > 85 ? "#22c55e" : confidencePct > 70 ? "#f59e0b" : "#ef4444",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-[#404040]">{confidencePct}%</span>
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
                {filtered.map((decision) => {
                  const config = sourceTypeConfig[decision.source_type];
                  const Icon = config.icon;
                  const confidencePct = Math.round(decision.confidence * 100);

                  return (
                    <tr key={decision.id} className="cursor-pointer">
                      <td>
                        <span className="text-[#fafafa] text-[13px] font-medium">
                          {decision.decision_text}
                        </span>
                      </td>
                      <td>
                        <span className="forge-badge forge-badge-neutral">
                          <Icon className="w-3 h-3" strokeWidth={2} />
                          {config.label}
                        </span>
                      </td>
                      <td>
                        <span className="text-[12px] text-[#525252]">
                          {decision.participants.length} people
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div className="w-10 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${confidencePct}%`,
                                background: confidencePct > 85 ? "#22c55e" : confidencePct > 70 ? "#f59e0b" : "#ef4444",
                              }}
                            />
                          </div>
                          <span className="text-[11px] text-[#525252]">{confidencePct}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-[12px] text-[#525252]" suppressHydrationWarning>
                          {new Date(decision.timestamp).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
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
