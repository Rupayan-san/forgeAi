"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  Loader2,
  Sparkles,
  FileCode2,
  Hash,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "@/lib/api";

interface Decision {
  decision_id: string;
  project_id: string;
  decision_text: string;
  reasoning: string;
  alternatives_considered: string[];
  participants: string[];
  source_type: string;
  source_id: string;
  source_url: string;
  timestamp: string;
  extracted_at: string;
  confidence_score: number;
}

export default function DecisionsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractMessage, setExtractMessage] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchDecisions = async () => {
    try {
      const data = await api.get<Decision[]>(
        `/projects/${projectId}/decisions`
      );
      setDecisions(data);
    } catch (err) {
      console.error("Failed to load decisions", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, [projectId]);

  const handleExtract = async () => {
    setIsExtracting(true);
    setExtractMessage("");
    try {
      const result = await api.post<{ message: string; count: number }>(
        `/projects/${projectId}/decisions/extract`
      );
      setExtractMessage(result.message);
      await fetchDecisions();
    } catch (err) {
      console.error(err);
      setExtractMessage("Failed to extract decisions.");
    } finally {
      setIsExtracting(false);
      setTimeout(() => setExtractMessage(""), 5000);
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Decision Log</h1>
          <p className="text-sm text-[rgba(255,255,255,0.4)] mt-1">
            AI-extracted architectural and product decisions from your project
          </p>
        </div>
        <div className="flex items-center gap-3">
          {extractMessage && (
            <span className="text-sm text-[#818CF8] font-medium animate-pulse">
              {extractMessage}
            </span>
          )}
          <button
            onClick={handleExtract}
            disabled={isExtracting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isExtracting ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
            )}
            Extract Decisions
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2
            className="w-6 h-6 text-[#6366F1] animate-spin"
            strokeWidth={1.5}
          />
        </div>
      ) : decisions.length === 0 ? (
        <div className="glass p-12 text-center">
          <FileText
            className="w-10 h-10 text-[rgba(255,255,255,0.15)] mx-auto mb-4"
            strokeWidth={1.5}
          />
          <p className="text-[rgba(255,255,255,0.5)] mb-2">
            No decisions extracted yet.
          </p>
          <p className="text-sm text-[rgba(255,255,255,0.3)]">
            Click &quot;Extract Decisions&quot; to analyze your project knowledge
            base.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {decisions.map((d) => {
            const isExpanded = expandedIds.has(d.decision_id);
            const SourceIcon =
              d.source_type === "discord_message" ? Hash : FileCode2;
            return (
              <div key={d.decision_id} className="glass p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <SourceIcon
                        className="w-4 h-4 text-[#818CF8] shrink-0"
                        strokeWidth={1.5}
                      />
                      <span className="text-xs text-[rgba(255,255,255,0.4)]">
                        {d.source_id}
                      </span>
                    </div>
                    <p className="text-white font-medium">{d.decision_text}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        d.confidence_score >= 0.8
                          ? "bg-emerald-500/20 text-emerald-400"
                          : d.confidence_score >= 0.5
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {Math.round(d.confidence_score * 100)}%
                    </span>
                    <button
                      onClick={() => toggleExpand(d.decision_id)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[rgba(255,255,255,0.3)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
                      ) : (
                        <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] space-y-3">
                    {d.reasoning && (
                      <div>
                        <p className="text-xs font-medium text-[rgba(255,255,255,0.5)] mb-1">
                          Reasoning
                        </p>
                        <p className="text-sm text-[rgba(255,255,255,0.7)]">
                          {d.reasoning}
                        </p>
                      </div>
                    )}
                    {d.alternatives_considered.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-[rgba(255,255,255,0.5)] mb-1">
                          Alternatives Considered
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {d.alternatives_considered.map((alt, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-[rgba(255,255,255,0.06)] text-xs text-[rgba(255,255,255,0.5)]"
                            >
                              {alt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {d.participants.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-[rgba(255,255,255,0.5)] mb-1">
                          Participants
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {d.participants.map((p, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-[rgba(99,102,241,0.1)] text-xs text-[#818CF8]"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
