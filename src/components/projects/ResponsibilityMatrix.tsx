import type { ProjectRequirementRow } from "@/lib/db/requirements";
import type { RequirementStatusValue } from "@/types/requirements";
import {
  detailMonoLabelStyle,
  detailSerifTitleStyle,
  detailSurfaceCardStyle,
} from "./projectDetailStyles";

type Props = {
  requirements: ProjectRequirementRow[];
};

function statusDotColor(status: RequirementStatusValue): string {
  switch (status) {
    case "substantially_final":
    case "executed":
    case "waived":
      return "#16a34a"; // green
    case "in_progress":
    case "draft":
      return "#d97706"; // amber
    case "not_applicable":
    case "not_started":
    default:
      return "#9ca3af"; // gray
  }
}

function formatTargetDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const CATEGORY_LABELS: Record<string, string> = {
  contracts: "Contracts",
  financial: "Financial",
  studies: "Studies",
  permits: "Permits",
  corporate: "Corporate",
  environmental_social: "Env & Social",
};

export function ResponsibilityMatrix({ requirements }: Props) {
  // Filter: LOI-critical and applicable
  const applicable = requirements.filter(
    (r) => r.isLoiCritical && r.isApplicable !== false
  );

  // Group by responsibleOrganizationName; null → "Unassigned"
  const groupMap = new Map<string, ProjectRequirementRow[]>();

  for (const req of applicable) {
    const key = req.responsibleOrganizationName ?? "Unassigned";
    const existing = groupMap.get(key);
    if (existing) {
      existing.push(req);
    } else {
      groupMap.set(key, [req]);
    }
  }

  // Sort: named orgs alphabetically, "Unassigned" always last
  const sortedKeys = Array.from(groupMap.keys()).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  const allUnassigned =
    sortedKeys.length === 1 && sortedKeys[0] === "Unassigned";

  return (
    <div style={{ marginTop: "32px" }}>
      {/* Header */}
      <p style={{ ...detailMonoLabelStyle, margin: "0 0 6px" }}>
        Responsibility Matrix
      </p>
      <p
        style={{
          ...detailSerifTitleStyle("22px"),
          margin: "0 0 6px",
        }}
      >
        Responsibility Matrix
      </p>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          color: "var(--ink-muted)",
          margin: "0 0 24px",
          lineHeight: 1.5,
        }}
      >
        LOI-critical items by owner
      </p>

      {applicable.length === 0 ? (
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            color: "var(--ink-muted)",
            padding: "24px 0",
          }}
        >
          No LOI-critical requirements found.
        </p>
      ) : allUnassigned ? (
        <div
          style={{
            ...detailSurfaceCardStyle("10px"),
            padding: "20px 24px",
            fontFamily: "'Inter', sans-serif",
            fontSize: "13px",
            color: "var(--ink-muted)",
            lineHeight: 1.5,
          }}
        >
          No responsibilities assigned yet. Use the Requirements checklist to
          assign owners.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {sortedKeys.map((orgName) => {
            const reqs = groupMap.get(orgName)!;
            return (
              <div key={orgName}>
                {/* Organization header */}
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color:
                      orgName === "Unassigned"
                        ? "var(--ink-muted)"
                        : "var(--ink)",
                    marginBottom: "10px",
                    paddingBottom: "8px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {orgName}
                </div>

                {/* Table */}
                <div
                  style={{
                    ...detailSurfaceCardStyle("8px"),
                    overflow: "hidden",
                  }}
                >
                  <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", width: "100%" }}>
                  {/* Table header */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 160px 100px 80px",
                      minWidth: "620px",
                      gap: "0 16px",
                      padding: "8px 16px",
                      borderBottom: "1px solid var(--border)",
                      backgroundColor:
                        "color-mix(in srgb, var(--border) 20%, transparent)",
                    }}
                  >
                    {["Requirement", "Category", "Responsible Person", "Target Date", "Status"].map(
                      (col) => (
                        <span
                          key={col}
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "8px",
                            fontWeight: 500,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "var(--ink-muted)",
                          }}
                        >
                          {col}
                        </span>
                      )
                    )}
                  </div>

                  {/* Rows */}
                  {reqs.map((req, idx) => (
                    <div
                      key={req.requirementId}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 120px 160px 100px 80px",
                        minWidth: "620px",
                        gap: "0 16px",
                        padding: "10px 16px",
                        alignItems: "center",
                        borderBottom:
                          idx < reqs.length - 1
                            ? "1px solid color-mix(in srgb, var(--border) 50%, transparent)"
                            : "none",
                      }}
                    >
                      {/* Requirement name */}
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "13px",
                          color: "var(--ink)",
                          lineHeight: 1.4,
                        }}
                      >
                        {req.name}
                      </span>

                      {/* Category badge */}
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "9px",
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--ink-muted)",
                          backgroundColor:
                            "color-mix(in srgb, var(--border) 40%, transparent)",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          display: "inline-block",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {CATEGORY_LABELS[req.category] ?? req.category}
                      </span>

                      {/* Responsible person */}
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "12px",
                          color: req.responsibleStakeholderName
                            ? "var(--ink)"
                            : "var(--ink-muted)",
                        }}
                      >
                        {req.responsibleStakeholderName ?? "—"}
                      </span>

                      {/* Target date */}
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "11px",
                          color: req.targetDate
                            ? "var(--ink)"
                            : "var(--ink-muted)",
                        }}
                      >
                        {req.targetDate ? formatTargetDate(req.targetDate) : "—"}
                      </span>

                      {/* Status dot */}
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: statusDotColor(req.status),
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "9px",
                            color: "var(--ink-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {req.status.replace(/_/g, " ")}
                        </span>
                      </span>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
