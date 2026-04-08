"use client";

import { useState } from "react";

type CovenantHealthBadgeProps = {
  active: number;
  breached: number;
  atRisk: number;
  satisfied: number;
  waived: number;
};

function getLevel(breached: number, atRisk: number): { label: string; color: string; bg: string } {
  if (breached > 0) return { label: "Breach", color: "var(--accent)", bg: "var(--accent-soft)" };
  if (atRisk > 0) return { label: "At risk", color: "var(--gold)", bg: "var(--gold-soft)" };
  return { label: "Healthy", color: "var(--teal)", bg: "var(--teal-soft)" };
}

export function CovenantHealthBadge({ active, breached, atRisk, satisfied, waived }: CovenantHealthBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const total = active + breached + atRisk + satisfied + waived;
  if (total === 0) return null;

  const level = getLevel(breached, atRisk);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "4px 10px",
          borderRadius: "999px",
          border: `1px solid ${level.color}`,
          backgroundColor: level.bg,
          color: level.color,
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          fontWeight: 500,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        Covenants: {level.label}
      </button>

      {expanded && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 20,
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "14px 16px",
            minWidth: "200px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: "0 0 10px",
            }}
          >
            Covenant Health
          </p>
          <div style={{ display: "grid", gap: "6px" }}>
            {breached > 0 && <CovenantLine label="Breached" count={breached} color="var(--accent)" />}
            {atRisk > 0 && <CovenantLine label="At risk" count={atRisk} color="var(--gold)" />}
            {active > 0 && <CovenantLine label="Active" count={active} color="var(--ink-mid)" />}
            {satisfied > 0 && <CovenantLine label="Satisfied" count={satisfied} color="var(--teal)" />}
            {waived > 0 && <CovenantLine label="Waived" count={waived} color="var(--ink-muted)" />}
          </div>
        </div>
      )}
    </div>
  );
}

function CovenantLine({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink-mid)" }}>{label}</span>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", fontWeight: 600, color }}>{count}</span>
    </div>
  );
}
