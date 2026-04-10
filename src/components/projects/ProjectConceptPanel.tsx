"use client";

import { useState, useTransition } from "react";
import { updateProjectConceptAction } from "@/actions/project-concepts";
import type { ProjectConceptRow } from "@/lib/db/project-concepts";

type Props = {
  projectId: string;
  slug: string;
  initialConcept: ProjectConceptRow | null;
  canEdit?: boolean;
};

const fieldLabelStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "9px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "88px",
  resize: "vertical",
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  lineHeight: 1.6,
  color: "var(--ink)",
  backgroundColor: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  padding: "10px 12px",
  outline: "none",
  boxSizing: "border-box",
};

function ConceptField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
}) {
  return (
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={fieldLabelStyle}>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={textareaStyle}
      />
    </label>
  );
}

function DisplayField({
  label,
  value,
  fallback,
}: {
  label: string;
  value: string | null;
  fallback: string;
}) {
  return (
    <div style={{ display: "grid", gap: "6px" }}>
      <span style={fieldLabelStyle}>{label}</span>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          lineHeight: 1.65,
          color: value ? "var(--ink)" : "var(--ink-mid)",
          margin: 0,
          whiteSpace: "pre-wrap",
        }}
      >
        {value || fallback}
      </p>
    </div>
  );
}

export function ProjectConceptPanel({
  projectId,
  slug,
  initialConcept,
  canEdit = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [concept, setConcept] = useState<ProjectConceptRow | null>(initialConcept);
  const [draft, setDraft] = useState({
    thesis: initialConcept?.thesis ?? "",
    sponsorRationale: initialConcept?.sponsorRationale ?? "",
    targetOutcome: initialConcept?.targetOutcome ?? "",
    knownUnknowns: initialConcept?.knownUnknowns ?? "",
    fatalFlaws: initialConcept?.fatalFlaws ?? "",
    nextActions: initialConcept?.nextActions ?? "",
    goNoGoRecommendation: initialConcept?.goNoGoRecommendation ?? "",
  });
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateProjectConceptAction({
        projectId,
        slug,
        thesis: draft.thesis || null,
        sponsorRationale: draft.sponsorRationale || null,
        targetOutcome: draft.targetOutcome || null,
        knownUnknowns: draft.knownUnknowns || null,
        fatalFlaws: draft.fatalFlaws || null,
        nextActions: draft.nextActions || null,
        goNoGoRecommendation: draft.goNoGoRecommendation || null,
      });

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setConcept(result.value);
      setDraft({
        thesis: result.value.thesis ?? "",
        sponsorRationale: result.value.sponsorRationale ?? "",
        targetOutcome: result.value.targetOutcome ?? "",
        knownUnknowns: result.value.knownUnknowns ?? "",
        fatalFlaws: result.value.fatalFlaws ?? "",
        nextActions: result.value.nextActions ?? "",
        goNoGoRecommendation: result.value.goNoGoRecommendation ?? "",
      });
      setOpen(false);
    });
  }

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "20px 22px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        <div>
          <p className="eyebrow" style={{ marginBottom: "8px" }}>Concept record</p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              lineHeight: 1.6,
              color: "var(--ink-mid)",
              margin: 0,
              maxWidth: "760px",
            }}
          >
            Capture the deal thesis, the rationale for why this project should exist, and the reasons it should or should not move deeper into execution.
          </p>
        </div>

        {canEdit ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
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
            }}
          >
            {open ? "Cancel" : concept ? "Edit Concept" : "Create Concept"}
          </button>
        ) : null}
      </div>

      {open && canEdit ? (
        <div style={{ display: "grid", gap: "14px" }}>
          <ConceptField
            label="Thesis"
            value={draft.thesis}
            placeholder="Why this deal exists, what problem it solves, and what makes it worth pursuing."
            onChange={(next) => setDraft((current) => ({ ...current, thesis: next }))}
          />
          <ConceptField
            label="Sponsor rationale"
            value={draft.sponsorRationale}
            placeholder="Why this sponsor or sponsor group is pursuing the deal and what strategic angle matters most."
            onChange={(next) => setDraft((current) => ({ ...current, sponsorRationale: next }))}
          />
          <ConceptField
            label="Target outcome"
            value={draft.targetOutcome}
            placeholder="What the team is trying to achieve: LOI, mandate, close, partnership, or another concrete outcome."
            onChange={(next) => setDraft((current) => ({ ...current, targetOutcome: next }))}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
            <ConceptField
              label="Known unknowns"
              value={draft.knownUnknowns}
              placeholder="What is still unclear enough that it could change the financing path or project shape?"
              onChange={(next) => setDraft((current) => ({ ...current, knownUnknowns: next }))}
            />
            <ConceptField
              label="Fatal flaws"
              value={draft.fatalFlaws}
              placeholder="What could kill this deal outright if confirmed?"
              onChange={(next) => setDraft((current) => ({ ...current, fatalFlaws: next }))}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
            <ConceptField
              label="Next actions"
              value={draft.nextActions}
              placeholder="List the immediate next actions to validate or de-risk the concept."
              onChange={(next) => setDraft((current) => ({ ...current, nextActions: next }))}
            />
            <ConceptField
              label="Go / no-go recommendation"
              value={draft.goNoGoRecommendation}
              placeholder="State the current recommendation and why."
              onChange={(next) => setDraft((current) => ({ ...current, goNoGoRecommendation: next }))}
            />
          </div>

          {error ? (
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
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--text-inverse)",
                backgroundColor: isPending ? "var(--ink-muted)" : "var(--teal)",
                border: "none",
                borderRadius: "3px",
                padding: "8px 14px",
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              {isPending ? "Saving…" : "Save Concept"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          <DisplayField
            label="Thesis"
            value={concept?.thesis ?? null}
            fallback="No explicit thesis has been captured yet."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
            <DisplayField
              label="Sponsor rationale"
              value={concept?.sponsorRationale ?? null}
              fallback="No sponsor rationale has been captured yet."
            />
            <DisplayField
              label="Target outcome"
              value={concept?.targetOutcome ?? null}
              fallback="No target outcome has been captured yet."
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
            <DisplayField
              label="Known unknowns"
              value={concept?.knownUnknowns ?? null}
              fallback="No known unknowns are recorded yet."
            />
            <DisplayField
              label="Fatal flaws"
              value={concept?.fatalFlaws ?? null}
              fallback="No fatal flaws are recorded yet."
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
            <DisplayField
              label="Next actions"
              value={concept?.nextActions ?? null}
              fallback="No concept-level next actions are recorded yet."
            />
            <DisplayField
              label="Go / no-go recommendation"
              value={concept?.goNoGoRecommendation ?? null}
              fallback="No recommendation has been recorded yet."
            />
          </div>
        </div>
      )}
    </div>
  );
}
