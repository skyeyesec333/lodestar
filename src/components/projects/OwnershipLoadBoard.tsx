import type { CSSProperties } from "react";
import type {
  OwnershipLoadBoardRequirement,
  OwnershipLoadBoardStakeholder,
  PressureLevel,
  RequirementSignal,
  StakeholderSignal,
} from "./OwnershipLoadBoard.logic";
import {
  detailMicroMonoStyle,
  detailMonoLabelStyle,
  detailMutedBodyStyle,
  detailSerifTitleStyle,
} from "./projectDetailStyles";

export type { OwnershipLoadBoardRequirement, OwnershipLoadBoardStakeholder } from "./OwnershipLoadBoard.logic";

export type OwnershipLoadBoardProps = {
  requirements: readonly OwnershipLoadBoardRequirement[];
  stakeholders: readonly OwnershipLoadBoardStakeholder[];
  title?: string;
  subtitle?: string;
};

const msPerDay = 86_400_000;

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date = new Date()): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  const delta = startOfDay(date).getTime() - startOfDay().getTime();
  return Math.round(delta / msPerDay);
}

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  const delta = startOfDay().getTime() - startOfDay(date).getTime();
  return Math.round(delta / msPerDay);
}

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

function formatPressureLabel(level: PressureLevel): string {
  switch (level) {
    case "critical":
      return "Critical";
    case "warning":
      return "At risk";
    case "info":
      return "Watch";
    case "quiet":
      return "Calm";
  }
}

function getPressureStyles(level: PressureLevel): { color: string; fill: string; border: string } {
  switch (level) {
    case "critical":
      return { color: "var(--accent)", fill: "color-mix(in srgb, var(--accent) 12%, var(--bg-card))", border: "var(--accent)" };
    case "warning":
      return { color: "var(--gold)", fill: "color-mix(in srgb, var(--gold) 12%, var(--bg-card))", border: "var(--gold)" };
    case "info":
      return { color: "var(--teal)", fill: "color-mix(in srgb, var(--teal) 12%, var(--bg-card))", border: "var(--teal)" };
    case "quiet":
      return { color: "var(--ink-muted)", fill: "var(--bg-card)", border: "var(--border)" };
  }
}

function classifyRequirement(requirement: OwnershipLoadBoardRequirement): RequirementSignal {
  const dueDays = daysUntil(toDate(requirement.targetDate));
  const hasOwner = Boolean(requirement.responsibleOrganizationId || requirement.responsibleStakeholderId);
  const isBlocked = requirement.status === "not_started" || requirement.status === "in_progress" || requirement.status === "draft";
  const isLate = dueDays !== null && dueDays < 0;
  const isSoon = dueDays !== null && dueDays >= 0 && dueDays <= 14;

  let score = 0;
  if (requirement.isPrimaryGate) score += 24;
  if (!requirement.isApplicable) score += 0;
  if (!hasOwner) score += 18;
  if (isLate) score += 36;
  else if (isSoon) score += 18;
  else if (dueDays !== null && dueDays <= 45) score += 8;
  if (isBlocked) score += 12;

  const level: PressureLevel =
    !requirement.isApplicable
      ? "quiet"
      : score >= 50
        ? "critical"
        : score >= 28
          ? "warning"
          : score >= 12
            ? "info"
            : "quiet";

  let label = "On track";
  let detail = "No near-term pressure";

  if (!requirement.isApplicable) {
    label = "Not applicable";
    detail = requirement.applicabilityReason ?? "Out of scope";
  } else if (isLate) {
    label = "Overdue";
    detail = dueDays !== null ? `${Math.abs(dueDays)}d late` : "Past due";
  } else if (isSoon) {
    label = "Due soon";
    detail = dueDays === 0 ? "Due today" : `${dueDays}d to due`;
  } else if (!hasOwner) {
    label = "Unassigned";
    detail = "Unassigned owner";
  } else if (requirement.isPrimaryGate) {
    label = "LOI critical";
    detail = "Next-gate blocker";
  } else if (isBlocked) {
    label = "In progress";
    detail = "Open work";
  }

  return { requirement, score, level, label, detail };
}

function classifyStakeholder(stakeholder: OwnershipLoadBoardStakeholder): StakeholderSignal {
  const contactDate = toDate(stakeholder.lastContactAt);
  const daysSinceContact = daysSince(contactDate);
  const openItems = stakeholder.openActionItemCount + stakeholder.documentsOwedCount;

  let score = openItems * 8;
  if (stakeholder.needsFollowUp) score += 18;
  if (daysSinceContact === null) score += 8;
  else if (daysSinceContact >= 21) score += 18;
  else if (daysSinceContact >= 10) score += 8;

  const level: PressureLevel =
    score >= 40
      ? "critical"
      : score >= 24
        ? "warning"
        : score >= 8
          ? "info"
          : "quiet";

  let label = "Responsive";
  let detail = "Low ownership pressure";
  if (stakeholder.needsFollowUp) {
    label = "Needs follow-up";
    detail = "Follow-up pending";
  } else if (openItems > 0) {
    label = "Active";
    detail = `${formatCount(openItems)} open item${openItems === 1 ? "" : "s"}`;
  } else if (daysSinceContact === null) {
    label = "No contact";
    detail = "No touchpoint yet";
  } else if (daysSinceContact >= 21) {
    label = "Stale";
    detail = `${daysSinceContact}d since contact`;
  } else if (daysSinceContact >= 10) {
    label = "Watch";
    detail = `${daysSinceContact}d since contact`;
  }

  return { stakeholder, score, level, label, detail };
}

function sectionLabelStyle(): CSSProperties {
  return { ...detailMonoLabelStyle, letterSpacing: "0.14em" };
}

export function OwnershipLoadBoard({
  requirements,
  stakeholders,
  title = "Ownership Load",
  subtitle = "A quick read on where responsibility is concentrated, stale, or under-owned.",
}: OwnershipLoadBoardProps) {
  const requirementSignals = [...requirements].map(classifyRequirement).sort((a, b) => b.score - a.score);
  const stakeholderSignals = [...stakeholders].map(classifyStakeholder).sort((a, b) => b.score - a.score);

  const criticalRequirements = requirementSignals.filter((item) => item.level === "critical");
  const unassignedRequirements = requirementSignals.filter(
    (item) => item.requirement.isApplicable && !item.requirement.responsibleOrganizationId && !item.requirement.responsibleStakeholderId
  );
  const staleStakeholders = stakeholders.filter((stakeholder) => {
    const contactAge = daysSince(toDate(stakeholder.lastContactAt));
    return stakeholder.needsFollowUp || contactAge === null || contactAge >= 10;
  });
  const totalOpenOwnerPressure = requirementSignals.filter((item) => item.requirement.isApplicable && item.level !== "quiet").length;

  const topRequirements = requirementSignals.slice(0, 4);
  const topStakeholders = stakeholderSignals.slice(0, 4);
  const showStakeholderPanel = topStakeholders.length > 0;

  const maxRequirementScore = Math.max(1, ...topRequirements.map((item) => item.score));
  const maxStakeholderScore = Math.max(1, ...topStakeholders.map((item) => item.score));

  return (
    <section
      style={{
        marginBottom: "32px",
        padding: 0,
      }}
    >
      <div style={{ display: "grid", gap: "14px", marginBottom: "18px" }}>
        <div style={{ minWidth: 0, maxWidth: "760px" }}>
          <p style={{ ...sectionLabelStyle(), margin: "0 0 8px 0" }}>PM View</p>
          <h2
            style={{
              ...detailSerifTitleStyle("20px"),
              margin: 0,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              ...detailMutedBodyStyle,
              margin: "8px 0 0 0",
              maxWidth: "640px",
            }}
          >
            {subtitle}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "10px",
            width: "100%",
            maxWidth: "760px",
          }}
        >
          {[
            { label: "Pressure items", value: formatCount(totalOpenOwnerPressure), level: totalOpenOwnerPressure > 0 ? "warning" : "quiet" as PressureLevel },
            { label: "Critical reqs", value: formatCount(criticalRequirements.length), level: criticalRequirements.length > 0 ? "critical" : "quiet" as PressureLevel },
            { label: "Unassigned", value: formatCount(unassignedRequirements.length), level: unassignedRequirements.length > 0 ? "warning" : "quiet" as PressureLevel },
            { label: "Stale contacts", value: formatCount(staleStakeholders.length), level: staleStakeholders.length > 0 ? "info" : "quiet" as PressureLevel },
          ].map((item) => {
            const styles = getPressureStyles(item.level);
            return (
              <div
                key={item.label}
                style={{
                  borderRadius: "14px",
                  border: `1px solid ${styles.border}`,
                  backgroundColor: styles.fill,
                  padding: "10px 12px 9px",
                  minWidth: 0,
                }}
              >
                <div style={{ ...sectionLabelStyle(), marginBottom: "8px" }}>{item.label}</div>
                <div
                  style={{
                    ...detailSerifTitleStyle("24px"),
                    lineHeight: 1,
                    color: styles.color,
                  }}
                >
                  {item.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: showStakeholderPanel ? "repeat(auto-fit, minmax(340px, 1fr))" : "minmax(0, 1fr)",
          gap: "16px",
          alignItems: "start",
        }}
      >
        {showStakeholderPanel ? (
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "16px",
              backgroundColor: "color-mix(in srgb, var(--bg-card) 88%, var(--bg))",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
              <p style={{ ...sectionLabelStyle(), margin: 0 }}>Stakeholder load</p>
              <p style={{ ...detailMonoLabelStyle, fontSize: "10px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "none", margin: 0 }}>
                by open actions and stale contact
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {topStakeholders.map((item) => {
                const styles = getPressureStyles(item.level);
                const width = `${Math.max(8, Math.round((item.score / maxStakeholderScore) * 100))}%`;

                return (
                  <div
                    key={item.stakeholder.id}
                    style={{
                      border: `1px solid ${styles.border}`,
                      borderRadius: "14px",
                      backgroundColor: styles.fill,
                      padding: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--ink)",
                            lineHeight: 1.3,
                          }}
                        >
                          {item.stakeholder.name}
                        </div>
                        <div
                          style={{
                            ...detailMicroMonoStyle,
                            marginTop: "4px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {[item.stakeholder.roleType, item.stakeholder.organizationName, item.stakeholder.title]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{
                            ...detailMonoLabelStyle,
                            color: styles.color,
                            border: `1px solid ${styles.border}`,
                            borderRadius: "999px",
                            padding: "4px 8px",
                          }}
                        >
                          {formatPressureLabel(item.level)}
                        </div>
                        <div style={{ ...detailMutedBodyStyle, fontSize: "11px", marginTop: "5px" }}>
                          {item.detail}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          flex: 1,
                          height: "8px",
                          borderRadius: "999px",
                          overflow: "hidden",
                          backgroundColor: "var(--border)",
                        }}
                      >
                        <div
                          style={{
                            width,
                            height: "100%",
                            borderRadius: "999px",
                            backgroundColor: styles.color,
                          }}
                        />
                      </div>
                      <div style={{ ...detailMonoLabelStyle, fontSize: "10px", fontWeight: 400, color: styles.color, letterSpacing: "0.08em", textTransform: "none" }}>
                        {formatCount(item.score)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "16px",
            backgroundColor: "color-mix(in srgb, var(--bg-card) 88%, var(--bg))",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
            <p style={{ ...sectionLabelStyle(), margin: 0 }}>Requirement pressure</p>
            <p style={{ ...detailMonoLabelStyle, fontSize: "10px", fontWeight: 400, letterSpacing: "0.08em", textTransform: "none", margin: 0 }}>
              blockers, owner gaps, timing
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {topRequirements.length === 0 ? (
              <div
                style={{
                  border: "1px dashed var(--border)",
                  borderRadius: "12px",
                  padding: "18px",
                  color: "var(--ink-muted)",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                }}
              >
                No requirements to display.
              </div>
            ) : (
              topRequirements.map((item) => {
                const styles = getPressureStyles(item.level);
                const width = `${Math.max(8, Math.round((item.score / maxRequirementScore) * 100))}%`;
                const owner = item.requirement.responsibleOrganizationName ?? item.requirement.responsibleStakeholderName ?? "Unassigned";
                const targetDate = toDate(item.requirement.targetDate);
                const dueDays = daysUntil(targetDate);

                return (
                  <div
                    key={item.requirement.projectRequirementId || item.requirement.requirementId}
                    style={{
                      border: `1px solid ${styles.border}`,
                      borderRadius: "14px",
                      backgroundColor: styles.fill,
                      padding: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "8px" }}>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--ink)",
                            lineHeight: 1.3,
                          }}
                        >
                          {item.requirement.name}
                        </div>
                        <div
                          style={{
                            ...detailMicroMonoStyle,
                            marginTop: "4px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {[item.requirement.category, item.requirement.phaseRequired, item.requirement.isPrimaryGate ? "LOI critical" : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{
                            ...detailMonoLabelStyle,
                            color: styles.color,
                            border: `1px solid ${styles.border}`,
                            borderRadius: "999px",
                            padding: "4px 8px",
                          }}
                        >
                          {item.label}
                        </div>
                        <div style={{ ...detailMutedBodyStyle, fontSize: "11px", marginTop: "5px" }}>
                          {item.detail}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        ...detailMicroMonoStyle,
                        marginBottom: "10px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      Owner: {owner}
                      {dueDays !== null
                        ? ` · ${dueDays < 0 ? `${Math.abs(dueDays)}d late` : dueDays === 0 ? "due today" : `${dueDays}d left`}`
                        : ""}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          flex: 1,
                          height: "8px",
                          borderRadius: "999px",
                          overflow: "hidden",
                          backgroundColor: "var(--border)",
                        }}
                      >
                        <div
                          style={{
                            width,
                            height: "100%",
                            borderRadius: "999px",
                            backgroundColor: styles.color,
                          }}
                        />
                      </div>
                      <div style={{ ...detailMonoLabelStyle, fontSize: "10px", fontWeight: 400, color: styles.color, letterSpacing: "0.08em", textTransform: "none" }}>
                        {formatCount(item.score)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
