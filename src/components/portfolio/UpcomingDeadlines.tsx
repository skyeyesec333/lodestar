import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

type Deadline = {
  id: string;
  name: string;
  slug: string;
  targetDate: Date;
  daysRemaining: number;
  label: string;
};

type Props = { deadlines: Deadline[] };

export function UpcomingDeadlines({ deadlines }: Props) {
  if (deadlines.length === 0) return <EmptyState headline="No upcoming deadlines" body="Set LOI or close target dates on projects to see upcoming deadlines." />;

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--border)" }}>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            margin: "0 0 2px",
          }}
        >
          Upcoming Deadlines
        </p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            color: "var(--ink-muted)",
            margin: 0,
          }}
        >
          Gate dates within the next 90 days.
        </p>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Project", "Milestone", "Target date", "Days remaining"].map((h) => (
              <th
                key={h}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                  textAlign: "left",
                  padding: "8px 20px",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deadlines.map((d) => {
            const urgent = d.daysRemaining <= 14;
            const warning = d.daysRemaining <= 30;
            const urgencyColor = urgent ? "var(--accent)" : warning ? "var(--gold)" : "var(--ink-muted)";

            return (
              <tr key={d.id} className="ls-table-row" style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 20px" }}>
                  <Link
                    href={`/projects/${d.slug}`}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--ink)",
                      textDecoration: "none",
                      transition: "color 0.15s ease",
                    }}
                  >
                    {d.name}
                  </Link>
                </td>
                <td style={{ padding: "12px 20px" }}>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                    }}
                  >
                    {d.label}
                  </span>
                </td>
                <td style={{ padding: "12px 20px" }}>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "11px",
                      color: "var(--ink)",
                    }}
                  >
                    {new Date(d.targetDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </td>
                <td style={{ padding: "12px 20px" }}>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "11px",
                      fontWeight: urgent || warning ? 600 : 400,
                      color: urgencyColor,
                    }}
                  >
                    {d.daysRemaining}d
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
