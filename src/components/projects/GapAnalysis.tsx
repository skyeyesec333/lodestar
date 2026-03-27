"use client";

import { useState } from "react";

type Props = { projectId: string };

type State = "idle" | "loading" | "done" | "error";

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

export function GapAnalysis({ projectId }: Props) {
  const [state, setState] = useState<State>("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setState("loading");
    setText("");
    setError(null);

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
            AI · Gap Analysis
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink-mid)",
              margin: 0,
            }}
          >
            Get prioritized actions to advance toward LOI submission
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

      {/* Loading pulse */}
      {state === "loading" && text === "" && (
        <div style={{ padding: "28px 28px" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "12px",
                backgroundColor: "var(--border)",
                borderRadius: "6px",
                marginBottom: "10px",
                width: i === 3 ? "60%" : "100%",
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
          `}</style>
        </div>
      )}

      {/* Streaming / done content */}
      {(state === "loading" || state === "done") && text && (
        <div style={{ padding: "24px 28px" }}>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              lineHeight: 1.75,
              color: "var(--ink-mid)",
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {renderMarkdown(text)}
            {state === "loading" && (
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
            )}
          </p>
          <style>{`
            @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
          `}</style>
        </div>
      )}

      {/* Error */}
      {state === "error" && error && (
        <div style={{ padding: "20px 28px" }}>
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
      )}
    </div>
  );
}
