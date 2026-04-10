"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  dealType: string;
  projectSlug: string;
  projectName: string;
};

type Action = {
  text: string;
  anchor: string;
};

function getActions(dealType: string): Action[] {
  if (dealType === "exim_project_finance") {
    return [
      {
        text: "Add your EPC contractor as a stakeholder — they must be US-based with >51% US content",
        anchor: "#section-stakeholders",
      },
      {
        text: "Set a target LOI date to activate urgency tracking and velocity alerts",
        anchor: "#section-overview",
      },
      {
        text: "Identify your off-taker and add them to the Parties workspace",
        anchor: "#section-stakeholders",
      },
      {
        text: "Upload or link your feasibility study — EXIM requires one for all projects",
        anchor: "#section-documents",
      },
      {
        text: "Write a one-paragraph deal thesis in the Concept workspace",
        anchor: "#section-concept",
      },
    ];
  }

  if (dealType.startsWith("dfi") || dealType === "development_finance") {
    return [
      {
        text: "Add the borrowing entity and co-lenders to the Parties workspace",
        anchor: "#section-stakeholders",
      },
      {
        text: "Set a target financial close date",
        anchor: "#section-overview",
      },
      {
        text: "Upload your project information memorandum or feasibility study",
        anchor: "#section-documents",
      },
      {
        text: "Define the debt structure in the Capital workspace",
        anchor: "#section-capital",
      },
      {
        text: "Write a deal thesis in the Concept workspace",
        anchor: "#section-concept",
      },
    ];
  }

  if (dealType === "commercial_finance") {
    return [
      {
        text: "Add the borrower, arranger, and any co-lenders to the Parties workspace",
        anchor: "#section-stakeholders",
      },
      {
        text: "Set a target financial close date to activate urgency tracking",
        anchor: "#section-overview",
      },
      {
        text: "Upload the credit memo or information memorandum in the Evidence workspace",
        anchor: "#section-documents",
      },
      {
        text: "Define the loan structure, tenor, and pricing in the Capital workspace",
        anchor: "#section-capital",
      },
      {
        text: "Write a deal thesis summarising the credit case in the Concept workspace",
        anchor: "#section-concept",
      },
    ];
  }

  if (dealType.startsWith("pe") || dealType === "private_equity") {
    return [
      {
        text: "Add the management team and key advisors to the Parties workspace",
        anchor: "#section-stakeholders",
      },
      {
        text: "Set a target close date for the equity raise",
        anchor: "#section-overview",
      },
      {
        text: "Upload your investor deck or information memorandum",
        anchor: "#section-documents",
      },
      {
        text: "Define the equity structure and target raise amount in the Capital workspace",
        anchor: "#section-capital",
      },
      {
        text: "Write a deal thesis in the Concept workspace",
        anchor: "#section-concept",
      },
    ];
  }

  return [
    {
      text: "Add key counterparties to the Parties workspace",
      anchor: "#section-stakeholders",
    },
    {
      text: "Set a target close date",
      anchor: "#section-overview",
    },
    {
      text: "Upload your core project documents",
      anchor: "#section-documents",
    },
    {
      text: "Define the financing structure in the Capital workspace",
      anchor: "#section-capital",
    },
    {
      text: "Write a deal thesis in the Concept workspace",
      anchor: "#section-concept",
    },
  ];
}

const STORAGE_KEY = (slug: string) => `lodestar:onboarding:dismissed:${slug}`;

export function FirstRunOverlay({ dealType, projectSlug, projectName }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isNew = searchParams.get("new") === "1";
    const isDismissed = localStorage.getItem(STORAGE_KEY(projectSlug)) === "1";
    if (isNew && !isDismissed) {
      setVisible(true);
    }
  }, [searchParams, projectSlug]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY(projectSlug), "1");
    setVisible(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    const newUrl = params.toString()
      ? `/projects/${projectSlug}?${params.toString()}`
      : `/projects/${projectSlug}`;
    router.replace(newUrl);
  }

  if (!visible) return null;

  const actions = getActions(dealType);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.55)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          maxWidth: "560px",
          width: "100%",
          padding: "32px",
          position: "relative",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        }}
      >
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--ink-muted)",
            fontSize: "20px",
            lineHeight: 1,
            padding: "4px 8px",
          }}
        >
          ×
        </button>

        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            marginBottom: "8px",
          }}
        >
          Start here
        </p>

        <h2
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "24px",
            fontWeight: 400,
            color: "var(--ink)",
            marginBottom: "8px",
            lineHeight: 1.2,
          }}
        >
          Welcome to {projectName}
        </h2>

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            color: "var(--ink-muted)",
            marginBottom: "28px",
            lineHeight: 1.6,
          }}
        >
          Five actions to get your project workspace off the ground.
        </p>

        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
          {actions.map((action, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: "var(--accent)",
                  color: "var(--text-inverse)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "11px",
                  fontWeight: 600,
                  marginTop: "1px",
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "var(--ink)",
                  lineHeight: 1.6,
                  flex: 1,
                }}
              >
                {action.text}
              </span>
              <a
                href={action.anchor}
                onClick={dismiss}
                style={{
                  flexShrink: 0,
                  color: "var(--accent)",
                  fontSize: "16px",
                  lineHeight: 1,
                  marginTop: "3px",
                  textDecoration: "none",
                }}
                aria-label="Go to section"
              >
                →
              </a>
            </li>
          ))}
        </ol>

        <button
          onClick={dismiss}
          style={{
            marginTop: "28px",
            width: "100%",
            padding: "12px 20px",
            backgroundColor: "var(--accent)",
            color: "var(--text-inverse)",
            border: "none",
            borderRadius: "8px",
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.01em",
          }}
        >
          Got it, let&apos;s go
        </button>
      </div>
    </div>
  );
}
