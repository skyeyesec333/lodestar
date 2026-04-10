"use client";

import { useState, useTransition, type CSSProperties } from "react";
import {
  addDebtTrancheAction,
  updateDebtTrancheAction,
  removeDebtTrancheAction,
} from "@/actions/debt-tranches";
import type { DebtTrancheRow } from "@/lib/db/debt-tranches";

// ── Label / style constants ──────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  senior_secured: "Senior Secured",
  mezzanine:      "Mezzanine",
  equity_bridge:  "Equity Bridge",
  subordinated:   "Subordinated",
  concessional:   "Concessional",
  first_loss:     "First Loss",
};

const TYPE_COLOR: Record<string, string> = {
  senior_secured: "var(--teal)",
  mezzanine:      "var(--gold)",
  equity_bridge:  "var(--gold)",
  subordinated:   "var(--ink-mid)",
  concessional:   "var(--teal)",
  first_loss:     "var(--accent)",
};

const TYPE_BG: Record<string, string> = {
  senior_secured: "var(--teal-soft)",
  mezzanine:      "var(--gold-soft)",
  equity_bridge:  "var(--gold-soft)",
  subordinated:   "var(--bg)",
  concessional:   "var(--teal-soft)",
  first_loss:     "var(--accent-soft)",
};

const STATUS_LABELS: Record<string, string> = {
  term_sheet: "Term Sheet",
  committed:  "Committed",
  drawn:      "Drawn",
  repaid:     "Repaid",
};

const STATUS_COLOR: Record<string, string> = {
  term_sheet: "var(--gold)",
  committed:  "var(--teal)",
  drawn:      "var(--accent)",
  repaid:     "var(--ink-muted)",
};

const STATUS_BG: Record<string, string> = {
  term_sheet: "var(--gold-soft)",
  committed:  "var(--teal-soft)",
  drawn:      "var(--accent-soft)",
  repaid:     "var(--bg)",
};

const TRANCHE_TYPES = [
  "senior_secured", "mezzanine", "equity_bridge",
  "subordinated", "concessional", "first_loss",
] as const;

const TRANCHE_STATUSES = ["term_sheet", "committed", "drawn", "repaid"] as const;

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

function formatUsd(cents: number | null): string {
  if (cents == null) return "—";
  const millions = cents / 100_000_000;
  if (millions >= 1) return `$${millions.toFixed(1)}M`;
  const thousands = cents / 100_000;
  if (thousands >= 1) return `$${thousands.toFixed(0)}K`;
  return `$${(cents / 100).toFixed(0)}`;
}

// ── Badge sub-components ─────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px",
        fontWeight: 500,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        color: TYPE_COLOR[type] ?? "var(--ink-muted)",
        backgroundColor: TYPE_BG[type] ?? "var(--bg)",
        border: `1px solid ${TYPE_COLOR[type] ?? "var(--border)"}`,
        borderRadius: "3px",
        padding: "2px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

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

// ── Blank form state ─────────────────────────────────────────────────────────

type TrancheForm = {
  name: string;
  type: string;
  amountUsd: string;
  tenorYears: string;
  interestRateBps: string;
  status: string;
  funderId: string;
};

const BLANK_FORM: TrancheForm = {
  name: "",
  type: "senior_secured",
  amountUsd: "",
  tenorYears: "",
  interestRateBps: "",
  status: "term_sheet",
  funderId: "",
};

// ── Main component ───────────────────────────────────────────────────────────

export function DebtTranchePanel({
  projectId,
  slug,
  initialTranches,
  funders,
}: {
  projectId: string;
  slug: string;
  initialTranches: DebtTrancheRow[];
  funders: Array<{ id: string; name: string }>;
}) {
  const [tranches, setTranches] = useState(initialTranches);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<TrancheForm>(BLANK_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TrancheForm>(BLANK_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit(t: DebtTrancheRow) {
    setEditingId(t.id);
    setEditForm({
      name: t.name,
      type: t.type,
      amountUsd: String(t.amountUsdCents / 100),
      tenorYears: t.tenorYears != null ? String(t.tenorYears) : "",
      interestRateBps: t.interestRateBps != null ? String(t.interestRateBps) : "",
      status: t.status,
      funderId: t.funderId ?? "",
    });
    setError(null);
  }

  function handleAdd() {
    setError(null);
    const amountCents = Math.round(parseFloat(addForm.amountUsd) * 100);
    if (!addForm.name.trim() || isNaN(amountCents) || amountCents <= 0) {
      setError("Name and a valid amount are required.");
      return;
    }

    startTransition(async () => {
      const result = await addDebtTrancheAction({
        projectId,
        slug,
        name: addForm.name.trim(),
        type: addForm.type,
        amountUsdCents: amountCents,
        tenorYears: addForm.tenorYears ? parseInt(addForm.tenorYears, 10) : null,
        interestRateBps: addForm.interestRateBps ? parseInt(addForm.interestRateBps, 10) : null,
        status: addForm.status,
        funderId: addForm.funderId || null,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setTranches((prev) => [
        ...prev,
        {
          id: result.value.id,
          projectId,
          funderId: addForm.funderId || null,
          funderName: funders.find((f) => f.id === addForm.funderId)?.name ?? null,
          name: addForm.name.trim(),
          type: addForm.type,
          amountUsdCents: amountCents,
          tenorYears: addForm.tenorYears ? parseInt(addForm.tenorYears, 10) : null,
          interestRateBps: addForm.interestRateBps ? parseInt(addForm.interestRateBps, 10) : null,
          drawSchedule: null,
          status: addForm.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      setAddForm(BLANK_FORM);
      setShowAddForm(false);
    });
  }

  function handleUpdate() {
    if (!editingId) return;
    setError(null);
    const amountCents = Math.round(parseFloat(editForm.amountUsd) * 100);
    if (!editForm.name.trim() || isNaN(amountCents) || amountCents <= 0) {
      setError("Name and a valid amount are required.");
      return;
    }

    startTransition(async () => {
      const result = await updateDebtTrancheAction({
        trancheId: editingId,
        slug,
        name: editForm.name.trim(),
        type: editForm.type,
        amountUsdCents: amountCents,
        tenorYears: editForm.tenorYears ? parseInt(editForm.tenorYears, 10) : null,
        interestRateBps: editForm.interestRateBps ? parseInt(editForm.interestRateBps, 10) : null,
        status: editForm.status,
        funderId: editForm.funderId || null,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setTranches((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                name: editForm.name.trim(),
                type: editForm.type,
                amountUsdCents: amountCents,
                tenorYears: editForm.tenorYears ? parseInt(editForm.tenorYears, 10) : null,
                interestRateBps: editForm.interestRateBps ? parseInt(editForm.interestRateBps, 10) : null,
                status: editForm.status,
                funderId: editForm.funderId || null,
                funderName: funders.find((f) => f.id === editForm.funderId)?.name ?? null,
                updatedAt: new Date(),
              }
            : t
        )
      );
      setEditingId(null);
    });
  }

  function handleRemove(trancheId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeDebtTrancheAction({ trancheId, slug });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setTranches((prev) => prev.filter((t) => t.id !== trancheId));
    });
  }

  // ── Aggregate metrics ────────────────────────────────────────────────────
  const totalCommitted = tranches
    .filter((t) => t.status === "committed" || t.status === "drawn")
    .reduce((sum, t) => sum + t.amountUsdCents, 0);
  const totalAll = tranches.reduce((sum, t) => sum + t.amountUsdCents, 0);

  // ── Form renderer (shared for add & edit) ────────────────────────────────
  function renderForm(form: TrancheForm, setForm: (f: TrancheForm) => void, onSubmit: () => void, onCancel: () => void, submitLabel: string) {
    return (
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
            <label style={labelStyle}>Name</label>
            <input
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Senior A"
            />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select
              style={inputStyle}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {TRANCHE_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Amount (USD)</label>
            <input
              style={inputStyle}
              type="number"
              value={form.amountUsd}
              onChange={(e) => setForm({ ...form, amountUsd: e.target.value })}
              placeholder="e.g. 50000000"
              min="0"
              step="1000"
            />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select
              style={inputStyle}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {TRANCHE_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tenor (years)</label>
            <input
              style={inputStyle}
              type="number"
              value={form.tenorYears}
              onChange={(e) => setForm({ ...form, tenorYears: e.target.value })}
              placeholder="Optional"
              min="1"
            />
          </div>
          <div>
            <label style={labelStyle}>Interest rate (bps)</label>
            <input
              style={inputStyle}
              type="number"
              value={form.interestRateBps}
              onChange={(e) => setForm({ ...form, interestRateBps: e.target.value })}
              placeholder="e.g. 350"
              min="0"
              max="10000"
            />
          </div>
          {funders.length > 0 && (
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Linked funder (optional)</label>
              <select
                style={inputStyle}
                value={form.funderId}
                onChange={(e) => setForm({ ...form, funderId: e.target.value })}
              >
                <option value="">— None —</option>
                {funders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--accent)", margin: "0 0 8px" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={onSubmit}
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
            {isPending ? "Saving…" : submitLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "6px 14px",
              borderRadius: "4px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg)",
              color: "var(--ink-muted)",
              cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "18px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <div>
          <p style={{ ...labelStyle, marginBottom: "2px" }}>Debt tranches</p>
          {tranches.length > 0 && (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                color: "var(--ink-muted)",
                margin: 0,
              }}
            >
              {tranches.length} tranche{tranches.length !== 1 ? "s" : ""} · {formatUsd(totalAll)} total · {formatUsd(totalCommitted)} committed
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setShowAddForm(!showAddForm); setError(null); setAddForm(BLANK_FORM); }}
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
          {showAddForm ? "Cancel" : "+ Add tranche"}
        </button>
      </div>

      {/* Add form */}
      {showAddForm &&
        renderForm(
          addForm,
          setAddForm,
          handleAdd,
          () => { setShowAddForm(false); setError(null); },
          "Add tranche"
        )}

      {/* Tranche list */}
      {tranches.length === 0 && !showAddForm && (
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: "var(--ink-muted)",
            fontStyle: "italic",
            margin: "8px 0",
          }}
        >
          No debt tranches recorded yet. Add one to track your capital structure.
        </p>
      )}

      {tranches.map((t) =>
        editingId === t.id ? (
          <div key={t.id}>
            {renderForm(
              editForm,
              setEditForm,
              handleUpdate,
              () => { setEditingId(null); setError(null); },
              "Save changes"
            )}
          </div>
        ) : (
          <div
            key={t.id}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "12px 16px",
              backgroundColor: "color-mix(in srgb, var(--bg) 60%, var(--bg-card))",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "6px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                {t.name}
              </span>
              <TypeBadge type={t.type} />
              <StatusBadge status={t.status} />
              {t.funderName && (
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "11px",
                    color: "var(--ink-muted)",
                  }}
                >
                  via {t.funderName}
                </span>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "18px", color: "var(--ink)" }}>
                {formatUsd(t.amountUsdCents)}
              </span>
              {t.tenorYears != null && (
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink-muted)" }}>
                  {t.tenorYears} yr tenor
                </span>
              )}
              {t.interestRateBps != null && (
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink-muted)" }}>
                  {t.interestRateBps} bps
                </span>
              )}

              <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  disabled={isPending}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: "3px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg)",
                    color: "var(--ink-muted)",
                    cursor: isPending ? "not-allowed" : "pointer",
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(t.id)}
                  disabled={isPending}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: "3px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg)",
                    color: "var(--accent)",
                    cursor: isPending ? "not-allowed" : "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
