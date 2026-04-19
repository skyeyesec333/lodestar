"use client";

import { useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  getBezierPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type EdgeMouseHandler,
} from "@xyflow/react";
import { motion } from "framer-motion";
import { useStakeholderGraph } from "@/hooks/useStakeholderGraph";
import type {
  CounterpartyNodeData,
  HealthEdgeData,
  HealthStatus,
} from "@/hooks/useStakeholderGraph";
import type { StakeholderRow } from "@/lib/db/stakeholders";
import type { FunderRelationshipRow } from "@/lib/db/funders";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import { EmptyState } from "@/components/ui/EmptyState";
import { CounterpartyDetailSheet } from "@/components/projects/CounterpartyDetailSheet";

const HEALTH_COLOR: Record<HealthStatus, string> = {
  active:  "var(--teal)",
  stale:   "var(--gold)",
  blocked: "var(--accent)",
};

const HEALTH_LABEL: Record<HealthStatus, string> = {
  active:  "Active",
  stale:   "Stale",
  blocked: "Blocked",
};

const HEALTH_DETAIL: Record<HealthStatus, string> = {
  active:  "Recent contact · healthy",
  stale:   "No contact in 10+ days",
  blocked: "Overdue requirement",
};

const HOUSE_EASE = [0.16, 1, 0.3, 1] as const;

// ── Nodes ─────────────────────────────────────────────────────────────────────

function SpvNode({ data }: NodeProps<Node<CounterpartyNodeData>>) {
  const scorePct = data.scoreBps != null ? Math.round(data.scoreBps / 100) : null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: HOUSE_EASE, delay: 0.14 }}
      style={{
        borderRadius: "12px",
        padding: "12px 16px",
        minWidth: "210px",
        background: "var(--ink)",
        color: "#ffffff",
        border: "1px solid var(--ink)",
        boxShadow:
          "0 10px 24px rgba(0,0,0,0.18), 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="l" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="r" style={{ opacity: 0 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "6px" }}>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--accent)",
          }}
        >
          Project SPV
        </span>
        {scorePct !== null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              flexShrink: 0,
              background: "color-mix(in srgb, var(--gold) 18%, transparent)",
              color: "var(--gold)",
              border: "1px solid color-mix(in srgb, var(--gold) 40%, transparent)",
            }}
          >
            <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "14px", lineHeight: 1 }}>
              {scorePct}
            </span>
          </div>
        )}
      </div>
      <div
        style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: "17px",
          lineHeight: 1.2,
          color: "#ffffff",
          letterSpacing: "-0.01em",
        }}
      >
        {data.name}
      </div>
    </motion.div>
  );
}

function CounterpartyNode({ data }: NodeProps<Node<CounterpartyNodeData>>) {
  const color = HEALTH_COLOR[data.status];
  const delay = 0.14 + Math.max(0, data.stackIndex) * 0.08;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: HOUSE_EASE, delay }}
      style={{
        borderRadius: "12px",
        padding: "10px 14px",
        minWidth: "170px",
        background: "var(--bg-card)",
        border: `1px solid ${data.status === "blocked" ? color : "var(--border)"}`,
        boxShadow:
          data.status === "blocked"
            ? `0 4px 14px color-mix(in srgb, ${color} 18%, transparent)`
            : "0 4px 12px rgba(0,0,0,0.06)",
        cursor: "pointer",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="l" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="r" style={{ opacity: 0 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "8px",
            fontWeight: 500,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
          }}
        >
          {data.role}
        </span>
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            flexShrink: 0,
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: color,
            boxShadow:
              data.status === "blocked"
                ? `0 0 0 3px color-mix(in srgb, ${color} 25%, transparent)`
                : undefined,
          }}
        />
      </div>

      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          fontWeight: 600,
          lineHeight: 1.3,
          color: "var(--ink)",
          letterSpacing: "-0.01em",
        }}
      >
        {data.name}
      </div>

      {data.jurisdiction && (
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "8px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            marginTop: "3px",
          }}
        >
          {data.jurisdiction}
        </div>
      )}

      {data.lastContact && (
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "8px",
            letterSpacing: "0.10em",
            color,
            fontWeight: 500,
            marginTop: "5px",
          }}
        >
          {data.lastContact}
        </div>
      )}
    </motion.div>
  );
}

// ── Edges ─────────────────────────────────────────────────────────────────────

function HealthEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<Edge<HealthEdgeData>>) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.22,
  });

  const status = data?.status ?? "active";
  const color = HEALTH_COLOR[status];
  const primary = data?.primary ?? false;
  const animated = data?.animated ?? false;

  return (
    <>
      <path
        id={id}
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={primary ? 1.8 : 1.2}
        strokeOpacity={primary ? 0.75 : 0.45}
        strokeDasharray={status === "stale" ? "5 4" : undefined}
        style={{ transition: "stroke 0.3s ease, stroke-opacity 0.3s ease" }}
      />
      {animated && (
        <circle r="3" fill={color} opacity={0.9}>
          <animateMotion dur="3.2s" repeatCount="indefinite" path={path} />
        </circle>
      )}
      {data?.label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 8,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fill: color,
            fontWeight: 500,
            pointerEvents: "none",
          }}
        >
          {data.label}
        </text>
      )}
    </>
  );
}

const nodeTypes = {
  spv: SpvNode,
  counterparty: CounterpartyNode,
};
const edgeTypes = {
  health: HealthEdge,
};

// ── Legend ────────────────────────────────────────────────────────────────────

function GraphLegend() {
  const items: HealthStatus[] = ["active", "stale", "blocked"];
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "22px",
        padding: "14px 20px",
        borderTop: "1px solid var(--border)",
        background: "color-mix(in srgb, var(--bg) 55%, var(--bg-card))",
      }}
    >
      {items.map((s) => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: HEALTH_COLOR[s] }} />
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--ink)",
            }}
          >
            {HEALTH_LABEL[s]}
          </span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink-muted)" }}>
            {HEALTH_DETAIL[s]}
          </span>
        </div>
      ))}
      <span style={{ flex: 1 }} />
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
        }}
      >
        Drag nodes · health updates live
      </span>
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

type EdgeTooltip = {
  x: number;
  y: number;
  lastContactISO: string | null | undefined;
  linkedRequirementCount: number | undefined;
};

function formatTooltipDate(iso: string | null | undefined): string {
  if (!iso) return "No contact on file";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Last contact: today";
  if (days === 1) return "Last contact: 1d ago";
  if (days < 30) return `Last contact: ${days}d ago`;
  return `Last contact: ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  projectId: string;
  projectSlug: string;
  projectName: string;
  readinessBps: number | null;
  stakeholders: StakeholderRow[];
  funderRelationships: FunderRelationshipRow[];
  requirements: ProjectRequirementRow[];
  graphLayout: Record<string, { x: number; y: number }> | null;
};

export function StakeholderGraph({
  projectId,
  projectSlug,
  projectName,
  readinessBps,
  stakeholders,
  funderRelationships,
  requirements,
  graphLayout,
}: Props) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    isEmpty,
    selectedOrg,
    openCounterparty,
    closeCounterparty,
  } = useStakeholderGraph({
    projectId,
    projectName,
    readinessBps,
    stakeholders,
    funderRelationships,
    requirements,
    graphLayout,
  });

  const [hoveredEdge, setHoveredEdge] = useState<EdgeTooltip | null>(null);

  if (isEmpty) {
    return (
      <EmptyState
        headline="No counterparties yet"
        body="Add stakeholders or funder relationships to map this project."
        ctaLabel="Add stakeholder"
        ctaHref={`/projects/${projectSlug}/parties`}
      />
    );
  }

  const onEdgeMouseEnter: EdgeMouseHandler<Edge<HealthEdgeData>> = (event, edge) => {
    setHoveredEdge({
      x: event.clientX,
      y: event.clientY,
      lastContactISO: edge.data?.lastContactISO,
      linkedRequirementCount: edge.data?.linkedRequirementCount,
    });
  };

  const onEdgeMouseLeave: EdgeMouseHandler<Edge<HealthEdgeData>> = () => {
    setHoveredEdge(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: HOUSE_EASE }}
      style={{
        position: "relative",
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
      }}
    >
      <div style={{ height: "540px", position: "relative" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.14 }}
          panOnDrag
          panOnScroll={false}
          zoomOnScroll
          zoomOnPinch
          zoomOnDoubleClick
          elementsSelectable
          edgesFocusable
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, node) => {
            if (node.data?.isSpv) return;
            const orgId = node.data?.organizationId;
            if (orgId) openCounterparty(orgId);
          }}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
        >
          <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="var(--border)" />
          <Controls
            position="bottom-right"
            showInteractive={false}
            className="ls-graph-controls"
          />
        </ReactFlow>

        {hoveredEdge && (
          <div
            role="tooltip"
            style={{
              position: "fixed",
              left: hoveredEdge.x + 12,
              top: hoveredEdge.y + 12,
              pointerEvents: "none",
              zIndex: 50,
              background: "var(--ink)",
              color: "var(--bg-card)",
              border: "1px solid var(--ink)",
              borderRadius: "4px",
              padding: "6px 10px",
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.06em",
              boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
            }}
          >
            <div>{formatTooltipDate(hoveredEdge.lastContactISO)}</div>
            <div>
              {hoveredEdge.linkedRequirementCount ?? 0} requirement
              {(hoveredEdge.linkedRequirementCount ?? 0) === 1 ? "" : "s"}
            </div>
          </div>
        )}
      </div>

      <GraphLegend />

      {selectedOrg && (
        <CounterpartyDetailSheet
          org={selectedOrg}
          projectSlug={projectSlug}
          onClose={closeCounterparty}
        />
      )}
    </motion.div>
  );
}
