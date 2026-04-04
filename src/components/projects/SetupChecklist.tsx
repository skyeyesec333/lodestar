type ChecklistItem = {
  label: string;
  complete: boolean;
  href: string;
  hintKey: "stakeholder" | "date" | "document" | "thesis" | "meeting";
};

type Props = {
  items: ChecklistItem[];
  dealTypeLabel: string;
  dealType: string;
};

function getItemHints(dealType: string): {
  stakeholder: string;
  date: string;
  document: string;
  thesis: string;
  meeting: string;
} {
  switch (dealType) {
    case "exim_project_finance":
      return {
        stakeholder: "Add your EPC contractor (must be US-based), off-taker, or legal counsel",
        date: "Set a target LOI date to activate urgency tracking",
        document: "Upload your feasibility study or project information memorandum",
        thesis: "Write a deal thesis that frames the EXIM financing rationale",
        meeting: "Log your first stakeholder or EXIM officer meeting",
      };
    case "development_finance":
      return {
        stakeholder: "Add the IFC investment officer, your E&S consultant, or legal counsel",
        date: "Set a target board approval date",
        document: "Upload your concept note, feasibility study, or ESIA",
        thesis: "Write a deal thesis that includes the development impact and additionality rationale",
        meeting: "Log your first IFC concept review meeting or appraisal mission",
      };
    case "commercial_finance":
      return {
        stakeholder: "Add the lead arranger, your independent engineer, or legal counsel",
        date: "Set a target credit approval date",
        document: "Upload your financial model or information memorandum",
        thesis: "Write a deal thesis that frames the credit story for lenders",
        meeting: "Log your first bank meeting or mandate discussion",
      };
    case "private_equity":
      return {
        stakeholder: "Add the management team, co-investors, or financial advisor",
        date: "Set a target IC approval or close date",
        document: "Upload your investor deck, IM, or financial model",
        thesis: "Write a deal thesis that frames the investment case for your IC",
        meeting: "Log your first IC pre-screen or sponsor meeting",
      };
    default:
      return {
        stakeholder: "Add key project parties — sponsor, advisors, or counterparties",
        date: "Set a target milestone date for your next major gate",
        document: "Upload your core project documents",
        thesis: "Write a deal thesis that captures the strategic rationale",
        meeting: "Log your first stakeholder or counterpart meeting",
      };
  }
}

export function SetupChecklist({ items, dealTypeLabel, dealType }: Props) {
  const hints = getItemHints(dealType);
  const allComplete = items.every((item) => item.complete);
  if (allComplete) return null;

  const completeCount = items.filter((item) => item.complete).length;
  const totalCount = items.length;
  const progressPct = Math.round((completeCount / totalCount) * 100);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "12px",
        backgroundColor: "var(--bg-card)",
        padding: "20px 24px",
        marginBottom: "24px",
      }}
    >
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          margin: "0 0 6px",
        }}
      >
        Setup Checklist
      </p>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "14px",
          color: "var(--ink)",
          margin: "0 0 18px",
        }}
      >
        Complete these to get your {dealTypeLabel} workspace ready
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                border: item.complete ? "none" : "2px solid var(--border)",
                backgroundColor: item.complete ? "var(--teal)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: "1px",
              }}
            >
              {item.complete && (
                <svg
                  width="10"
                  height="8"
                  viewBox="0 0 10 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "13px",
                    color: item.complete ? "var(--ink-muted)" : "var(--ink)",
                    textDecoration: item.complete ? "line-through" : "none",
                  }}
                >
                  {item.label}
                </span>
                {!item.complete && (
                  <a
                    href={item.href}
                    style={{
                      color: "var(--accent)",
                      fontSize: "12px",
                      textDecoration: "none",
                      flexShrink: 0,
                    }}
                  >
                    ↗
                  </a>
                )}
              </div>
              {!item.complete && (
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "12px",
                    color: "var(--ink-muted)",
                    margin: "2px 0 0",
                    lineHeight: 1.5,
                  }}
                >
                  {hints[item.hintKey]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "6px",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              color: "var(--ink-muted)",
            }}
          >
            {completeCount}/{totalCount} complete
          </span>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              color: "var(--ink-muted)",
            }}
          >
            {progressPct}%
          </span>
        </div>
        <div
          style={{
            height: "4px",
            borderRadius: "2px",
            backgroundColor: "var(--border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              borderRadius: "2px",
              backgroundColor: "var(--teal)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
