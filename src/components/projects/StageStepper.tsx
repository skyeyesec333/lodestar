const STAGES = [
  { id: "concept",          label: "Concept"               },
  { id: "pre_loi",          label: "Pre-EXIM LOI"          },
  { id: "loi_submitted",    label: "EXIM LOI Submitted"    },
  { id: "loi_approved",     label: "EXIM LOI Approved"     },
  { id: "pre_commitment",   label: "Pre-Commitment"        },
  { id: "final_commitment", label: "EXIM Final Commitment" },
  { id: "financial_close",  label: "Financial Close"       },
] as const;

type StageId = (typeof STAGES)[number]["id"];

export function StageStepper({ current }: { current: StageId }) {
  const currentIndex = STAGES.findIndex((s) => s.id === current);

  return (
    <div style={{ marginBottom: "40px" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {/* Connecting line — behind everything */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            right: "10px",
            height: "1px",
            backgroundColor: "var(--border)",
            zIndex: 0,
          }}
        />

        {/* Progress line — up to current stage */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            height: "1px",
            width: currentIndex === 0
              ? "0%"
              : `calc(${(currentIndex / (STAGES.length - 1)) * 100}% - 0px)`,
            backgroundColor: "var(--accent)",
            zIndex: 1,
            transition: "width 0.4s ease",
          }}
        />

        {/* Stage dots */}
        {STAGES.map((stage, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent   = i === currentIndex;
          const isFuture    = i > currentIndex;

          return (
            <div
              key={stage.id}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: i === 0 ? "flex-start" : i === STAGES.length - 1 ? "flex-end" : "center",
                position: "relative",
                zIndex: 2,
              }}
            >
              {/* Dot */}
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: isFuture
                    ? "var(--bg)"
                    : isCurrent
                    ? "var(--accent)"
                    : "var(--accent)",
                  border: isFuture
                    ? "1px solid var(--border)"
                    : `2px solid var(--accent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background-color 0.2s",
                }}
              >
                {isCompleted && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {isCurrent && (
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "white" }} />
                )}
              </div>

              {/* Label */}
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  fontWeight: isCurrent ? 500 : 400,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: isFuture ? "var(--ink-muted)" : isCurrent ? "var(--accent)" : "var(--ink-mid)",
                  marginTop: "8px",
                  whiteSpace: "nowrap",
                  textAlign: i === 0 ? "left" : i === STAGES.length - 1 ? "right" : "center",
                }}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
