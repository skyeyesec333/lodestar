"use client";

import { useState, useTransition, useRef } from "react";
import { updateRequirementStatus, addRequirementNoteAction, updateRequirementResponsibilityAction } from "@/actions/requirements";
import { REQUIREMENT_STATUS_LABELS, REQUIREMENT_STATUS_ORDER } from "@/types/requirements";
import type { RequirementStatusValue, ProgramId } from "@/types/requirements";
import { IFC_REQUIREMENTS } from "@/lib/ifc/requirements";
import type { IfcRequirementDef } from "@/lib/ifc/requirements";
import type { ProjectRequirementRow, RequirementNoteRow } from "@/lib/db/requirements";
import type { DocumentRow } from "@/lib/db/documents";
import type { CommentRow } from "@/lib/db/comments";
import type { ApprovalRow } from "@/lib/db/approvals";
import type { TeamMember } from "@/types/collaboration";
import { CommentThread } from "@/components/collaboration/CommentThread";
import { ApprovalBadge } from "@/components/collaboration/ApprovalBadge";
import { WatchButton } from "@/components/collaboration/WatchButton";

type StakeholderOption = { id: string; name: string };
type OrganizationOption = { id: string; name: string };

type ResponsibilityState = {
  responsibleOrganizationId: string | null;
  responsibleOrganizationName: string | null;
  responsibleStakeholderId: string | null;
  responsibleStakeholderName: string | null;
  targetDate: Date | null;
  isApplicable: boolean;
  applicabilityReason: string | null;
};

const CATEGORY_ORDER = [
  "contracts",
  "financial",
  "studies",
  "permits",
  "corporate",
  "environmental_social",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  contracts: "Contracts",
  financial: "Financial",
  studies: "Studies",
  permits: "Permits",
  corporate: "Corporate",
  environmental_social: "Environmental & Social",
};

const EXIM_PHASE_LABELS: Record<string, string> = {
  loi: "EXIM LOI",
  final_commitment: "EXIM Final Commitment",
};

const IFC_PHASE_LABELS: Record<string, string> = {
  loi: "IFC Board Approval",
  final_commitment: "IFC Financial Close",
};

const GENERIC_PHASE_LABELS: Record<string, string> = {
  loi: "Initial Approval",
  final_commitment: "Financial Close",
};

const IFC_CATEGORY_LABELS: Record<string, string> = {
  environmental_social: "Environmental & Social",
  contracts: "Contracts",
  financial: "Financial",
  permits: "Permits",
  corporate: "Corporate",
};

const IFC_CATEGORY_ORDER = [
  "environmental_social",
  "contracts",
  "financial",
  "permits",
  "corporate",
] as const;

function statusColor(status: RequirementStatusValue): string {
  switch (status) {
    case "executed": return "var(--teal)";
    case "substantially_final": return "var(--teal)";
    case "waived": return "var(--ink-muted)";
    case "not_applicable": return "var(--ink-muted)";
    case "draft": return "var(--gold)";
    case "in_progress": return "var(--gold)";
    case "not_started": return "var(--border-strong)";
  }
}

function statusBg(status: RequirementStatusValue): string {
  switch (status) {
    case "executed": return "var(--teal-soft)";
    case "substantially_final": return "var(--teal-soft)";
    case "waived": return "var(--bg)";
    case "not_applicable": return "var(--bg)";
    case "draft": return "var(--gold-soft)";
    case "in_progress": return "var(--gold-soft)";
    case "not_started": return "var(--bg)";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(contentType: string): string {
  if (contentType === "application/pdf") return "PDF";
  if (contentType.includes("word")) return "DOC";
  if (contentType.includes("sheet") || contentType.includes("excel")) return "XLS";
  if (contentType.includes("presentation") || contentType.includes("powerpoint")) return "PPT";
  if (contentType.startsWith("image/")) return "IMG";
  return "FILE";
}

// ── Requirement Note Thread ───────────────────────────────────────────────────

function RequirementNoteThread({
  projectId,
  requirementId,
  currentStatus,
  notes,
  onNoteAdded,
  canEdit = true,
}: {
  projectId: string;
  requirementId: string;
  currentStatus: RequirementStatusValue;
  notes: RequirementNoteRow[];
  onNoteAdded: (note: RequirementNoteRow) => void;
  canEdit?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [submitting, startSubmit] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleAdd() {
    if (!draft.trim()) return;
    setSubmitError(null);
    const noteText = draft.trim();
    startSubmit(async () => {
      const result = await addRequirementNoteAction({
        projectId,
        requirementId,
        note: noteText,
        statusSnapshot: currentStatus,
      });
      if (!result.ok) {
        setSubmitError(result.error.message);
        return;
      }
      onNoteAdded(result.value);
      setDraft("");
    });
  }

  function formatNoteDate(date: Date): string {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        padding: "12px 24px 16px",
      }}
    >
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          margin: "0 0 10px",
        }}
      >
        Notes
      </p>

      {/* Existing notes, newest first */}
      {notes.length > 0 && (
        <div style={{ marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {notes.map((n) => (
            <div
              key={n.id}
              style={{
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                padding: "8px 12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "4px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    color: statusColor(n.statusSnapshot as RequirementStatusValue),
                    backgroundColor: statusBg(n.statusSnapshot as RequirementStatusValue),
                    border: `1px solid ${statusColor(n.statusSnapshot as RequirementStatusValue)}`,
                    borderRadius: "2px",
                    padding: "1px 5px",
                    textTransform: "uppercase",
                  }}
                >
                  {REQUIREMENT_STATUS_LABELS[n.statusSnapshot as RequirementStatusValue] ?? n.statusSnapshot}
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    color: "var(--ink-muted)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {formatNoteDate(n.createdAt)}
                </span>
              </div>
              {n.note && (
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    color: "var(--ink-mid)",
                    margin: 0,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {n.note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <>
          {/* Add note form */}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note — status context, open questions, next steps…"
            rows={2}
            style={{
              width: "100%",
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              lineHeight: 1.6,
              color: "var(--ink)",
              backgroundColor: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "3px",
              padding: "8px 12px",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {submitError && (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                color: "var(--accent)",
                margin: "4px 0 0",
              }}
            >
              {submitError}
            </p>
          )}
          <button
            onClick={handleAdd}
            disabled={submitting || !draft.trim()}
            style={{
              marginTop: "8px",
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "#fff",
              backgroundColor: submitting || !draft.trim() ? "var(--ink-muted)" : "var(--accent)",
              border: "none",
              borderRadius: "3px",
              padding: "6px 14px",
              cursor: submitting || !draft.trim() ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Saving…" : "Add Note"}
          </button>
        </>
      )}
    </div>
  );
}

// ── Requirement Responsibility Panel ─────────────────────────────────────────

function RequirementResponsibilityPanel({
  projectId,
  requirementId,
  slug,
  responsibility,
  stakeholders,
  organizations,
  onSaved,
  canEdit = true,
}: {
  projectId: string;
  requirementId: string;
  slug: string;
  responsibility: ResponsibilityState;
  stakeholders: StakeholderOption[];
  organizations: OrganizationOption[];
  onSaved: (next: ResponsibilityState) => void;
  canEdit?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  // Draft form state
  const [draftOrgId, setDraftOrgId] = useState<string>("");
  const [draftStakeholderId, setDraftStakeholderId] = useState<string>("");
  const [draftTargetDate, setDraftTargetDate] = useState<string>("");
  const [draftNotApplicable, setDraftNotApplicable] = useState(false);
  const [draftApplicabilityReason, setDraftApplicabilityReason] = useState("");

  function openEdit() {
    setDraftOrgId(responsibility.responsibleOrganizationId ?? "");
    setDraftStakeholderId(responsibility.responsibleStakeholderId ?? "");
    setDraftTargetDate(
      responsibility.targetDate
        ? new Date(responsibility.targetDate).toISOString().substring(0, 10)
        : ""
    );
    setDraftNotApplicable(!responsibility.isApplicable);
    setDraftApplicabilityReason(responsibility.applicabilityReason ?? "");
    setSaveError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setSaveError(null);
  }

  function handleSave() {
    setSaveError(null);
    startSaving(async () => {
      const result = await updateRequirementResponsibilityAction({
        projectId,
        requirementId,
        slug,
        responsibleOrganizationId: draftOrgId || null,
        responsibleStakeholderId: draftStakeholderId || null,
        targetDate: draftTargetDate || null,
        isApplicable: !draftNotApplicable,
        applicabilityReason: draftNotApplicable ? (draftApplicabilityReason || null) : null,
      });
      if (!result.ok) {
        setSaveError(result.error.message);
        return;
      }
      const resolvedOrgName = draftOrgId
        ? (organizations.find((o) => o.id === draftOrgId)?.name ?? null)
        : null;
      const resolvedStakeholderName = draftStakeholderId
        ? (stakeholders.find((s) => s.id === draftStakeholderId)?.name ?? null)
        : null;
      onSaved({
        responsibleOrganizationId: draftOrgId || null,
        responsibleOrganizationName: resolvedOrgName,
        responsibleStakeholderId: draftStakeholderId || null,
        responsibleStakeholderName: resolvedStakeholderName,
        targetDate: draftTargetDate ? new Date(draftTargetDate) : null,
        isApplicable: !draftNotApplicable,
        applicabilityReason: draftNotApplicable ? (draftApplicabilityReason || null) : null,
      });
      setEditing(false);
    });
  }

  const hasAssignment =
    responsibility.responsibleStakeholderId ||
    responsibility.responsibleOrganizationId ||
    responsibility.targetDate ||
    !responsibility.isApplicable;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function targetDateColor(): string {
    if (!responsibility.targetDate) return "var(--ink-mid)";
    const d = new Date(responsibility.targetDate);
    d.setHours(0, 0, 0, 0);
    const diffMs = d.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / 86_400_000);
    if (diffDays < 0) return "var(--accent)";
    if (diffDays <= 14) return "var(--gold)";
    return "var(--ink-mid)";
  }

  function formatTargetDate(date: Date): string {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const selectStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "var(--ink)",
    backgroundColor: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "3px",
    padding: "6px 10px",
    width: "100%",
    outline: "none",
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "var(--ink)",
    backgroundColor: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "3px",
    padding: "6px 10px",
    width: "100%",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        padding: "12px 24px 14px",
      }}
    >
      {/* Section label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            margin: 0,
          }}
        >
          Responsibility
        </p>
        {!editing && canEdit && (
          <button
            onClick={openEdit}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--teal)",
              background: "none",
              border: "1px solid var(--teal)",
              borderRadius: "3px",
              padding: "3px 8px",
              cursor: "pointer",
            }}
          >
            {hasAssignment ? "Edit" : "Assign"}
          </button>
        )}
      </div>

      {/* Current assignment display */}
      {!editing && hasAssignment && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {!responsibility.isApplicable && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "2px",
                  padding: "2px 6px",
                }}
              >
                N/A
              </span>
              {responsibility.applicabilityReason && (
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "12px",
                    color: "var(--ink-muted)",
                  }}
                >
                  {responsibility.applicabilityReason}
                </span>
              )}
            </div>
          )}
          {responsibility.responsibleStakeholderName && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "var(--teal-soft)",
                  border: "1px solid var(--teal)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "8px",
                    fontWeight: 600,
                    color: "var(--teal)",
                    textTransform: "uppercase",
                  }}
                >
                  {responsibility.responsibleStakeholderName.charAt(0)}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "var(--ink)",
                }}
              >
                {responsibility.responsibleStakeholderName}
              </span>
            </div>
          )}
          {responsibility.responsibleOrganizationName && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  minWidth: "22px",
                }}
              >
                Org
              </span>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "var(--ink-mid)",
                }}
              >
                {responsibility.responsibleOrganizationName}
              </span>
            </div>
          )}
          {responsibility.targetDate && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  minWidth: "22px",
                }}
              >
                Due
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "11px",
                  color: targetDateColor(),
                }}
              >
                {formatTargetDate(responsibility.targetDate)}
              </span>
            </div>
          )}
        </div>
      )}

      {!editing && !hasAssignment && (
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            color: "var(--ink-muted)",
            margin: 0,
          }}
        >
          No owner assigned yet.
        </p>
      )}

      {/* Edit form */}
      {editing && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Stakeholder */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                marginBottom: "4px",
              }}
            >
              Owner
            </label>
            <select
              value={draftStakeholderId}
              onChange={(e) => setDraftStakeholderId(e.target.value)}
              style={selectStyle}
            >
              <option value="">— Unassigned —</option>
              {stakeholders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Organization */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                marginBottom: "4px",
              }}
            >
              Organization
            </label>
            <select
              value={draftOrgId}
              onChange={(e) => setDraftOrgId(e.target.value)}
              style={selectStyle}
            >
              <option value="">— None —</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Target Date */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                marginBottom: "4px",
              }}
            >
              Target Date
            </label>
            <input
              type="date"
              value={draftTargetDate}
              onChange={(e) => setDraftTargetDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Not applicable */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={draftNotApplicable}
              onChange={(e) => setDraftNotApplicable(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                color: "var(--ink-mid)",
              }}
            >
              Mark as not applicable to this project
            </span>
          </label>

          {/* Applicability reason — shown only when not applicable */}
          {draftNotApplicable && (
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  marginBottom: "4px",
                }}
              >
                Reason
              </label>
              <input
                type="text"
                value={draftApplicabilityReason}
                onChange={(e) => setDraftApplicabilityReason(e.target.value)}
                placeholder="Why is this requirement not applicable?"
                maxLength={500}
                style={inputStyle}
              />
            </div>
          )}

          {saveError && (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                color: "var(--accent)",
                margin: 0,
              }}
            >
              {saveError}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "#fff",
                backgroundColor: saving ? "var(--ink-muted)" : "var(--teal)",
                border: "none",
                borderRadius: "3px",
                padding: "6px 14px",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                padding: "6px 14px",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type RequirementsChecklistProps = {
  projectId: string;
  slug: string;
  rows: ProjectRequirementRow[];
  documents: DocumentRow[];
  stakeholders: StakeholderOption[];
  organizations: OrganizationOption[];
  dealType?: string;
  program?: ProgramId;
  onProgramChange?: (program: ProgramId) => void;
  // Collaboration layer
  teamMembers?: TeamMember[];
  currentUserId?: string;
  actorName?: string;
  commentsByRequirementId?: Record<string, CommentRow[]>;
  approvalsByRequirementId?: Record<string, ApprovalRow>;
  watchedRequirementIds?: Set<string>;
  canEdit?: boolean;
  canApprove?: boolean;
};

export function RequirementsChecklist({ projectId, slug, rows, documents, stakeholders, organizations, dealType, program: programProp, onProgramChange, teamMembers = [], currentUserId, actorName, commentsByRequirementId = {}, approvalsByRequirementId = {}, watchedRequirementIds = new Set(), canEdit = true, canApprove = true }: RequirementsChecklistProps) {
  const isExim = !dealType || dealType === "exim_project_finance";
  const [activeProgram, setActiveProgram] = useState<ProgramId>(programProp ?? "exim");

  function handleProgramChange(p: ProgramId) {
    setActiveProgram(p);
    onProgramChange?.(p);
  }
  const [statuses, setStatuses] = useState<Record<string, RequirementStatusValue>>(
    Object.fromEntries(rows.map((r) => [r.requirementId, r.status]))
  );
  const [noteThreads, setNoteThreads] = useState<Record<string, RequirementNoteRow[]>>(
    Object.fromEntries(rows.map((r) => [r.requirementId, r.recentNotes ?? []]))
  );
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(
    new Set(rows.filter((r) => r.recentNotes && r.recentNotes.length > 0).map((r) => r.requirementId))
  );
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [docsByReq, setDocsByReq] = useState<Record<string, DocumentRow[]>>(() => {
    const map: Record<string, DocumentRow[]> = {};
    for (const doc of documents) {
      if (doc.projectRequirementId) {
        if (!map[doc.projectRequirementId]) map[doc.projectRequirementId] = [];
        map[doc.projectRequirementId].push(doc);
      }
    }
    return map;
  });
  const [uploadingReq, setUploadingReq] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [lastError, setLastError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [responsibilities, setResponsibilities] = useState<Record<string, ResponsibilityState>>(
    Object.fromEntries(
      rows.map((r) => [
        r.requirementId,
        {
          responsibleOrganizationId: r.responsibleOrganizationId,
          responsibleOrganizationName: r.responsibleOrganizationName,
          responsibleStakeholderId: r.responsibleStakeholderId,
          responsibleStakeholderName: r.responsibleStakeholderName,
          targetDate: r.targetDate,
          isApplicable: r.isApplicable,
          applicabilityReason: r.applicabilityReason,
        },
      ])
    )
  );
  const [expandedResponsibility, setExpandedResponsibility] = useState<Set<string>>(new Set());

  function handleStatusChange(requirementId: string, status: RequirementStatusValue) {
    const previous = statuses[requirementId];
    setStatuses((prev) => ({ ...prev, [requirementId]: status }));
    setPendingId(requirementId);
    setLastError(null);

    const autoNote = `Status changed to ${REQUIREMENT_STATUS_LABELS[status]}`;

    startTransition(async () => {
      const result = await updateRequirementStatus({ projectId, requirementId, status, note: autoNote });
      if (!result.ok) {
        setStatuses((prev) => ({ ...prev, [requirementId]: previous }));
        setLastError(result.error.message);
      } else {
        // Optimistically prepend the auto note
        const newNote: RequirementNoteRow = {
          id: `optimistic-${Date.now()}`,
          clerkUserId: "",
          note: autoNote,
          statusSnapshot: status,
          createdAt: new Date(),
        };
        setNoteThreads((prev) => ({
          ...prev,
          [requirementId]: [newNote, ...(prev[requirementId] ?? [])],
        }));
        setExpandedNotes((prev) => {
          const next = new Set(prev);
          next.add(requirementId);
          return next;
        });
      }
      setPendingId(null);
    });
  }

  function toggleNotes(requirementId: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(requirementId)) next.delete(requirementId);
      else next.add(requirementId);
      return next;
    });
  }

  function toggleResponsibility(requirementId: string) {
    setExpandedResponsibility((prev) => {
      const next = new Set(prev);
      if (next.has(requirementId)) next.delete(requirementId);
      else next.add(requirementId);
      return next;
    });
  }

  function toggleDocs(projectRequirementId: string) {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(projectRequirementId)) next.delete(projectRequirementId);
      else next.add(projectRequirementId);
      return next;
    });
  }

  async function handleDocUpload(requirementId: string, projectRequirementId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploadingReq(requirementId);
    setUploadErrors((prev) => ({ ...prev, [requirementId]: "" }));

    const fd = new FormData();
    fd.append("file", file);
    fd.append("projectId", projectId);
    fd.append("slug", slug);
    fd.append("requirementId", requirementId);

    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload failed (${res.status})`);
      }
      const json = await res.json();
      const doc = json.document as DocumentRow;
      setDocsByReq((prev) => ({
        ...prev,
        [projectRequirementId]: [doc, ...(prev[projectRequirementId] ?? [])],
      }));
      // Expand docs shelf after upload
      setExpandedDocs((prev) => new Set(prev).add(projectRequirementId));
    } catch (err) {
      setUploadErrors((prev) => ({
        ...prev,
        [requirementId]: err instanceof Error ? err.message : "Upload failed.",
      }));
    } finally {
      setUploadingReq(null);
      const input = fileInputRefs.current[requirementId];
      if (input) input.value = "";
    }
  }

  async function handleDocDelete(requirementId: string, projectRequirementId: string, docId: string) {
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    if (res.ok) {
      setDocsByReq((prev) => ({
        ...prev,
        [projectRequirementId]: (prev[projectRequirementId] ?? []).filter((d) => d.id !== docId),
      }));
    }
  }

  async function handleDocDownload(docId: string, filename: string) {
    const res = await fetch(`/api/documents/${docId}/signed-url`);
    if (!res.ok) return;
    const { url } = await res.json();
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.click();
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: rows.filter((r) => r.category === cat),
  }));

  const allNotStarted = rows.every((r) => r.status === "not_started");

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <p className="eyebrow">{isExim ? "EXIM Deal Workplan" : "Deal Workplan"}</p>
        <button
          onClick={() => setCompact((c) => !c)}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            padding: "5px 12px",
            cursor: "pointer",
          }}
        >
          {compact ? "Spacious" : "Compact"}
        </button>
      </div>

      {/* Program selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "24px",
        }}
      >
        {(["exim", "ifc"] as ProgramId[]).map((p) => (
          <button
            key={p}
            onClick={() => handleProgramChange(p)}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: activeProgram === p ? "var(--teal)" : "var(--ink-muted)",
              backgroundColor: activeProgram === p ? "var(--teal-soft)" : "transparent",
              border: activeProgram === p ? "1px solid var(--teal)" : "1px solid var(--border)",
              borderRadius: "3px",
              padding: "5px 14px",
              cursor: "pointer",
            }}
          >
            {p === "exim" ? "EXIM Bank" : "IFC"}
          </button>
        ))}
      </div>

      {/* IFC read-only checklist */}
      {activeProgram === "ifc" && (
        <div>
          {/* Advisory banner */}
          <div
            style={{
              backgroundColor: "var(--gold-soft)",
              border: "1px solid var(--gold)",
              borderRadius: "4px",
              padding: "14px 20px",
              marginBottom: "28px",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--gold)",
                margin: "0 0 4px",
              }}
            >
              Preview
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                color: "var(--ink-mid)",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              IFC deal workplan tracking coming soon — database integration will be enabled in a future update.
            </p>
          </div>

          {/* IFC requirement groups */}
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {IFC_CATEGORY_ORDER.map((cat) => {
              const items: readonly IfcRequirementDef[] = IFC_REQUIREMENTS.filter((r) => r.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  {/* Category header */}
                  <div
                    style={{
                      padding: "0 24px 10px",
                      borderBottom: "1px solid var(--border)",
                      marginBottom: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--ink)",
                      }}
                    >
                      {IFC_CATEGORY_LABELS[cat] ?? cat}
                    </span>
                  </div>

                  {/* Requirement rows */}
                  {items.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderTop: "none",
                        borderLeft: req.isLoiCritical ? "3px solid var(--accent)" : "1px solid var(--border)",
                        padding: "14px 24px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "var(--ink)",
                          }}
                        >
                          {req.name}
                        </span>
                        {req.isLoiCritical ? (
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "9px",
                              fontWeight: 500,
                              letterSpacing: "0.10em",
                              textTransform: "uppercase",
                              color: "var(--accent)",
                              backgroundColor: "var(--accent-soft)",
                              padding: "2px 6px",
                              borderRadius: "2px",
                            }}
                          >
                            LOI Critical
                          </span>
                        ) : (
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "9px",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--ink-muted)",
                              backgroundColor: "var(--bg)",
                              padding: "2px 6px",
                              borderRadius: "2px",
                            }}
                          >
                            {IFC_PHASE_LABELS[req.phaseRequired]}
                          </span>
                        )}
                        {req.applicableSectors && (
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "9px",
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              color: "var(--ink-muted)",
                              backgroundColor: "var(--bg)",
                              padding: "2px 6px",
                              borderRadius: "2px",
                              border: "1px solid var(--border)",
                            }}
                          >
                            {req.applicableSectors.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EXIM checklist — unchanged behavior */}
      {activeProgram === "exim" && (
      <div>
      {lastError && (
        <div
          style={{
            backgroundColor: "var(--accent-soft)",
            border: "1px solid var(--accent)",
            borderRadius: "4px",
            padding: "10px 16px",
            marginBottom: "16px",
          }}
        >
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--accent)", margin: 0 }}>
            {lastError}
          </p>
        </div>
      )}

      {allNotStarted && rows.length > 0 && (
        <div
          style={{
            backgroundColor: "var(--gold-soft)",
            border: "1px solid var(--gold)",
            borderRadius: "4px",
            padding: "20px 24px",
            marginBottom: "28px",
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
            Why This Matters
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
            Your EXIM deal workplan starts here
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink-mid)",
              margin: "0 0 14px",
              lineHeight: 1.6,
              maxWidth: "560px",
            }}
          >
            EXIM Bank requires substantially final versions of executed contracts, feasibility
            studies, environmental permits, and corporate documents before issuing a Letter of
            Interest. Every workplan item below maps directly to a requirement EXIM reviewers will check.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {[
              "1 — Mark items In Progress as soon as you begin gathering them",
              "2 — Advance to Draft once a working version exists",
              "3 — Set Substantially Final only when the document is near-executed form",
            ].map((step) => (
              <p
                key={step}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "11px",
                  color: "var(--ink-mid)",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {step}
              </p>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        {grouped.map(({ category, label, items }) => (
          <div key={category}>
            {/* Category header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 160px",
                gap: "16px",
                padding: compact ? "0 20px 8px" : "0 24px 10px",
                borderBottom: "1px solid var(--border)",
                marginBottom: "2px",
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                }}
              >
                Status
              </span>
            </div>

            {/* Rows */}
            {items.map((row) => {
              const status = statuses[row.requirementId] ?? row.status;
              const isUpdating = pendingId === row.requirementId;
              const isExpandedNotes = expandedNotes.has(row.requirementId);
              const isExpandedDocs = expandedDocs.has(row.projectRequirementId);
              const isExpandedResponsibility = expandedResponsibility.has(row.requirementId);
              const threadNotes = noteThreads[row.requirementId] ?? [];
              // Collaboration
              const reqComments = commentsByRequirementId[row.projectRequirementId] ?? [];
              const reqApproval = approvalsByRequirementId[row.projectRequirementId] ?? null;
              const isWatched = watchedRequirementIds.has(row.projectRequirementId);
              const showCollab = !!(currentUserId && row.projectRequirementId);
              const hasNote = threadNotes.length > 0;
              const reqDocs = docsByReq[row.projectRequirementId] ?? [];
              const docCount = reqDocs.length;
              const isUploadingThis = uploadingReq === row.requirementId;
              const uploadError = uploadErrors[row.requirementId];
              const responsibility = responsibilities[row.requirementId] ?? {
                responsibleOrganizationId: null,
                responsibleOrganizationName: null,
                responsibleStakeholderId: null,
                responsibleStakeholderName: null,
                targetDate: null,
                isApplicable: true,
                applicabilityReason: null,
              };
              const hasResponsibility =
                responsibility.responsibleStakeholderId !== null ||
                responsibility.responsibleOrganizationId !== null ||
                responsibility.targetDate !== null ||
                !responsibility.isApplicable;

              return (
                <div
                  key={row.requirementId}
                  id={`req-${row.requirementId}`}
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderTop: "none",
                    borderLeft: row.isLoiCritical ? "3px solid var(--accent)" : "1px solid var(--border)",
                    opacity: isUpdating ? 0.6 : 1,
                    transition: "opacity 0.15s, box-shadow 0.2s",
                  }}
                >
                  {/* Main row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 160px",
                      gap: "16px",
                      alignItems: "center",
                      padding: compact ? "10px 20px" : "16px 24px",
                    }}
                  >
                    {/* Requirement info */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: compact ? "0" : "2px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "var(--ink)",
                          }}
                          title={row.description}
                        >
                          {row.name}
                        </span>
                        {row.isLoiCritical ? (
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "9px",
                              fontWeight: 500,
                              letterSpacing: "0.10em",
                              textTransform: "uppercase",
                              color: "var(--accent)",
                              backgroundColor: "var(--accent-soft)",
                              padding: "2px 6px",
                              borderRadius: "2px",
                            }}
                          >
                            LOI Critical
                          </span>
                        ) : (
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "9px",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "var(--ink-muted)",
                              backgroundColor: "var(--bg)",
                              padding: "2px 6px",
                              borderRadius: "2px",
                            }}
                          >
                            {(isExim ? EXIM_PHASE_LABELS : GENERIC_PHASE_LABELS)[row.phaseRequired]}
                          </span>
                        )}

                        {/* Notes toggle */}
                        <button
                          onClick={() => toggleNotes(row.requirementId)}
                          title={isExpandedNotes ? "Hide notes" : hasNote ? "Edit note" : "Add note"}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "9px",
                            letterSpacing: "0.08em",
                            color: hasNote ? "var(--accent)" : "var(--ink-muted)",
                            background: "none",
                            border: "none",
                            padding: "2px 4px",
                            cursor: "pointer",
                            opacity: isExpandedNotes ? 1 : 0.7,
                            transition: "opacity 0.15s, color 0.15s",
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2 2h8v7H7.5L6 10.5 4.5 9H2V2z"
                              stroke="currentColor"
                              strokeWidth="1"
                              strokeLinejoin="round"
                              fill={hasNote ? "currentColor" : "none"}
                              fillOpacity={hasNote ? 0.15 : 0}
                            />
                          </svg>
                          {hasNote && !isExpandedNotes && (
                            <span style={{ textTransform: "uppercase" }}>note</span>
                          )}
                        </button>

                        {/* Documents toggle */}
                        {row.projectRequirementId && (
                          <button
                            onClick={() => toggleDocs(row.projectRequirementId)}
                            title={isExpandedDocs ? "Hide documents" : docCount > 0 ? `${docCount} document${docCount !== 1 ? "s" : ""}` : "Attach document"}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "9px",
                              letterSpacing: "0.08em",
                              color: docCount > 0 ? "var(--teal)" : "var(--ink-muted)",
                              background: "none",
                              border: "none",
                              padding: "2px 4px",
                              cursor: "pointer",
                              opacity: isExpandedDocs ? 1 : 0.7,
                              transition: "opacity 0.15s, color 0.15s",
                            }}
                          >
                            {/* Paperclip icon */}
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                              <path
                                d="M10 5.5L5.5 10a3 3 0 01-4.243-4.243l5-5a2 2 0 012.829 2.829L4.586 8.086A1 1 0 013.172 6.672L7.5 2.343"
                                stroke="currentColor"
                                strokeWidth="1.1"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            {docCount > 0 && (
                              <span style={{ textTransform: "uppercase" }}>{docCount}</span>
                            )}
                          </button>
                        )}

                        {/* Responsibility toggle */}
                        {(canEdit || hasResponsibility) && (
                          <button
                            onClick={() => toggleResponsibility(row.requirementId)}
                            title={
                              isExpandedResponsibility
                                ? "Hide responsibility"
                                : canEdit
                                  ? hasResponsibility
                                    ? "View/edit responsibility"
                                    : "Assign responsibility"
                                  : "View responsibility"
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "9px",
                              letterSpacing: "0.08em",
                              color: hasResponsibility ? "var(--teal)" : "var(--ink-muted)",
                              background: "none",
                              border: "none",
                              padding: "2px 4px",
                              cursor: "pointer",
                              opacity: isExpandedResponsibility ? 1 : 0.7,
                              transition: "opacity 0.15s, color 0.15s",
                            }}
                          >
                            {/* Person icon */}
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                              <circle cx="6" cy="4" r="2" stroke="currentColor" strokeWidth="1" fill={hasResponsibility ? "currentColor" : "none"} fillOpacity={hasResponsibility ? 0.2 : 0} />
                              <path d="M2 10c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                            </svg>
                            {hasResponsibility && !isExpandedResponsibility && (
                              <span style={{ textTransform: "uppercase" }}>owner</span>
                            )}
                          </button>
                        )}

                        {/* Collaboration: approval badge + watch (LOI-critical or applicable items) */}
                        {showCollab && row.isApplicable && (
                          <>
                            {row.isLoiCritical && (
                              <ApprovalBadge
                                projectId={projectId}
                                slug={slug}
                                targetType="requirement"
                                targetId={row.projectRequirementId}
                                approval={reqApproval}
                                currentUserId={currentUserId!}
                                actorName={actorName}
                                canAct={canApprove}
                              />
                            )}
                            <WatchButton
                              projectId={projectId}
                              targetType="requirement"
                              targetId={row.projectRequirementId}
                              initialWatching={isWatched}
                              actorName={actorName}
                              variant="icon"
                            />
                          </>
                        )}
                      </div>
                      {!compact && (
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "13px",
                            color: "var(--ink-muted)",
                            margin: "4px 0 0",
                            lineHeight: 1.5,
                            maxWidth: "560px",
                          }}
                        >
                          {row.description}
                        </p>
                      )}
                    </div>

                    {/* Status select */}
                    <select
                      value={status}
                      disabled={!canEdit || isUpdating || isPending}
                      onChange={(e) =>
                        handleStatusChange(row.requirementId, e.target.value as RequirementStatusValue)
                      }
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "11px",
                        fontWeight: 500,
                        letterSpacing: "0.06em",
                        color: statusColor(status),
                        backgroundColor: statusBg(status),
                        border: `1px solid ${statusColor(status)}`,
                        borderRadius: "3px",
                        padding: "6px 28px 6px 10px",
                        appearance: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%236b6b64' d='M5 7L1 3h8z'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 8px center",
                        cursor: canEdit ? "pointer" : "default",
                        width: "100%",
                        opacity: canEdit ? 1 : 0.8,
                      }}
                    >
                      {REQUIREMENT_STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {REQUIREMENT_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Note thread */}
                  {isExpandedNotes && (
                    <RequirementNoteThread
                      projectId={projectId}
                      requirementId={row.requirementId}
                      currentStatus={status}
                      notes={threadNotes}
                      canEdit={canEdit}
                      onNoteAdded={(note) => {
                        setNoteThreads((prev) => ({
                          ...prev,
                          [row.requirementId]: [note, ...(prev[row.requirementId] ?? [])],
                        }));
                      }}
                    />
                  )}

                  {/* Collaboration comment thread */}
                  {showCollab && isExpandedNotes && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "12px 24px" }}>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", margin: "0 0 10px" }}>
                        Team Comments
                      </p>
                      <CommentThread
                        projectId={projectId}
                        slug={slug}
                        targetType="requirement"
                        targetId={row.projectRequirementId}
                        initialComments={reqComments}
                        currentUserId={currentUserId!}
                        teamMembers={teamMembers}
                        actorName={actorName}
                        compact={false}
                      />
                    </div>
                  )}

                  {/* Responsibility panel */}
                  {isExpandedResponsibility && (
                    <RequirementResponsibilityPanel
                      projectId={projectId}
                      requirementId={row.requirementId}
                      slug={slug}
                      responsibility={responsibility}
                      stakeholders={stakeholders}
                      organizations={organizations}
                      canEdit={canEdit}
                      onSaved={(next) => {
                        setResponsibilities((prev) => ({
                          ...prev,
                          [row.requirementId]: next,
                        }));
                      }}
                    />
                  )}

                  {/* Documents shelf */}
                  {isExpandedDocs && row.projectRequirementId && (
                    <div
                      style={{
                        borderTop: "1px solid var(--border)",
                        backgroundColor: "var(--bg)",
                      }}
                    >
                      {/* Shelf header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 24px",
                          borderBottom: reqDocs.length > 0 ? "1px solid var(--border)" : undefined,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "9px",
                            fontWeight: 500,
                            letterSpacing: "0.10em",
                            textTransform: "uppercase",
                            color: "var(--ink-muted)",
                          }}
                        >
                          Supporting Documents
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {uploadError && (
                            <span
                              style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: "11px",
                                color: "var(--accent)",
                              }}
                            >
                              {uploadError}
                            </span>
                          )}
                          {canEdit && (
                            <>
                              <button
                                onClick={() => fileInputRefs.current[row.requirementId]?.click()}
                                disabled={isUploadingThis}
                                style={{
                                  fontFamily: "'DM Mono', monospace",
                                  fontSize: "9px",
                                  fontWeight: 500,
                                  letterSpacing: "0.10em",
                                  textTransform: "uppercase",
                                  color: "var(--teal)",
                                  backgroundColor: "transparent",
                                  border: "1px solid var(--teal)",
                                  borderRadius: "3px",
                                  padding: "4px 10px",
                                  cursor: isUploadingThis ? "not-allowed" : "pointer",
                                  opacity: isUploadingThis ? 0.5 : 1,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {isUploadingThis ? "Uploading…" : "+ Attach"}
                              </button>
                              <input
                                ref={(el) => { fileInputRefs.current[row.requirementId] = el; }}
                                type="file"
                                style={{ display: "none" }}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp"
                                onChange={(e) => handleDocUpload(row.requirementId, row.projectRequirementId, e.target.files)}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Document list */}
                      {reqDocs.length === 0 ? (
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "12px",
                            color: "var(--ink-muted)",
                            padding: "14px 24px",
                            margin: 0,
                          }}
                        >
                          {canEdit
                            ? "No documents attached yet. Click Attach to link a file to this requirement."
                            : "No documents attached yet."}
                        </p>
                      ) : (
                        reqDocs.map((doc, i) => (
                          <div
                            key={doc.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "10px 24px",
                              borderBottom: i < reqDocs.length - 1 ? "1px solid var(--border)" : undefined,
                            }}
                          >
                            {/* Type badge */}
                            <div
                              style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "9px",
                                fontWeight: 600,
                                letterSpacing: "0.06em",
                                color: "var(--teal)",
                                backgroundColor: "var(--teal-soft)",
                                borderRadius: "3px",
                                padding: "2px 5px",
                                flexShrink: 0,
                              }}
                            >
                              {fileIcon(doc.contentType)}
                            </div>

                            {/* Filename + meta */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  fontFamily: "'Inter', sans-serif",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  color: "var(--ink)",
                                  margin: 0,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {doc.filename}
                              </p>
                              <p
                                style={{
                                  fontFamily: "'DM Mono', monospace",
                                  fontSize: "9px",
                                  color: "var(--ink-muted)",
                                  margin: "1px 0 0",
                                  letterSpacing: "0.04em",
                                }}
                              >
                                {formatBytes(doc.sizeBytes)} ·{" "}
                                {new Date(doc.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                              <button
                                onClick={() => handleDocDownload(doc.id, doc.filename)}
                                style={{
                                  fontFamily: "'DM Mono', monospace",
                                  fontSize: "9px",
                                  letterSpacing: "0.06em",
                                  color: "var(--ink-muted)",
                                  backgroundColor: "transparent",
                                  border: "1px solid var(--border)",
                                  borderRadius: "3px",
                                  padding: "3px 8px",
                                  cursor: "pointer",
                                }}
                              >
                                Download
                              </button>
                              {canEdit && (
                                <button
                                  onClick={() => handleDocDelete(row.requirementId, row.projectRequirementId, doc.id)}
                                  style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: "9px",
                                    letterSpacing: "0.06em",
                                    color: "var(--accent)",
                                    backgroundColor: "transparent",
                                    border: "1px solid var(--accent)",
                                    borderRadius: "3px",
                                    padding: "3px 8px",
                                    cursor: "pointer",
                                  }}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      </div>
      )}
    </div>
  );
}
