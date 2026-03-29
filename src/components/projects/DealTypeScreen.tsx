"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DealTypeValue =
  | "exim_project_finance"
  | "commercial_finance"
  | "development_finance"
  | "private_equity"
  | "other";

export interface DealTypeResult {
  dealType: DealTypeValue;
}

interface Props {
  onSelect: (result: DealTypeResult) => void;
  onExit: () => void;
}

// ─── Deal type options ────────────────────────────────────────────────────────

const DEAL_TYPES: {
  value: DealTypeValue;
  label: string;
  description: string;
  badge?: string;
}[] = [
  {
    value: "exim_project_finance",
    label: "US EXIM Bank Project Finance",
    description: "Long-term guarantee or direct loan via US Export-Import Bank.",
    badge: "Full data room + readiness scoring",
  },
  {
    value: "commercial_finance",
    label: "Commercial Bank Finance",
    description: "Private credit facility, syndicated loan, or project bond.",
  },
  {
    value: "development_finance",
    label: "Development Finance / MDB",
    description: "IFC, AfDB, DFC, OPIC, or other multilateral/bilateral DFI.",
  },
  {
    value: "private_equity",
    label: "Private Equity / Sponsor Finance",
    description: "Equity-led structure — no lender or ECA involved yet.",
  },
  {
    value: "other",
    label: "Other / Not Sure Yet",
    description: "Set up the deal now and assign a financing type later.",
  },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  backgroundColor: "var(--bg)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "580px",
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "40px",
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  marginBottom: "8px",
};

const headingStyle: React.CSSProperties = {
  fontFamily: "'DM Serif Display', Georgia, serif",
  fontSize: "26px",
  fontWeight: 400,
  color: "var(--ink)",
  margin: "0 0 8px",
  lineHeight: 1.25,
};

const subheadStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "14px",
  color: "var(--ink-mid)",
  lineHeight: 1.6,
  margin: "0 0 28px",
};

const backLinkStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  textDecoration: "underline",
};

// ─── Option card ──────────────────────────────────────────────────────────────

function DealTypeOption({
  value,
  label,
  description,
  badge,
  selected,
  onClick,
}: {
  value: DealTypeValue;
  label: string;
  description: string;
  badge?: string;
  selected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "14px 18px",
        border: selected
          ? "1px solid var(--teal)"
          : hovered
            ? "1px solid var(--teal)"
            : "1px solid var(--border)",
        borderRadius: "4px",
        backgroundColor: selected
          ? "var(--teal-soft)"
          : "transparent",
        cursor: "pointer",
        marginBottom: "10px",
        transition: "border-color 0.15s, background-color 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "12px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              color: selected ? "var(--teal)" : "var(--ink)",
              margin: "0 0 3px",
              textTransform: "uppercase",
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink-mid)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        </div>
        {badge && (
          <span
            style={{
              flexShrink: 0,
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--teal)",
              backgroundColor: "var(--teal-soft)",
              border: "1px solid var(--teal)",
              borderRadius: "3px",
              padding: "3px 8px",
              whiteSpace: "nowrap",
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DealTypeScreen({ onSelect, onExit }: Props) {
  const [selected, setSelected] = useState<DealTypeValue | null>(null);

  function handleContinue() {
    if (selected) onSelect({ dealType: selected });
  }

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <p style={eyebrowStyle}>New Deal</p>
        <h2 style={headingStyle}>What kind of deal is this?</h2>
        <p style={subheadStyle}>
          This determines which checklist, scoring model, and workflow Lodestar
          applies. You can change it later from deal settings.
        </p>

        {DEAL_TYPES.map((dt) => (
          <DealTypeOption
            key={dt.value}
            value={dt.value}
            label={dt.label}
            description={dt.description}
            badge={dt.badge}
            selected={selected === dt.value}
            onClick={() => setSelected(dt.value)}
          />
        ))}

        <div
          style={{
            marginTop: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <button type="button" style={backLinkStyle} onClick={onExit}>
            ← Cancel
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={handleContinue}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: selected ? "#ffffff" : "var(--ink-muted)",
              backgroundColor: selected ? "var(--teal)" : "var(--border)",
              border: "none",
              borderRadius: "3px",
              padding: "14px 24px",
              cursor: selected ? "pointer" : "default",
              transition: "background-color 0.15s, color 0.15s",
            }}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
