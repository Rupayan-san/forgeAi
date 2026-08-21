"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Loader2,
  Network,
  GitBranch,
  Layers,
  Maximize2,
  Move,
  Search,
  ArrowRightLeft,
  ZoomIn,
} from "lucide-react";
import { api } from "@/lib/api";
import { getSourceConfig } from "@/lib/sourceTypes";
import { applyDagreLayout } from "@/lib/graphLayout";

interface GraphNodeData {
  id: string;
  type: string;
  label: string;
  confidence_score?: number;
}

interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  relation: string;
}

interface GraphResponse {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

interface ArchNodeData {
  id: string;
  label: string;
  layer: "frontend" | "backend_api" | "backend_service" | "backend_core" | "external" | "unmatched";
  detail?: string;
}

interface ArchEdgeData {
  id: string;
  source: string;
  target: string;
  relation: string;
}

interface ArchResponse {
  nodes: ArchNodeData[];
  edges: ArchEdgeData[];
  warnings: string[];
}

const LAYER_COLORS: Record<ArchNodeData["layer"], string> = {
  frontend: "#6366f1",
  backend_api: "#10b981",
  backend_service: "#f59e0b",
  backend_core: "#22d3ee",
  external: "#a855f7",
  unmatched: "#ef4444",
};

const LAYER_LABELS: Record<ArchNodeData["layer"], string> = {
  frontend: "Frontend Page",
  backend_api: "Backend Endpoint",
  backend_service: "Backend Service",
  backend_core: "Backend Core/Model",
  external: "External System",
  unmatched: "⚠ Unmatched Call",
};

type ViewMode = "decisions" | "architecture";
type LayoutDirection = "LR" | "TB";

// ── Decision graph node builder (real project data) ──
function buildDecisionFlow(
  data: GraphResponse,
  direction: LayoutDirection
): { nodes: Node[]; edges: Edge[] } {
  const seenNodeIds = new Set<string>();
  const rfNodes: Node[] = [];
  for (const n of data.nodes) {
    if (!seenNodeIds.has(n.id)) {
      seenNodeIds.add(n.id);
      const config = getSourceConfig(n.type);
      const Icon = config.icon;
      rfNodes.push({
        id: n.id,
        position: { x: 0, y: 0 },
        data: {
          label: (
            <div className="flex items-center gap-2 text-left">
              <div
                className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                style={{ background: `${config.color}20` }}
              >
                <Icon className="w-3 h-3" style={{ color: config.color }} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] leading-tight select-none">{n.label}</span>
            </div>
          ),
        },
        style: {
          background: "#0a0a0a",
          border: `1px solid ${config.color}40`,
          borderRadius: 8,
          padding: "8px 10px",
          width: 260,
          color: "#fafafa",
          fontSize: 11,
        },
      });
    }
  }

  const seenEdgeIds = new Set<string>();
  const rfEdges: Edge[] = [];
  for (const e of data.edges) {
    if (!seenEdgeIds.has(e.id) && seenNodeIds.has(e.source) && seenNodeIds.has(e.target)) {
      seenEdgeIds.add(e.id);
      rfEdges.push({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.relation,
        type: "smoothstep",
        animated: e.relation === "derived_from",
        style: { stroke: "#262626" },
        labelBgStyle: { fill: "#0a0a0a" },
        labelStyle: { fill: "#525252", fontSize: 9 },
      });
    }
  }

  return { nodes: applyDagreLayout(rfNodes, rfEdges, direction), edges: rfEdges };
}

// ── Dynamic architecture graph node builder ──
function buildArchitectureFlow(
  data: ArchResponse,
  direction: LayoutDirection,
  activeLayers: Set<string>
): { nodes: Node[]; edges: Edge[] } {
  const filteredRawNodes = data.nodes.filter((n) => activeLayers.has(n.layer));
  const seenNodeIds = new Set<string>();
  const rfNodes: Node[] = [];

  for (const n of filteredRawNodes) {
    if (!seenNodeIds.has(n.id)) {
      seenNodeIds.add(n.id);
      const color = LAYER_COLORS[n.layer] || "#737373";
      rfNodes.push({
        id: n.id,
        position: { x: 0, y: 0 },
        data: {
          label: (
            <div className="text-left select-none">
              <div className="text-[11px] font-semibold leading-tight">{n.label}</div>
              {n.detail && (
                <div className="text-[9px] mt-0.5 opacity-60 leading-tight truncate">{n.detail}</div>
              )}
            </div>
          ),
        },
        style: {
          background: "#0a0a0a",
          border: `1.5px solid ${color}`,
          borderRadius: 8,
          padding: "8px 12px",
          width: 240,
          color: "#fafafa",
        },
      });
    }
  }

  const seenEdgeIds = new Set<string>();
  const rfEdges: Edge[] = [];

  for (const e of data.edges) {
    if (
      !seenEdgeIds.has(e.id) &&
      seenNodeIds.has(e.source) &&
      seenNodeIds.has(e.target)
    ) {
      seenEdgeIds.add(e.id);
      rfEdges.push({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        label: e.relation && e.relation.length > 20 ? "" : e.relation,
        animated: e.relation === "calls (unresolved)",
        style: {
          stroke: e.relation === "calls (unresolved)" ? "#ef4444" : "#262626",
          strokeWidth: e.relation === "calls (unresolved)" ? 1.8 : 1.2,
        },
        labelStyle: { fill: "#525252", fontSize: 9 },
      });
    }
  }

  return { nodes: applyDagreLayout(rfNodes, rfEdges, direction), edges: rfEdges };
}

function GraphCanvas({
  nodes,
  edges,
  viewKey,
  wheelMode,
}: {
  nodes: Node[];
  edges: Edge[];
  viewKey: string;
  wheelMode: "zoom" | "pan";
}) {
  const { fitView } = useReactFlow();

  // Trigger fit view whenever the node set or key changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ duration: 400, padding: 0.15 });
    }, 50);
    return () => clearTimeout(timer);
  }, [viewKey, fitView, nodes.length]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        key={viewKey}
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.02}
        maxZoom={2.5}
        panOnDrag={true}
        panOnScroll={wheelMode === "pan"}
        zoomOnScroll={wheelMode === "zoom"}
        zoomOnPinch={true}
        zoomOnDoubleClick={true}
        nodesDraggable={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1a1a1a" gap={20} size={1} />
        <Controls
          showInteractive={true}
          position="bottom-left"
          className="!bg-[#0a0a0a] !border-[#262626] [&>button]:!bg-[#0a0a0a] [&>button]:!border-[#262626] [&>button]:!text-[#fafafa] [&>button:hover]:!bg-[#171717]"
        />
        <MiniMap
          position="bottom-right"
          style={{ background: "#0a0a0a" }}
          maskColor="rgba(0,0,0,0.6)"
          nodeColor={(n) => (n.style?.border as string)?.split(" ")[2] || "#262626"}
        />
      </ReactFlow>
    </div>
  );
}

export default function GraphPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [view, setView] = useState<ViewMode>("decisions");
  const [direction, setDirection] = useState<LayoutDirection>("LR");
  const [wheelMode, setWheelMode] = useState<"zoom" | "pan">("zoom");

  const [data, setData] = useState<GraphResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [archData, setArchData] = useState<ArchResponse | null>(null);
  const [archLoading, setArchLoading] = useState(false);
  const [archError, setArchError] = useState("");

  const [activeLayers, setActiveLayers] = useState<Set<string>>(
    new Set([
      "frontend",
      "backend_api",
      "backend_service",
      "backend_core",
      "external",
      "unmatched",
    ])
  );

  const toggleLayer = (layer: string) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        if (next.size > 1) next.delete(layer); // keep at least one
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!projectId) return;
    api
      .get<GraphResponse>(`/projects/${projectId}/graph`)
      .then(setData)
      .catch((err) => setError(err.message || "Failed to load graph"))
      .finally(() => setIsLoading(false));
  }, [projectId]);

  useEffect(() => {
    if (view !== "architecture" || archData) return;
    setArchLoading(true);
    setArchError("");
    api
      .get<ArchResponse>(`/system/architecture`)
      .then(setArchData)
      .catch((err) => setArchError(err.message || "Failed to scan codebase"))
      .finally(() => setArchLoading(false));
  }, [view, archData]);

  const decisionFlow = useMemo(
    () => (data ? buildDecisionFlow(data, direction) : null),
    [data, direction]
  );

  const architectureFlow = useMemo(
    () =>
      archData
        ? buildArchitectureFlow(archData, direction, activeLayers)
        : null,
    [archData, direction, activeLayers]
  );

  const activeFlow = view === "decisions" ? decisionFlow : architectureFlow;
  const flowKey = `${view}-${direction}-${activeFlow?.nodes.length || 0}-${Array.from(activeLayers).join(",")}`;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen w-full bg-[#050505] overflow-hidden select-none">
      {/* Header with view toggle & controls */}
      <div className="shrink-0 px-6 py-3 border-b border-[#1a1a1a] flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[14px] font-medium text-[#fafafa] flex items-center gap-2">
            <Network className="w-4 h-4 text-[#10b981]" strokeWidth={1.5} />
            Knowledge Graph
          </h1>
          <p className="text-[11px] text-[#525252]">
            {view === "decisions"
              ? "Decisions connected to the files, messages, and people that produced them."
              : "How Forge is built — live AST & API scan across frontend, backend, and external systems."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Wheel mode toggle: Zoom vs Pan */}
          <div className="flex items-center rounded-md border border-[#1a1a1a] overflow-hidden bg-[#0a0a0a]">
            <button
              onClick={() => setWheelMode("zoom")}
              title="Mouse wheel zooms canvas"
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                wheelMode === "zoom"
                  ? "bg-[#171717] text-[#10b981]"
                  : "text-[#525252] hover:text-[#fafafa]"
              }`}
            >
              <ZoomIn className="w-3 h-3" />
              Wheel: Zoom
            </button>
            <button
              onClick={() => setWheelMode("pan")}
              title="Mouse wheel scrolls/pans canvas"
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                wheelMode === "pan"
                  ? "bg-[#171717] text-[#10b981]"
                  : "text-[#525252] hover:text-[#fafafa]"
              }`}
            >
              <Move className="w-3 h-3" />
              Wheel: Scroll
            </button>
          </div>

          {/* Direction toggle */}
          <button
            onClick={() => setDirection((prev) => (prev === "LR" ? "TB" : "LR"))}
            title="Toggle tree direction (Left-Right vs Top-Bottom)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border border-[#1a1a1a] bg-[#0a0a0a] text-[#737373] hover:text-[#fafafa] hover:bg-[#171717] transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-3 h-3" />
            {direction === "LR" ? "Horizontal" : "Vertical"}
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-md border border-[#1a1a1a] overflow-hidden">
            <button
              onClick={() => setView("decisions")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
                view === "decisions"
                  ? "bg-[#111111] text-[#fafafa]"
                  : "text-[#525252] hover:text-[#737373]"
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" strokeWidth={1.5} />
              Decisions
            </button>
            <button
              onClick={() => setView("architecture")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
                view === "architecture"
                  ? "bg-[#111111] text-[#fafafa]"
                  : "text-[#525252] hover:text-[#737373]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" strokeWidth={1.5} />
              Architecture
            </button>
          </div>
        </div>
      </div>

      {/* Interactive layer filter bar for architecture view */}
      {view === "architecture" && (
        <div className="shrink-0 px-6 py-2 border-b border-[#1a1a1a] flex items-center justify-between gap-4 flex-wrap bg-[#080808]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-[#525252] font-mono mr-1">Filter:</span>
            {(Object.keys(LAYER_LABELS) as (keyof typeof LAYER_LABELS)[]).map((key) => {
              const active = activeLayers.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleLayer(key)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border transition-all cursor-pointer ${
                    active
                      ? "bg-[#141414] text-[#fafafa] border-[#262626]"
                      : "bg-transparent text-[#404040] border-transparent opacity-40 hover:opacity-75"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-sm"
                    style={{ background: LAYER_COLORS[key] }}
                  />
                  <span>{LAYER_LABELS[key]}</span>
                </button>
              );
            })}
          </div>
          {archData?.warnings && archData.warnings.length > 0 && (
            <span className="text-[10px] text-amber-400 font-mono">
              ⚠ {archData.warnings.join(", ")}
            </span>
          )}
        </div>
      )}

      {/* Graph canvas */}
      {view === "decisions" && isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-[#10b981] animate-spin" strokeWidth={2} />
        </div>
      ) : view === "decisions" && error ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#ef4444] text-[13px]">{error}</p>
        </div>
      ) : view === "decisions" && (!data || data.nodes.length === 0) ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <Network className="w-8 h-8 text-[#262626] mb-3" strokeWidth={1.5} />
          <h2 className="text-[14px] font-semibold text-[#fafafa] mb-1">No graph data yet</h2>
          <p className="text-[#525252] text-[12px] max-w-sm">
            Extract decisions first from the Decision Log page.
          </p>
        </div>
      ) : view === "architecture" && archLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 text-[#10b981] animate-spin" strokeWidth={2} />
          <p className="text-[11px] text-[#525252] font-mono">
            Scanning backend AST & frontend route calls...
          </p>
        </div>
      ) : view === "architecture" && archError ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#ef4444] text-[13px]">{archError}</p>
        </div>
      ) : (
        <div className="flex-1 w-full h-full relative min-h-0">
          <ReactFlowProvider>
            <GraphCanvas
              nodes={activeFlow?.nodes || []}
              edges={activeFlow?.edges || []}
              viewKey={flowKey}
              wheelMode={wheelMode}
            />
          </ReactFlowProvider>
        </div>
      )}
    </div>
  );
}
