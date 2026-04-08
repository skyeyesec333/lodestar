import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

type VelocityEntry = {
  id: string;
  name: string;
  slug: string;
  completionsLast30Days: number;
};

type Props = { entries: VelocityEntry[] };

export function VelocityLeaderboard({ entries }: Props) {
  if (entries.length === 0) return <EmptyState headline="No velocity data" body="Complete requirements to see velocity rankings across your portfolio." />;

  const max = entries[0]?.completionsLast30Days ?? 1;

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "20px 24px",
      }}
    >
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          margin: "0 0 4px",
        }}
      >
        Velocity — Last 30 Days
      </p>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "12px",
          color: "var(--ink-muted)",
          margin: "0 0 16px",
        }}
      >
        Requirements completed per project.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {entries.map((entry, i) => (
          <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                color: "var(--ink-muted)",
                minWidth: "16px",
                textAlign: "right",
              }}
            >
              {i + 1}
            </span>
            <Link
              href={`/projects/${entry.slug}`}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                color: "var(--ink)",
                textDecoration: "none",
                minWidth: "160px",
                flexShrink: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                transition: "color 0.15s ease",
              }}
            >
              {entry.name}
            </Link>
            <div
              style={{
                flex: 1,
                height: "6px",
                backgroundColor: "var(--border)",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(entry.completionsLast30Days / max) * 100}%`,
                  backgroundColor: "var(--teal)",
                  borderRadius: "3px",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--ink)",
                minWidth: "24px",
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {entry.completionsLast30Days}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
