"use client";

import { useState } from "react";

const DEAL_TYPE_ANALYSIS_LABELS: Record<string, string> = {
  exim_project_finance: "EXIM Deal Gap Analysis",
  development_finance: "DFI / IFC Gap Analysis",
  commercial_finance: "Commercial Bank Gap Analysis",
  private_equity: "PE / Sponsor Finance Gap Analysis",
};

type Props = { projectId: string; dealType?: string };

type State = "idle" | "loading" | "done" | "error";

function buildPreview(text: string): string {
  const cleaned = text.trim();
  if (!cleaned) return "";

  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const source = paragraphs[0] ?? cleaned;
  const sentences = source.split(/(?<=[.!?])\s+/).filter(Boolean);
  const target = sentences.length > 0 ? sentences : [source];

  const maxPreviewLength = 260;
  const previewParts: string[] = [];
  let length = 0;

  for (const sentence of target) {
    if (!sentence) continue;

    if (previewParts.length > 0 && length + sentence.length > maxPreviewLength) {
      break;
    }

    if (previewParts.length === 0 && sentence.length > maxPreviewLength) {
      const truncated = sentence.slice(0, maxPreviewLength).replace(/\s+\S*$/, "");
      if (truncated) previewParts.push(truncated);
      break;
    }

    previewParts.push(sentence);
    length += sentence.length;

    if (length >= 180) break;
  }

  const preview = previewParts.join(" ").trim();
  if (!preview) return source.slice(0, maxPreviewLength).trim();

  return cleaned.length > preview.length ? `${preview}…` : preview;
}

// Minimal markdown renderer — only handles **bold** and newlines
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={j} style={{ color: "var(--ink)", fontWeight: 600 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
    return (
      <span key={i}>
        {rendered}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

export function GapAnalysis({ projectId, dealType }: Props) {
  const analysisLabel = DEAL_TYPE_ANALYSIS_LABELS[dealType ?? ""] ?? "Deal Gap Analysis";
  const [state, setState] = useState<State>("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  async function run() {
    setState("loading");
    setText("");
    setError(null);
    setIsExpanded(false);

    try {
      const res = await fetch("/api/gap-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream.");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setText((prev) => prev + decoder.decode(value, { stream: true }));
      }

      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        marginBottom: "32px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 28px",
          borderBottom: state !== "idle" ? "1px solid var(--border)" : undefined,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
        >
          <div>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
                color: "var(--accent)",
                margin: "0 0 4px",
              }}
            >
              AI · {analysisLabel}
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                color: "var(--ink-mid)",
                margin: 0,
                maxWidth: "560px",
                lineHeight: 1.5,
              }}
            >
              Quick scan of the biggest readiness gaps and what to do next.
            </p>
          </div>

          <button
            onClick={run}
          disabled={state === "loading"}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "#ffffff",
            backgroundColor: state === "loading" ? "var(--ink-muted)" : "var(--accent)",
            border: "none",
            borderRadius: "3px",
            padding: "8px 18px",
            cursor: state === "loading" ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {state === "loading"
            ? "Analyzing…"
            : state === "done"
            ? "Regenerate"
            : "Analyze"}
        </button>
      </div>

      {/* Status body */}
      {state === "idle" && (
        <div style={{ padding: "16px 28px 18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              padding: "12px 14px",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              backgroundColor: "color-mix(in srgb, var(--accent) 3%, var(--bg-card))",
            }}
          >
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                lineHeight: 1.5,
                color: "var(--ink-mid)",
                margin: 0,
              }}
            >
              Run a gap analysis to get a short summary, then expand for the full narrative.
            </p>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Idle
            </span>
          </div>
        </div>
      )}

      {state === "loading" && (
        <div style={{ padding: "18px 28px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              marginBottom: text ? "12px" : "0",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                margin: 0,
              }}
            >
              Analyzing
            </p>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
              }}
            >
              Streaming
            </span>
          </div>

          {text === "" ? (
            <div style={{ display: "grid", gap: "10px" }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    height: "10px",
                    backgroundColor: "var(--border)",
                    borderRadius: "999px",
                    width: i === 3 ? "58%" : "100%",
                    animation: "pulse 1.4s ease-in-out infinite",
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 0.4; }
                  50% { opacity: 1; }
                }
                @keyframes blink {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0; }
                }
              `}</style>
            </div>
          ) : (
            <div
              style={{
                padding: "14px",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  lineHeight: 1.7,
                  color: "var(--ink-mid)",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {renderMarkdown(text)}
                <span
                  style={{
                    display: "inline-block",
                    width: "2px",
                    height: "14px",
                    backgroundColor: "var(--accent)",
                    marginLeft: "2px",
                    verticalAlign: "text-bottom",
                    animation: "blink 0.8s step-end infinite",
                  }}
                />
              </p>
            </div>
          )}
        </div>
      )}

      {state === "done" && (
        <div style={{ padding: "18px 28px 22px" }}>
          {text ? (
            <div
              style={{
                display: "grid",
                gap: "12px",
                padding: "14px",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <div style={{ display: "grid", gap: "6px" }}>
                <p
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: "var(--ink-muted)",
                    margin: 0,
                  }}
                >
                  Summary
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    lineHeight: 1.7,
                    color: "var(--ink-mid)",
                    margin: 0,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {renderMarkdown(buildPreview(text))}
                </p>
              </div>

              {text.trim().length > buildPreview(text).length && (
                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: "12px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsExpanded((current) => !current)}
                    aria-expanded={isExpanded}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "var(--accent)",
                      backgroundColor: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    {isExpanded ? "Hide full narrative" : "Show full narrative"}
                  </button>

                  {isExpanded && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "14px",
                        border: "1px solid var(--border)",
                        borderRadius: "4px",
                        backgroundColor: "color-mix(in srgb, var(--accent) 2%, var(--bg-card))",
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "13px",
                          lineHeight: 1.75,
                          color: "var(--ink-mid)",
                          margin: 0,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {renderMarkdown(text)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: "12px 14px",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                backgroundColor: "var(--bg-card)",
                color: "var(--ink-muted)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              No analysis returned.
            </div>
          )}
        </div>
      )}

      {state === "error" && error && (
        <div style={{ padding: "18px 28px 22px" }}>
          <div
            style={{
              padding: "14px",
              border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))",
              borderRadius: "4px",
              backgroundColor: "color-mix(in srgb, var(--accent) 5%, var(--bg-card))",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--accent)",
                margin: "0 0 6px",
              }}
            >
              Gap analysis failed
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                color: "var(--accent)",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {error}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
