"use client";

import { useState, useTransition, type CSSProperties } from "react";
import {
  createDocumentRequest,
  updateStakeholderDocumentRequestStatus,
} from "@/actions/document-requests";
import type { DocumentRequestListRow } from "@/lib/db/document-requests";

// ── Style constants ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  received:  "Received",
  waived:    "Waived",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  requested: "var(--gold)",
  received:  "var(--teal)",
  waived:    "var(--ink-muted)",
  cancelled: "var(--accent)",
};

const STATUS_BG: Record<string, string> = {
  requested: "var(--gold-soft)",
  received:  "var(--teal-soft)",
  waived:    "var(--bg)",
  cancelled: "var(--accent-soft)",
};

const TRANSITION_OPTIONS = ["received", "waived", "cancelled"] as const;

const inputStyle: CSSProperties = {
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

const labelStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "9px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  display: "block",
  marginBottom: "5px",
};

function daysSince(d: Date): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
}

function isOverdue(d: Date | null): boolean {
  if (!d) return false;
  return new Date(d) < new Date();
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Badge ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px",
        fontWeight: 500,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: STATUS_COLOR[status] ?? "var(--ink-muted)",
        backgroundColor: STATUS_BG[status] ?? "var(--bg)",
        border: `1px solid ${STATUS_COLOR[status] ?? "var(--border)"}`,
        borderRadius: "3px",
        padding: "2px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Form state ───────────────────────────────────────────────────────────────

type CreateForm = {
  stakeholderId: string;
  title: string;
  description: string;
  projectRequirementId: string;
  dueDate: string;
};

const BLANK_FORM: CreateForm = {
  stakeholderId: "",
  title: "",
  description: "",
  projectRequirementId: "",
  dueDate: "",
};

// ── Main component ───────────────────────────────────────────────────────────

export function DocumentRequestPanel({
  projectId,
  slug,
  initialRequests,
  stakeholders,
  requirementOptions,
}: {
  projectId: string;
  slug: string;
  initialRequests: DocumentRequestListRow[];
  stakeholders: Array<{ id: string; name: string }>;
  requirementOptions: Array<{ projectRequirementId: string; name: string }>;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(BLANK_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openCount = requests.filter((r) => r.status === "requested").length;
  const receivedCount = requests.filter((r) => r.status === "received").length;

  function handleCreate() {
    setError(null);
    if (!form.stakeholderId || !form.title.trim()) {
      setError("Stakeholder and title are required.");
      return;
    }

    const stakeholder = stakeholders.find((s) => s.id === form.stakeholderId);
    const requirement = requirementOptions.find((r) => r.projectRequirementId === form.projectRequirementId);

    startTransition(async () => {
      const result = await createDocumentRequest({
        projectId,
        slug,
        stakeholderId: form.stakeholderId,
        stakeholderName: stakeholder?.name ?? "",
        title: form.title.trim(),
        description: form.description.trim() || null,
        projectRequirementId: form.projectRequirementId || null,
        requirementName: requirement?.name ?? null,
        dueDate: form.dueDate || null,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setRequests((prev) => [
        {
          ...result.value,
          stakeholderId: form.stakeholderId,
          stakeholderName: stakeholder?.name ?? "",
          projectRequirementId: form.projectRequirementId || null,
        },
        ...prev,
      ]);
      setForm(BLANK_FORM);
      setShowCreate(false);
    });
  }

  function handleStatusChange(req: DocumentRequestListRow, newStatus: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateStakeholderDocumentRequestStatus({
        projectId,
        slug,
        requestId: req.id,
        stakeholderName: req.stakeholderName,
        title: req.title,
        status: newStatus,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setRequests((prev) =>
        prev.map((r) =>
          r.id === req.id ? { ...r, status: newStatus as DocumentRequestListRow["status"] } : r
        )
      );
    });
  }

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "20px 22px",
        backgroundColor: "var(--bg-card)",
        marginBottom: "18px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div>
          <p style={{ ...labelStyle, marginBottom: "2px" }}>Document requests</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink-muted)", margin: 0 }}>
            {openCount} open · {receivedCount} received · {requests.length} total
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowCreate(!showCreate); setError(null); setForm(BLANK_FORM); }}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "5px 12px",
            borderRadius: "4px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg)",
            color: "var(--ink)",
            cursor: "pointer",
          }}
        >
          {showCreate ? "Cancel" : "+ New request"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "14px 16px",
            backgroundColor: "color-mix(in srgb, var(--bg) 60%, var(--bg-card))",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div>
              <label style={labelStyle}>Stakeholder</label>
              <select
                style={inputStyle}
                value={form.stakeholderId}
                onChange={(e) => setForm({ ...form, stakeholderId: e.target.value })}
              >
                <option value="">Select stakeholder…</option>
                {stakeholders.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Title</label>
              <input
                style={inputStyle}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. EPC Term Sheet"
              />
            </div>
            <div>
              <label style={labelStyle}>Linked requirement (optional)</label>
              <select
                style={inputStyle}
                value={form.projectRequirementId}
                onChange={(e) => setForm({ ...form, projectRequirementId: e.target.value })}
              >
                <option value="">— None —</option>
                {requirementOptions.map((r) => (
                  <option key={r.projectRequirementId} value={r.projectRequirementId}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Due date (optional)</label>
              <input
                style={inputStyle}
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Description (optional)</label>
              <textarea
                style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Any additional context or instructions…"
              />
            </div>
          </div>

          {error && (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--accent)", margin: "0 0 8px" }}>{error}</p>
          )}

          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "6px 14px",
              borderRadius: "4px",
              border: "1px solid var(--teal)",
              backgroundColor: "var(--teal)",
              color: "var(--text-inverse)",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Sending…" : "Send request"}
          </button>
        </div>
      )}

      {/* Empty state */}
      {requests.length === 0 && !showCreate && (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-muted)", fontStyle: "italic" }}>
          No document requests yet. Request specific documents from stakeholders to fill evidence gaps.
        </p>
      )}

      {/* Request list */}
      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "10px 14px",
            backgroundColor: "color-mix(in srgb, var(--bg) 60%, var(--bg-card))",
            marginBottom: "6px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
              {req.title}
            </span>
            <StatusBadge status={req.status} />
            {req.dueDate && isOverdue(req.dueDate) && req.status === "requested" && (
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                }}
              >
                Overdue
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink-muted)" }}>
              {req.stakeholderName}
            </span>
            {req.requirementName && (
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "var(--ink-muted)" }}>
                for {req.requirementName}
              </span>
            )}
            {req.dueDate && (
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: isOverdue(req.dueDate) && req.status === "requested" ? "var(--accent)" : "var(--ink-muted)" }}>
                Due {formatDate(req.dueDate)}
              </span>
            )}
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "var(--ink-muted)" }}>
              {daysSince(req.createdAt)}d ago
            </span>

            {/* Status transition buttons */}
            {req.status === "requested" && (
              <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
                {TRANSITION_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(req, s)}
                    disabled={isPending}
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "2px 7px",
                      borderRadius: "3px",
                      border: `1px solid ${STATUS_COLOR[s] ?? "var(--border)"}`,
                      backgroundColor: STATUS_BG[s] ?? "var(--bg)",
                      color: STATUS_COLOR[s] ?? "var(--ink-muted)",
                      cursor: isPending ? "not-allowed" : "pointer",
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
