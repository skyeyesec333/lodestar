"use client";

import { useState } from "react";
import { FileText, X, Copy, Check, Loader2, Download } from "lucide-react";
import type { StatusReport } from "@/lib/ai/status-report";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Props = {
  projectSlug: string;
};

export function StatusReportButton({ projectSlug }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [report, setReport] = useState<StatusReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setState("loading");
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/projects/${projectSlug}/status-report`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as StatusReport;
      setReport(data);
      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate report");
      setState("error");
    }
  }

  function handleClose() {
    setState("idle");
    setReport(null);
    setErrorMsg(null);
    setCopied(false);
  }

  function buildClipboardText(r: StatusReport): string {
    const lines: string[] = [
      `WEEKLY DEAL STATUS REPORT`,
      `Generated: ${new Date(r.generatedAt).toLocaleString()}`,
      ``,
      r.headline,
      ``,
      `DEAL STATUS`,
      r.readinessSummary,
      ``,
      `PROGRESS`,
      r.progressSummary,
      ``,
      `KEY RISKS`,
      ...r.keyRisks.map((risk, i) => `${i + 1}. ${risk}`),
      ``,
      `NEXT STEPS`,
      ...r.nextSteps.map((step, i) => `${i + 1}. ${step}`),
    ];
    return lines.join("\n");
  }

  async function handleCopy() {
    if (!report) return;
    await navigator.clipboard.writeText(buildClipboardText(report));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadPdf() {
    if (!report) return;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${report.headline}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, serif; font-size: 11pt; color: #111; padding: 48px; max-width: 720px; margin: 0 auto; }
    h1 { font-size: 18pt; font-weight: normal; margin-bottom: 6px; }
    .meta { font-size: 9pt; color: #666; margin-bottom: 32px; font-family: monospace; }
    h2 { font-size: 10pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin: 24px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    p { font-size: 11pt; line-height: 1.65; margin-bottom: 12px; }
    ul { margin: 0 0 12px 20px; }
    li { font-size: 11pt; line-height: 1.65; margin-bottom: 4px; }
    .readiness { font-size: 13pt; font-weight: 600; margin-bottom: 8px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(report.headline)}</h1>
  <p class="meta">Deal Status Report · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
  <h2>Deal Status</h2>
  <p class="readiness">${escapeHtml(report.readinessSummary)}</p>
  <h2>Progress</h2>
  <p>${escapeHtml(report.progressSummary)}</p>
  <h2>Key Risks</h2>
  <ul>${report.keyRisks.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>
  <h2>Next Steps</h2>
  <ul>${report.nextSteps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none";
    document.body.appendChild(iframe);

    iframe.contentDocument!.open();
    iframe.contentDocument!.write(html);
    iframe.contentDocument!.close();

    iframe.onload = () => {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={handleGenerate}
        disabled={state === "loading"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 14px",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg-card)",
          color: "var(--ink)",
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          fontWeight: 500,
          cursor: state === "loading" ? "not-allowed" : "pointer",
          opacity: state === "loading" ? 0.7 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {state === "loading" ? (
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <FileText size={14} />
        )}
        {state === "loading" ? "Generating..." : "Weekly Report"}
      </button>

      {(state === "done" || state === "error") && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={handleClose}
        >
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "28px 32px",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {state === "error" && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--accent)",
                      margin: 0,
                    }}
                  >
                    Report generation failed
                  </p>
                  <button onClick={handleClose} style={closeButtonStyle}>
                    <X size={16} />
                  </button>
                </div>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    color: "var(--ink-muted)",
                    margin: 0,
                  }}
                >
                  {errorMsg}
                </p>
              </>
            )}

            {state === "done" && report && (
              <>
                {/* Header row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "20px",
                    gap: "16px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p
                      className="eyebrow"
                      style={{ marginBottom: "6px", color: "var(--teal)" }}
                    >
                      Weekly deal status
                    </p>
                    <h2
                      style={{
                        fontFamily: "'DM Serif Display', Georgia, serif",
                        fontSize: "20px",
                        fontWeight: 400,
                        color: "var(--ink)",
                        margin: 0,
                        lineHeight: 1.35,
                      }}
                    >
                      {report.headline}
                    </h2>
                  </div>
                  <button onClick={handleClose} style={closeButtonStyle}>
                    <X size={16} />
                  </button>
                </div>

                <Divider />

                {/* Readiness summary */}
                <Section label="Deal Status">
                  <p style={bodyStyle}>{report.readinessSummary}</p>
                </Section>

                {/* Progress */}
                <Section label="Progress This Week">
                  <p style={bodyStyle}>{report.progressSummary}</p>
                </Section>

                {/* Key risks */}
                <Section label="Key Risks">
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {report.keyRisks.map((risk, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "flex-start",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: "var(--gold)",
                            marginTop: "7px",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ ...bodyStyle, color: "var(--gold)" }}>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                {/* Next steps */}
                <Section label="Next Steps">
                  <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {report.nextSteps.map((step, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "flex-start",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--teal)",
                            minWidth: "20px",
                            paddingTop: "2px",
                          }}
                        >
                          {i + 1}.
                        </span>
                        <span style={{ ...bodyStyle, color: "var(--teal)" }}>{step}</span>
                      </li>
                    ))}
                  </ol>
                </Section>

                <Divider />

                {/* Footer actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginTop: "20px",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      color: "var(--ink-muted)",
                      margin: 0,
                    }}
                  >
                    Generated {new Date(report.generatedAt).toLocaleString()}
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={handleCopy}
                      style={{
                        ...actionButtonStyle,
                        backgroundColor: copied ? "var(--teal-soft)" : "var(--bg)",
                        color: copied ? "var(--teal)" : "var(--ink-muted)",
                      }}
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? "Copied" : "Copy to clipboard"}
                    </button>
                    <button
                      onClick={handleDownloadPdf}
                      disabled={!report}
                      style={{
                        ...actionButtonStyle,
                        backgroundColor: "var(--ink)",
                        color: "var(--bg)",
                        borderColor: "var(--ink)",
                        opacity: report ? 1 : 0.4,
                        cursor: report ? "pointer" : "not-allowed",
                      }}
                    >
                      <Download size={13} />
                      Download PDF
                    </button>
                    <button onClick={handleClose} style={actionButtonStyle}>
                      <X size={13} />
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function Divider() {
  return (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid var(--border)",
        margin: "18px 0",
      }}
    />
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <p
        className="eyebrow"
        style={{ marginBottom: "8px", color: "var(--ink-muted)" }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

const bodyStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "var(--ink)",
  lineHeight: 1.65,
  margin: 0,
};

const closeButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "4px",
  border: "none",
  backgroundColor: "transparent",
  color: "var(--ink-muted)",
  cursor: "pointer",
  borderRadius: "6px",
  flexShrink: 0,
};

const actionButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "5px 12px",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  backgroundColor: "var(--bg)",
  color: "var(--ink-muted)",
  fontFamily: "'Inter', sans-serif",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
};
