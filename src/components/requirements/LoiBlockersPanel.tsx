"use client";

import { useRef, useState } from "react";

type GateBlockersPanelProps = {
  blockers: Array<{ id: string; name: string }>;
  gateLabel: string;
};

export function GateBlockersPanel({ blockers, gateLabel }: GateBlockersPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReturnJump, setShowReturnJump] = useState(false);
  const previewBlockers = blockers.slice(0, 3);
  const remainingPreviewCount = blockers.length - previewBlockers.length;

  if (blockers.length === 0) return null;

  function scrollTo(id: string) {
    const el = document.getElementById(`req-${id}`);
    if (!el) return;
    setShowReturnJump(true);
    const y = el.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    // Brief highlight flash
    el.style.transition = "box-shadow 0.2s";
    el.style.boxShadow = "0 0 0 2px var(--accent)";
    setTimeout(() => { el.style.boxShadow = ""; }, 1200);
  }

  function scrollBackToBlockers() {
    const panel = panelRef.current;
    if (!panel) return;
    const y = panel.getBoundingClientRect().top + window.scrollY - 92;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    setShowReturnJump(false);
  }

  return (
    <>
      <div
        ref={panelRef}
        style={{
          backgroundColor: "var(--gold-soft)",
          border: "1px solid var(--gold)",
          borderLeft: "3px solid var(--gold)",
          borderRadius: "10px",
          padding: "16px 18px 14px",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "grid", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--gold)",
                  margin: 0,
                }}
              >
                {gateLabel} Blockers
              </p>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--gold)",
                  backgroundColor: "color-mix(in srgb, var(--gold) 12%, var(--bg-card))",
                  border: "1px solid color-mix(in srgb, var(--gold) 35%, var(--border))",
                  borderRadius: "999px",
                  padding: "3px 7px",
                }}
              >
                {blockers.length} remaining
              </span>
              <button
                type="button"
                onClick={() => setIsExpanded((current) => !current)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                  backgroundColor: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  aria-hidden="true"
                  style={{
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <path
                    d="M2 4L5 7L8 4"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {isExpanded ? "Collapse grid" : "Expand grid"}
              </button>
            </div>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                color: "var(--ink-mid)",
                margin: 0,
                lineHeight: 1.45,
                maxWidth: "680px",
              }}
            >
              Preview the blockers here. Expand for the full jump grid.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: isExpanded ? "12px" : "10px",
          }}
        >
          {previewBlockers.map((blocker) => (
            <button
              key={blocker.id}
              onClick={() => scrollTo(blocker.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "var(--bg-card)",
                border: "1px solid color-mix(in srgb, var(--gold) 22%, var(--border))",
                padding: "8px 10px",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "border-color 0.12s ease, transform 0.12s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--gold)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "color-mix(in srgb, var(--gold) 22%, var(--border))";
                (e.currentTarget as HTMLButtonElement).style.transform = "";
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: "var(--ink)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {blocker.name}
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "8px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ink-muted)",
                    flexShrink: 0,
                  }}
                >
                  Jump
                </span>
              </span>
            </button>
          ))}
          {remainingPreviewCount > 0 && !isExpanded && (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "transparent",
                border: "1px dashed color-mix(in srgb, var(--gold) 28%, var(--border))",
                color: "var(--ink-muted)",
                borderRadius: "8px",
                padding: "8px 10px",
                cursor: "pointer",
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
              }}
            >
              +{remainingPreviewCount} more blockers
            </button>
          )}
        </div>

        {isExpanded && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "10px",
                marginTop: "2px",
              }}
            >
              {blockers.map((blocker) => (
                <button
                  key={blocker.id}
                  onClick={() => scrollTo(blocker.id)}
                  style={{
                    display: "grid",
                    gap: "10px",
                    textAlign: "left",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid color-mix(in srgb, var(--gold) 22%, var(--border))",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "border-color 0.12s ease, transform 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--gold)";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "color-mix(in srgb, var(--gold) 22%, var(--border))";
                    (e.currentTarget as HTMLButtonElement).style.transform = "";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--accent)",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: "var(--accent)",
                          flexShrink: 0,
                        }}
                      />
                      {gateLabel}-critical
                    </span>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                      }}
                    >
                      Open
                    </span>
                  </div>

                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--ink)",
                      lineHeight: 1.35,
                    }}
                  >
                    {blocker.name}
                  </span>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        color: "var(--ink-muted)",
                      }}
                    >
                      Jump to checklist
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 10 10"
                      fill="none"
                      style={{ flexShrink: 0, opacity: 0.55 }}
                    >
                      <path d="M2 8L8 2M8 2H4M8 2v4" stroke="var(--ink)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.06em",
                color: "var(--ink-muted)",
                margin: "12px 0 0",
                lineHeight: 1.5,
              }}
            >
              Click any blocker to jump to its row in the checklist.
            </p>
          </>
        )}
      </div>

      {showReturnJump && (
        <button
          type="button"
          onClick={scrollBackToBlockers}
          style={{
            position: "fixed",
            right: "24px",
            bottom: "24px",
            zIndex: 40,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--ink)",
            backgroundColor: "var(--gold-soft)",
            border: "1px solid var(--gold)",
            borderRadius: "999px",
            padding: "10px 14px",
            cursor: "pointer",
            boxShadow: "0 10px 24px rgba(0,0,0,0.16)",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M5 1.5v7M5 1.5L2.5 4M5 1.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to blockers
        </button>
      )}
    </>
  );
}
