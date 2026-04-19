"use client";

import { useState, useTransition } from "react";
import {
  addFunderRelationship,
  setFunderStage,
  editFunderDetails,
  removeFunderRelationship,
  addCondition,
  setConditionStatus,
  removeCondition,
  confirmCpSatisfaction,
  requestCpEvidence,
} from "@/actions/funders";
import type { FunderRelationshipRow, FunderConditionRow } from "@/lib/db/funders";
import { CapitalStackBar } from "@/components/projects/CapitalStackBar";
import { FunderKanban } from "@/components/projects/FunderKanban";
import { FunderPipelineFunnel } from "@/components/projects/FunderPipelineFunnel";
import { DebtTranchePanel } from "@/components/projects/DebtTranchePanel";
import type { DebtTrancheRow } from "@/lib/db/debt-tranches";
import { toast } from "@/lib/ui/toast";

type EngagementStage =
  | "identified"
  | "initial_contact"
  | "due_diligence"
  | "term_sheet"
  | "committed"
  | "declined";

const STAGE_LABELS_SHORT: Record<EngagementStage, string> = {
  identified:      "Identified",
  initial_contact: "In Contact",
  due_diligence:   "Due Diligence",
  term_sheet:      "Term Sheet",
  committed:       "Committed",
  declined:        "Declined",
};

// ── Label / style constants ───────────────────────────────────────────────────

const FUNDER_TYPE_LABELS: Record<string, string> = {
  exim:            "EXIM Bank",
  dfi:             "DFI",
  commercial_bank: "Commercial Bank",
  equity:          "Equity",
  mezzanine:       "Mezzanine",
  other:           "Other",
};

const FUNDER_TYPE_COLOR: Record<string, string> = {
  exim:            "var(--teal)",
  dfi:             "var(--gold)",
  commercial_bank: "var(--ink-mid)",
  equity:          "var(--gold)",
  mezzanine:       "var(--ink-mid)",
  other:           "var(--ink-muted)",
};

const FUNDER_TYPE_BG: Record<string, string> = {
  exim:            "var(--teal-soft)",
  dfi:             "var(--gold-soft)",
  commercial_bank: "var(--bg)",
  equity:          "var(--gold-soft)",
  mezzanine:       "var(--bg)",
  other:           "var(--bg)",
};

const STAGE_LABELS: Record<string, string> = {
  identified:      "Identified",
  initial_contact: "Initial Contact",
  due_diligence:   "Due Diligence",
  term_sheet:      "Term Sheet",
  committed:       "Committed",
  declined:        "Declined",
};

const STAGE_COLOR: Record<string, string> = {
  identified:      "var(--ink-muted)",
  initial_contact: "var(--ink-mid)",
  due_diligence:   "var(--gold)",
  term_sheet:      "var(--teal)",
  committed:       "var(--teal)",
  declined:        "var(--accent)",
};

const STAGE_BG: Record<string, string> = {
  identified:      "var(--bg)",
  initial_contact: "var(--bg)",
  due_diligence:   "var(--gold-soft)",
  term_sheet:      "var(--teal-soft)",
  committed:       "var(--teal-soft)",
  declined:        "var(--accent-soft)",
};

const CONDITION_STATUS_LABELS: Record<string, string> = {
  open:        "Open",
  in_progress: "In Progress",
  satisfied:   "Satisfied",
  waived:      "Waived",
};

const CONDITION_STATUS_COLOR: Record<string, string> = {
  open:        "var(--ink-muted)",
  in_progress: "var(--gold)",
  satisfied:   "var(--teal)",
  waived:      "var(--ink-muted)",
};

const CONDITION_STATUS_BG: Record<string, string> = {
  open:        "var(--bg)",
  in_progress: "var(--gold-soft)",
  satisfied:   "var(--teal-soft)",
  waived:      "var(--bg)",
};

// ── Shared style helpers ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "var(--ink)",
  backgroundColor: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "7px 10px",
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "9px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  display: "block",
  marginBottom: "5px",
};

// ── Utility helpers ───────────────────────────────────────────────────────────

function formatUsd(cents: number | null): string {
  if (cents == null) return "—";
  const millions = cents / 100_000_000;
  if (millions >= 1) return `$${millions.toFixed(0)}M`;
  const thousands = cents / 100_000;
  if (thousands >= 1) return `$${thousands.toFixed(0)}K`;
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysSince(d: Date | null): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
}

function daysUntil(d: Date | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
}

function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function toISOOrNull(s: string): string | null {
  if (!s) return null;
  // date-input gives YYYY-MM-DD; append time for datetime
  return new Date(s).toISOString();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FunderTypeBadge({ type }: { type: string }) {
  return (
    <span
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px",
        fontWeight: 500,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: FUNDER_TYPE_COLOR[type] ?? "var(--ink-muted)",
        backgroundColor: FUNDER_TYPE_BG[type] ?? "var(--bg)",
        border: `1px solid ${FUNDER_TYPE_COLOR[type] ?? "var(--border)"}`,
        borderRadius: "3px",
        padding: "2px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {FUNDER_TYPE_LABELS[type] ?? type}
    </span>
  );
}

function StageBadge({ stage }: { stage: string }) {
  return (
    <span
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px",
        fontWeight: 500,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: STAGE_COLOR[stage] ?? "var(--ink-muted)",
        backgroundColor: STAGE_BG[stage] ?? "var(--bg)",
        border: `1px solid ${STAGE_COLOR[stage] ?? "var(--border)"}`,
        borderRadius: "3px",
        padding: "2px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {STAGE_LABELS[stage] ?? stage}
    </span>
  );
}

function ConditionStatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px",
        fontWeight: 500,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: CONDITION_STATUS_COLOR[status] ?? "var(--ink-muted)",
        backgroundColor: CONDITION_STATUS_BG[status] ?? "var(--bg)",
        border: `1px solid ${CONDITION_STATUS_COLOR[status] ?? "var(--border)"}`,
        borderRadius: "3px",
        padding: "2px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {CONDITION_STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── State types ───────────────────────────────────────────────────────────────

type AddFunderForm = {
  organizationName: string;
  funderType: string;
  engagementStage: string;
  amountUsdCents: string;
  lastContactDate: string;
  nextFollowupDate: string;
  notes: string;
};

const BLANK_ADD_FORM: AddFunderForm = {
  organizationName: "",
  funderType: "exim",
  engagementStage: "identified",
  amountUsdCents: "",
  lastContactDate: "",
  nextFollowupDate: "",
  notes: "",
};

type StageEditState = {
  relationshipId: string;
  engagementStage: string;
  notes: string;
  lastContactDate: string;
  nextFollowupDate: string;
};

type DetailsEditState = {
  relationshipId: string;
  amountUsdCents: string;
  notes: string;
  lastContactDate: string;
  nextFollowupDate: string;
};

type ConditionFormState = {
  relationshipId: string;
  description: string;
  projectRequirementId: string;
  dueDate: string;
};

// ── Main component ────────────────────────────────────────────────────────────

export function FunderWorkspace({
  projectId,
  slug,
  initialFunders,
  requirements,
  stakeholders = [],
  capexUsdCents = null,
  debtTranches = [],
}: {
  projectId: string;
  slug: string;
  initialFunders: FunderRelationshipRow[];
  requirements: Array<{ requirementId: string; name: string }>;
  stakeholders?: Array<{ id: string; name: string }>;
  capexUsdCents?: number | null;
  debtTranches?: DebtTrancheRow[];
}) {
  const [funders, setFunders] = useState<FunderRelationshipRow[]>(initialFunders);
  const [pipelineView, setPipelineView] = useState<"kanban" | "funnel">("kanban");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddFunderForm>(BLANK_ADD_FORM);
  const [addError, setAddError] = useState<string | null>(null);

  const [stageEdit, setStageEdit] = useState<StageEditState | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);

  const [detailsEdit, setDetailsEdit] = useState<DetailsEditState | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [conditionForm, setConditionForm] = useState<ConditionFormState | null>(null);
  const [conditionError, setConditionError] = useState<string | null>(null);

  // Evidence request form: keyed by conditionId
  const [evidenceFormId, setEvidenceFormId] = useState<string | null>(null);
  const [evidenceStakeholderId, setEvidenceStakeholderId] = useState("");
  const [evidenceDueAt, setEvidenceDueAt] = useState("");
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // ── Staleness check ───────────────────────────────────────────────────────

  const staleCount = funders.filter((f) => {
    if (f.engagementStage === "committed" || f.engagementStage === "declined") return false;
    const days = daysSince(f.lastContactDate);
    return days !== null && days > 30;
  }).length;
  const activeFunders = funders.filter(
    (f) => f.engagementStage !== "committed" && f.engagementStage !== "declined"
  );
  const openConditionCount = funders.reduce(
    (sum, funder) =>
      sum +
      funder.conditions.filter(
        (condition) => condition.status === "open" || condition.status === "in_progress"
      ).length,
    0
  );
  const followupsDueSoon = funders.filter((funder) => {
    const days = daysUntil(funder.nextFollowupDate);
    return days !== null && days >= 0 && days <= 7;
  }).length;
  const committedCount = funders.filter((funder) => funder.engagementStage === "committed").length;

  // ── Add funder ────────────────────────────────────────────────────────────

  function handleAdd() {
    setAddError(null);
    const amountUsdCents = addForm.amountUsdCents.trim()
      ? Math.round(parseFloat(addForm.amountUsdCents) * 1_000_000)
      : null;

    startTransition(async () => {
      const result = await addFunderRelationship({
        projectId,
        slug,
        organizationName: addForm.organizationName.trim(),
        funderType: addForm.funderType,
        engagementStage: addForm.engagementStage || undefined,
        amountUsdCents,
        notes: addForm.notes.trim() || null,
        lastContactDate: toISOOrNull(addForm.lastContactDate),
        nextFollowupDate: toISOOrNull(addForm.nextFollowupDate),
      });

      if (!result.ok) {
        setAddError(result.error.message);
        return;
      }

      setAddForm(BLANK_ADD_FORM);
      setShowAddForm(false);
      window.location.reload();
    });
  }

  // ── Drag-to-change stage (from Kanban) ────────────────────────────────────

  function handleStageDrop(funderId: string, newStage: EngagementStage) {
    const current = funders.find((f) => f.id === funderId);
    if (!current) return;
    const previousStage = current.engagementStage;
    if (previousStage === newStage) return;

    setFunders((prev) =>
      prev.map((f) => (f.id === funderId ? { ...f, engagementStage: newStage } : f))
    );

    startTransition(async () => {
      const result = await setFunderStage({
        relationshipId: funderId,
        slug,
        engagementStage: newStage,
      });
      if (!result.ok) {
        setFunders((prev) =>
          prev.map((f) => (f.id === funderId ? { ...f, engagementStage: previousStage } : f))
        );
        toast.error(result.error.message);
        return;
      }
      toast.success(`Moved to ${STAGE_LABELS_SHORT[newStage] ?? newStage}`);
    });
  }

  // ── Stage edit ────────────────────────────────────────────────────────────

  function handleStageSave() {
    if (!stageEdit) return;
    setStageError(null);
    startTransition(async () => {
      const result = await setFunderStage({
        relationshipId: stageEdit.relationshipId,
        slug,
        engagementStage: stageEdit.engagementStage,
        notes: stageEdit.notes || undefined,
        lastContactDate: toISOOrNull(stageEdit.lastContactDate),
        nextFollowupDate: toISOOrNull(stageEdit.nextFollowupDate),
      });

      if (!result.ok) {
        setStageError(result.error.message);
        return;
      }

      setFunders((prev) =>
        prev.map((f) =>
          f.id === stageEdit.relationshipId
            ? {
                ...f,
                engagementStage: stageEdit.engagementStage,
                notes: stageEdit.notes || f.notes,
                lastContactDate: stageEdit.lastContactDate
                  ? new Date(stageEdit.lastContactDate)
                  : f.lastContactDate,
                nextFollowupDate: stageEdit.nextFollowupDate
                  ? new Date(stageEdit.nextFollowupDate)
                  : f.nextFollowupDate,
              }
            : f
        )
      );
      setStageEdit(null);
    });
  }

  // ── Details edit ──────────────────────────────────────────────────────────

  function handleDetailsSave() {
    if (!detailsEdit) return;
    setDetailsError(null);
    const amountUsdCents = detailsEdit.amountUsdCents.trim()
      ? Math.round(parseFloat(detailsEdit.amountUsdCents) * 1_000_000)
      : null;

    startTransition(async () => {
      const result = await editFunderDetails({
        relationshipId: detailsEdit.relationshipId,
        slug,
        amountUsdCents,
        notes: detailsEdit.notes.trim() || null,
        lastContactDate: toISOOrNull(detailsEdit.lastContactDate),
        nextFollowupDate: toISOOrNull(detailsEdit.nextFollowupDate),
      });

      if (!result.ok) {
        setDetailsError(result.error.message);
        return;
      }

      setFunders((prev) =>
        prev.map((f) =>
          f.id === detailsEdit.relationshipId
            ? {
                ...f,
                amountUsdCents,
                notes: detailsEdit.notes.trim() || null,
                lastContactDate: detailsEdit.lastContactDate
                  ? new Date(detailsEdit.lastContactDate)
                  : null,
                nextFollowupDate: detailsEdit.nextFollowupDate
                  ? new Date(detailsEdit.nextFollowupDate)
                  : null,
              }
            : f
        )
      );
      setDetailsEdit(null);
    });
  }

  // ── Remove funder ─────────────────────────────────────────────────────────

  function handleRemoveFunder(relationshipId: string, orgName: string) {
    if (!confirm(`Remove "${orgName}" from the funder list? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await removeFunderRelationship({ relationshipId, slug });
      if (!result.ok) return;
      setFunders((prev) => prev.filter((f) => f.id !== relationshipId));
    });
  }

  // ── Add condition ─────────────────────────────────────────────────────────

  function handleAddCondition() {
    if (!conditionForm) return;
    setConditionError(null);
    startTransition(async () => {
      const result = await addCondition({
        funderRelationshipId: conditionForm.relationshipId,
        slug,
        description: conditionForm.description.trim(),
        projectRequirementId: conditionForm.projectRequirementId || null,
        dueDate: toISOOrNull(conditionForm.dueDate),
      });

      if (!result.ok) {
        setConditionError(result.error.message);
        return;
      }

      setConditionForm(null);
      window.location.reload();
    });
  }

  // ── Condition status ──────────────────────────────────────────────────────

  function handleMarkSatisfied(condition: FunderConditionRow, funderRelId: string) {
    if (!confirm(`Mark "${condition.description}" as satisfied?`)) return;
    startTransition(async () => {
      const result = await confirmCpSatisfaction({ conditionId: condition.id, slug });
      if (!result.ok) return;
      setFunders((prev) =>
        prev.map((f) =>
          f.id === funderRelId
            ? {
                ...f,
                conditions: f.conditions.map((c) =>
                  c.id === condition.id
                    ? { ...c, status: "satisfied", satisfiedAt: new Date() }
                    : c
                ),
              }
            : f
        )
      );
    });
  }

  function handleRequestEvidence(conditionId: string) {
    setEvidenceFormId(conditionId);
    setEvidenceStakeholderId("");
    setEvidenceDueAt("");
    setEvidenceError(null);
  }

  function handleSubmitEvidenceRequest(conditionId: string) {
    if (!evidenceStakeholderId || !evidenceDueAt) {
      setEvidenceError("Select a stakeholder and a due date.");
      return;
    }
    setEvidenceError(null);
    startTransition(async () => {
      const result = await requestCpEvidence({
        conditionId,
        slug,
        assigneeStakeholderId: evidenceStakeholderId,
        dueAt: new Date(evidenceDueAt),
      });
      if (!result.ok) {
        setEvidenceError(result.error.message);
        return;
      }
      setEvidenceFormId(null);
    });
  }

  function handleConditionDone(condition: FunderConditionRow, funderRelId: string) {
    startTransition(async () => {
      const result = await setConditionStatus({
        conditionId: condition.id,
        slug,
        status: "satisfied",
        satisfiedAt: new Date().toISOString(),
      });
      if (!result.ok) return;

      setFunders((prev) =>
        prev.map((f) =>
          f.id === funderRelId
            ? {
                ...f,
                conditions: f.conditions.map((c) =>
                  c.id === condition.id
                    ? { ...c, status: "satisfied", satisfiedAt: new Date() }
                    : c
                ),
              }
            : f
        )
      );
    });
  }

  // ── Remove condition ──────────────────────────────────────────────────────

  function handleRemoveCondition(conditionId: string, funderRelId: string) {
    if (!confirm("Remove this condition? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await removeCondition({ conditionId, slug });
      if (!result.ok) return;
      setFunders((prev) =>
        prev.map((f) =>
          f.id === funderRelId
            ? { ...f, conditions: f.conditions.filter((c) => c.id !== conditionId) }
            : f
        )
      );
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section
      id="section-funders"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "28px 32px",
        marginBottom: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div>
          <p className="eyebrow" style={{ marginBottom: "4px" }}>
            Funder Workspace
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink-muted)",
              margin: 0,
            }}
          >
            Track engagement stage and open conditions for each financing party.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          disabled={isPending}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: showAddForm ? "var(--ink-muted)" : "var(--teal)",
            backgroundColor: "transparent",
            border: `1px solid ${showAddForm ? "var(--border)" : "var(--teal)"}`,
            borderRadius: "3px",
            padding: "6px 14px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {showAddForm ? "Cancel" : "+ Add Funder"}
        </button>
      </div>

      {/* Staleness alert banner */}
      {staleCount > 0 && (
        <div
          style={{
            backgroundColor: "var(--gold-soft)",
            border: "1px solid var(--gold)",
            borderRadius: "3px",
            padding: "10px 16px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink)",
            }}
          >
            <strong>{staleCount} funder{staleCount !== 1 ? "s" : ""}</strong> ha{staleCount !== 1 ? "ve" : "s"} had no contact in over 30 days. Review and schedule follow-ups.
          </span>
        </div>
      )}

      {/* Capital stack visualization */}
      {funders.length > 0 && (
        <CapitalStackBar
          tranches={funders.map((f) => ({
            relationshipId: f.id,
            organizationName: f.organizationName,
            funderType: f.funderType,
            engagementStage: f.engagementStage,
            amountUsdCents: f.amountUsdCents,
            openConditionCount: f.conditions.filter(
              (c) => c.status === "open" || c.status === "in_progress"
            ).length,
          }))}
          capexUsdCents={capexUsdCents}
        />
      )}

      {/* Debt tranches */}
      <DebtTranchePanel
        projectId={projectId}
        slug={slug}
        initialTranches={debtTranches}
        funders={funders.map((f) => ({ id: f.id, name: f.organizationName }))}
      />

      {funders.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          {[
            { label: "Active counterparties", value: activeFunders.length, tone: "var(--ink)" },
            { label: "Open conditions", value: openConditionCount, tone: openConditionCount > 0 ? "var(--gold)" : "var(--teal)" },
            { label: "Follow-ups due", value: followupsDueSoon, tone: followupsDueSoon > 0 ? "var(--gold)" : "var(--teal)" },
            { label: "Committed", value: committedCount, tone: committedCount > 0 ? "var(--teal)" : "var(--ink-muted)" },
          ].map((metric) => (
            <div
              key={metric.label}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "12px 14px",
                backgroundColor: "color-mix(in srgb, var(--bg) 60%, var(--bg-card))",
              }}
            >
              <p style={{ ...labelStyle, marginBottom: "8px" }}>{metric.label}</p>
              <p
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "28px",
                  lineHeight: 1,
                  color: metric.tone,
                  margin: 0,
                }}
              >
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {funders.length > 0 && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "16px 16px 4px",
            backgroundColor: "color-mix(in srgb, var(--bg) 55%, var(--bg-card))",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="eyebrow" style={{ marginBottom: "4px" }}>
                Counterparty pipeline
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "var(--ink-mid)",
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {pipelineView === "kanban"
                  ? "Use the lane view to see where counterparties are clustering and which ones need movement now."
                  : "Funnel view highlights stage-to-stage drop-off across the pipeline."}
              </p>
            </div>
            <div
              role="tablist"
              aria-label="Pipeline view"
              style={{
                display: "flex",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                padding: "2px",
                backgroundColor: "var(--bg-card)",
                flexShrink: 0,
              }}
            >
              {(["kanban", "funnel"] as const).map((view) => {
                const active = pipelineView === view;
                return (
                  <button
                    key={view}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setPipelineView(view)}
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      fontWeight: 500,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      padding: "5px 12px",
                      borderRadius: "999px",
                      border: "none",
                      cursor: "pointer",
                      color: active ? "var(--text-inverse)" : "var(--ink-muted)",
                      backgroundColor: active ? "var(--teal)" : "transparent",
                      transition: "background-color 150ms cubic-bezier(0.16, 1, 0.3, 1), color 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    {view === "kanban" ? "Kanban" : "Funnel"}
                  </button>
                );
              })}
            </div>
          </div>
          {pipelineView === "funnel" ? (
            <FunderPipelineFunnel funders={funders} />
          ) : (
          <FunderKanban
            funders={funders}
            onSelectFunder={(funderId) => {
              const selected = funders.find((funder) => funder.id === funderId);
              if (!selected) return;
              setDetailsEdit({
                relationshipId: selected.id,
                amountUsdCents:
                  selected.amountUsdCents != null
                    ? String(selected.amountUsdCents / 1_000_000)
                    : "",
                notes: selected.notes ?? "",
                lastContactDate: toDateInputValue(selected.lastContactDate),
                nextFollowupDate: toDateInputValue(selected.nextFollowupDate),
              });
              setStageEdit(null);
              requestAnimationFrame(() => {
                document.getElementById(`funder-card-${selected.id}`)?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
              });
            }}
            onStageChange={handleStageDrop}
          />
          )}
        </div>
      )}

      {/* Add funder form */}
      {showAddForm && (
        <div
          style={{
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: "0 0 16px",
            }}
          >
            New Funder
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Organization Name *</label>
              <input
                style={inputStyle}
                value={addForm.organizationName}
                onChange={(e) => setAddForm((p) => ({ ...p, organizationName: e.target.value }))}
                placeholder="e.g. US International Development Finance Corp"
              />
            </div>

            <div>
              <label style={labelStyle}>Funder Type *</label>
              <select
                style={inputStyle}
                value={addForm.funderType}
                onChange={(e) => setAddForm((p) => ({ ...p, funderType: e.target.value }))}
              >
                {Object.entries(FUNDER_TYPE_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Engagement Stage</label>
              <select
                style={inputStyle}
                value={addForm.engagementStage}
                onChange={(e) => setAddForm((p) => ({ ...p, engagementStage: e.target.value }))}
              >
                {Object.entries(STAGE_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Amount ($M)</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="0.1"
                value={addForm.amountUsdCents}
                onChange={(e) => setAddForm((p) => ({ ...p, amountUsdCents: e.target.value }))}
                placeholder="e.g. 200"
              />
            </div>

            <div>
              <label style={labelStyle}>Last Contact Date</label>
              <input
                style={inputStyle}
                type="date"
                value={addForm.lastContactDate}
                onChange={(e) => setAddForm((p) => ({ ...p, lastContactDate: e.target.value }))}
              />
            </div>

            <div>
              <label style={labelStyle}>Next Follow-up Date</label>
              <input
                style={inputStyle}
                type="date"
                value={addForm.nextFollowupDate}
                onChange={(e) => setAddForm((p) => ({ ...p, nextFollowupDate: e.target.value }))}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                style={{ ...inputStyle, minHeight: "72px", resize: "vertical" }}
                value={addForm.notes}
                onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Initial observations, intro contact, etc."
              />
            </div>
          </div>

          {addError && (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                color: "var(--accent)",
                margin: "10px 0 0",
              }}
            >
              {addError}
            </p>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              onClick={handleAdd}
              disabled={isPending || !addForm.organizationName.trim()}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--bg)",
                backgroundColor: isPending ? "var(--ink-muted)" : "var(--teal)",
                border: "none",
                borderRadius: "3px",
                padding: "8px 18px",
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              {isPending ? "Saving…" : "Add Funder"}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setAddForm(BLANK_ADD_FORM); setAddError(null); }}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                padding: "8px 18px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Funder cards */}
      {funders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {funders.map((funder) => {
            const isEditingStage   = stageEdit?.relationshipId === funder.id;
            const isEditingDetails = detailsEdit?.relationshipId === funder.id;
            const isAddingCondition = conditionForm?.relationshipId === funder.id;

            const contactDays  = daysSince(funder.lastContactDate);
            const followupDays = daysUntil(funder.nextFollowupDate);

            const contactStale =
              contactDays !== null &&
              contactDays > 30 &&
              funder.engagementStage !== "committed" &&
              funder.engagementStage !== "declined";

            const followupSoon     = followupDays !== null && followupDays >= 0 && followupDays <= 7;
            const followupOverdue  = followupDays !== null && followupDays < 0;

            return (
              <div
                key={funder.id}
                id={`funder-card-${funder.id}`}
                style={{
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "3px",
                  padding: "16px 20px",
                }}
              >
                {/* Card header row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    {/* Name + badges */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "var(--ink)",
                        }}
                      >
                        {funder.organizationName}
                      </span>
                      <FunderTypeBadge type={funder.funderType} />
                      <StageBadge stage={funder.engagementStage} />
                    </div>

                    {/* Metadata row */}
                    <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: funder.notes ? "8px" : "0" }}>
                      <div>
                        <p style={{ ...labelStyle, marginBottom: "2px" }}>Amount</p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 500, color: "var(--ink)", margin: 0 }}>
                          {formatUsd(funder.amountUsdCents)}
                        </p>
                      </div>
                      <div>
                        <p style={{ ...labelStyle, marginBottom: "2px" }}>Last Contact</p>
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: contactStale ? "var(--accent)" : "var(--ink)",
                            margin: 0,
                          }}
                        >
                          {formatDate(funder.lastContactDate)}
                          {contactStale && (
                            <span style={{ fontSize: "11px", marginLeft: "6px", color: "var(--accent)" }}>
                              ({contactDays}d ago)
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p style={{ ...labelStyle, marginBottom: "2px" }}>Next Follow-up</p>
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: followupOverdue
                              ? "var(--accent)"
                              : followupSoon
                              ? "var(--gold)"
                              : "var(--ink)",
                            margin: 0,
                          }}
                        >
                          {formatDate(funder.nextFollowupDate)}
                          {followupOverdue && (
                            <span style={{ fontSize: "11px", marginLeft: "6px" }}>overdue</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {funder.notes && (
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "13px",
                          color: "var(--ink-muted)",
                          margin: 0,
                          lineHeight: 1.6,
                        }}
                      >
                        {funder.notes}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
                    <button
                      onClick={() =>
                        setStageEdit(
                          isEditingStage
                            ? null
                            : {
                                relationshipId: funder.id,
                                engagementStage: funder.engagementStage,
                                notes: funder.notes ?? "",
                                lastContactDate: toDateInputValue(funder.lastContactDate),
                                nextFollowupDate: toDateInputValue(funder.nextFollowupDate),
                              }
                        )
                      }
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                        backgroundColor: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        cursor: "pointer",
                      }}
                    >
                      Stage
                    </button>
                    <button
                      onClick={() =>
                        setDetailsEdit(
                          isEditingDetails
                            ? null
                            : {
                                relationshipId: funder.id,
                                amountUsdCents:
                                  funder.amountUsdCents != null
                                    ? String(funder.amountUsdCents / 1_000_000)
                                    : "",
                                notes: funder.notes ?? "",
                                lastContactDate: toDateInputValue(funder.lastContactDate),
                                nextFollowupDate: toDateInputValue(funder.nextFollowupDate),
                              }
                        )
                      }
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                        backgroundColor: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        setConditionForm(
                          isAddingCondition
                            ? null
                            : {
                                relationshipId: funder.id,
                                description: "",
                                projectRequirementId: "",
                                dueDate: "",
                              }
                        )
                      }
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--teal)",
                        backgroundColor: "transparent",
                        border: "1px solid var(--teal)",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        cursor: "pointer",
                      }}
                    >
                      + Condition
                    </button>
                    <button
                      onClick={() => handleRemoveFunder(funder.id, funder.organizationName)}
                      disabled={isPending}
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--accent)",
                        backgroundColor: "transparent",
                        border: "1px solid var(--border)",
                        borderRadius: "3px",
                        padding: "5px 10px",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Stage edit inline panel */}
                {isEditingStage && stageEdit && (
                  <div
                    style={{
                      marginTop: "14px",
                      paddingTop: "14px",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <label style={labelStyle}>Engagement Stage</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                      {Object.entries(STAGE_LABELS).map(([val, lbl]) => (
                        <button
                          key={val}
                          onClick={() =>
                            setStageEdit((prev) => prev ? { ...prev, engagementStage: val } : prev)
                          }
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "10px",
                            fontWeight: 500,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color:
                              stageEdit.engagementStage === val
                                ? STAGE_COLOR[val]
                                : "var(--ink-muted)",
                            backgroundColor:
                              stageEdit.engagementStage === val
                                ? STAGE_BG[val]
                                : "transparent",
                            border: `1px solid ${stageEdit.engagementStage === val ? STAGE_COLOR[val] : "var(--border)"}`,
                            borderRadius: "3px",
                            padding: "5px 12px",
                            cursor: "pointer",
                          }}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={labelStyle}>Last Contact Date</label>
                        <input
                          style={inputStyle}
                          type="date"
                          value={stageEdit.lastContactDate}
                          onChange={(e) =>
                            setStageEdit((prev) => prev ? { ...prev, lastContactDate: e.target.value } : prev)
                          }
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Next Follow-up Date</label>
                        <input
                          style={inputStyle}
                          type="date"
                          value={stageEdit.nextFollowupDate}
                          onChange={(e) =>
                            setStageEdit((prev) => prev ? { ...prev, nextFollowupDate: e.target.value } : prev)
                          }
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <label style={labelStyle}>Notes</label>
                      <textarea
                        style={{ ...inputStyle, minHeight: "64px", resize: "vertical" }}
                        value={stageEdit.notes}
                        onChange={(e) =>
                          setStageEdit((prev) => prev ? { ...prev, notes: e.target.value } : prev)
                        }
                        placeholder="Context on this stage change"
                      />
                    </div>

                    {stageError && (
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--accent)", margin: "0 0 10px" }}>
                        {stageError}
                      </p>
                    )}

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={handleStageSave}
                        disabled={isPending}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--bg)",
                          backgroundColor: isPending ? "var(--ink-muted)" : "var(--teal)",
                          border: "none",
                          borderRadius: "3px",
                          padding: "6px 14px",
                          cursor: isPending ? "not-allowed" : "pointer",
                        }}
                      >
                        {isPending ? "Saving…" : "Save Stage"}
                      </button>
                      <button
                        onClick={() => { setStageEdit(null); setStageError(null); }}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--ink-muted)",
                          backgroundColor: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "3px",
                          padding: "6px 14px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Details edit inline panel */}
                {isEditingDetails && detailsEdit && (
                  <div
                    style={{
                      marginTop: "14px",
                      paddingTop: "14px",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={labelStyle}>Amount ($M)</label>
                        <input
                          style={inputStyle}
                          type="number"
                          min="0"
                          step="0.1"
                          value={detailsEdit.amountUsdCents}
                          onChange={(e) =>
                            setDetailsEdit((prev) => prev ? { ...prev, amountUsdCents: e.target.value } : prev)
                          }
                          placeholder="e.g. 200"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Last Contact Date</label>
                        <input
                          style={inputStyle}
                          type="date"
                          value={detailsEdit.lastContactDate}
                          onChange={(e) =>
                            setDetailsEdit((prev) => prev ? { ...prev, lastContactDate: e.target.value } : prev)
                          }
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Next Follow-up Date</label>
                        <input
                          style={inputStyle}
                          type="date"
                          value={detailsEdit.nextFollowupDate}
                          onChange={(e) =>
                            setDetailsEdit((prev) => prev ? { ...prev, nextFollowupDate: e.target.value } : prev)
                          }
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={labelStyle}>Notes</label>
                      <textarea
                        style={{ ...inputStyle, minHeight: "64px", resize: "vertical" }}
                        value={detailsEdit.notes}
                        onChange={(e) =>
                          setDetailsEdit((prev) => prev ? { ...prev, notes: e.target.value } : prev)
                        }
                        placeholder="Notes about this funder"
                      />
                    </div>

                    {detailsError && (
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--accent)", margin: "0 0 10px" }}>
                        {detailsError}
                      </p>
                    )}

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={handleDetailsSave}
                        disabled={isPending}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--bg)",
                          backgroundColor: isPending ? "var(--ink-muted)" : "var(--teal)",
                          border: "none",
                          borderRadius: "3px",
                          padding: "6px 14px",
                          cursor: isPending ? "not-allowed" : "pointer",
                        }}
                      >
                        {isPending ? "Saving…" : "Save Details"}
                      </button>
                      <button
                        onClick={() => { setDetailsEdit(null); setDetailsError(null); }}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--ink-muted)",
                          backgroundColor: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "3px",
                          padding: "6px 14px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Add condition inline form */}
                {isAddingCondition && conditionForm && (
                  <div
                    style={{
                      marginTop: "14px",
                      paddingTop: "14px",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                        margin: "0 0 12px",
                      }}
                    >
                      Add Condition / CP
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Description *</label>
                        <input
                          style={inputStyle}
                          value={conditionForm.description}
                          onChange={(e) =>
                            setConditionForm((prev) => prev ? { ...prev, description: e.target.value } : prev)
                          }
                          placeholder="e.g. Executed off-take agreement in substantially final form"
                        />
                      </div>

                      {requirements.length > 0 && (
                        <div>
                          <label style={labelStyle}>Link to Requirement</label>
                          <select
                            style={inputStyle}
                            value={conditionForm.projectRequirementId}
                            onChange={(e) =>
                              setConditionForm((prev) => prev ? { ...prev, projectRequirementId: e.target.value } : prev)
                            }
                          >
                            <option value="">— None —</option>
                            {requirements.map((r) => (
                              <option key={r.requirementId} value={r.requirementId}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label style={labelStyle}>Due Date</label>
                        <input
                          style={inputStyle}
                          type="date"
                          value={conditionForm.dueDate}
                          onChange={(e) =>
                            setConditionForm((prev) => prev ? { ...prev, dueDate: e.target.value } : prev)
                          }
                        />
                      </div>
                    </div>

                    {conditionError && (
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--accent)", margin: "0 0 10px" }}>
                        {conditionError}
                      </p>
                    )}

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={handleAddCondition}
                        disabled={isPending || !conditionForm.description.trim()}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--bg)",
                          backgroundColor: isPending ? "var(--ink-muted)" : "var(--teal)",
                          border: "none",
                          borderRadius: "3px",
                          padding: "6px 14px",
                          cursor: isPending ? "not-allowed" : "pointer",
                        }}
                      >
                        {isPending ? "Saving…" : "Add"}
                      </button>
                      <button
                        onClick={() => { setConditionForm(null); setConditionError(null); }}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--ink-muted)",
                          backgroundColor: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "3px",
                          padding: "6px 14px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Conditions sub-list */}
                {funder.conditions.length > 0 && (
                  <div
                    style={{
                      marginTop: "14px",
                      paddingTop: "14px",
                      borderTop: "1px solid var(--border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <p style={{ ...labelStyle, margin: "0 0 6px" }}>Conditions / CPs</p>
                    {funder.conditions.map((condition) => {
                      const dueDays = daysUntil(condition.dueDate);
                      const dueOverdue = dueDays !== null && dueDays < 0 && condition.status !== "satisfied" && condition.status !== "waived";

                      const isSatisfied = condition.status === "satisfied";
                      const isWaived = condition.status === "waived";
                      const isActive = !isSatisfied && !isWaived;
                      const showEvidenceForm = evidenceFormId === condition.id;

                      return (
                        <div
                          key={condition.id}
                          style={{
                            backgroundColor: "var(--bg-card)",
                            border: `1px solid ${isSatisfied ? "var(--teal)" : "var(--border)"}`,
                            borderRadius: "3px",
                            padding: "10px 14px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: "12px",
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ flex: 1, minWidth: "200px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                <span
                                  style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: "13px",
                                    color: "var(--ink)",
                                  }}
                                >
                                  {condition.description}
                                </span>
                                <ConditionStatusBadge status={condition.status} />
                              </div>
                              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                                {condition.requirementName && (
                                  <span
                                    style={{
                                      fontFamily: "'DM Mono', monospace",
                                      fontSize: "9px",
                                      color: "var(--ink-muted)",
                                    }}
                                  >
                                    → {condition.requirementName}
                                  </span>
                                )}
                                {condition.dueDate && (
                                  <span
                                    style={{
                                      fontFamily: "'DM Mono', monospace",
                                      fontSize: "9px",
                                      color: dueOverdue ? "var(--accent)" : "var(--ink-muted)",
                                      letterSpacing: "0.06em",
                                    }}
                                  >
                                    Due {formatDate(condition.dueDate)}
                                    {dueOverdue && " — overdue"}
                                  </span>
                                )}
                                {isSatisfied && condition.satisfiedAt && (
                                  <span
                                    style={{
                                      fontFamily: "'DM Mono', monospace",
                                      fontSize: "9px",
                                      color: "var(--teal)",
                                      letterSpacing: "0.06em",
                                    }}
                                  >
                                    ✓ Satisfied {formatDate(condition.satisfiedAt)}
                                  </span>
                                )}
                                {condition.evidenceDocumentFilename && (
                                  <span
                                    style={{
                                      fontFamily: "'DM Mono', monospace",
                                      fontSize: "9px",
                                      color: "var(--teal)",
                                      backgroundColor: "var(--teal-soft)",
                                      border: "1px solid var(--teal)",
                                      borderRadius: "2px",
                                      padding: "1px 6px",
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    📎 {condition.evidenceDocumentFilename}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: "6px", flexShrink: 0, flexWrap: "wrap" }}>
                              {isActive && (
                                <>
                                  <button
                                    onClick={() => handleMarkSatisfied(condition, funder.id)}
                                    disabled={isPending}
                                    style={{
                                      fontFamily: "'DM Mono', monospace",
                                      fontSize: "9px",
                                      fontWeight: 500,
                                      letterSpacing: "0.08em",
                                      textTransform: "uppercase",
                                      color: "var(--teal)",
                                      backgroundColor: "transparent",
                                      border: "1px solid var(--teal)",
                                      borderRadius: "3px",
                                      padding: "4px 8px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Mark satisfied
                                  </button>
                                  {stakeholders.length > 0 && (
                                    <button
                                      onClick={() =>
                                        showEvidenceForm
                                          ? setEvidenceFormId(null)
                                          : handleRequestEvidence(condition.id)
                                      }
                                      disabled={isPending}
                                      style={{
                                        fontFamily: "'DM Mono', monospace",
                                        fontSize: "9px",
                                        letterSpacing: "0.08em",
                                        textTransform: "uppercase",
                                        color: "var(--ink-mid)",
                                        backgroundColor: "transparent",
                                        border: "1px solid var(--border)",
                                        borderRadius: "3px",
                                        padding: "4px 8px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      {showEvidenceForm ? "Cancel" : "Request evidence"}
                                    </button>
                                  )}
                                </>
                              )}
                              <button
                                onClick={() => handleRemoveCondition(condition.id, funder.id)}
                                disabled={isPending}
                                style={{
                                  fontFamily: "'DM Mono', monospace",
                                  fontSize: "9px",
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  color: "var(--accent)",
                                  backgroundColor: "transparent",
                                  border: "1px solid var(--border)",
                                  borderRadius: "3px",
                                  padding: "4px 8px",
                                  cursor: "pointer",
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {/* Evidence request inline form */}
                          {showEvidenceForm && (
                            <div
                              style={{
                                marginTop: "10px",
                                paddingTop: "10px",
                                borderTop: "1px solid var(--border)",
                                display: "flex",
                                alignItems: "flex-end",
                                gap: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <label
                                  style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "9px",
                                    letterSpacing: "0.10em",
                                    textTransform: "uppercase",
                                    color: "var(--ink-muted)",
                                  }}
                                >
                                  Assign to
                                </label>
                                <select
                                  value={evidenceStakeholderId}
                                  onChange={(e) => setEvidenceStakeholderId(e.target.value)}
                                  style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: "12px",
                                    color: "var(--ink)",
                                    backgroundColor: "var(--bg-card)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "3px",
                                    padding: "5px 8px",
                                  }}
                                >
                                  <option value="">Select stakeholder…</option>
                                  {stakeholders.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <label
                                  style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "9px",
                                    letterSpacing: "0.10em",
                                    textTransform: "uppercase",
                                    color: "var(--ink-muted)",
                                  }}
                                >
                                  Due by
                                </label>
                                <input
                                  type="date"
                                  value={evidenceDueAt}
                                  onChange={(e) => setEvidenceDueAt(e.target.value)}
                                  style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "12px",
                                    color: "var(--ink)",
                                    backgroundColor: "var(--bg-card)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "3px",
                                    padding: "5px 8px",
                                  }}
                                />
                              </div>
                              <button
                                onClick={() => handleSubmitEvidenceRequest(condition.id)}
                                disabled={isPending}
                                style={{
                                  fontFamily: "'DM Mono', monospace",
                                  fontSize: "9px",
                                  fontWeight: 500,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  color: "var(--text-inverse)",
                                  backgroundColor: "var(--teal)",
                                  border: "none",
                                  borderRadius: "3px",
                                  padding: "7px 12px",
                                  cursor: "pointer",
                                }}
                              >
                                Send request
                              </button>
                              {evidenceError && (
                                <span
                                  style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: "11px",
                                    color: "var(--accent)",
                                  }}
                                >
                                  {evidenceError}
                                </span>
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
          })}
        </div>
      )}

      {/* Empty state coaching card */}
      {funders.length === 0 && !showAddForm && (
        <div
          style={{
            backgroundColor: "var(--gold-soft)",
            border: "1px solid var(--gold)",
            borderRadius: "4px",
            padding: "20px 24px",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--gold)",
              margin: "0 0 8px",
            }}
          >
            Financing Strategy
          </p>
          <p
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "18px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: "0 0 10px",
            }}
          >
            Map your capital stack
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink-mid)",
              margin: "0 0 10px",
              lineHeight: 1.6,
              maxWidth: "560px",
            }}
          >
            EXIM typically covers 85% of US export content. The remaining 15% plus local costs
            require co-financing from DFIs, commercial banks, or equity. Track each financing
            party&apos;s engagement stage and their open conditions (CPs) here.
          </p>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              color: "var(--ink-mid)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Add each financing party above to track their engagement and open conditions.
          </p>
        </div>
      )}
    </section>
  );
}
