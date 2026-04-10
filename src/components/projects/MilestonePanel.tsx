"use client";

import { useState, useTransition } from "react";
import type { CSSProperties } from "react";
import type { DealMilestoneRow } from "@/lib/db/milestones";
import {
  createMilestoneAction,
  updateMilestoneAction,
  toggleMilestoneComplete,
  deleteMilestoneAction,
  applyMilestoneTemplate,
} from "@/actions/milestones";
import { MILESTONE_TEMPLATES } from "@/lib/exim/milestone-templates";

const PHASE_LABELS: Record<string, string> = {
  concept:          "Concept",
  pre_loi:          "Pre-LOI",
  loi_submitted:    "LOI Submitted",
  loi_approved:     "LOI Approved",
  pre_commitment:   "Pre-Commitment",
  final_commitment: "Final Commitment",
  financial_close:  "Financial Close",
};

type Props = {
  projectId: string;
  slug: string;
  initialMilestones: DealMilestoneRow[];
  anchorDate: string; // ISO — project createdAt or targetLoiDate, used as template anchor
};

type EditDraft = {
  id: string;
  name: string;
  description: string;
  linkedPhase: string;
  targetDate: string;
};

function toDateInput(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function formatDate(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(m: DealMilestoneRow): boolean {
  if (m.completedAt || !m.targetDate) return false;
  return new Date(m.targetDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
}

export function MilestonePanel({ projectId, slug, initialMilestones, anchorDate }: Props) {
  const [milestones, setMilestones] = useState<DealMilestoneRow[]>(initialMilestones);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addPhase, setAddPhase] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(MILESTONE_TEMPLATES[0]?.slug ?? "");
  const [templateAnchor, setTemplateAnchor] = useState(anchorDate.slice(0, 10));
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // ── Add ──────────────────────────────────────────────────────────────────────

  function handleAdd() {
    if (!addName.trim()) { setAddError("Name is required."); return; }
    setAddError(null);
    startTransition(async () => {
      const result = await createMilestoneAction({
        projectId, slug,
        name: addName.trim(),
        targetDate: addDate || null,
        linkedPhase: addPhase || null,
      });
      if (!result.ok) { setAddError(result.error.message); return; }
      setMilestones((prev) => [...prev, result.value].sort((a, b) => a.sortOrder - b.sortOrder));
      setAddName(""); setAddDate(""); setAddPhase("");
      setShowAddForm(false);
    });
  }

  // ── Toggle complete ───────────────────────────────────────────────────────────

  function handleToggle(m: DealMilestoneRow) {
    startTransition(async () => {
      const result = await toggleMilestoneComplete({
        milestoneId: m.id, slug, completed: !m.completedAt,
      });
      if (!result.ok) return;
      setMilestones((prev) => prev.map((x) => x.id === m.id ? result.value : x));
    });
  }

  // ── Edit ──────────────────────────────────────────────────────────────────────

  function openEdit(m: DealMilestoneRow) {
    setEditDraft({
      id: m.id,
      name: m.name,
      description: m.description ?? "",
      linkedPhase: m.linkedPhase ?? "",
      targetDate: toDateInput(m.targetDate),
    });
    setEditError(null);
  }

  function handleEditSave() {
    if (!editDraft) return;
    if (!editDraft.name.trim()) { setEditError("Name is required."); return; }
    setEditError(null);
    startTransition(async () => {
      const result = await updateMilestoneAction({
        milestoneId: editDraft.id, slug,
        name: editDraft.name.trim(),
        description: editDraft.description || null,
        linkedPhase: editDraft.linkedPhase || null,
        targetDate: editDraft.targetDate || null,
      });
      if (!result.ok) { setEditError(result.error.message); return; }
      setMilestones((prev) => prev.map((x) => x.id === editDraft.id ? result.value : x));
      setEditDraft(null);
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteMilestoneAction({ milestoneId: id, slug });
      if (!result.ok) return;
      setMilestones((prev) => prev.filter((x) => x.id !== id));
    });
  }

  // ── Apply template ────────────────────────────────────────────────────────────

  function handleApplyTemplate() {
    setTemplateError(null);
    setTemplateSuccess(null);
    startTransition(async () => {
      const result = await applyMilestoneTemplate({
        projectId, slug,
        templateSlug: selectedTemplate,
        anchorDate: templateAnchor,
      });
      if (!result.ok) { setTemplateError(result.error.message); return; }
      // Reload milestones by refreshing
      window.location.reload();
    });
  }

  const done = milestones.filter((m) => !!m.completedAt).length;
  const total = milestones.length;

  return (
    <div
      id="section-milestones"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "28px 32px",
        marginBottom: "24px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <p className="eyebrow" style={{ margin: 0 }}>Deal Milestones</p>
          {total > 0 && (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--ink-muted)", letterSpacing: "0.06em" }}>
              {done}/{total} complete
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => { setShowTemplates((v) => !v); setShowAddForm(false); }}
            style={{ ...headerBtnStyle, color: showTemplates ? "var(--ink-muted)" : "var(--gold)", borderColor: showTemplates ? "var(--border)" : "var(--gold)" }}
          >
            {showTemplates ? "Cancel" : "Apply Template"}
          </button>
          <button
            onClick={() => { setShowAddForm((v) => !v); setShowTemplates(false); }}
            style={{ ...headerBtnStyle, color: showAddForm ? "var(--ink-muted)" : "var(--teal)", borderColor: showAddForm ? "var(--border)" : "var(--teal)" }}
          >
            {showAddForm ? "Cancel" : "+ Add Milestone"}
          </button>
        </div>
      </div>

      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
        Track key deliverable dates for this deal. Milestones appear as diamond markers on the Deal Timeline.
      </p>

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ height: "3px", backgroundColor: "var(--border)", borderRadius: "2px", marginBottom: "20px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(done / total) * 100}%`, backgroundColor: "var(--teal)", borderRadius: "2px", transition: "width 0.3s" }} />
        </div>
      )}

      {/* Template panel */}
      {showTemplates && (
        <div style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: "3px", padding: "20px", marginBottom: "20px" }}>
          <p style={formSectionLabel}>Apply milestone template</p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink-muted)", margin: "0 0 16px" }}>
            Creates a set of pre-defined milestones with target dates offset from an anchor date. Existing milestones are not removed.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <label style={{ display: "block" }}>
              <span style={formLabel}>Template</span>
              <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} style={selectStyle}>
                {MILESTONE_TEMPLATES.map((t) => (
                  <option key={t.slug} value={t.slug}>{t.label}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "block" }}>
              <span style={formLabel}>Anchor date</span>
              <input type="date" value={templateAnchor} onChange={(e) => setTemplateAnchor(e.target.value)} style={inputStyle} />
            </label>
          </div>
          {selectedTemplate && (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink-muted)", margin: "0 0 12px", fontStyle: "italic" }}>
              {MILESTONE_TEMPLATES.find((t) => t.slug === selectedTemplate)?.description}
              {" "}{MILESTONE_TEMPLATES.find((t) => t.slug === selectedTemplate)?.milestones.length} milestones.
            </p>
          )}
          {templateError && <p style={errorText}>{templateError}</p>}
          {templateSuccess && <p style={{ ...errorText, color: "var(--teal)" }}>{templateSuccess}</p>}
          <button onClick={handleApplyTemplate} disabled={isPending} style={saveBtnStyle}>
            {isPending ? "Applying…" : "Apply Template"}
          </button>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: "3px", padding: "20px", marginBottom: "20px" }}>
          <p style={formSectionLabel}>New milestone</p>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <label style={{ display: "block" }}>
              <span style={formLabel}>Name</span>
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. EPC Contractor Selected"
                style={inputStyle}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                autoFocus
              />
            </label>
            <label style={{ display: "block" }}>
              <span style={formLabel}>Target date</span>
              <input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "block" }}>
              <span style={formLabel}>Linked phase</span>
              <select value={addPhase} onChange={(e) => setAddPhase(e.target.value)} style={selectStyle}>
                <option value="">None</option>
                {Object.entries(PHASE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          {addError && <p style={errorText}>{addError}</p>}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleAdd} disabled={isPending} style={saveBtnStyle}>{isPending ? "Adding…" : "Add Milestone"}</button>
            <button onClick={() => { setShowAddForm(false); setAddError(null); }} style={cancelBtnStyle}>Cancel</button>
          </div>
        </div>
      )}

      {/* Milestone list */}
      {milestones.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-muted)", margin: 0 }}>
            No milestones yet. Add one above or apply a template to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {milestones.map((m) => {
            const overdue = isOverdue(m);
            const isEditing = editDraft?.id === m.id;

            if (isEditing && editDraft) {
              return (
                <div key={m.id} style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", borderRadius: "3px", padding: "14px 16px", marginBottom: "4px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <label style={{ display: "block" }}>
                      <span style={formLabel}>Name</span>
                      <input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} style={inputStyle} autoFocus />
                    </label>
                    <label style={{ display: "block" }}>
                      <span style={formLabel}>Target date</span>
                      <input type="date" value={editDraft.targetDate} onChange={(e) => setEditDraft({ ...editDraft, targetDate: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: "block" }}>
                      <span style={formLabel}>Linked phase</span>
                      <select value={editDraft.linkedPhase} onChange={(e) => setEditDraft({ ...editDraft, linkedPhase: e.target.value })} style={selectStyle}>
                        <option value="">None</option>
                        {Object.entries(PHASE_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label style={{ display: "block", marginBottom: "10px" }}>
                    <span style={formLabel}>Notes</span>
                    <input value={editDraft.description} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} placeholder="Optional notes" style={inputStyle} />
                  </label>
                  {editError && <p style={errorText}>{editError}</p>}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={handleEditSave} disabled={isPending} style={saveBtnStyle}>{isPending ? "Saving…" : "Save"}</button>
                    <button onClick={() => setEditDraft(null)} style={cancelBtnStyle}>Cancel</button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  borderRadius: "3px",
                  backgroundColor: m.completedAt ? "var(--teal-soft)" : overdue ? "var(--accent-soft)" : "transparent",
                  borderLeft: `3px solid ${m.completedAt ? "var(--teal)" : overdue ? "var(--accent)" : "var(--border)"}`,
                  transition: "background-color 0.15s",
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggle(m)}
                  disabled={isPending}
                  style={{
                    width: "16px", height: "16px", flexShrink: 0,
                    border: `2px solid ${m.completedAt ? "var(--teal)" : "var(--border)"}`,
                    borderRadius: "2px",
                    backgroundColor: m.completedAt ? "var(--teal)" : "transparent",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                  title={m.completedAt ? "Mark incomplete" : "Mark complete"}
                >
                  {m.completedAt && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3L3.5 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                {/* Diamond icon */}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                  <path
                    d="M5 0.5L9.5 5L5 9.5L0.5 5Z"
                    fill={m.completedAt ? "var(--teal)" : overdue ? "var(--accent)" : "var(--ink-muted)"}
                    stroke={m.completedAt ? "var(--teal)" : overdue ? "var(--accent)" : "var(--border)"}
                    strokeWidth={m.completedAt ? 0 : 0.8}
                    fillOpacity={m.completedAt ? 1 : 0.4}
                  />
                </svg>

                {/* Name */}
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: m.completedAt ? "var(--teal)" : "var(--ink)",
                  textDecoration: m.completedAt ? "line-through" : "none",
                  flex: 1,
                  minWidth: 0,
                }}>
                  {m.name}
                </span>

                {/* Linked phase badge */}
                {m.linkedPhase && (
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "8px",
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--ink-muted)",
                    border: "1px solid var(--border)",
                    borderRadius: "2px",
                    padding: "2px 5px",
                    whiteSpace: "nowrap",
                  }}>
                    {PHASE_LABELS[m.linkedPhase] ?? m.linkedPhase}
                  </span>
                )}

                {/* Target date */}
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.04em",
                  color: overdue ? "var(--accent)" : "var(--ink-muted)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}>
                  {m.targetDate ? formatDate(m.targetDate) : "—"}
                  {overdue && " · Overdue"}
                </span>

                {/* Actions */}
                <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                  <button onClick={() => openEdit(m)} style={iconBtnStyle} title="Edit">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(m.id)} disabled={isPending} style={{ ...iconBtnStyle, color: "var(--accent)" }} title="Delete">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 3H10M4.5 3V2H7.5V3M5 5.5V9M7 5.5V9M3 3L3.5 10H8.5L9 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const headerBtnStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  backgroundColor: "transparent",
  border: "1px solid",
  borderRadius: "3px",
  padding: "6px 12px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const saveBtnStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-inverse)",
  backgroundColor: "var(--teal)",
  border: "none",
  borderRadius: "3px",
  padding: "8px 14px",
  cursor: "pointer",
};

const cancelBtnStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  backgroundColor: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "7px 12px",
  cursor: "pointer",
};

const iconBtnStyle: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--ink-muted)",
  padding: "2px",
  display: "flex",
  alignItems: "center",
  borderRadius: "2px",
};

const inputStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "var(--ink)",
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "7px 10px",
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "var(--ink)",
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "7px 10px",
  width: "100%",
  outline: "none",
};

const formLabel: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "9px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  display: "block",
  marginBottom: "5px",
};

const formSectionLabel: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  margin: "0 0 14px",
};

const errorText: CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "12px",
  color: "var(--accent)",
  margin: "0 0 10px",
};
