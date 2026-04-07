"use client";

import { useState, useTransition } from "react";
import type { CovenantRow } from "@/lib/db/covenants";
import {
  addCovenantAction,
  updateCovenantAction,
  markCovenantSatisfiedAction,
  removeCovenantAction,
} from "@/actions/covenants";

// ── Constants ─────────────────────────────────────────────────────────────────

const COVENANT_TYPE_LABELS: Record<string, string> = {
  financial_ratio: "Financial Ratio",
  reporting: "Reporting",
  insurance: "Insurance",
  operational: "Operational",
  other: "Other",
};

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-Annual",
  annual: "Annual",
  one_time: "One-Time",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  satisfied: "Satisfied",
  waived: "Waived",
};

const COVENANT_TYPES = [
  "financial_ratio",
  "reporting",
  "insurance",
  "operational",
  "other",
] as const;

const COVENANT_FREQUENCIES = [
  "monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "one_time",
] as const;

const STATUS_OPTIONS = ["active", "satisfied", "waived"] as const;

type CovenantType = (typeof COVENANT_TYPES)[number];
type CovenantFrequency = (typeof COVENANT_FREQUENCIES)[number];
type CovenantStatus = (typeof STATUS_OPTIONS)[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateInput(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(covenant: CovenantRow): boolean {
  if (covenant.status !== "active" || !covenant.nextDueAt) return false;
  return new Date(covenant.nextDueAt).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
}

function isDueWithin30Days(covenant: CovenantRow): boolean {
  if (covenant.status !== "active" || !covenant.nextDueAt) return false;
  const now = new Date().setHours(0, 0, 0, 0);
  const due = new Date(covenant.nextDueAt).setHours(0, 0, 0, 0);
  return due >= now && due <= now + 30 * 86_400_000;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  projectId: string;
  slug: string;
  initialCovenants: CovenantRow[];
};

type AddDraft = {
  title: string;
  covenantType: CovenantType;
  frequency: CovenantFrequency;
  nextDueAt: string;
  notes: string;
  funder: string;
};

type EditDraft = {
  id: string;
  title: string;
  nextDueAt: string;
  notes: string;
  status: CovenantStatus;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{
        display: "inline-block",
        width: "12px",
        height: "12px",
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
      }}
    />
  );
}

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "red" | "amber" | "gray" | "green";
}) {
  const colorMap = {
    red: { bg: "var(--accent-soft, #fee2e2)", text: "var(--accent, #dc2626)", border: "var(--accent, #dc2626)" },
    amber: { bg: "#fffbeb", text: "#b45309", border: "#fbbf24" },
    gray: { bg: "var(--bg-card)", text: "var(--ink-muted)", border: "var(--border)" },
    green: { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  };
  const c = colorMap[color];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "999px",
        border: `1px solid ${c.border}`,
        backgroundColor: c.bg,
        color: c.text,
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px",
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function statusBadgeColor(status: string, overdue: boolean): "red" | "amber" | "gray" | "green" {
  if (overdue) return "red";
  if (status === "satisfied") return "green";
  if (status === "waived") return "gray";
  return "gray";
}

// ── Input helpers (inline styles for consistency with the rest of the app) ────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "'DM Mono', monospace",
  fontSize: "9px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  marginBottom: "4px",
};

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: "4px" }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CovenantMonitoringPanel({
  projectId,
  slug,
  initialCovenants,
}: Props) {
  const [covenants, setCovenants] = useState<CovenantRow[]>(initialCovenants);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [addDraft, setAddDraft] = useState<AddDraft>({
    title: "",
    covenantType: "financial_ratio",
    frequency: "quarterly",
    nextDueAt: "",
    notes: "",
    funder: "",
  });

  const [isPending, startTransition] = useTransition();

  const overdue = covenants.filter(isOverdue);
  const upcoming = covenants.filter((c) => !isOverdue(c) && isDueWithin30Days(c));

  // ── Add ────────────────────────────────────────────────────────────────────

  function resetAddDraft() {
    setAddDraft({
      title: "",
      covenantType: "financial_ratio",
      frequency: "quarterly",
      nextDueAt: "",
      notes: "",
      funder: "",
    });
    setAddError(null);
  }

  function handleAdd() {
    if (!addDraft.title.trim()) {
      setAddError("Title is required.");
      return;
    }
    setAddError(null);
    startTransition(async () => {
      const result = await addCovenantAction({
        projectId,
        slug,
        title: addDraft.title.trim(),
        covenantType: addDraft.covenantType,
        frequency: addDraft.frequency,
        nextDueAt: addDraft.nextDueAt ? new Date(addDraft.nextDueAt) : null,
        notes: addDraft.notes.trim() || null,
        funderId: null,
      });
      if (!result.ok) {
        setAddError(result.error.message);
        return;
      }
      // Optimistic: refresh page data via server revalidation — reload covenants
      window.location.reload();
    });
  }

  // ── Mark satisfied ─────────────────────────────────────────────────────────

  function handleMarkSatisfied(covenantId: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await markCovenantSatisfiedAction({ covenantId, slug });
      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }
      window.location.reload();
    });
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  function openEdit(c: CovenantRow) {
    setEditDraft({
      id: c.id,
      title: c.title,
      nextDueAt: toDateInput(c.nextDueAt),
      notes: c.notes ?? "",
      status: (STATUS_OPTIONS.includes(c.status as CovenantStatus) ? c.status : "active") as CovenantStatus,
    });
    setEditError(null);
  }

  function handleEditSave() {
    if (!editDraft) return;
    if (!editDraft.title.trim()) {
      setEditError("Title is required.");
      return;
    }
    setEditError(null);
    startTransition(async () => {
      const result = await updateCovenantAction({
        covenantId: editDraft.id,
        slug,
        title: editDraft.title.trim(),
        nextDueAt: editDraft.nextDueAt ? new Date(editDraft.nextDueAt) : null,
        notes: editDraft.notes.trim() || null,
        status: editDraft.status,
      });
      if (!result.ok) {
        setEditError(result.error.message);
        return;
      }
      window.location.reload();
    });
  }

  // ── Remove ─────────────────────────────────────────────────────────────────

  function handleRemove(covenantId: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await removeCovenantAction({ covenantId, slug });
      if (!result.ok) {
        setActionError(result.error.message);
        return;
      }
      setCovenants((prev) => prev.filter((c) => c.id !== covenantId));
      setConfirmRemoveId(null);
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div
        id="section-covenants"
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
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p className="eyebrow" style={{ marginBottom: "4px" }}>Execution workspace</p>
            <h2
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "22px",
                fontWeight: 400,
                color: "var(--ink)",
                margin: 0,
              }}
            >
              Covenants
            </h2>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                color: "var(--ink-mid)",
                margin: "4px 0 0",
              }}
            >
              Track ongoing funder obligations with due-date monitoring and satisfaction history.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowAddSheet(true); resetAddDraft(); }}
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--ink)",
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            + Add Covenant
          </button>
        </div>

        {/* Overdue alert */}
        {overdue.length > 0 && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              border: "1px solid var(--accent, #dc2626)",
              borderLeft: "3px solid var(--accent, #dc2626)",
              borderRadius: "4px",
              padding: "12px 16px",
              marginBottom: "16px",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--accent, #dc2626)",
                margin: "0 0 6px",
                fontWeight: 600,
              }}
            >
              Overdue — {overdue.length} covenant{overdue.length !== 1 ? "s" : ""}
            </p>
            <div style={{ display: "grid", gap: "4px" }}>
              {overdue.map((c) => (
                <p
                  key={c.id}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    color: "var(--ink)",
                    margin: 0,
                  }}
                >
                  <strong>{c.title}</strong> — was due {formatDate(c.nextDueAt)}
                  {c.funderName ? ` (${c.funderName})` : ""}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming within 30 days */}
        {upcoming.length > 0 && (
          <div
            style={{
              backgroundColor: "#fffbeb",
              border: "1px solid #fbbf24",
              borderLeft: "3px solid #b45309",
              borderRadius: "4px",
              padding: "12px 16px",
              marginBottom: "16px",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#b45309",
                margin: "0 0 6px",
                fontWeight: 600,
              }}
            >
              Due within 30 days — {upcoming.length} covenant{upcoming.length !== 1 ? "s" : ""}
            </p>
            <div style={{ display: "grid", gap: "4px" }}>
              {upcoming.map((c) => (
                <p
                  key={c.id}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    color: "var(--ink)",
                    margin: 0,
                  }}
                >
                  <strong>{c.title}</strong> — due {formatDate(c.nextDueAt)}
                  {c.funderName ? ` (${c.funderName})` : ""}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Global action error */}
        {actionError && (
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "12px",
              color: "var(--accent, #dc2626)",
              marginBottom: "12px",
            }}
          >
            {actionError}
          </p>
        )}

        {/* Empty state */}
        {covenants.length === 0 && (
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "var(--ink-muted)",
              padding: "20px 0",
              textAlign: "center",
            }}
          >
            No covenants yet. Add a covenant to start tracking funder obligations.
          </p>
        )}

        {/* Covenants table */}
        {covenants.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr>
                  {["Title", "Type", "Funder", "Frequency", "Next Due", "Status", "Actions"].map(
                    (col) => (
                      <th
                        key={col}
                        style={{
                          textAlign: "left",
                          padding: "6px 10px",
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "9px",
                          fontWeight: 600,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--ink-muted)",
                          borderBottom: "1px solid var(--border)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {covenants.map((c) => {
                  const overdueCovenant = isOverdue(c);
                  const upcomingCovenant = !overdueCovenant && isDueWithin30Days(c);
                  const isEditing = editDraft?.id === c.id;

                  if (isEditing && editDraft) {
                    return (
                      <tr key={c.id}>
                        <td
                          colSpan={7}
                          style={{
                            padding: "12px 10px",
                            borderBottom: "1px solid var(--border)",
                            backgroundColor: "var(--bg)",
                          }}
                        >
                          <div
                            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"
                            style={{
                              alignItems: "end",
                            }}
                          >
                            <FormField label="Title">
                              <input
                                style={inputStyle}
                                value={editDraft.title}
                                onChange={(e) =>
                                  setEditDraft((d) => d && { ...d, title: e.target.value })
                                }
                              />
                            </FormField>
                            <FormField label="Next Due">
                              <input
                                type="date"
                                style={inputStyle}
                                value={editDraft.nextDueAt}
                                onChange={(e) =>
                                  setEditDraft((d) => d && { ...d, nextDueAt: e.target.value })
                                }
                              />
                            </FormField>
                            <FormField label="Status">
                              <select
                                style={inputStyle}
                                value={editDraft.status}
                                onChange={(e) =>
                                  setEditDraft((d) =>
                                    d && { ...d, status: e.target.value as CovenantStatus }
                                  )
                                }
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {STATUS_LABELS[s]}
                                  </option>
                                ))}
                              </select>
                            </FormField>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={handleEditSave}
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: "6px",
                                  border: "none",
                                  background: "var(--ink)",
                                  color: "var(--bg)",
                                  fontFamily: "'DM Mono', monospace",
                                  fontSize: "10px",
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                {isPending && <Spinner />}
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditDraft(null)}
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border)",
                                  background: "transparent",
                                  color: "var(--ink-muted)",
                                  fontFamily: "'DM Mono', monospace",
                                  fontSize: "10px",
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  cursor: "pointer",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                          <FormField label="Notes">
                            <textarea
                              style={{ ...inputStyle, resize: "vertical", minHeight: "60px" }}
                              value={editDraft.notes}
                              onChange={(e) =>
                                setEditDraft((d) => d && { ...d, notes: e.target.value })
                              }
                            />
                          </FormField>
                          {editError && (
                            <p
                              style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: "12px",
                                color: "var(--accent, #dc2626)",
                                margin: "6px 0 0",
                              }}
                            >
                              {editError}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={c.id}
                      style={{
                        backgroundColor: overdueCovenant
                          ? "#fff5f5"
                          : upcomingCovenant
                            ? "#fffef0"
                            : "transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid var(--border)",
                          color: overdueCovenant ? "var(--accent, #dc2626)" : "var(--ink)",
                          fontWeight: overdueCovenant ? 600 : 400,
                          maxWidth: "220px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {c.title}
                          {overdueCovenant && <Badge color="red">Overdue</Badge>}
                        </div>
                        {c.notes && (
                          <p
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "11px",
                              color: "var(--ink-muted)",
                              margin: "2px 0 0",
                              lineHeight: 1.4,
                            }}
                          >
                            {c.notes}
                          </p>
                        )}
                      </td>
                      <td style={{ padding: "10px", borderBottom: "1px solid var(--border)", color: "var(--ink-mid)", whiteSpace: "nowrap" }}>
                        {COVENANT_TYPE_LABELS[c.covenantType] ?? c.covenantType}
                      </td>
                      <td style={{ padding: "10px", borderBottom: "1px solid var(--border)", color: "var(--ink-mid)", whiteSpace: "nowrap" }}>
                        {c.funderName ?? "—"}
                      </td>
                      <td style={{ padding: "10px", borderBottom: "1px solid var(--border)", color: "var(--ink-mid)", whiteSpace: "nowrap" }}>
                        {FREQUENCY_LABELS[c.frequency] ?? c.frequency}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          borderBottom: "1px solid var(--border)",
                          color: overdueCovenant
                            ? "var(--accent, #dc2626)"
                            : upcomingCovenant
                              ? "#b45309"
                              : "var(--ink-mid)",
                          whiteSpace: "nowrap",
                          fontWeight: overdueCovenant || upcomingCovenant ? 600 : 400,
                        }}
                      >
                        {formatDate(c.nextDueAt)}
                      </td>
                      <td style={{ padding: "10px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                        <Badge color={statusBadgeColor(c.status, overdueCovenant)}>
                          {STATUS_LABELS[c.status] ?? c.status}
                        </Badge>
                      </td>
                      <td style={{ padding: "10px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          {c.status === "active" && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleMarkSatisfied(c.id)}
                              title="Mark Satisfied"
                              style={{
                                padding: "4px 8px",
                                borderRadius: "4px",
                                border: "1px solid #86efac",
                                background: "#f0fdf4",
                                color: "#15803d",
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "9px",
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              {isPending ? <Spinner /> : null}
                              Satisfy
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              border: "1px solid var(--border)",
                              background: "transparent",
                              color: "var(--ink-muted)",
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "9px",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                          {confirmRemoveId === c.id ? (
                            <>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleRemove(c.id)}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid var(--accent, #dc2626)",
                                  background: "#fee2e2",
                                  color: "var(--accent, #dc2626)",
                                  fontFamily: "'DM Mono', monospace",
                                  fontSize: "9px",
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                {isPending ? <Spinner /> : null}
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRemoveId(null)}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid var(--border)",
                                  background: "transparent",
                                  color: "var(--ink-muted)",
                                  fontFamily: "'DM Mono', monospace",
                                  fontSize: "9px",
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  cursor: "pointer",
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveId(c.id)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "4px",
                                border: "1px solid var(--border)",
                                background: "transparent",
                                color: "var(--ink-muted)",
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "9px",
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                cursor: "pointer",
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Covenant Sheet / Modal */}
      {showAddSheet && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setShowAddSheet(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 100,
            }}
          />
          {/* Panel */}
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(480px, 100vw)",
              background: "var(--bg-card)",
              borderLeft: "1px solid var(--border)",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
              zIndex: 101,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Sheet header */}
            <div
              style={{
                padding: "24px 28px 16px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <p className="eyebrow" style={{ marginBottom: "4px" }}>Covenants</p>
                <h3
                  style={{
                    fontFamily: "'DM Serif Display', Georgia, serif",
                    fontSize: "20px",
                    fontWeight: 400,
                    color: "var(--ink)",
                    margin: 0,
                  }}
                >
                  Add Covenant
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSheet(false)}
                aria-label="Close covenant panel"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--ink-muted)",
                  fontSize: "20px",
                  lineHeight: 1,
                  padding: "4px",
                }}
              >
                ×
              </button>
            </div>

            {/* Sheet body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
              <div style={{ display: "grid", gap: "16px" }}>
                <FormField label="Title *">
                  <input
                    style={inputStyle}
                    placeholder="e.g. Debt Service Coverage Ratio"
                    value={addDraft.title}
                    onChange={(e) =>
                      setAddDraft((d) => ({ ...d, title: e.target.value }))
                    }
                  />
                </FormField>

                <FormField label="Covenant Type">
                  <select
                    style={inputStyle}
                    value={addDraft.covenantType}
                    onChange={(e) =>
                      setAddDraft((d) => ({
                        ...d,
                        covenantType: e.target.value as CovenantType,
                      }))
                    }
                  >
                    {COVENANT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {COVENANT_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Frequency">
                  <select
                    style={inputStyle}
                    value={addDraft.frequency}
                    onChange={(e) =>
                      setAddDraft((d) => ({
                        ...d,
                        frequency: e.target.value as CovenantFrequency,
                      }))
                    }
                  >
                    {COVENANT_FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {FREQUENCY_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Next Due Date">
                  <input
                    type="date"
                    style={inputStyle}
                    value={addDraft.nextDueAt}
                    onChange={(e) =>
                      setAddDraft((d) => ({ ...d, nextDueAt: e.target.value }))
                    }
                  />
                </FormField>

                <FormField label="Funder (optional)">
                  <input
                    style={inputStyle}
                    placeholder="e.g. US EXIM Bank"
                    value={addDraft.funder}
                    onChange={(e) =>
                      setAddDraft((d) => ({ ...d, funder: e.target.value }))
                    }
                  />
                </FormField>

                <FormField label="Notes">
                  <textarea
                    style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
                    placeholder="Additional context or threshold details..."
                    value={addDraft.notes}
                    onChange={(e) =>
                      setAddDraft((d) => ({ ...d, notes: e.target.value }))
                    }
                  />
                </FormField>

                {addError && (
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "12px",
                      color: "var(--accent, #dc2626)",
                      margin: 0,
                    }}
                  >
                    {addError}
                  </p>
                )}
              </div>
            </div>

            {/* Sheet footer */}
            <div
              style={{
                padding: "16px 28px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setShowAddSheet(false)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--ink-muted)",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleAdd}
                style={{
                  padding: "9px 18px",
                  borderRadius: "6px",
                  border: "none",
                  background: "var(--ink)",
                  color: "var(--bg)",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isPending && <Spinner />}
                Add Covenant
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
