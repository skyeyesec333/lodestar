"use client";

import { useState } from "react";
import type { StakeholderRow } from "@/lib/db/stakeholders";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "epc_contact",        label: "EPC Contact" },
  { value: "offtaker_contact",   label: "Off-taker Contact" },
  { value: "legal_counsel",      label: "Legal Counsel" },
  { value: "exim_officer",       label: "EXIM Officer" },
  { value: "government_liaison", label: "Government Liaison" },
  { value: "financial_advisor",  label: "Financial Advisor" },
  { value: "community_rep",      label: "Community Rep" },
  { value: "sponsor_team",       label: "Sponsor Team" },
  { value: "other",              label: "Other" },
];

const ROLE_COLORS: Record<string, string> = {
  epc_contact:        "var(--teal)",
  offtaker_contact:   "var(--gold)",
  legal_counsel:      "var(--ink-mid)",
  exim_officer:       "var(--accent)",
  government_liaison: "var(--ink-mid)",
  financial_advisor:  "var(--gold)",
  community_rep:      "var(--ink-muted)",
  sponsor_team:       "var(--teal)",
  other:              "var(--ink-muted)",
};

const ROLE_BG: Record<string, string> = {
  epc_contact:        "var(--teal-soft)",
  offtaker_contact:   "var(--gold-soft)",
  legal_counsel:      "var(--bg)",
  exim_officer:       "var(--accent-soft)",
  government_liaison: "var(--bg)",
  financial_advisor:  "var(--gold-soft)",
  community_rep:      "var(--bg)",
  sponsor_team:       "var(--teal-soft)",
  other:              "var(--bg)",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

function formatDate(value: Date | string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type NodePosition = {
  x: number;
  y: number;
};

type Props = {
  stakeholders: StakeholderRow[];
  projectName: string;
};

export function StakeholderGraph({ stakeholders, projectName }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (stakeholders.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          backgroundColor: "var(--bg-card)",
        }}
      >
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            color: "var(--ink-muted)",
            margin: 0,
          }}
        >
          No stakeholders to display.
        </p>
      </div>
    );
  }

  const count = stakeholders.length;
  const radius = count <= 6 ? 180 : count <= 12 ? 240 : 300;

  // Compute viewBox dimensions dynamically with enough padding for labels
  const padding = 80;
  const viewBoxSize = (radius + padding) * 2;
  const centerX = viewBoxSize / 2;
  const centerY = viewBoxSize / 2;

  const positions: NodePosition[] = stakeholders.map((_, i) => {
    const angle = (2 * Math.PI * i) / stakeholders.length - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  const selectedStakeholder =
    selectedId !== null
      ? (stakeholders.find((s) => s.id === selectedId) ?? null)
      : null;

  return (
    <div>
      {/* SVG graph */}
      <div
        style={{
          overflow: "hidden",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          backgroundColor: "var(--bg-card)",
          padding: "16px",
        }}
      >
        <svg
          width="100%"
          height="auto"
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          style={{ display: "block" }}
          aria-label="Stakeholder relationship graph"
        >
          {/* Connector lines from center to each node */}
          {positions.map((pos, i) => {
            const s = stakeholders[i];
            if (!s) return null;
            return (
              <line
                key={`line-${s.id}`}
                x1={centerX}
                y1={centerY}
                x2={pos.x}
                y2={pos.y}
                stroke="var(--border)"
                strokeWidth={1}
              />
            );
          })}

          {/* Center node — project */}
          <circle
            cx={centerX}
            cy={centerY}
            r={40}
            fill="var(--gold-soft)"
            stroke="var(--gold)"
            strokeWidth={2}
          />
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "12px",
              fill: "var(--ink)",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {truncate(projectName, 14)}
          </text>

          {/* Stakeholder nodes */}
          {stakeholders.map((s, i) => {
            const pos = positions[i];
            if (!pos) return null;

            const color = ROLE_COLORS[s.roleType] ?? "var(--ink-muted)";
            const bg = ROLE_BG[s.roleType] ?? "var(--bg)";
            const isSelected = selectedId === s.id;
            const initials = getInitials(s.name);
            const roleLabel =
              ROLE_OPTIONS.find((r) => r.value === s.roleType)?.label ?? s.roleType;
            const hasOpenItems = s.openActionItemCount > 0;

            return (
              <g
                key={s.id}
                onClick={() => setSelectedId(isSelected ? null : s.id)}
                style={{ cursor: "pointer" }}
                role="button"
                aria-label={`${s.name}, ${roleLabel}`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(isSelected ? null : s.id);
                  }
                }}
              >
                {/* Node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={28}
                  fill={bg}
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 2}
                />

                {/* Initials */}
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "11px",
                    fill: color,
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  {initials}
                </text>

                {/* Name label below circle */}
                <text
                  x={pos.x}
                  y={pos.y + 38}
                  textAnchor="middle"
                  dominantBaseline="hanging"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "11px",
                    fill: "var(--ink)",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  {truncate(s.name, 16)}
                </text>

                {/* Role label below name */}
                <text
                  x={pos.x}
                  y={pos.y + 53}
                  textAnchor="middle"
                  dominantBaseline="hanging"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    fill: "var(--ink-muted)",
                    pointerEvents: "none",
                    userSelect: "none",
                    textTransform: "uppercase",
                  }}
                >
                  {truncate(roleLabel.toUpperCase(), 16)}
                </text>

                {/* Open action item badge */}
                {hasOpenItems && (
                  <>
                    <circle
                      cx={pos.x + 20}
                      cy={pos.y - 20}
                      r={8}
                      fill="var(--accent)"
                    />
                    <text
                      x={pos.x + 20}
                      y={pos.y - 20}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "8px",
                        fill: "#ffffff",
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                    >
                      {s.openActionItemCount > 9 ? "9+" : String(s.openActionItemCount)}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail card for selected stakeholder */}
      {selectedStakeholder !== null && (
        <div
          style={{
            marginTop: "12px",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            backgroundColor: "var(--bg-card)",
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color:
                    ROLE_COLORS[selectedStakeholder.roleType] ?? "var(--ink-muted)",
                  backgroundColor:
                    ROLE_BG[selectedStakeholder.roleType] ?? "var(--bg)",
                  display: "inline-block",
                  padding: "2px 7px",
                  borderRadius: "2px",
                  margin: "0 0 6px",
                }}
              >
                {ROLE_OPTIONS.find((r) => r.value === selectedStakeholder.roleType)
                  ?.label ?? selectedStakeholder.roleType}
              </p>
              <p
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "20px",
                  color: "var(--ink)",
                  margin: "0 0 4px",
                  lineHeight: 1.2,
                }}
              >
                {selectedStakeholder.name}
              </p>
              {(selectedStakeholder.title || selectedStakeholder.organizationName) && (
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    color: "var(--ink-mid)",
                    margin: 0,
                  }}
                >
                  {[selectedStakeholder.title, selectedStakeholder.organizationName]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                color: "var(--ink-muted)",
                cursor: "pointer",
                fontSize: "16px",
                lineHeight: 1,
                padding: "4px 9px",
                flexShrink: 0,
              }}
              aria-label="Close detail"
            >
              ×
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "10px",
            }}
          >
            {[
              {
                label: "Open Actions",
                value:
                  selectedStakeholder.openActionItemCount > 0
                    ? `${selectedStakeholder.openActionItemCount} open`
                    : "None",
              },
              {
                label: "Meetings",
                value:
                  selectedStakeholder.meetingCount > 0
                    ? `${selectedStakeholder.meetingCount} logged`
                    : "None yet",
              },
              {
                label: "Last Contact",
                value:
                  formatDate(selectedStakeholder.lastContactAt) ?? "No meetings",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "3px",
                  padding: "10px 12px",
                }}
              >
                <p
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    fontWeight: 500,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: "var(--ink-muted)",
                    margin: "0 0 4px",
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--ink)",
                    margin: 0,
                  }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
