"use client";

import { REQUIREMENTS_BY_ID } from "@/lib/exim/requirements";

type LoiBlockersPanelProps = {
  blockerIds: string[];
};

export function LoiBlockersPanel({ blockerIds }: LoiBlockersPanelProps) {
  if (blockerIds.length === 0) return null;

  function scrollTo(id: string) {
    const el = document.getElementById(`req-${id}`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    // Brief highlight flash
    el.style.transition = "box-shadow 0.2s";
    el.style.boxShadow = "0 0 0 2px var(--accent)";
    setTimeout(() => { el.style.boxShadow = ""; }, 1200);
  }

  return (
    <div
      style={{
        backgroundColor: "var(--gold-soft)",
        border: "1px solid var(--gold)",
        borderLeft: "3px solid var(--gold)",
        borderRadius: "4px",
        padding: "20px 24px",
        marginBottom: "32px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "16px" }}>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--gold)",
            margin: 0,
          }}
        >
          LOI Blockers
        </p>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.08em",
            color: "var(--ink-muted)",
          }}
        >
          · {blockerIds.length} remaining
        </span>
      </div>

      {/* Grid of blocker chips */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "6px",
        }}
      >
        {blockerIds.map((id) => {
          const req = REQUIREMENTS_BY_ID.get(id);
          return (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                textAlign: "left",
                background: "none",
                border: "none",
                padding: "6px 8px",
                borderRadius: "3px",
                cursor: "pointer",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--gold-soft)";
                (e.currentTarget as HTMLButtonElement).style.outline = "1px solid var(--gold)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
                (e.currentTarget as HTMLButtonElement).style.outline = "";
              }}
            >
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  backgroundColor: "var(--accent)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--ink)",
                  lineHeight: 1.4,
                }}
              >
                {req?.name ?? id}
              </span>
              {/* Jump arrow */}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                style={{ marginLeft: "auto", flexShrink: 0, opacity: 0.4 }}
              >
                <path d="M2 8L8 2M8 2H4M8 2v4" stroke="var(--ink)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          );
        })}
      </div>

      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "12px",
          color: "var(--ink-muted)",
          margin: "14px 0 0",
          lineHeight: 1.5,
        }}
      >
        These items must reach <strong>Substantially Final</strong> before LOI submission. Click any item to jump to it in the checklist.
      </p>
    </div>
  );
}
