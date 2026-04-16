"use client";

import { useState, useTransition } from "react";
import { updateProject, advanceProjectStage } from "@/actions/projects";
import type { SerializableProject } from "@/types";
import type { GateReview } from "@/lib/projects/gate-review";

export type { SerializableProject } from "@/types";

const SECTORS = ["power", "transport", "water", "telecom", "mining", "other"] as const;
const COVER_TYPES = ["comprehensive", "political_only"] as const;
const PHASE_VALUES = [
  "concept", "pre_loi", "loi_submitted", "loi_approved",
  "pre_commitment", "final_commitment", "financial_close",
] as const;
const PHASE_LABELS: Record<string, string> = {
  concept: "Concept",
  pre_loi: "Pre-LOI",
  loi_submitted: "LOI Submitted",
  loi_approved: "LOI Approved",
  pre_commitment: "Pre-Commitment",
  final_commitment: "Final Commitment",
  financial_close: "Financial Close",
};

type Props = {
  project: SerializableProject;
  canManageProject?: boolean;
  gateReview?: GateReview;
};

const inputStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "14px",
  color: "var(--ink)",
  backgroundColor: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "8px 12px",
  width: "100%",
  outline: "none",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500 as const,
  letterSpacing: "0.10em",
  textTransform: "uppercase" as const,
  color: "var(--ink-muted)",
  display: "block" as const,
  marginBottom: "6px",
};

export function ProjectEditForm({
  project,
  canManageProject = true,
  gateReview,
}: Props) {
  const isExim = project.dealType === "exim_project_finance";
  const [open, setOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isAdvancing, startAdvanceTransition] = useTransition();

  const isLastStage = project.stage === "financial_close";
  const currentStageIndex = PHASE_VALUES.indexOf(project.stage as typeof PHASE_VALUES[number]);
  const nextStageLabel = !isLastStage ? PHASE_LABELS[PHASE_VALUES[currentStageIndex + 1]] : null;
  const gateTone =
    gateReview?.status === "ready"
      ? "var(--teal)"
      : gateReview?.status === "at_risk"
        ? "var(--gold)"
        : "var(--accent)";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const capexRaw = fd.get("capexUsd") as string;
    const loiRaw = fd.get("targetLoiDate") as string;

    startTransition(async () => {
      const result = await updateProject({
        projectId: project.id,
        slug: project.slug,
        name: fd.get("name") as string,
        description: (fd.get("description") as string) || null,
        countryCode: fd.get("countryCode") as string,
        sector: fd.get("sector") as string,
        capexUsd: capexRaw ? Number(capexRaw) : null,
        eximCoverType: (fd.get("eximCoverType") as string) || null,
        targetLoiDate: loiRaw ? new Date(loiRaw) : null,
      });

      if (!result.ok) {
        setError(result.error.message);
      } else {
        setOpen(false);
      }
    });
  }

  function handleAdvance() {
    setError(null);
    startAdvanceTransition(async () => {
      const result = await advanceProjectStage({
        projectId: project.id,
        slug: project.slug,
        currentStage: project.stage,
      });
      if (!result.ok) setError(result.error.message);
    });
  }

  const capexDisplay =
    project.capexUsdCents != null
      ? (project.capexUsdCents / 100_000_000).toFixed(0)
      : "";

  const loiDisplay = project.targetLoiDate
    ? project.targetLoiDate.slice(0, 10)
    : "";

  return (
    <div>
      {!canManageProject ? null : (
        <>
      {/* Trigger row */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: open ? "var(--ink-muted)" : "var(--accent)",
            backgroundColor: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "3px",
            padding: "6px 14px",
            cursor: "pointer",
            transition: "color 0.15s",
          }}
        >
          {open ? "Cancel" : "Edit Project"}
        </button>

        {!isLastStage && gateReview && (
          <button
            onClick={() => setGateOpen((current) => !current)}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: gateTone,
              backgroundColor: "transparent",
              border: `1px solid ${gateTone}`,
              borderRadius: "3px",
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            {gateOpen ? "Close Gate Review" : `Review Gate → ${gateReview.nextStageLabel ?? nextStageLabel}`}
          </button>
        )}
      </div>

      {error && !open ? (
        <div
          style={{
            backgroundColor: "var(--accent-soft)",
            border: "1px solid var(--accent)",
            borderRadius: "3px",
            padding: "8px 14px",
            marginTop: "12px",
          }}
        >
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--accent)",
              margin: 0,
            }}
          >
            {error}
          </p>
        </div>
      ) : null}

      {gateOpen && gateReview ? (
        <div
          style={{
            marginTop: "16px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "18px 18px 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "14px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ ...labelStyle, marginBottom: "8px" }}>Gate Review</p>
              <p
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "24px",
                  color: gateTone,
                  margin: "0 0 6px",
                }}
              >
                {gateReview.nextStageLabel ?? "Final Stage"}
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "var(--ink-mid)",
                  lineHeight: 1.55,
                  margin: 0,
                  maxWidth: "640px",
                }}
              >
                {gateReview.focusText}
              </p>
            </div>

            <div
              style={{
                padding: "8px 10px",
                borderRadius: "999px",
                border: `1px solid ${gateTone}`,
                color: gateTone,
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {gateReview.summary}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            {gateReview.criteria.map((criterion) => {
              const criterionTone =
                criterion.status === "ready" ? "var(--teal)" : "var(--accent)";
              return (
                <div
                  key={criterion.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    backgroundColor:
                      criterion.status === "ready"
                        ? "color-mix(in srgb, var(--teal) 8%, var(--bg-card))"
                        : "color-mix(in srgb, var(--accent) 6%, var(--bg-card))",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      marginBottom: "8px",
                    }}
                  >
                    <span style={{ ...labelStyle, marginBottom: 0 }}>{criterion.label}</span>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: criterionTone,
                      }}
                    >
                      {criterion.status === "ready" ? "Ready" : "Blocked"}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "12px",
                      lineHeight: 1.55,
                      color: "var(--ink-mid)",
                      margin: 0,
                    }}
                  >
                    {criterion.detail}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleAdvance}
              disabled={isAdvancing || !gateReview.canAdvance}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--text-inverse)",
                backgroundColor:
                  isAdvancing || !gateReview.canAdvance ? "var(--ink-muted)" : "var(--teal)",
                border: "none",
                borderRadius: "3px",
                padding: "8px 14px",
                cursor:
                  isAdvancing || !gateReview.canAdvance ? "not-allowed" : "pointer",
                opacity: isAdvancing || !gateReview.canAdvance ? 0.65 : 1,
              }}
            >
              {isAdvancing
                ? "Advancing…"
                : gateReview.canAdvance
                  ? `Advance → ${gateReview.nextStageLabel ?? nextStageLabel}`
                  : "Advance blocked"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Edit panel */}
      {open && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: "20px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "28px 32px",
          }}
        >
          {error && (
            <div
              style={{
                backgroundColor: "var(--accent-soft)",
                border: "1px solid var(--accent)",
                borderRadius: "3px",
                padding: "8px 14px",
                marginBottom: "20px",
              }}
            >
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--accent)", margin: 0 }}>
                {error}
              </p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 28px" }}>
            {/* Name */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Project Name</label>
              <input name="name" defaultValue={project.name} required style={inputStyle} />
            </div>

            {/* Description */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Description</label>
              <textarea
                name="description"
                defaultValue={project.description ?? ""}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {/* Country */}
            <div>
              <label style={labelStyle}>Country Code</label>
              <input
                name="countryCode"
                defaultValue={project.countryCode}
                maxLength={2}
                style={{ ...inputStyle, textTransform: "uppercase" }}
              />
            </div>

            {/* Sector */}
            <div>
              <label style={labelStyle}>Sector</label>
              <select name="sector" defaultValue={project.sector} style={inputStyle}>
                {SECTORS.map((s) => (
                  <option key={s} value={s} style={{ textTransform: "capitalize" }}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* CAPEX */}
            <div>
              <label style={labelStyle}>CAPEX (USD millions)</label>
              <input
                name="capexUsd"
                type="number"
                min="0"
                step="1"
                defaultValue={capexDisplay}
                placeholder="e.g. 250"
                style={inputStyle}
              />
            </div>

            {/* EXIM Cover — EXIM only */}
            {isExim && (
              <div>
                <label style={labelStyle}>EXIM Cover Type</label>
                <select name="eximCoverType" defaultValue={project.eximCoverType ?? ""} style={inputStyle}>
                  <option value="">— Not set —</option>
                  {COVER_TYPES.map((c) => (
                    <option key={c} value={c}>
                      {c === "comprehensive" ? "Comprehensive" : "Political Only"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Target LOI date — EXIM only */}
            {isExim && (
              <div>
                <label style={labelStyle}>Target LOI Date</label>
                <input
                  name="targetLoiDate"
                  type="date"
                  defaultValue={loiDisplay}
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
            <button
              type="submit"
              disabled={isPending}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--text-inverse)",
                backgroundColor: "var(--accent)",
                border: "none",
                borderRadius: "3px",
                padding: "10px 24px",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? "Saving…" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                padding: "10px 24px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
        </>
      )}
    </div>
  );
}
