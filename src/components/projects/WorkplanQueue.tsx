"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { DocumentRow } from "@/lib/db/documents";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import { BulkStatusBar } from "@/components/requirements/BulkStatusBar";
import { RequirementEvidenceUpload } from "@/components/requirements/RequirementEvidenceUpload";
import { RequirementNotesQuickInput } from "@/components/requirements/RequirementNotesQuickInput";
import { updateRequirementStatus } from "@/actions/requirements";
import { REQUIREMENT_STATUS_LABELS, type RequirementStatusValue } from "@/types/requirements";
import { buildWorkplanQueue, type WorkplanQueueItem } from "@/lib/projects/workplan-queue";

type QueueTab = "critical" | "evidence" | "unowned" | "overdue" | "recent" | "done";

type Props = {
  projectId: string;
  slug: string;
  dealType: string;
  rows: ProjectRequirementRow[];
  documents: DocumentRow[];
  canEdit: boolean;
};

const TAB_LABELS: Record<QueueTab, string> = {
  critical: "Critical",
  evidence: "Missing evidence",
  unowned: "Unowned",
  overdue: "Overdue",
  recent: "Recently active",
  done: "Done",
};

const STATUS_OPTIONS: RequirementStatusValue[] = [
  "not_started",
  "in_progress",
  "draft",
  "substantially_final",
  "executed",
  "waived",
];

function categoryLabel(category: string): string {
  return category.replace(/_/g, " ");
}

function phaseLabel(phase: string): string {
  return phase.replace(/_/g, " ");
}

function formatTargetDate(date: Date | null): string {
  if (!date) return "No date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: "'DM Mono', monospace",
    fontSize: "10px",
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    borderRadius: "999px",
    padding: "8px 12px",
    border: active ? "none" : "1px solid var(--border)",
    backgroundColor: active ? "var(--ink)" : "var(--bg-card)",
    color: active ? "var(--bg-card)" : "var(--ink-mid)",
    cursor: "pointer",
  };
}

function QueueRow({
  projectId,
  slug,
  item,
  canEdit,
  selected,
  onToggleSelected,
  onStatusUpdated,
  onDocumentUploaded,
}: {
  projectId: string;
  slug: string;
  item: WorkplanQueueItem;
  canEdit: boolean;
  selected: boolean;
  onToggleSelected: (requirementId: string) => void;
  onStatusUpdated: (requirementId: string, status: RequirementStatusValue) => void;
  onDocumentUploaded: (doc: DocumentRow) => void;
}) {
  const [status, setStatus] = useState<RequirementStatusValue>(item.status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setStatus(item.status);
  }, [item.status]);

  function applyStatus(nextStatus: RequirementStatusValue) {
    setError(null);
    setStatus(nextStatus);
    startTransition(async () => {
      const result = await updateRequirementStatus({
        projectId,
        requirementId: item.requirementId,
        status: nextStatus,
      });
      if (!result.ok) {
        setError(result.error.message);
        setStatus(item.status);
        return;
      }
      onStatusUpdated(item.requirementId, nextStatus);
    });
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "28px minmax(0, 2fr) minmax(140px, 0.8fr) minmax(110px, 0.8fr) minmax(150px, 0.9fr) minmax(200px, 1.1fr)",
        gap: "12px",
        alignItems: "start",
        padding: "14px 16px",
        borderTop: "1px solid color-mix(in srgb, var(--border) 55%, transparent)",
      }}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelected(item.requirementId)}
        aria-label={`Select ${item.name}`}
        style={{ marginTop: "6px" }}
      />

      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "6px" }}>
          {item.isLoiCritical ? (
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--accent)",
                backgroundColor: "color-mix(in srgb, var(--accent) 10%, var(--bg-card))",
                border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
                borderRadius: "999px",
                padding: "3px 8px",
              }}
            >
              Gate critical
            </span>
          ) : null}
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
            }}
          >
            {categoryLabel(item.category)} · {phaseLabel(item.phaseRequired)}
          </span>
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--ink)",
            lineHeight: 1.45,
            marginBottom: "6px",
          }}
        >
          {item.name}
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {item.blockedByOwner ? (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--gold)", textTransform: "uppercase" }}>
              Owner missing
            </span>
          ) : null}
          {item.blockedByEvidence ? (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--gold)", textTransform: "uppercase" }}>
              Evidence missing
            </span>
          ) : null}
          {item.overdue ? (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--accent)", textTransform: "uppercase" }}>
              Overdue
            </span>
          ) : null}
        </div>
      </div>

      <div>
        <p style={{ margin: "0 0 4px", fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
          Owner
        </p>
        <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-mid)", lineHeight: 1.45 }}>
          {item.responsibleStakeholderName ?? item.responsibleOrganizationName ?? "Unassigned"}
        </p>
      </div>

      <div>
        <p style={{ margin: "0 0 4px", fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
          Target
        </p>
        <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: "13px", color: item.overdue ? "var(--accent)" : "var(--ink-mid)" }}>
          {formatTargetDate(item.targetDate)}
        </p>
      </div>

      <div>
        <p style={{ margin: "0 0 4px", fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
          Status
        </p>
        <select
          value={status}
          onChange={(event) => applyStatus(event.target.value as RequirementStatusValue)}
          disabled={!canEdit || isPending}
          style={{
            width: "100%",
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: "var(--ink)",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "7px 9px",
          }}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {REQUIREMENT_STATUS_LABELS[option]}
            </option>
          ))}
        </select>
        {error ? (
          <p style={{ margin: "4px 0 0", fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "var(--accent)" }}>
            {error}
          </p>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        <RequirementEvidenceUpload
          projectId={projectId}
          requirementId={item.requirementId}
          projectRequirementId={item.projectRequirementId}
          slug={slug}
          requirementName={item.name}
          existingDocCount={item.documentCount}
          canEdit={canEdit}
          onUploaded={onDocumentUploaded}
        />
        <RequirementNotesQuickInput
          projectId={projectId}
          requirementId={item.requirementId}
          currentStatus={item.status}
          notes={item.notes}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}

export function WorkplanQueue({
  projectId,
  slug,
  dealType,
  rows,
  documents,
  canEdit,
}: Props) {
  const [activeTab, setActiveTab] = useState<QueueTab>("critical");
  const [localRows, setLocalRows] = useState(rows);
  const [localDocuments, setLocalDocuments] = useState(documents);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => setLocalRows(rows), [rows]);
  useEffect(() => setLocalDocuments(documents), [documents]);

  const queue = useMemo(
    () => buildWorkplanQueue(localRows, localDocuments),
    [localRows, localDocuments]
  );

  const tabCounts: Record<QueueTab, number> = {
    critical: queue.criticalNow.length,
    evidence: queue.missingEvidence.length,
    unowned: queue.unowned.length,
    overdue: queue.overdue.length,
    recent: queue.recentlyAdvanced.length,
    done: queue.done.length,
  };

  const activeItems = (() => {
    switch (activeTab) {
      case "critical":
        return queue.criticalNow;
      case "evidence":
        return queue.missingEvidence;
      case "unowned":
        return queue.unowned;
      case "overdue":
        return queue.overdue;
      case "recent":
        return queue.recentlyAdvanced;
      case "done":
        return queue.done;
    }
  })();

  function handleToggleSelected(requirementId: string) {
    setSelectedIds((current) =>
      current.includes(requirementId)
        ? current.filter((id) => id !== requirementId)
        : [...current, requirementId]
    );
  }

  function handleStatusUpdated(requirementId: string, status: RequirementStatusValue) {
    setLocalRows((current) =>
      current.map((row) =>
        row.requirementId === requirementId
          ? { ...row, status }
          : row
      )
    );
  }

  function handleDocumentUploaded(document: DocumentRow) {
    setLocalDocuments((current) => [document, ...current]);
  }

  return (
    <section
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "18px 18px 10px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <div style={{ maxWidth: "720px" }}>
          <p className="eyebrow" style={{ marginBottom: "8px" }}>
            Active Gate Queue
          </p>
          <h3
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "24px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: "0 0 8px",
            }}
          >
            What the team should move next
          </h3>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "var(--ink-mid)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Queue-first view for {dealType === "exim_project_finance" ? "the next EXIM gate" : "the next financing gate"}: prioritize critical items, plug proof gaps, and resolve unowned work before dropping into the full checklist.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        {[
          { label: "Critical now", value: queue.criticalNow.length, tone: "var(--accent)" },
          { label: "Missing evidence", value: queue.missingEvidence.length, tone: "var(--gold)" },
          { label: "Unowned", value: queue.unowned.length, tone: "var(--gold)" },
          { label: "Overdue", value: queue.overdue.length, tone: "var(--accent)" },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "14px 16px",
              backgroundColor: "color-mix(in srgb, var(--bg) 62%, var(--bg-card))",
            }}
          >
            <p style={{ margin: "0 0 6px", fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
              {card.label}
            </p>
            <p style={{ margin: 0, fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "28px", lineHeight: 1, color: card.tone }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        {(Object.keys(TAB_LABELS) as QueueTab[]).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={tabButtonStyle(activeTab === tab)}>
            {TAB_LABELS[tab]} ({tabCounts[tab]})
          </button>
        ))}
      </div>

      <div style={{ border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "28px minmax(0, 2fr) minmax(140px, 0.8fr) minmax(110px, 0.8fr) minmax(150px, 0.9fr) minmax(200px, 1.1fr)",
            gap: "12px",
            padding: "10px 16px",
            backgroundColor: "color-mix(in srgb, var(--bg) 75%, var(--bg-card))",
          }}
        >
          {["", "Requirement", "Owner", "Target", "Status", "Quick actions"].map((label, index) => (
            <span
              key={`${label}-${index}`}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "8px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {activeItems.length > 0 ? (
          activeItems.map((item) => (
            <QueueRow
              key={item.requirementId}
              projectId={projectId}
              slug={slug}
              item={item}
              canEdit={canEdit}
              selected={selectedIds.includes(item.requirementId)}
              onToggleSelected={handleToggleSelected}
              onStatusUpdated={handleStatusUpdated}
              onDocumentUploaded={handleDocumentUploaded}
            />
          ))
        ) : (
          <div
            style={{
              padding: "20px 16px",
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink-muted)",
            }}
          >
            No requirements in this queue.
          </div>
        )}
      </div>

      <BulkStatusBar
        projectId={projectId}
        slug={slug}
        selectedIds={selectedIds}
        onClear={() => setSelectedIds([])}
      />
    </section>
  );
}
