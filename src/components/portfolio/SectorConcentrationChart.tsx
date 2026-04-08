import { EmptyState } from "@/components/ui/EmptyState";

type SectorEntry = { count: number; capexCents: number };

function formatCapex(cents: number): string {
  if (cents === 0) return "$0";
  const millions = cents / 100_000_000;
  if (millions >= 1) return `$${millions.toFixed(1)}M`;
  const thousands = cents / 100_000;
  if (thousands >= 1) return `$${thousands.toFixed(0)}K`;
  return `$${(cents / 100).toFixed(0)}`;
}

function formatSector(sector: string): string {
  return sector
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SectorConcentrationChart({
  breakdown,
  totalProjects,
}: {
  breakdown: Record<string, SectorEntry>;
  totalProjects: number;
}) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1].count - a[1].count);
  if (entries.length === 0) return <EmptyState headline="No sector data" body="Add CAPEX values and sectors to projects to see concentration analysis." />;

  const maxCount = entries[0][1].count;
  const concentrationSector = entries.find(
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
        Sector concentration
      </p>

      {concentrationSector && (
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            color: "var(--gold)",
            marginBottom: "12px",
          }}
        >
          Concentration risk: &gt;50% of portfolio in {formatSector(concentrationSector[0])}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {entries.map(([sector, data]) => {
          const pct = totalProjects > 0 ? Math.round((data.count / totalProjects) * 100) : 0;
          return (
            <div key={sector}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "3px",
                }}
              >
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "var(--ink)" }}>
                  {formatSector(sector)}
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--ink-muted)" }}>
                  {data.count} deal{data.count !== 1 ? "s" : ""} · {formatCapex(data.capexCents)} · {pct}%
                </span>
              </div>
              <div
                style={{
                  height: "6px",
                  borderRadius: "3px",
                  backgroundColor: "var(--border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${maxCount > 0 ? (data.count / maxCount) * 100 : 0}%`,
                    backgroundColor: "var(--teal)",
                    borderRadius: "3px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
