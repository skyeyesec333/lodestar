"use client";

import { useState } from "react";
import type { DocumentReviewResult, DocumentGap } from "@/lib/ai/document-review";

type Props = {
  slug: string;
  documentId: string;
};

type ReviewState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; result: DocumentReviewResult }
  | { phase: "error"; message: string };

type AssessmentMeta = { label: string; color: string; bg: string; border: string };

function assessmentMeta(
  value: DocumentReviewResult["overallAssessment"]
): AssessmentMeta {
  switch (value) {
    case "substantially_final":
      return {
        label: "Substantially Final",
        color: "var(--teal)",
        bg: "var(--teal-soft)",
        border: "var(--teal)",
      };
    case "needs_work":
      return {
        label: "Needs Work",
        color: "var(--gold)",
        bg: "var(--gold-soft)",
        border: "var(--gold)",
      };
    case "early_draft":
      return {
        label: "Early Draft",
        color: "var(--accent)",
        bg: "var(--accent-soft)",
        border: "var(--accent)",
      };
    case "cannot_assess":
      return {
        label: "Cannot Assess",
        color: "var(--ink-muted)",
        bg: "var(--bg-card)",
        border: "var(--border)",
      };
  }
}

function severityColor(severity: DocumentGap["severity"]): string {
  switch (severity) {
    case "blocking":
      return "var(--accent)";
    case "major":
      return "var(--gold)";
    case "minor":
      return "var(--ink-muted)";
  }
}

function ReviewPanel({ result }: { result: DocumentReviewResult }) {
  const meta = assessmentMeta(result.overallAssessment);

  return (
    <div
      style={{
        marginTop: "12px",
        padding: "16px",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        backgroundColor: "var(--bg)",
      }}
    >
      {/* Assessment badge */}
      <div style={{ marginBottom: "12px" }}>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: meta.color,
            backgroundColor: meta.bg,
            border: `1px solid ${meta.border}`,
            borderRadius: "3px",
            padding: "3px 10px",
          }}
        >
          {meta.label}
        </span>
      </div>

      {/* Summary */}
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          color: "var(--ink-mid)",
          margin: "0 0 14px",
          lineHeight: 1.6,
        }}
      >
        {result.summary}
      </p>

      {/* Gaps */}
      {result.gaps.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: "0 0 8px",
            }}
          >
            Gaps Identified
          </p>
          {result.gaps.map((gap, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: "10px",
                paddingLeft: "10px",
                borderLeft: `2px solid ${severityColor(gap.severity)}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "3px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: severityColor(gap.severity),
                  }}
                >
                  {gap.severity}
                </span>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  {gap.issue}
                </span>
              </div>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "12px",
                  color: "var(--ink-mid)",
                  margin: "0 0 2px",
                  lineHeight: 1.5,
                }}
              >
                {gap.recommendation}
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "11px",
                  color: "var(--ink-muted)",
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                {gap.eximStandard}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Strengths */}
      {result.strengths.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: "0 0 8px",
            }}
          >
            Strengths
          </p>
          {result.strengths.map((strength, idx) => (
            <div
              key={idx}
              style={{ display: "flex", gap: "6px", marginBottom: "4px" }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "12px",
                  color: "var(--teal)",
                  flexShrink: 0,
                }}
              >
                ✓
              </span>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "var(--ink-mid)",
                }}
              >
                {strength}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Next steps */}
      {result.nextSteps.length > 0 && (
        <div>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: "0 0 8px",
            }}
          >
            Next Steps
          </p>
          {result.nextSteps.map((step, idx) => (
            <div
              key={idx}
              style={{ display: "flex", gap: "8px", marginBottom: "6px" }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  color: "var(--ink-muted)",
                  flexShrink: 0,
                  paddingTop: "2px",
                }}
              >
                {idx + 1}.
              </span>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "var(--ink-mid)",
                  lineHeight: 1.5,
                }}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocumentReviewButton({ slug, documentId }: Props) {
  const [state, setState] = useState<ReviewState>({ phase: "idle" });
  const [panelOpen, setPanelOpen] = useState(false);
  const [additionalContext, setAdditionalContext] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  async function runReview() {
    setState({ phase: "loading" });
    setPanelOpen(true);
    setFormOpen(false);

    try {
      const res = await fetch(
        `/api/projects/${slug}/documents/${documentId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ additionalContext: additionalContext.trim() || undefined }),
        }
      );

      if (res.status === 429) {
        setState({ phase: "error", message: "Rate limit reached. Please wait a moment and try again." });
        return;
      }

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setState({
          phase: "error",
          message: json?.error ?? `Review failed (${res.status})`,
        });
        return;
      }

      const result = (await res.json()) as DocumentReviewResult;
      setState({ phase: "done", result });
    } catch {
      setState({ phase: "error", message: "Network error. Please try again." });
    }
  }

  function handleButtonClick() {
    if (state.phase === "done" || state.phase === "error") {
      // Re-open the panel or toggle it
      setPanelOpen((prev) => !prev);
      return;
    }
    setFormOpen((prev) => !prev);
  }

  const buttonLabel =
    state.phase === "loading"
      ? "Reviewing..."
      : state.phase === "done"
      ? "AI Review"
      : "AI Review";

  return (
    <div>
      <button
        onClick={handleButtonClick}
        disabled={state.phase === "loading"}
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color:
            state.phase === "done"
              ? "var(--teal)"
              : state.phase === "error"
              ? "var(--accent)"
              : "var(--ink-muted)",
          backgroundColor: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "3px",
          padding: "4px 10px",
          cursor: state.phase === "loading" ? "not-allowed" : "pointer",
          opacity: state.phase === "loading" ? 0.6 : 1,
          display: "flex",
          alignItems: "center",
          gap: "5px",
        }}
      >
        {state.phase === "loading" && (
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              border: "1.5px solid var(--ink-muted)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "ls-spin 0.7s linear infinite",
            }}
          />
        )}
        {buttonLabel}
      </button>

      {/* Context input form */}
      {formOpen && state.phase === "idle" && (
        <div
          style={{
            marginTop: "8px",
            padding: "12px",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            backgroundColor: "var(--bg-card)",
          }}
        >
          <label
            style={{
              display: "grid",
              gap: "6px",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
              }}
            >
              Additional context (optional)
            </span>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={2}
              placeholder="e.g. This is a draft term sheet pending legal sign-off."
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                color: "var(--ink)",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "3px",
                padding: "8px 10px",
                resize: "vertical",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </label>
          <button
            onClick={() => void runReview()}
            style={{
              marginTop: "10px",
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-inverse)",
              backgroundColor: "var(--teal)",
              border: "none",
              borderRadius: "3px",
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            Run AI Review
          </button>
        </div>
      )}

      {/* Spinner during load */}
      {state.phase === "loading" && panelOpen && (
        <div
          style={{
            marginTop: "12px",
            padding: "16px",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            backgroundColor: "var(--bg)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "14px",
              height: "14px",
              border: "2px solid var(--border)",
              borderTopColor: "var(--teal)",
              borderRadius: "50%",
              animation: "ls-spin 0.7s linear infinite",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink-muted)",
            }}
          >
            Running EXIM document review...
          </span>
        </div>
      )}

      {/* Error */}
      {state.phase === "error" && panelOpen && (
        <div
          style={{
            marginTop: "12px",
            padding: "12px 16px",
            border: "1px solid var(--accent)",
            borderRadius: "4px",
            backgroundColor: "var(--accent-soft)",
          }}
        >
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--accent)",
              margin: "0 0 8px",
            }}
          >
            {state.message}
          </p>
          <button
            onClick={() => {
              setState({ phase: "idle" });
              setPanelOpen(false);
              setFormOpen(true);
            }}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--accent)",
              backgroundColor: "transparent",
              border: "1px solid var(--accent)",
              borderRadius: "3px",
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Review result */}
      {state.phase === "done" && panelOpen && (
        <ReviewPanel result={state.result} />
      )}
    </div>
  );
}
