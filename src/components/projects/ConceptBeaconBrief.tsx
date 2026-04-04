"use client";

import { useBeacon } from "@/components/beacon/BeaconProvider";

type Props = {
  thesis: string | null;
  knownUnknowns: string | null;
  fatalFlaws: string | null;
  nextActions: string | null;
  goNoGoRecommendation: string | null;
  gateReviewSummary: string;
  conceptPromptsCount: number;
  isExim: boolean;
};

export function ConceptBeaconBrief({
  thesis,
  knownUnknowns,
  fatalFlaws,
  nextActions,
  goNoGoRecommendation,
  gateReviewSummary,
  conceptPromptsCount,
  isExim,
}: Props) {
  const { setOpen, setActiveTab } = useBeacon();

  function openBeacon() {
    setActiveTab("assistant");
    setOpen(true);
  }

  const cards: Array<{ label: string; detail: string; action: string | null; hot: boolean }> = [
    {
      label: "Frame the opportunity",
      detail: thesis
        ? "The deal thesis is captured. Beacon can assess whether it's differentiated, financeable, and worth advancing given current market conditions."
        : "No thesis is captured yet. Ask Beacon to help the team define what the deal is, why it matters, and what success looks like.",
      action: thesis
        ? "Assess this thesis"
        : "Help me write a deal thesis",
      hot: !thesis,
    },
    {
      label: "Pressure-test assumptions",
      detail: knownUnknowns
        ? "Known unknowns are recorded. Beacon can stress-test which assumptions are most likely to break the plan and suggest how to resolve them."
        : "No known unknowns are captured yet. Ask Beacon to surface the assumptions that could materially change the capital path or kill the deal.",
      action: knownUnknowns
        ? "Which assumption is most dangerous?"
        : "What assumptions should I stress-test?",
      hot: !knownUnknowns,
    },
    {
      label: "Identify fatal flaws",
      detail: fatalFlaws
        ? "Fatal flaws are recorded. Beacon can help assess whether they've been mitigated, if mitigation is realistic, and what diligence would confirm them."
        : "No fatal flaws are documented. Ask Beacon what could kill this deal outright if confirmed — before the team commits deeper.",
      action: fatalFlaws
        ? "Are these fatal flaws mitigated?"
        : "What could kill this deal?",
      hot: !fatalFlaws,
    },
    {
      label: "Recommend next moves",
      detail: nextActions
        ? "Next actions are listed. Beacon can challenge whether they are the highest-leverage moves toward the next gate, or whether a different sequence would de-risk the deal faster."
        : "No next actions are captured. Ask Beacon what would most quickly validate or kill the concept before committing team time to execution.",
      action: nextActions
        ? "Are these the right next actions?"
        : "What should we do first?",
      hot: !nextActions,
    },
  ];

  return (
    <div
      style={{
        marginTop: "18px",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "18px 20px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <div style={{ minWidth: 0, maxWidth: "760px" }}>
          <p className="eyebrow" style={{ marginBottom: "8px" }}>Concept agent brief</p>
          <h3
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "22px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: "0 0 8px",
            }}
          >
            What Beacon can do in this workspace
          </h3>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "var(--ink-mid)",
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            {conceptPromptsCount > 0
              ? `This concept has ${conceptPromptsCount} open gap${conceptPromptsCount === 1 ? "" : "s"}. Beacon can help fill them using the structured record, uploaded evidence, and deal context — before the team goes deeper into execution.`
              : "The concept record looks complete. Beacon can now serve as a critical challenger — stress-testing the thesis, questioning assumptions, and recommending the highest-leverage next moves."}
          </p>
        </div>

        <button
          type="button"
          onClick={openBeacon}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--accent)",
            backgroundColor: "transparent",
            border: "1px solid var(--accent)",
            borderRadius: "999px",
            padding: "8px 14px",
            cursor: "pointer",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          Open Beacon
        </button>
      </div>

      {/* 4 cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
        }}
      >
        {cards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={openBeacon}
            style={{
              backgroundColor: card.hot ? "color-mix(in srgb, var(--accent) 6%, var(--bg))" : "var(--bg)",
              border: `1px solid ${card.hot ? "color-mix(in srgb, var(--accent) 30%, var(--border))" : "var(--border)"}`,
              borderRadius: "12px",
              padding: "14px 16px",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              {card.hot ? (
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "var(--accent)",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "var(--teal)",
                    flexShrink: 0,
                  }}
                />
              )}
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: card.hot ? "var(--accent)" : "var(--ink-muted)",
                  margin: 0,
                }}
              >
                {card.label}
              </p>
            </div>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                color: "var(--ink-mid)",
                lineHeight: 1.6,
                margin: "0 0 10px",
              }}
            >
              {card.detail}
            </p>
            {card.action ? (
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  color: "var(--accent)",
                  margin: 0,
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                Ask: &ldquo;{card.action}&rdquo; →
              </p>
            ) : null}
          </button>
        ))}
      </div>

      {/* Go/no-go strip if captured */}
      {goNoGoRecommendation ? (
        <div
          style={{
            marginTop: "14px",
            padding: "12px 16px",
            borderRadius: "10px",
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
            display: "flex",
            gap: "16px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                margin: "0 0 4px",
              }}
            >
              Current go / no-go
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                color: "var(--ink)",
                lineHeight: 1.5,
                margin: 0,
                maxWidth: "640px",
              }}
            >
              {goNoGoRecommendation}
            </p>
          </div>
          <button
            type="button"
            onClick={openBeacon}
            style={{
              marginLeft: "auto",
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.08em",
              color: "var(--ink-muted)",
              backgroundColor: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "6px 12px",
              cursor: "pointer",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            Challenge this rec →
          </button>
        </div>
      ) : null}

      {/* Gate review note */}
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "12px",
          color: "var(--ink-muted)",
          margin: "14px 0 0",
          lineHeight: 1.5,
        }}
      >
        Gate review: <span style={{ color: "var(--ink)" }}>{gateReviewSummary}</span>
        {isExim ? " · EXIM LOI readiness score drives gate eligibility." : ""}
      </p>
    </div>
  );
}
