import { getOverdueActionItems } from "@/lib/db/action-items";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  detailMonoLabelStyle,
  detailSurfaceCardStyle,
} from "./projectDetailStyles";

type Props = { projectId: string };

export async function OverdueActionItems({ projectId }: Props) {
  const result = await getOverdueActionItems(projectId);
  if (!result.ok) return null;

  const items = result.value;
  if (items.length === 0) {
    return (
      <EmptyState
        headline="No overdue items"
        body="All action items are on track — nothing past due."
      />
    );
  }

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--accent)",
        borderRadius: "10px",
        overflow: "hidden",
        marginBottom: "24px",
      }}
    >
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--accent)",
              margin: 0,
            }}
          >
            Overdue Action Items
          </p>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--accent)",
              backgroundColor: "color-mix(in srgb, var(--accent) 10%, var(--bg-card))",
              border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
              borderRadius: "999px",
              padding: "3px 7px",
            }}
          >
            {items.length}
          </span>
        </div>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            color: "var(--ink-mid)",
            margin: "4px 0 0",
          }}
        >
          Open action items past their due date.
        </p>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Action Item", "Assignee", "Overdue"].map((h) => (
              <th
                key={h}
                style={{
                  ...detailMonoLabelStyle,
                  textAlign: "left",
                  padding: "8px 18px",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="ls-table-row"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <td style={{ padding: "10px 18px" }}>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--ink)",
                    lineHeight: 1.35,
                  }}
                >
                  {item.title}
                </span>
                {item.requirementName && (
                  <span
                    style={{
                      display: "block",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.06em",
                      color: "var(--ink-muted)",
                      marginTop: "2px",
                    }}
                  >
                    {item.requirementName}
                  </span>
                )}
              </td>
              <td style={{ padding: "10px 18px" }}>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "12px",
                    color: "var(--ink-mid)",
                  }}
                >
                  {item.assigneeName ?? "Unassigned"}
                </span>
              </td>
              <td style={{ padding: "10px 18px" }}>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: item.daysOverdue > 7 ? "var(--accent)" : "var(--gold)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {item.daysOverdue}d overdue
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
