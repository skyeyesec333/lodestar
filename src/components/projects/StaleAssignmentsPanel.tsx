import { getStaleAssignments } from "@/lib/db/requirements";

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  draft: "Draft",
  substantially_final: "Substantially final",
};

const CATEGORY_LABELS: Record<string, string> = {
  contracts: "Contracts",
  financial: "Financial",
  studies: "Studies",
  permits: "Permits",
  corporate: "Corporate",
  environmental_social: "Env & Social",
};

interface StaleAssignmentsPanelProps {
  projectId: string;
}

export async function StaleAssignmentsPanel({ projectId }: StaleAssignmentsPanelProps) {
  const result = await getStaleAssignments(projectId, 14);

  if (!result.ok || result.value.length === 0) {
    return null;
  }

  const items = result.value;

  return (
    <div
      style={{
        backgroundColor: "var(--gold-soft)",
        border: "1px solid var(--gold)",
        borderLeft: "3px solid var(--gold)",
        borderRadius: "4px",
        padding: "20px 24px",
        marginBottom: "24px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--gold)",
            margin: 0,
          }}
        >
          Stale Assignments
        </p>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "20px",
            height: "20px",
            padding: "0 6px",
            backgroundColor: "var(--gold)",
            color: "#fff",
            borderRadius: "999px",
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {items.length}
        </span>
      </div>

      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          color: "var(--ink-muted)",
          margin: "0 0 16px",
          lineHeight: 1.6,
        }}
      >
        {items.length === 1
          ? "1 requirement has an owner but hasn't been updated in 14+ days."
          : `${items.length} requirements have owners but haven't been updated in 14+ days.`}
      </p>

      {/* Item list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map((item) => {
          const owner = item.assignedTo ?? item.responsibleParty ?? "—";
          const categoryLabel = CATEGORY_LABELS[item.category] ?? item.category;
          const statusLabel = STATUS_LABELS[item.status] ?? item.status;

          return (
            <div
              key={item.projectRequirementId}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
                padding: "10px 14px",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
              }}
            >
              {/* Left: name + owner */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--ink)",
                    margin: "0 0 3px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.name}
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "12px",
                    color: "var(--ink-muted)",
                    margin: 0,
                  }}
                >
                  {categoryLabel} · {owner}
                </p>
              </div>

              {/* Right: status + days */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    fontWeight: 500,
                    color: "var(--ink-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {statusLabel}
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--gold)",
                  }}
                >
                  {item.daysSinceUpdate}d idle
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
