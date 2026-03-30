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

function wrapLines(text: string, maxLen: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLen || current === "") {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = truncate(lines[maxLines - 1] ?? "", maxLen);
  }

  return lines;
}

function formatDate(value: Date | string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeDays(value: Date | string | null): string | null {
  if (!value) return null;
  const then = new Date(value);
  const diffDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(then).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function getRoleLabel(roleType: string): string {
  return ROLE_OPTIONS.find((r) => r.value === roleType)?.label ?? roleType;
}

function getStakeholderStatus(stakeholder: StakeholderRow) {
  const overdueActionCount = stakeholder.openActionItems.filter(
    (item) => item.dueDate && new Date(item.dueDate).getTime() < Date.now()
  ).length;
  const overdueDocumentCount = stakeholder.documentsOwed.filter(
    (item) => item.dueDate && new Date(item.dueDate).getTime() < Date.now()
  ).length;
  const openPressure = stakeholder.openActionItemCount + stakeholder.documentsOwedCount;
  const hasRecentMeeting = stakeholder.recentMeetings.length > 0;
  const lastContactDays = formatRelativeDays(stakeholder.lastContactAt);

  if (overdueActionCount > 0 || overdueDocumentCount > 0) {
    return {
      label: "Blocked",
      color: "var(--accent)",
      background: "var(--accent-soft)",
      tone: "critical" as const,
      summary:
        overdueActionCount > 0
          ? `${overdueActionCount} overdue action${overdueActionCount === 1 ? "" : "s"}`
          : `${overdueDocumentCount} overdue doc${overdueDocumentCount === 1 ? "" : "s"}`,
    };
  }

  if (stakeholder.needsFollowUp) {
    return {
      label: "Stale",
      color: "var(--gold)",
      background: "var(--gold-soft)",
      tone: "warning" as const,
      summary: stakeholder.followUpReason ?? "Follow-up needed",
    };
  }

  if (openPressure > 0) {
    return {
      label: "Active",
      color: "var(--teal)",
      background: "var(--teal-soft)",
      tone: "active" as const,
      summary: `${openPressure} open item${openPressure === 1 ? "" : "s"}`,
    };
  }

  return {
    label: hasRecentMeeting ? "Quiet" : "Unverified",
    color: "var(--ink-muted)",
    background: "var(--bg)",
    tone: "neutral" as const,
    summary: hasRecentMeeting ? `Last touch ${lastContactDays ?? "recently"}` : "No activity yet",
  };
}

function getNodeRadius(stakeholder: StakeholderRow): number {
  const pressure = stakeholder.openActionItemCount + stakeholder.documentsOwedCount;
  return clamp(18 + Math.min(7, pressure * 1.25), 18, 25);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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
  const radius = count <= 6 ? 158 : count <= 12 ? 210 : 258;

  // Compute viewBox dimensions dynamically with enough padding for labels
  const padding = 96;
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

  const stakeholderMetrics = stakeholders.map((stakeholder) => {
    const status = getStakeholderStatus(stakeholder);
    const pressure = stakeholder.openActionItemCount + stakeholder.documentsOwedCount;
    const isPrimary = stakeholder.isPrimary;
    return {
      stakeholder,
      status,
      pressure,
      radius: getNodeRadius(stakeholder),
      isPrimary,
    };
  });

  const blockedCount = stakeholderMetrics.filter((item) => item.status.tone === "critical").length;
  const staleCount = stakeholderMetrics.filter((item) => item.status.tone === "warning").length;
  const activeCount = stakeholderMetrics.filter((item) => item.status.tone === "active").length;
  const primaryCount = stakeholderMetrics.filter((item) => item.isPrimary).length;
  const totalPressure = stakeholderMetrics.reduce((sum, item) => sum + item.pressure, 0);
  const topPressureStakeholder =
    [...stakeholderMetrics].sort((a, b) => b.pressure - a.pressure)[0] ?? null;

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        {[
          { label: "Stakeholders", value: `${stakeholders.length}` },
          { label: "Primary roles", value: `${primaryCount}` },
          { label: "Follow-up", value: `${staleCount + blockedCount}` },
          { label: "Open pressure", value: `${totalPressure}` },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "10px 12px",
              backgroundColor: "var(--bg-card)",
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
          <defs>
            {stakeholderMetrics.map(({ stakeholder, status }) => (
              <filter key={`shadow-${stakeholder.id}`} id={`shadow-${stakeholder.id}`} x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={status.color} floodOpacity="0.14" />
              </filter>
            ))}
          </defs>

          {/* Connector lines from center to each node */}
          {positions.map((pos, i) => {
            const item = stakeholderMetrics[i];
            const s = item?.stakeholder;
            if (!s) return null;
            return (
              <line
                key={`line-${s.id}`}
                x1={centerX}
                y1={centerY}
                x2={pos.x}
                y2={pos.y}
                stroke={selectedId === null ? "var(--border)" : selectedId === s.id ? "var(--accent)" : "var(--border)"}
                strokeOpacity={selectedId === null ? 1 : selectedId === s.id ? 1 : 0.35}
                strokeWidth={selectedId === s.id ? 2 : 1}
              />
            );
          })}

          {/* Center node — project */}
          <circle
            cx={centerX}
            cy={centerY}
            r={34}
            fill="var(--gold-soft)"
            stroke="var(--gold)"
            strokeWidth={2}
          />
          <text
            x={centerX}
            y={centerY - 6}
            textAnchor="middle"
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "8.5px",
              fill: "var(--ink)",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {truncate(projectName, 12)}
          </text>
          <text
            x={centerX}
            y={centerY + 6}
            textAnchor="middle"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "5.8px",
              letterSpacing: "0.12em",
              fill: "var(--ink-muted)",
              pointerEvents: "none",
              userSelect: "none",
              textTransform: "uppercase",
            }}
          >
            <tspan x={centerX} dy="0">
              {blockedCount + staleCount > 0 ? `${blockedCount + staleCount}` : "All"}
            </tspan>
            <tspan x={centerX} dy="7">
              {blockedCount + staleCount > 0 ? "Need Attention" : "Stable"}
            </tspan>
          </text>

          {/* Stakeholder nodes */}
          {stakeholders.map((s, i) => {
            const pos = positions[i];
            if (!pos) return null;

            const color = ROLE_COLORS[s.roleType] ?? "var(--ink-muted)";
            const bg = ROLE_BG[s.roleType] ?? "var(--bg)";
            const isSelected = selectedId === s.id;
            const initials = getInitials(s.name);
            const roleLabel = getRoleLabel(s.roleType);
            const status = getStakeholderStatus(s);
            const radius = getNodeRadius(s);
            const hasOpenItems = s.openActionItemCount > 0;
            const pressure = s.openActionItemCount + s.documentsOwedCount;
            const isPrimary = s.isPrimary;
            const nameLines = wrapLines(s.name, 14, 2);
            const roleText = truncate(roleLabel.toUpperCase(), 12);

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
                  r={radius + 5}
                  fill="transparent"
                  stroke={status.color}
                  strokeWidth={isSelected ? 2 : 1.2}
                  strokeOpacity={isSelected ? 1 : 0.4}
                  strokeDasharray={status.tone === "warning" ? "4 4" : undefined}
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill={bg}
                  stroke={isSelected ? "var(--ink)" : color}
                  strokeWidth={isSelected ? 3 : isPrimary ? 2.5 : 2}
                  filter={`url(#shadow-${s.id})`}
                />

                {/* Initials */}
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: radius >= 23 ? "9px" : "8px",
                    fontWeight: 600,
                    fill: color,
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  {initials}
                </text>

                {status.tone !== "neutral" && (
                  <circle
                    cx={pos.x + radius - 3}
                    cy={pos.y - radius + 3}
                    r={3}
                    fill={status.color}
                    stroke="white"
                    strokeWidth={1}
                  />
                )}

                {/* Name label below circle */}
                <text
                  x={pos.x}
                  y={pos.y + radius + 10}
                  textAnchor="middle"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "6.8px",
                    fontWeight: 600,
                    fill: "var(--ink)",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  {nameLines.map((line, index) => (
                    <tspan key={`${s.id}-name-${index}`} x={pos.x} dy={index === 0 ? "0" : "7"}>
                      {line}
                    </tspan>
                  ))}
                </text>

                {/* Role label below name */}
                <text
                  x={pos.x}
                  y={pos.y + radius + 25}
                  textAnchor="middle"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "5.6px",
                    fill: status.color,
                    pointerEvents: "none",
                    userSelect: "none",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {roleText}
                </text>

                {/* Open action item badge */}
                {hasOpenItems && (
                  <>
                    <circle
                      cx={pos.x + radius - 8}
                      cy={pos.y - radius + 8}
                      r={5.3}
                      fill={pressure > 3 ? "var(--accent)" : status.color}
                    />
                    <text
                      x={pos.x + radius - 8}
                      y={pos.y - radius + 8}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "5.4px",
                        fill: "#ffffff",
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                    >
                      {pressure > 9 ? "9+" : String(pressure)}
                    </text>
                  </>
                )}

                {isPrimary && (
                  <rect
                    x={pos.x - 14}
                    y={pos.y - radius - 13}
                    width={28}
                    height={8}
                    rx={4}
                    fill="var(--bg-card)"
                    stroke="var(--border)"
                  />
                )}
                {isPrimary && (
                  <text
                    x={pos.x}
                    y={pos.y - radius - 9}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "5px",
                      letterSpacing: "0.1em",
                      fill: "var(--ink-muted)",
                      pointerEvents: "none",
                      userSelect: "none",
                      textTransform: "uppercase",
                    }}
                  >
                    Primary
                  </text>
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
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginTop: "10px",
                }}
              >
                {[
                  {
                    label: getStakeholderStatus(selectedStakeholder).label,
                    color: getStakeholderStatus(selectedStakeholder).color,
                    background: getStakeholderStatus(selectedStakeholder).background,
                  },
                  {
                    label:
                      selectedStakeholder.openActionItemCount > 0
                        ? `${selectedStakeholder.openActionItemCount} actions`
                        : "No open actions",
                    color: "var(--ink-muted)",
                    background: "var(--bg)",
                  },
                  {
                    label:
                      selectedStakeholder.documentsOwedCount > 0
                        ? `${selectedStakeholder.documentsOwedCount} docs owed`
                        : "No docs owed",
                    color: "var(--ink-muted)",
                    background: "var(--bg)",
                  },
                ].map((badge) => (
                  <span
                    key={badge.label}
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: badge.color,
                      backgroundColor: badge.background,
                      border: "1px solid var(--border)",
                      borderRadius: "999px",
                      padding: "5px 9px",
                    }}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
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
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "10px",
            }}
          >
            {[
              {
                label: "Status",
                value: getStakeholderStatus(selectedStakeholder).summary,
              },
              {
                label: "Open Actions",
                value:
                  selectedStakeholder.openActionItemCount > 0
                    ? `${selectedStakeholder.openActionItemCount} open`
                    : "None",
              },
              {
                label: "Docs Owed",
                value:
                  selectedStakeholder.documentsOwedCount > 0
                    ? `${selectedStakeholder.documentsOwedCount} linked`
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
              {
                label: "Follow-up",
                value: selectedStakeholder.followUpReason ?? "Not required",
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

          {selectedStakeholder.lastMeetingOutcome && (
            <div
              style={{
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid var(--border)",
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
                Last Meeting Outcome
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "var(--ink-mid)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {selectedStakeholder.lastMeetingOutcome}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
