import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioProjectRow } from "@/lib/db/portfolio";
import { buildPortfolioTriageBoard } from "@/lib/projects/portfolio-triage";
import { PortfolioTriageCard } from "@/components/projects/PortfolioTriageCard";

type PortfolioTriageBoardProps = {
  projects: PortfolioProjectRow[];
};

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div
      style={{
        borderRadius: "12px",
        border: "1px solid var(--border)",
        padding: "14px 16px",
        backgroundColor: "color-mix(in srgb, var(--bg) 55%, var(--bg-card))",
      }}
    >
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          margin: "0 0 8px",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: "28px",
          color: tone,
          margin: 0,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

export function PortfolioTriageBoard({ projects }: PortfolioTriageBoardProps) {
  const board = buildPortfolioTriageBoard(projects);

  return (
    <section className="space-y-5" aria-labelledby="portfolio-triage-heading">
      <Card>
        <CardHeader>
          <CardTitle
            id="portfolio-triage-heading"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              fontWeight: 500,
            }}
          >
            Portfolio Triage Board
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <MetricTile label="Total" value={board.summary.totalProjects} tone="var(--ink)" />
            <MetricTile label="Sponsor attention" value={board.summary.needsSponsorAttention} tone="var(--accent)" />
            <MetricTile label="At risk" value={board.summary.gateAtRisk} tone="var(--gold)" />
            <MetricTile label="Ownerless" value={board.summary.ownerlessBlockers} tone="var(--accent)" />
            <MetricTile label="Stalled" value={board.summary.stalledMomentum} tone="var(--ink-muted)" />
            <MetricTile label="Healthy" value={board.summary.healthy} tone="var(--teal)" />
          </div>

          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              lineHeight: 1.6,
              color: "var(--ink-mid)",
              margin: 0,
            }}
          >
            This board surfaces the projects most likely to need intervention first. The full portfolio table remains below for reporting and scanning.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-5">
        {board.lanes
          .filter((lane) => lane.projects.length > 0)
          .map((lane) => (
            <Card key={lane.id} style={{ borderColor: lane.tone }}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "11px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      {lane.label}
                    </CardTitle>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "13px",
                        color: "var(--ink-mid)",
                        marginTop: "6px",
                      }}
                    >
                      {lane.description}
                    </p>
                  </div>
                  <Badge
                    variant={lane.badgeVariant}
                    style={{
                      borderColor: lane.tone,
                      color: lane.tone,
                      backgroundColor: "transparent",
                    }}
                  >
                    {lane.projects.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {lane.projects.map((project) => (
                  <PortfolioTriageCard key={project.id} project={project} lane={lane} />
                ))}
              </CardContent>
            </Card>
          ))}
      </div>
    </section>
  );
}
