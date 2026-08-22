"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ScrollText,
  History,
  Edit3,
  Check,
  X,
  Loader2,
  Cpu,
  Layers,
  Code2,
  GitBranch,
  Globe,
  Palette,
  AlertOctagon,
  ArrowLeft,
} from "lucide-react";
import { useProjectStore } from "@/store/use-project-store";
import { useAuthStore } from "@/store/use-auth-store";
import { api } from "@/lib/api";
import {
  ProjectConstitution,
  ConstitutionSections,
  ConstitutionHistoryItem,
} from "@/types";

function formatDateTime(isoString: string): string {
  if (!isoString) return "Never";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Recently";
  }
}

// Tag input component for lists
function TagListEditor({
  label,
  tags,
  onChange,
  placeholder = "Add item and press Enter...",
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [inputVal, setInputVal] = useState("");

  const handleAdd = () => {
    const trimmed = inputVal.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputVal("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-medium text-[#a3a3a3]">{label}</label>
      <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-[#0d0d0d] border border-[#222] min-h-[42px] items-center">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1c1c1c] border border-[#2a2a2a] text-[11px] text-[#fafafa]"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="text-[#737373] hover:text-red-400 p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAdd}
          placeholder={tags.length === 0 ? placeholder : "+ Add another"}
          className="flex-1 min-w-[120px] bg-transparent text-[12px] text-[#fafafa] outline-none placeholder:text-[#525252] px-1"
        />
      </div>
    </div>
  );
}

export default function ConstitutionPage() {
  const params = useParams();
  const projectId = params.id as string;

  const currentProject = useProjectStore((state) => state.currentProject);
  const fetchProject = useProjectStore((state) => state.fetchProject);
  const user = useAuthStore((state) => state.user);

  const [constitution, setConstitution] = useState<ProjectConstitution | null>(null);
  const [history, setHistory] = useState<ConstitutionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistorySnapshot, setSelectedHistorySnapshot] = useState<ConstitutionHistoryItem | null>(null);

  // Edit form state
  const [editSections, setEditSections] = useState<ConstitutionSections | null>(null);
  const [changeSummary, setChangeSummary] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<"tech" | "arch" | "code" | "git" | "api" | "ui" | "rules">("tech");

  const isOwner =
    currentProject?.user_role === "owner" ||
    user?.user_id === currentProject?.owner_id ||
    (currentProject?.member_roles && user?.user_id && currentProject.member_roles[user.user_id] === "owner");

  const loadHistory = async () => {
    if (!projectId) return;
    try {
      const data = await api.get<ConstitutionHistoryItem[]>(`/projects/${projectId}/constitution/history`);
      setHistory(data || []);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId, true);
      api
        .get<ProjectConstitution>(`/projects/${projectId}/constitution`)
        .then(setConstitution)
        .catch((err) => console.error("Failed to load constitution:", err))
        .finally(() => setIsLoading(false));

      api
        .get<ConstitutionHistoryItem[]>(`/projects/${projectId}/constitution/history`)
        .then((data) => setHistory(data || []))
        .catch((err) => console.error("Failed to load history:", err));
    }
  }, [projectId, fetchProject]);

  const handleOpenEdit = () => {
    if (!constitution) return;
    setEditSections(JSON.parse(JSON.stringify(constitution.sections)));
    setChangeSummary("");
    setSaveError(null);
    setShowEditModal(true);
  };

  const handleSaveConstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSections) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const updated = await api.put<ProjectConstitution>(`/projects/${projectId}/constitution`, {
        sections: editSections,
        change_summary: changeSummary.trim() || undefined,
      });
      setConstitution(updated);
      setShowEditModal(false);
      await loadHistory();
    } catch (err: unknown) {
      console.error("Failed to save constitution:", err);
      setSaveError((err as Error).message || "Failed to save constitution.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 text-[#10b981] animate-spin" strokeWidth={2} />
      </div>
    );
  }

  const s = selectedHistorySnapshot ? selectedHistorySnapshot.sections : constitution?.sections;
  const currentVersion = selectedHistorySnapshot ? selectedHistorySnapshot.version : constitution?.version || 1;
  const isViewingHistory = !!selectedHistorySnapshot;

  return (
    <div className="p-6 lg:p-8 max-w-[1100px] space-y-6">
      {/* Top Navigation & Back */}
      <div className="flex items-center justify-between">
        <Link
          href={`/project/${projectId}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-[#737373] hover:text-[#fafafa] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to {currentProject?.name || "Workspace"}
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#262626] bg-[#111] text-[#a3a3a3] hover:text-[#fafafa] text-[12px] font-medium transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            History ({history.length + 1})
          </button>
          {isOwner && (
            <button
              onClick={handleOpenEdit}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#10b981] hover:bg-[#059669] text-white text-[12px] font-medium transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Constitution
            </button>
          )}
        </div>
      </div>

      {/* Snapshot Viewing Notice */}
      {isViewingHistory && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-300 text-[12px]">
            <History className="w-4 h-4 shrink-0" />
            <span>
              Viewing historical snapshot <strong>v{selectedHistorySnapshot.version}</strong> (from{" "}
              {formatDateTime(selectedHistorySnapshot.updated_at)})
            </span>
          </div>
          <button
            onClick={() => setSelectedHistorySnapshot(null)}
            className="text-[11px] text-amber-200 underline font-medium cursor-pointer"
          >
            Return to Active v{constitution?.version}
          </button>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="surface p-6 border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-[#0d0d0d] to-[#080808] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-[#10b981]">
            <ScrollText className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-[#fafafa] tracking-tight">Project Constitution</h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v{currentVersion}
              </span>
              <span className="text-[11px] text-[#737373] font-mono">Authoritative Technical Agreement</span>
            </div>
            <p className="text-[#a3a3a3] text-[13px] mt-1 max-w-2xl">
              The authoritative set of architecture decisions, coding rules, git protocols, and technology agreements
              for <strong className="text-[#fafafa]">{currentProject?.name}</strong>. Grounded as primary context for
              Forge AI.
            </p>
            <div className="flex items-center gap-3 text-[11px] text-[#525252] mt-2">
              <span>Updated: {formatDateTime(constitution?.updated_at || "")}</span>
              <span>·</span>
              <span>Updated by: {constitution?.updated_by || "System"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7 Constitution Section Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Technology Stack */}
        <div className="surface p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2.5">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h2 className="text-[14px] font-semibold text-[#fafafa]">1. Technology Stack</h2>
          </div>
          <div className="space-y-2 text-[12px]">
            <div>
              <span className="text-[#737373] block text-[11px] font-medium mb-1">Languages:</span>
              {s?.technology.languages && s.technology.languages.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {s.technology.languages.map((l, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-[#141414] border border-[#262626] text-[#fafafa] font-mono text-[11px]">
                      {l}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[#525252] italic">Not specified</span>
              )}
            </div>
            <div>
              <span className="text-[#737373] block text-[11px] font-medium mb-1">Frameworks:</span>
              {s?.technology.frameworks && s.technology.frameworks.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {s.technology.frameworks.map((f, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-[#141414] border border-[#262626] text-[#fafafa] font-mono text-[11px]">
                      {f}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[#525252] italic">Not specified</span>
              )}
            </div>
            <div>
              <span className="text-[#737373] block text-[11px] font-medium mb-1">Databases:</span>
              {s?.technology.databases && s.technology.databases.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {s.technology.databases.map((d, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-[#141414] border border-[#262626] text-[#fafafa] font-mono text-[11px]">
                      {d}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[#525252] italic">Not specified</span>
              )}
            </div>
            {s?.technology.notes && (
              <p className="text-[#737373] text-[11px] pt-1 border-t border-[#141414]">
                <strong className="text-[#a3a3a3]">Notes:</strong> {s.technology.notes}
              </p>
            )}
          </div>
        </div>

        {/* 2. Architecture */}
        <div className="surface p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2.5">
            <Layers className="w-4 h-4 text-purple-400" />
            <h2 className="text-[14px] font-semibold text-[#fafafa]">2. Architecture Rules</h2>
          </div>
          <div className="space-y-2 text-[12px]">
            <div>
              <span className="text-[#737373] text-[11px] font-medium">Style: </span>
              <span className="text-[#fafafa] font-semibold">{s?.architecture.style || "Unspecified"}</span>
            </div>
            <div>
              <span className="text-[#737373] block text-[11px] font-medium mb-1">Core Architecture Rules:</span>
              {s?.architecture.rules && s.architecture.rules.length > 0 ? (
                <ul className="space-y-1">
                  {s.architecture.rules.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[#d4d4d4]">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-[#525252] italic">No rules defined yet</span>
              )}
            </div>
            {s?.architecture.notes && (
              <p className="text-[#737373] text-[11px] pt-1 border-t border-[#141414]">
                <strong className="text-[#a3a3a3]">Notes:</strong> {s.architecture.notes}
              </p>
            )}
          </div>
        </div>

        {/* 3. Coding Standards */}
        <div className="surface p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2.5">
            <Code2 className="w-4 h-4 text-blue-400" />
            <h2 className="text-[14px] font-semibold text-[#fafafa]">3. Coding Standards</h2>
          </div>
          <div className="space-y-2 text-[12px]">
            <div>
              <span className="text-[#737373] block text-[11px] font-medium mb-1">Naming & Conventions:</span>
              {s?.coding_standards.naming_conventions && s.coding_standards.naming_conventions.length > 0 ? (
                <ul className="space-y-1">
                  {s.coding_standards.naming_conventions.map((n, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[#d4d4d4]">
                      <span className="text-blue-400 font-mono text-[11px]">•</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-[#525252] italic">Not specified</span>
              )}
            </div>
            <div>
              <span className="text-[#737373] block text-[11px] font-medium mb-1">Error Handling:</span>
              {s?.coding_standards.error_handling && s.coding_standards.error_handling.length > 0 ? (
                <ul className="space-y-1">
                  {s.coding_standards.error_handling.map((e, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[#d4d4d4]">
                      <span className="text-blue-400 font-mono text-[11px]">•</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-[#525252] italic">Not specified</span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Git Workflow */}
        <div className="surface p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2.5">
            <GitBranch className="w-4 h-4 text-amber-400" />
            <h2 className="text-[14px] font-semibold text-[#fafafa]">4. Git Workflow</h2>
          </div>
          <div className="space-y-2 text-[12px]">
            <div>
              <span className="text-[#737373] text-[11px] font-medium">Merge Strategy: </span>
              <span className="text-[#fafafa] font-semibold">{s?.git_workflow.merge_strategy || "Unspecified"}</span>
            </div>
            <div>
              <span className="text-[#737373] block text-[11px] font-medium mb-1">Branch Naming:</span>
              {s?.git_workflow.branch_naming && s.git_workflow.branch_naming.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {s.git_workflow.branch_naming.map((b, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-[#141414] border border-[#262626] text-[#fafafa] font-mono text-[11px]">
                      {b}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[#525252] italic">Not specified</span>
              )}
            </div>
            <div>
              <span className="text-[#737373] block text-[11px] font-medium mb-1">Commit Conventions:</span>
              {s?.git_workflow.commit_conventions && s.git_workflow.commit_conventions.length > 0 ? (
                <ul className="space-y-1">
                  {s.git_workflow.commit_conventions.map((c, i) => (
                    <li key={i} className="text-[#d4d4d4] font-mono text-[11px]">
                      {c}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-[#525252] italic">Not specified</span>
              )}
            </div>
          </div>
        </div>

        {/* 5. API Conventions */}
        <div className="surface p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2.5">
            <Globe className="w-4 h-4 text-teal-400" />
            <h2 className="text-[14px] font-semibold text-[#fafafa]">5. API Conventions</h2>
          </div>
          <div className="space-y-2 text-[12px]">
            <div>
              <span className="text-[#737373] text-[11px] font-medium">Style: </span>
              <span className="text-[#fafafa] font-semibold">{s?.api_conventions.style || "REST"}</span>
            </div>
            <div>
              <span className="text-[#737373] block text-[11px] font-medium mb-1">Endpoint Naming:</span>
              {s?.api_conventions.endpoint_naming && s.api_conventions.endpoint_naming.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {s.api_conventions.endpoint_naming.map((ep, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-[#141414] border border-[#262626] text-[#fafafa] font-mono text-[11px]">
                      {ep}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[#525252] italic">Not specified</span>
              )}
            </div>
          </div>
        </div>

        {/* 6. Design & UI Conventions */}
        <div className="surface p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2.5">
            <Palette className="w-4 h-4 text-pink-400" />
            <h2 className="text-[14px] font-semibold text-[#fafafa]">6. Design / UI Conventions</h2>
          </div>
          <div className="space-y-2 text-[12px]">
            <div>
              <span className="text-[#737373] block text-[11px] font-medium mb-1">Component & Styling Rules:</span>
              {s?.design_ui_conventions.styling_conventions && s.design_ui_conventions.styling_conventions.length > 0 ? (
                <ul className="space-y-1">
                  {s.design_ui_conventions.styling_conventions.map((sc, i) => (
                    <li key={i} className="text-[#d4d4d4]">
                      • {sc}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-[#525252] italic">Not specified</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 7. General Rules & Restrictions (Full Width) */}
      <div className="surface p-5 space-y-3 border-red-500/20 bg-gradient-to-r from-red-950/10 via-transparent to-transparent">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2.5">
          <AlertOctagon className="w-4 h-4 text-red-400" />
          <h2 className="text-[14px] font-semibold text-[#fafafa]">7. General Rules & Hard Restrictions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
          <div>
            <span className="text-[#737373] block text-[11px] font-medium mb-1.5">Strict Restrictions:</span>
            {s?.general_rules.restrictions && s.general_rules.restrictions.length > 0 ? (
              <ul className="space-y-1.5">
                {s.general_rules.restrictions.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-red-300 bg-red-950/20 p-2 rounded border border-red-500/20">
                    <X className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-[#525252] italic">No hard restrictions specified</span>
            )}
          </div>
          <div>
            <span className="text-[#737373] block text-[11px] font-medium mb-1.5">Custom Agreements:</span>
            {s?.general_rules.custom_rules && s.general_rules.custom_rules.length > 0 ? (
              <ul className="space-y-1.5">
                {s.general_rules.custom_rules.map((cr, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-emerald-300 bg-emerald-950/20 p-2 rounded border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{cr}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-[#525252] italic">No custom agreements specified</span>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal (Owners only) */}
      {showEditModal && editSections && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="surface w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl overflow-hidden border border-[#2a2a2a] shadow-2xl animate-scale-in">
            <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#111]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#10b981]" />
                <h2 className="text-[14px] font-semibold text-[#fafafa]">
                  Edit Project Constitution (v{constitution?.version} → v{(constitution?.version || 1) + 1})
                </h2>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-[#737373] hover:text-[#fafafa] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section tabs */}
            <div className="flex border-b border-[#222] px-4 overflow-x-auto bg-[#0a0a0a]">
              {[
                { id: "tech", label: "1. Technology" },
                { id: "arch", label: "2. Architecture" },
                { id: "code", label: "3. Coding" },
                { id: "git", label: "4. Git" },
                { id: "api", label: "5. API" },
                { id: "ui", label: "6. Design/UI" },
                { id: "rules", label: "7. General Rules" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setEditTab(tab.id as "tech" | "arch" | "code" | "git" | "api" | "ui" | "rules")}
                  className={`py-2.5 px-3 text-[12px] font-medium border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                    editTab === tab.id
                      ? "border-[#10b981] text-[#fafafa]"
                      : "border-transparent text-[#737373] hover:text-[#a3a3a3]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {editTab === "tech" && (
                <div className="space-y-4">
                  <TagListEditor
                    label="Programming Languages"
                    tags={editSections.technology.languages}
                    onChange={(tags) =>
                      setEditSections({
                        ...editSections,
                        technology: { ...editSections.technology, languages: tags },
                      })
                    }
                    placeholder="e.g. TypeScript, Python, Rust"
                  />
                  <TagListEditor
                    label="Frameworks & Libraries"
                    tags={editSections.technology.frameworks}
                    onChange={(tags) =>
                      setEditSections({
                        ...editSections,
                        technology: { ...editSections.technology, frameworks: tags },
                      })
                    }
                    placeholder="e.g. Next.js, FastAPI, TailwindCSS"
                  />
                  <TagListEditor
                    label="Databases & Storage"
                    tags={editSections.technology.databases}
                    onChange={(tags) =>
                      setEditSections({
                        ...editSections,
                        technology: { ...editSections.technology, databases: tags },
                      })
                    }
                    placeholder="e.g. MongoDB, Qdrant, Redis"
                  />
                  <div>
                    <label className="block text-[12px] font-medium text-[#a3a3a3] mb-1">Notes / Additional Specs</label>
                    <textarea
                      value={editSections.technology.notes || ""}
                      onChange={(e) =>
                        setEditSections({
                          ...editSections,
                          technology: { ...editSections.technology, notes: e.target.value },
                        })
                      }
                      className="forge-input w-full p-2 text-[12px] min-h-[60px]"
                      placeholder="Additional stack notes..."
                    />
                  </div>
                </div>
              )}

              {editTab === "arch" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#a3a3a3] mb-1">Architectural Style</label>
                    <input
                      type="text"
                      value={editSections.architecture.style || ""}
                      onChange={(e) =>
                        setEditSections({
                          ...editSections,
                          architecture: { ...editSections.architecture, style: e.target.value },
                        })
                      }
                      className="forge-input w-full px-3 py-2 text-[12px]"
                      placeholder="e.g. Clean Architecture, Modular Monolith, Microservices"
                    />
                  </div>
                  <TagListEditor
                    label="Core Architecture Rules"
                    tags={editSections.architecture.rules}
                    onChange={(tags) =>
                      setEditSections({
                        ...editSections,
                        architecture: { ...editSections.architecture, rules: tags },
                      })
                    }
                    placeholder="e.g. Service layer required for business logic"
                  />
                  <TagListEditor
                    label="Service Boundaries & Layers"
                    tags={editSections.architecture.service_boundaries}
                    onChange={(tags) =>
                      setEditSections({
                        ...editSections,
                        architecture: { ...editSections.architecture, service_boundaries: tags },
                      })
                    }
                    placeholder="e.g. API -> Service -> Database"
                  />
                </div>
              )}

              {editTab === "code" && (
                <div className="space-y-4">
                  <TagListEditor
                    label="Naming Conventions"
                    tags={editSections.coding_standards.naming_conventions}
                    onChange={(tags) =>
                      setEditSections({
                        ...editSections,
                        coding_standards: { ...editSections.coding_standards, naming_conventions: tags },
                      })
                    }
                    placeholder="e.g. camelCase for TS variables, snake_case for Python"
                  />
                  <TagListEditor
                    label="Error Handling Guidelines"
                    tags={editSections.coding_standards.error_handling}
                    onChange={(tags) =>
                      setEditSections({
                        ...editSections,
                        coding_standards: { ...editSections.coding_standards, error_handling: tags },
                      })
                    }
                    placeholder="e.g. Catch unknown types and use explicit status codes"
                  />
                </div>
              )}

              {editTab === "git" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#a3a3a3] mb-1">Merge Strategy</label>
                    <input
                      type="text"
                      value={editSections.git_workflow.merge_strategy || ""}
                      onChange={(e) =>
                        setEditSections({
                          ...editSections,
                          git_workflow: { ...editSections.git_workflow, merge_strategy: e.target.value },
                        })
                      }
                      className="forge-input w-full px-3 py-2 text-[12px]"
                      placeholder="e.g. Squash and merge, Rebase, Linear history"
                    />
                  </div>
                  <TagListEditor
                    label="Branch Naming Conventions"
                    tags={editSections.git_workflow.branch_naming}
                    onChange={(tags) =>
                      setEditSections({
                        ...editSections,
                        git_workflow: { ...editSections.git_workflow, branch_naming: tags },
                      })
                    }
                    placeholder="e.g. feature/*, fix/*, chore/*"
                  />
                  <TagListEditor
                    label="Commit Conventions"
                    tags={editSections.git_workflow.commit_conventions}
                    onChange={(tags) =>
                      setEditSections({
                        ...editSections,
                        git_workflow: { ...editSections.git_workflow, commit_conventions: tags },
                      })
                    }
                    placeholder="e.g. Conventional Commits (feat, fix, docs)"
                  />
                </div>
              )}

              {editTab === "api" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[#a3a3a3] mb-1">API Paradigm / Style</label>
                    <input
                      type="text"
                      value={editSections.api_conventions.style || "REST"}
                      onChange={(e) =>
                        setEditSections({
                          ...editSections,
                          api_conventions: { ...editSections.api_conventions, style: e.target.value },
                        })
                      }
                      className="forge-input w-full px-3 py-2 text-[12px]"
                      placeholder="e.g. REST, GraphQL, gRPC"
                    />
                  </div>
                  <TagListEditor
                    label="Endpoint Naming Rules"
                    tags={editSections.api_conventions.endpoint_naming}
                    onChange={(tags) =>
                      setEditSections({
                        ...editSections,
                        api_conventions: { ...editSections.api_conventions, endpoint_naming: tags },
                      })
                    }
                    placeholder="e.g. /api/v1/{plural-resources}, kebab-case routes"
                  />
                </div>
              )}

              {editTab === "ui" && (
                <div className="space-y-4">
                  <TagListEditor
                    label="Styling & Design System Conventions"
                    tags={editSections.design_ui_conventions.styling_conventions}
                    onChange={(tags) =>
                      setEditSections({
                        ...editSections,
                        design_ui_conventions: { ...editSections.design_ui_conventions, styling_conventions: tags },
                      })
                    }
                    placeholder="e.g. TailwindCSS v4, Dark mode first, Glassmorphism"
                  />
                  <TagListEditor
                    label="State Management Rules"
                    tags={editSections.design_ui_conventions.state_management}
                    onChange={(tags) =>
                      setEditSections({
                        ...editSections,
                        design_ui_conventions: { ...editSections.design_ui_conventions, state_management: tags },
                      })
                    }
                    placeholder="e.g. Zustand stores for global state"
                  />
                </div>
              )}

              {editTab === "rules" && (
                <div className="space-y-4">
                  <TagListEditor
                    label="Strict Technical Restrictions"
                    tags={editSections.general_rules.restrictions}
                    onChange={(tags) =>
                      setEditSections({
                        ...editSections,
                        general_rules: { ...editSections.general_rules, restrictions: tags },
                      })
                    }
                    placeholder="e.g. No raw database queries from API controllers"
                  />
                  <TagListEditor
                    label="Custom Team Agreements"
                    tags={editSections.general_rules.custom_rules}
                    onChange={(tags) =>
                      setEditSections({
                        ...editSections,
                        general_rules: { ...editSections.general_rules, custom_rules: tags },
                      })
                    }
                    placeholder="e.g. All backend endpoints must have automated pytest coverage"
                  />
                </div>
              )}

              {/* Change summary */}
              <div className="pt-3 border-t border-[#222]">
                <label className="block text-[12px] font-medium text-[#10b981] mb-1">
                  Change Summary (Recorded in Version History)
                </label>
                <input
                  type="text"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder="e.g. Added PostgreSQL to stack and updated commit conventions"
                  className="forge-input w-full px-3 py-2 text-[12px]"
                />
              </div>

              {saveError && <p className="text-red-400 text-[12px]">{saveError}</p>}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#222] bg-[#111] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-3 py-1.5 rounded-md border border-[#262626] text-[#737373] hover:text-[#fafafa] text-[12px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConstitution}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#10b981] hover:bg-[#059669] text-white text-[12px] font-medium transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Publish Version {(constitution?.version || 1) + 1}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="surface w-full max-w-lg max-h-[80vh] flex flex-col rounded-xl overflow-hidden border border-[#2a2a2a] shadow-2xl animate-scale-in">
            <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#111]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#10b981]" />
                <h2 className="text-[14px] font-semibold text-[#fafafa]">Constitution Version History</h2>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-[#737373] hover:text-[#fafafa] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {/* Active version */}
              <div className="p-3 rounded-lg bg-[#0e0e0e] border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-mono font-semibold text-[12px]">
                      v{constitution?.version}
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.25 rounded font-mono">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-[#737373] mt-1">
                    Updated {formatDateTime(constitution?.updated_at || "")} by {constitution?.updated_by}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedHistorySnapshot(null);
                    setShowHistoryModal(false);
                  }}
                  className="px-2.5 py-1 rounded bg-[#1c1c1c] text-[#fafafa] text-[11px] font-medium hover:bg-[#282828] cursor-pointer"
                >
                  View Active
                </button>
              </div>

              {/* Historical versions */}
              {history.map((item) => (
                <div
                  key={item.id || item.version}
                  className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1f1f1f] flex items-center justify-between"
                >
                  <div>
                    <span className="text-[#a3a3a3] font-mono font-semibold text-[12px]">v{item.version}</span>
                    <p className="text-[12px] text-[#fafafa] mt-0.5">
                      {item.change_summary || "Constitution update"}
                    </p>
                    <p className="text-[10px] text-[#525252] mt-0.5">
                      {formatDateTime(item.updated_at)} by {item.updated_by}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedHistorySnapshot(item);
                      setShowHistoryModal(false);
                    }}
                    className="px-2.5 py-1 rounded bg-[#141414] text-[#a3a3a3] hover:text-[#fafafa] border border-[#262626] text-[11px] font-medium cursor-pointer"
                  >
                    View Snapshot
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
