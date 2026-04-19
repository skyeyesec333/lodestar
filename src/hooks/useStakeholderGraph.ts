"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import type { StakeholderRow } from "@/lib/db/stakeholders";
import type { FunderRelationshipRow } from "@/lib/db/funders";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import { saveStakeholderGraphLayout } from "@/actions/projects";

export type HealthStatus = "active" | "stale" | "blocked";

export type CounterpartyNodeData = {
  role: string;
  name: string;
  jurisdiction?: string;
  status: HealthStatus;
  lastContact?: string;
  isSpv?: boolean;
  scoreBps?: number;
  organizationId?: string;
  linkedRequirementCount?: number;
  /** Index among counterparties (0-based). SPV has -1. Used by the component for stagger delay. */
  stackIndex: number;
  [key: string]: unknown;
};

export type HealthEdgeData = {
  status: HealthStatus;
  primary?: boolean;
  animated?: boolean;
  label?: string;
  lastContactISO?: string | null;
  linkedRequirementCount?: number;
  [key: string]: unknown;
};

export type OrgDetail = {
  organizationId: string;
  name: string;
  role: string;
  jurisdiction: string | null;
  status: HealthStatus;
  lastContactAt: Date | null;
  stakeholders: Array<{
    id: string;
    name: string;
    title: string | null;
    email: string | null;
  }>;
  blockingRequirements: Array<{
    projectRequirementId: string;
    name: string;
    status: string;
    targetDate: Date | null;
  }>;
  linkedRequirementCount: number;
};

export type StakeholderGraphInput = {
  projectId: string;
  projectName: string;
  readinessBps: number | null;
  stakeholders: StakeholderRow[];
  funderRelationships: FunderRelationshipRow[];
  requirements: ProjectRequirementRow[];
  graphLayout: Record<string, { x: number; y: number }> | null;
};

export type UseStakeholderGraphResult = {
  nodes: Node<CounterpartyNodeData>[];
  edges: Edge<HealthEdgeData>[];
  onNodesChange: OnNodesChange<Node<CounterpartyNodeData>>;
  onEdgesChange: OnEdgesChange<Edge<HealthEdgeData>>;
  isEmpty: boolean;
  selectedOrgId: string | null;
  selectedOrg: OrgDetail | null;
  openCounterparty: (organizationId: string) => void;
  closeCounterparty: () => void;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const SPV_ID = "spv";
const SPV_POSITION = { x: 400, y: 250 };
const STALE_THRESHOLD_MS = 10 * 24 * 60 * 60 * 1000;
const SAVE_DEBOUNCE_MS = 800;

const ROLE_LABELS: Record<string, string> = {
  epc_contact:        "EPC",
  offtaker_contact:   "Off-taker",
  legal_counsel:      "Legal",
  exim_officer:       "EXIM",
  government_liaison: "Government",
  financial_advisor:  "Advisor",
  community_rep:      "Community",
  sponsor_team:       "Sponsor",
  other:              "Counterparty",
};

const FUNDER_TYPE_LABELS: Record<string, string> = {
  exim:            "EXIM",
  dfi:             "DFI",
  commercial_bank: "Commercial Bank",
  equity:          "Equity",
  mezzanine:       "Mezzanine",
  other:           "Funder",
};

// ── Derivation helpers ────────────────────────────────────────────────────────

type OrgAggregate = {
  organizationId: string;
  name: string;
  jurisdiction: string | null;
  funderType: string | null;
  roleCounts: Map<string, number>;
  lastContactAt: Date | null;
  stakeholders: Array<{
    id: string;
    name: string;
    title: string | null;
    email: string | null;
  }>;
};

function dateMax(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

function formatRelativeDays(date: Date | null): string | undefined {
  if (!date) return undefined;
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return undefined;
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function mostCommonKey(map: Map<string, number>): string | null {
  let best: string | null = null;
  let bestCount = -1;
  for (const [key, count] of map) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

function buildOrgAggregates(
  stakeholders: StakeholderRow[],
  funderRelationships: FunderRelationshipRow[]
): Map<string, OrgAggregate> {
  const orgs = new Map<string, OrgAggregate>();

  for (const s of stakeholders) {
    if (!s.organizationId) continue;
    let agg = orgs.get(s.organizationId);
    if (!agg) {
      agg = {
        organizationId: s.organizationId,
        name: s.organizationName ?? "Unknown",
        jurisdiction: s.organizationCountryCode ?? null,
        funderType: null,
        roleCounts: new Map(),
        lastContactAt: null,
        stakeholders: [],
      };
      orgs.set(s.organizationId, agg);
    }
    if (s.organizationName && agg.name === "Unknown") agg.name = s.organizationName;
    if (s.organizationCountryCode && !agg.jurisdiction) agg.jurisdiction = s.organizationCountryCode;
    agg.roleCounts.set(s.roleType, (agg.roleCounts.get(s.roleType) ?? 0) + 1);
    agg.lastContactAt = dateMax(agg.lastContactAt, s.lastContactAt);
    agg.stakeholders.push({ id: s.id, name: s.name, title: s.title, email: s.email });
  }

  for (const fr of funderRelationships) {
    let agg = orgs.get(fr.organizationId);
    if (!agg) {
      agg = {
        organizationId: fr.organizationId,
        name: fr.organizationName,
        jurisdiction: null,
        funderType: fr.funderType,
        roleCounts: new Map(),
        lastContactAt: null,
        stakeholders: [],
      };
      orgs.set(fr.organizationId, agg);
    } else if (!agg.funderType) {
      agg.funderType = fr.funderType;
    }
    agg.lastContactAt = dateMax(agg.lastContactAt, fr.lastContactDate);
  }

  return orgs;
}

type OrgMetrics = {
  linkedRequirementCount: number;
  hasBlocker: boolean;
  blockingRequirements: OrgDetail["blockingRequirements"];
};

const TERMINAL_STATUSES = new Set(["executed", "waived", "not_applicable"]);

function computeOrgMetrics(
  orgId: string,
  orgStakeholderIds: Set<string>,
  requirements: ProjectRequirementRow[],
  today: Date
): OrgMetrics {
  let linked = 0;
  const blockers: OrgDetail["blockingRequirements"] = [];
  for (const r of requirements) {
    const matchesOrg = r.responsibleOrganizationId === orgId;
    const matchesStakeholder = r.responsibleStakeholderId
      ? orgStakeholderIds.has(r.responsibleStakeholderId)
      : false;
    if (!matchesOrg && !matchesStakeholder) continue;
    linked++;
    if (
      !TERMINAL_STATUSES.has(r.status) &&
      r.targetDate !== null &&
      r.targetDate.getTime() < today.getTime()
    ) {
      blockers.push({
        projectRequirementId: r.projectRequirementId,
        name: r.name,
        status: r.status,
        targetDate: r.targetDate,
      });
    }
  }
  return { linkedRequirementCount: linked, hasBlocker: blockers.length > 0, blockingRequirements: blockers };
}

function roleLabelFor(agg: OrgAggregate): string {
  if (agg.funderType && FUNDER_TYPE_LABELS[agg.funderType]) {
    return FUNDER_TYPE_LABELS[agg.funderType];
  }
  const key = mostCommonKey(agg.roleCounts);
  if (key && ROLE_LABELS[key]) return ROLE_LABELS[key];
  return "Counterparty";
}

function deriveStatus(
  hasBlocker: boolean,
  lastContactAt: Date | null,
  now: Date
): HealthStatus {
  if (hasBlocker) return "blocked";
  if (!lastContactAt || now.getTime() - lastContactAt.getTime() > STALE_THRESHOLD_MS) return "stale";
  return "active";
}

function radialPosition(index: number, total: number): { x: number; y: number } {
  const radius = Math.max(180, 120 + total * 18);
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: Math.round(SPV_POSITION.x + radius * Math.cos(angle)),
    y: Math.round(SPV_POSITION.y + radius * Math.sin(angle)),
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useStakeholderGraph(
  input: StakeholderGraphInput
): UseStakeholderGraphResult {
  const {
    projectId,
    projectName,
    readinessBps,
    stakeholders,
    funderRelationships,
    requirements,
    graphLayout,
  } = input;

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  // Build deterministic node/edge arrays from the server data.
  const { initialNodes, initialEdges, orgDetails } = useMemo(() => {
    const now = new Date();
    const orgs = buildOrgAggregates(stakeholders, funderRelationships);
    const orgList = Array.from(orgs.values()).sort((a, b) => a.name.localeCompare(b.name));
    const layoutMap = graphLayout ?? {};

    const nodes: Node<CounterpartyNodeData>[] = [];
    const edges: Edge<HealthEdgeData>[] = [];
    const details: Record<string, OrgDetail> = {};

    // SPV node
    const spvPosition = layoutMap[SPV_ID] ?? SPV_POSITION;
    nodes.push({
      id: SPV_ID,
      type: "spv",
      position: spvPosition,
      draggable: true,
      data: {
        role: "Project SPV",
        name: projectName,
        status: "active",
        isSpv: true,
        scoreBps: readinessBps ?? undefined,
        stackIndex: -1,
      },
    });

    orgList.forEach((agg, i) => {
      const orgStakeholderIds = new Set(agg.stakeholders.map((s) => s.id));
      const metrics = computeOrgMetrics(agg.organizationId, orgStakeholderIds, requirements, now);
      const status = deriveStatus(metrics.hasBlocker, agg.lastContactAt, now);
      const role = roleLabelFor(agg);
      const position = layoutMap[agg.organizationId] ?? radialPosition(i, orgList.length);

      nodes.push({
        id: agg.organizationId,
        type: "counterparty",
        position,
        draggable: true,
        data: {
          role,
          name: agg.name,
          jurisdiction: agg.jurisdiction ?? undefined,
          status,
          lastContact: formatRelativeDays(agg.lastContactAt),
          organizationId: agg.organizationId,
          linkedRequirementCount: metrics.linkedRequirementCount,
          stackIndex: i,
        },
      });

      edges.push({
        id: `e-${SPV_ID}-${agg.organizationId}`,
        source: agg.organizationId,
        target: SPV_ID,
        sourceHandle: "r",
        targetHandle: "l",
        type: "health",
        data: {
          status,
          primary: true,
          animated: status === "active",
          lastContactISO: agg.lastContactAt ? agg.lastContactAt.toISOString() : null,
          linkedRequirementCount: metrics.linkedRequirementCount,
        },
      });

      details[agg.organizationId] = {
        organizationId: agg.organizationId,
        name: agg.name,
        role,
        jurisdiction: agg.jurisdiction,
        status,
        lastContactAt: agg.lastContactAt,
        stakeholders: agg.stakeholders,
        blockingRequirements: metrics.blockingRequirements,
        linkedRequirementCount: metrics.linkedRequirementCount,
      };
    });

    return { initialNodes: nodes, initialEdges: edges, orgDetails: details };
  }, [stakeholders, funderRelationships, requirements, graphLayout, projectName, readinessBps]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CounterpartyNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<HealthEdgeData>>(initialEdges);

  // Resync local state when server data changes (parent re-fetches).
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Debounced position save.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestNodesRef = useRef(nodes);
  latestNodesRef.current = nodes;

  const flushSave = useCallback(() => {
    const layout: Record<string, { x: number; y: number }> = {};
    for (const n of latestNodesRef.current) {
      layout[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) };
    }
    saveStakeholderGraphLayout({ projectId, layout }).catch(() => {
      /* silent — dragging shouldn't surface errors; a hard failure would require toast */
    });
  }, [projectId]);

  const wrappedOnNodesChange = useCallback<OnNodesChange<Node<CounterpartyNodeData>>>(
    (changes) => {
      onNodesChange(changes);
      const touchesPosition = changes.some(
        (c) => c.type === "position" && c.dragging !== true && c.position !== undefined
      );
      if (!touchesPosition) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
    },
    [onNodesChange, flushSave]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const openCounterparty = useCallback((organizationId: string) => {
    setSelectedOrgId(organizationId);
  }, []);
  const closeCounterparty = useCallback(() => {
    setSelectedOrgId(null);
  }, []);

  const selectedOrg = selectedOrgId ? orgDetails[selectedOrgId] ?? null : null;
  const isEmpty = initialNodes.length <= 1; // only SPV

  return {
    nodes,
    edges,
    onNodesChange: wrappedOnNodesChange,
    onEdgesChange,
    isEmpty,
    selectedOrgId,
    selectedOrg,
    openCounterparty,
    closeCounterparty,
  };
}
