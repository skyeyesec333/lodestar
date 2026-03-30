"use client";

import { useState, useTransition } from "react";
import { updateProject, advanceProjectStage } from "@/actions/projects";
import type { ProjectSector, EximCoverType, ProjectPhase, DealType } from "@prisma/client";

// Serializable version of Project — capexUsdCents as number (BigInt can't cross server/client boundary)
export type SerializableProject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  countryCode: string;
  sector: ProjectSector;
  dealType: DealType;
  capexUsdCents: number | null;
  eximCoverType: EximCoverType | null;
  stage: ProjectPhase;
  targetLoiDate: string | null; // ISO string
};

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

type Props = { project: SerializableProject };

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

export function ProjectEditForm({ project }: Props) {
  const isExim = project.dealType === "exim_project_finance";
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isAdvancing, startAdvanceTransition] = useTransition();

  const isLastStage = project.stage === "financial_close";
  const currentStageIndex = PHASE_VALUES.indexOf(project.stage as typeof PHASE_VALUES[number]);
  const nextStageLabel = !isLastStage ? PHASE_LABELS[PHASE_VALUES[currentStageIndex + 1]] : null;

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

        {!isLastStage && (
          <button
            onClick={handleAdvance}
            disabled={isAdvancing}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "#ffffff",
              backgroundColor: "var(--teal)",
              border: "none",
              borderRadius: "3px",
              padding: "6px 14px",
              cursor: isAdvancing ? "not-allowed" : "pointer",
              opacity: isAdvancing ? 0.6 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {isAdvancing ? "Advancing…" : `Advance → ${nextStageLabel}`}
          </button>
        )}
      </div>

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
                color: "#ffffff",
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
    </div>
  );
}
