import type { CSSProperties } from "react";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import {
  detailMonoLabelStyle,
  detailMutedBodyStyle,
  detailSerifTitleStyle,
  detailSurfaceCardStyle,
} from "./projectDetailStyles";

type CriticalPathBoardProps = {
  rows: ProjectRequirementRow[];
  referenceDate: string | Date;
  title?: string;
  subtitle?: string;
  maxItems?: number;
};

type BoardItem = {
  row: ProjectRequirementRow;
  daysUntilDue: number | null;
  priority: number;
  statusTone: "critical" | "warning" | "neutral" | "done";
  statusLabel: string;
};

type OwnerBucket = {
  label: string;
  count: number;
  overdue: number;
};

const cardStyle: CSSProperties = {
  ...detailSurfaceCardStyle("16px"),
  overflow: "hidden",
};

const monoLabelStyle: CSSProperties = {
  ...detailMonoLabelStyle,
};

const bodyTextStyle: CSSProperties = {
  ...detailMutedBodyStyle,
};

function toUtcMidnight(value: string | Date): number {
  const d = new Date(value);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function formatDate(value: Date | null): string {
  if (!value) return "No target date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function getStatusLabel(row: ProjectRequirementRow): string {
  if (!row.isApplicable) return "Not applicable";
  if (row.status === "waived") return "Waived";
  if (row.status === "executed") return "Executed";
  return row.status.replace(/_/g, " ");
}

function getDaysUntilDue(targetDate: Date | null, referenceDate: string | Date): number | null {
  if (!targetDate) return null;
  const target = toUtcMidnight(targetDate);
  const reference = toUtcMidnight(referenceDate);
  return Math.ceil((target - reference) / 86_400_000);
}

function getPriority(row: ProjectRequirementRow, daysUntilDue: number | null): number {
  const isClosed = row.status === "executed" || row.status === "waived" || !row.isApplicable;
  if (isClosed) return 0;

  let score = row.isPrimaryGate ? 80 : 40;
  if (daysUntilDue !== null) {
    if (daysUntilDue < 0) score += 100;
    else if (daysUntilDue <= 14) score += 60;
    else if (daysUntilDue <= 30) score += 35;
    else if (daysUntilDue <= 60) score += 15;
  } else {
    score += 10;
  }

  if (!row.responsibleOrganizationName && !row.responsibleStakeholderName) score += 20;
  if (row.applicabilityReason) score += 5;
  if (row.notes) score += 5;
  return score;
}

function getStatusTone(row: ProjectRequirementRow, daysUntilDue: number | null): BoardItem["statusTone"] {
  if (row.status === "executed" || row.status === "waived" || !row.isApplicable) return "done";
  if (daysUntilDue !== null && daysUntilDue < 0) return "critical";
  if (row.isPrimaryGate || (daysUntilDue !== null && daysUntilDue <= 30)) return "warning";
  return "neutral";
}

function toneColor(tone: BoardItem["statusTone"]): string {
  switch (tone) {
    case "critical":
      return "var(--accent)";
    case "warning":
      return "var(--gold)";
    case "neutral":
      return "var(--teal)";
    case "done":
      return "var(--ink-muted)";
  }
}

function toneBackground(tone: BoardItem["statusTone"]): string {
  switch (tone) {
    case "critical":
      return "var(--accent-soft)";
    case "warning":
      return "var(--gold-soft)";
    case "neutral":
      return "var(--teal-soft)";
    case "done":
      return "var(--bg)";
  }
}

function ownerLabel(row: ProjectRequirementRow): string {
  if (row.responsibleOrganizationName) return row.responsibleOrganizationName;
  if (row.responsibleStakeholderName) return row.responsibleStakeholderName;
  return "Unassigned";
}

function buildItems(rows: ProjectRequirementRow[], referenceDate: string | Date): BoardItem[] {
  return rows
    .map((row) => {
      const daysUntilDue = getDaysUntilDue(row.targetDate, referenceDate);
      return {
        row,
        daysUntilDue,
        priority: getPriority(row, daysUntilDue),
        statusTone: getStatusTone(row, daysUntilDue),
        statusLabel: getStatusLabel(row),
      };
    })
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.row.sortOrder !== b.row.sortOrder) return a.row.sortOrder - b.row.sortOrder;
      return a.row.name.localeCompare(b.row.name);
    });
}

function buildOwnerBuckets(items: BoardItem[], maxItems: number): OwnerBucket[] {
  const map = new Map<string, OwnerBucket>();

  for (const item of items) {
    if (item.priority <= 0) continue;
    const label = ownerLabel(item.row);
    const existing = map.get(label) ?? { label, count: 0, overdue: 0 };
    existing.count += 1;
    if (item.daysUntilDue !== null && item.daysUntilDue < 0) existing.overdue += 1;
    map.set(label, existing);
  }

  return [...map.values()]
    .sort((a, b) => b.overdue - a.overdue || b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, maxItems);
}

function StatTile({
  label,
  value,
  accent = "var(--ink)",
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div
        style={{
          padding: "14px 16px",
          backgroundColor: "color-mix(in srgb, var(--bg) 72%, var(--bg-card))",
        borderRight: "1px solid var(--border)",
        minWidth: 0,
      }}
    >
      <div style={monoLabelStyle}>{label}</div>
      <div
        title={typeof value === "string" ? value : undefined}
        style={{
          ...detailSerifTitleStyle("30px"),
          lineHeight: 1.05,
          color: accent,
          marginTop: "8px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function RequirementRowCard({ item }: { item: BoardItem }) {
  const color = toneColor(item.statusTone);
  const background = toneBackground(item.statusTone);
  const isClosed = item.statusTone === "done";

  return (
    <div
      style={{
        display: "grid",
        gap: "10px",
        padding: "16px",
        borderRadius: "14px",
        border: `1px solid ${isClosed ? "var(--border)" : color}`,
        backgroundColor: background,
        boxShadow: "0 1px 0 rgba(255,255,255,0.02)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--ink)",
              lineHeight: 1.35,
            }}
          >
            {item.row.name}
          </div>
          <div
            style={{
              ...monoLabelStyle,
              marginTop: "6px",
              color: "var(--ink-muted)",
            }}
          >
            {item.row.category} · {item.row.phaseRequired.replace(/_/g, " ")}
          </div>
        </div>

        <div
          style={{
            ...monoLabelStyle,
            color,
            backgroundColor: "color-mix(in srgb, currentColor 10%, transparent)",
            border: `1px solid ${color}`,
            borderRadius: "999px",
            padding: "6px 10px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {item.statusLabel}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
        <div>
          <div style={monoLabelStyle}>Owner</div>
          <div style={{ ...bodyTextStyle, color: "var(--ink)", marginTop: "4px" }}>{ownerLabel(item.row)}</div>
        </div>
        <div>
          <div style={monoLabelStyle}>Due</div>
          <div style={{ ...bodyTextStyle, color: "var(--ink)", marginTop: "4px" }}>
            {formatDate(item.row.targetDate)}
          </div>
        </div>
        <div>
          <div style={monoLabelStyle}>Window</div>
          <div style={{ ...bodyTextStyle, color: "var(--ink)", marginTop: "4px" }}>
            {item.daysUntilDue === null
              ? "Unscheduled"
              : item.daysUntilDue < 0
                ? `${Math.abs(item.daysUntilDue)}d overdue`
                : `${item.daysUntilDue}d left`}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {item.row.isPrimaryGate ? (
          <span
            style={{
              ...monoLabelStyle,
              color: "var(--accent)",
              backgroundColor: "var(--accent-soft)",
              borderRadius: "999px",
              padding: "5px 8px",
            }}
          >
            LOI critical
          </span>
        ) : null}
        {!item.row.isApplicable ? (
          <span
            style={{
              ...monoLabelStyle,
              color: "var(--ink-muted)",
              backgroundColor: "var(--bg)",
              borderRadius: "999px",
              padding: "5px 8px",
            }}
          >
            Not applicable
          </span>
        ) : null}
        {item.row.responsibleOrganizationName || item.row.responsibleStakeholderName ? (
          <span
            style={{
              ...monoLabelStyle,
              color: "var(--ink-muted)",
              backgroundColor: "var(--bg)",
              borderRadius: "999px",
              padding: "5px 8px",
            }}
          >
            Assigned
          </span>
        ) : (
          <span
            style={{
              ...monoLabelStyle,
              color: "var(--accent)",
              backgroundColor: "var(--accent-soft)",
              borderRadius: "999px",
              padding: "5px 8px",
            }}
          >
            Unassigned
          </span>
        )}
      </div>

      {item.row.applicabilityReason ? (
        <div style={{ ...bodyTextStyle, color: "var(--ink-muted)" }}>{item.row.applicabilityReason}</div>
      ) : null}
      {item.row.notes ? <div style={{ ...bodyTextStyle, color: "var(--ink)" }}>{item.row.notes}</div> : null}
    </div>
  );
}

export function CriticalPathBoard({
  rows,
  referenceDate,
  title = "Critical Path",
  subtitle = "A compact view of what is blocking progress, who owns it, and which items need attention first.",
  maxItems = 6,
}: CriticalPathBoardProps) {
  const items = buildItems(rows, referenceDate);
  const activeItems = items.filter((item) => item.priority > 0);
  const overdueCount = activeItems.filter((item) => item.daysUntilDue !== null && item.daysUntilDue < 0).length;
  const criticalCount = activeItems.filter((item) => item.row.isPrimaryGate).length;
  const unassignedCount = activeItems.filter(
    (item) => !item.row.responsibleOrganizationName && !item.row.responsibleStakeholderName
  ).length;
  const readyCount = rows.filter(
    (row) => row.status === "executed" || row.status === "waived" || !row.isApplicable
  ).length;
  const ownerBuckets = buildOwnerBuckets(activeItems, 5);

  const focusItems = activeItems.slice(0, maxItems);

  return (
    <section style={{ display: "grid", gap: "18px", marginBottom: "32px" }}>
      <div style={cardStyle}>
        <div
          style={{
            padding: "20px 22px 18px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={monoLabelStyle}>{title}</div>
            <div
              style={{
                ...detailSerifTitleStyle("24px"),
                marginTop: "8px",
              }}
            >
              Blockers before the next gate
            </div>
            <div style={{ ...bodyTextStyle, maxWidth: "720px", marginTop: "8px" }}>{subtitle}</div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <span
              style={{
                ...monoLabelStyle,
                color: "var(--accent)",
                backgroundColor: "var(--accent-soft)",
                borderRadius: "999px",
                padding: "7px 10px",
              }}
            >
              {criticalCount} LOI critical
            </span>
            <span
              style={{
                ...monoLabelStyle,
                color: "var(--gold)",
                backgroundColor: "var(--gold-soft)",
                borderRadius: "999px",
                padding: "7px 10px",
              }}
            >
              {overdueCount} overdue
            </span>
            <span
              style={{
                ...monoLabelStyle,
                color: "var(--teal)",
                backgroundColor: "var(--teal-soft)",
                borderRadius: "999px",
                padding: "7px 10px",
              }}
            >
              {unassignedCount} unassigned
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", borderBottom: "1px solid var(--border)" }}>
          <StatTile label="Open items" value={activeItems.length} accent="var(--ink)" />
          <StatTile label="Ready" value={readyCount} accent="var(--teal)" />
          <StatTile label="Highest risk" value={focusItems.length > 0 ? focusItems[0].row.name : "None"} accent="var(--accent)" />
          <StatTile label="Owner groups" value={ownerBuckets.length} accent="var(--gold)" />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "0",
          }}
        >
          <div style={{ padding: "18px 20px 20px", borderRight: "1px solid var(--border)" }}>
            <div style={{ ...monoLabelStyle, marginBottom: "14px" }}>Critical Path</div>
            <div style={{ display: "grid", gap: "12px" }}>
              {focusItems.length > 0 ? (
                focusItems.map((item) => <RequirementRowCard key={item.row.projectRequirementId || item.row.requirementId} item={item} />)
              ) : (
                <div
                  style={{
                    padding: "28px",
                    borderRadius: "14px",
                    border: "1px dashed var(--border)",
                    backgroundColor: "var(--bg)",
                    ...bodyTextStyle,
                  }}
                >
                  No current blockers. The board will populate when requirements move into risk.
                </div>
              )}
            </div>
          </div>

          <aside style={{ padding: "18px 18px 20px", display: "grid", gap: "14px" }}>
            <div>
              <div style={{ ...monoLabelStyle, marginBottom: "10px" }}>Ownership Pressure</div>
              <div style={{ display: "grid", gap: "8px" }}>
                {ownerBuckets.length > 0 ? (
                  ownerBuckets.map((bucket) => (
                    <div
                      key={bucket.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        padding: "12px 14px",
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--bg)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                          {bucket.label}
                        </div>
                        <div style={{ ...monoLabelStyle, marginTop: "4px" }}>
                          {bucket.count} open item{bucket.count === 1 ? "" : "s"}
                        </div>
                      </div>
                      <div
                        style={{
                          ...monoLabelStyle,
                          color: bucket.overdue > 0 ? "var(--accent)" : "var(--ink-muted)",
                          flexShrink: 0,
                          alignSelf: "center",
                        }}
                      >
                        {bucket.overdue > 0 ? `${bucket.overdue} overdue` : "On track"}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ ...bodyTextStyle, padding: "12px 14px", border: "1px dashed var(--border)", borderRadius: "12px" }}>
                    No active ownership pressure.
                  </div>
                )}
              </div>
            </div>

            <div>
              <div style={{ ...monoLabelStyle, marginBottom: "10px" }}>Quick Signals</div>
              <div style={{ display: "grid", gap: "8px" }}>
                <div style={{ ...bodyTextStyle, padding: "12px 14px", border: "1px solid var(--border)", borderRadius: "12px", backgroundColor: "var(--bg)" }}>
                  <strong style={{ color: "var(--ink)" }}>{criticalCount}</strong> items are explicitly LOI critical.
                </div>
                <div style={{ ...bodyTextStyle, padding: "12px 14px", border: "1px solid var(--border)", borderRadius: "12px", backgroundColor: "var(--bg)" }}>
                  <strong style={{ color: "var(--ink)" }}>{overdueCount}</strong> items are overdue relative to the reference date.
                </div>
                <div style={{ ...bodyTextStyle, padding: "12px 14px", border: "1px solid var(--border)", borderRadius: "12px", backgroundColor: "var(--bg)" }}>
                  <strong style={{ color: "var(--ink)" }}>{unassignedCount}</strong> active items have no named owner.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
