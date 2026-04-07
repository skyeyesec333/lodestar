import Link from "next/link";

type StagnantDeal = {
  id: string;
  name: string;
  slug: string;
  readinessScore: number;
  daysSinceLastActivity: number;
};

type Props = { deals: StagnantDeal[] };

export function StagnantDealsTable({ deals }: Props) {
  if (deals.length === 0) return null;

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
          Stagnant Deals
        </p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            color: "var(--ink-muted)",
            margin: 0,
          }}
        >
          Projects below 50% readiness with no activity in the last 14 days.
        </p>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {["Project", "Readiness", "Last activity"].map((h) => (
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
          {deals.map((deal) => (
            <tr
              key={deal.id}
              className="ls-table-row"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <td style={{ padding: "12px 20px" }}>
                <Link
                  href={`/projects/${deal.slug}`}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--ink)",
                    textDecoration: "none",
                    transition: "color 0.15s ease",
                  }}
                >
                  {deal.name}
                </Link>
              </td>
              <td style={{ padding: "12px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      flex: 1,
                      maxWidth: "80px",
                      height: "4px",
                      backgroundColor: "var(--border)",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${deal.readinessScore}%`,
                        backgroundColor: "var(--accent)",
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "11px",
                      color: "var(--ink-muted)",
                      minWidth: "30px",
                    }}
                  >
                    {deal.readinessScore}%
                  </span>
                </div>
              </td>
              <td style={{ padding: "12px 20px" }}>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "11px",
                    color: deal.daysSinceLastActivity > 30 ? "var(--accent)" : "var(--gold)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {deal.daysSinceLastActivity}d ago
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
