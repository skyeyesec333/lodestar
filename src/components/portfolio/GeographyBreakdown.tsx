import { countryLabel } from "@/lib/projects/country-label";
import { EmptyState } from "@/components/ui/EmptyState";

type GeoEntry = { count: number; capexCents: number };

function formatCapex(cents: number): string {
  if (cents === 0) return "$0";
  const millions = cents / 100_000_000;
  if (millions >= 1) return `$${millions.toFixed(1)}M`;
  const thousands = cents / 100_000;
  if (thousands >= 1) return `$${thousands.toFixed(0)}K`;
  return `$${(cents / 100).toFixed(0)}`;
}

export function GeographyBreakdown({
  breakdown,
  totalProjects,
}: {
  breakdown: Record<string, GeoEntry>;
  totalProjects: number;
}) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1].count - a[1].count);
  if (entries.length === 0) return <EmptyState headline="No geography data" body="Add country codes to projects to see geographic concentration." />;

  const concentrationCountry = entries.find(
    ([, v]) => totalProjects > 1 && v.count / totalProjects > 0.5
  );

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "20px 22px",
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
          marginBottom: "14px",
        }}
      >
        Geography concentration
      </p>

      {concentrationCountry && (
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            color: "var(--gold)",
            marginBottom: "12px",
          }}
        >
          Concentration risk: &gt;50% of portfolio in {countryLabel(concentrationCountry[0])}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {entries.map(([code, data]) => {
          const pct = totalProjects > 0 ? Math.round((data.count / totalProjects) * 100) : 0;
          return (
            <div
              key={code}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink)" }}>
                {countryLabel(code)}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--ink-muted)" }}>
                  {data.count} deal{data.count !== 1 ? "s" : ""}
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--ink-muted)" }}>
                  {formatCapex(data.capexCents)}
                </span>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    color: pct > 50 ? "var(--gold)" : "var(--ink-muted)",
                    backgroundColor: pct > 50 ? "var(--gold-soft)" : "var(--bg)",
                    border: `1px solid ${pct > 50 ? "var(--gold)" : "var(--border)"}`,
                    borderRadius: "3px",
                    padding: "1px 6px",
                    minWidth: "36px",
                    textAlign: "center",
                  }}
                >
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
