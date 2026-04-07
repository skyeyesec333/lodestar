import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortfolioStats, getPortfolioVelocity } from "@/lib/db/portfolio";
import { getUpcomingMilestones } from "@/lib/db/milestones-upcoming";
import { PortfolioTriageBoard } from "@/components/projects/PortfolioTriageBoard";
import { UpcomingMilestonesWidget } from "@/components/projects/UpcomingMilestonesWidget";
import { ReadinessDistributionBar } from "@/components/portfolio/ReadinessDistributionBar";
import { StagnantDealsTable } from "@/components/portfolio/StagnantDealsTable";
import { VelocityLeaderboard } from "@/components/portfolio/VelocityLeaderboard";
import { UpcomingDeadlines } from "@/components/portfolio/UpcomingDeadlines";
import { DealComparisonTable } from "@/components/portfolio/DealComparisonTable";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCapex(cents: number | null): string {
  if (cents === null) return "—";
  const millions = cents / 100_000_000;
  return `$${millions.toFixed(1)}M`;
}

function formatStage(stage: string): string {
  return stage
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDealType(dealType: string | null): string {
  if (!dealType) return "—";
  return dealType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function stageVariant(
  stage: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (stage) {
    case "financial_close":
    case "final_commitment":
      return "default";
    case "loi_approved":
    case "pre_commitment":
      return "secondary";
    default:
      return "outline";
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

const DEAL_TYPE_LABELS: Record<string, string> = {
  exim_project_finance: "EXIM Project Finance",
  commercial_finance: "Commercial Finance",
  development_finance: "Development Finance",
  private_equity: "Private Equity",
  other: "Other",
};

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ dealType?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { dealType: dealTypeFilter } = await searchParams;

  const [result, milestonesResult, velocityResult] = await Promise.all([
    getPortfolioStats(userId),
    getUpcomingMilestones(userId),
    getPortfolioVelocity(userId),
  ]);
  const velocityMap = velocityResult.ok ? velocityResult.value : new Map<string, number>();

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <h1
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "28px",
            fontWeight: 400,
            color: "var(--text-primary)",
          }}
        >
          Portfolio Overview
        </h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Failed to load portfolio data: {result.error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allProjects = result.value;
  const projects =
    dealTypeFilter && dealTypeFilter !== "all"
      ? allProjects.filter((p) => p.dealType === dealTypeFilter)
      : allProjects;

  // Derive available deal types from actual data for filter UI
  const dealTypesInPortfolio = Array.from(new Set(allProjects.map((p) => p.dealType))).sort();

  if (allProjects.length === 0) {
    return (
      <div className="space-y-6">
        <h1
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "28px",
            fontWeight: 400,
            color: "var(--text-primary)",
          }}
        >
          Portfolio Overview
        </h1>
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "13px",
                color: "var(--text-secondary)",
              }}
            >
              No projects yet.{" "}
              <Link href="/projects/new" className="underline">
                Create your first project
              </Link>{" "}
              to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Summary stats ───────────────────────────────────────────────────────────

  const totalCapexCents = projects.reduce(
    (sum, p) => sum + (p.capexUsdCents ?? 0),
    0
  );

  // Only include projects with at least one requirement in the avg — new blank workspaces
  // start at 0% but shouldn't drag the portfolio average down artificially.
  const scoredProjects = projects.filter((p) => p.totalRequirements > 0);
  const avgReadiness =
    scoredProjects.length > 0
      ? scoredProjects.reduce((sum, p) => sum + p.readinessScore, 0) / scoredProjects.length
      : 0;

  const stageBreakdown = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.stage] = (acc[p.stage] ?? 0) + 1;
    return acc;
  }, {});

  // Readiness distribution buckets
  const distribution = { not_started: 0, at_risk: 0, progressing: 0, ready: 0 };
  for (const p of projects) {
    const bps = p.readinessBps ?? p.readinessScore * 100;
    if (bps >= 7500) distribution.ready++;
    else if (bps >= 5000) distribution.progressing++;
    else if (bps >= 2500) distribution.at_risk++;
    else distribution.not_started++;
  }

  // Stagnant deals: readiness < 50% AND last activity > 14 days ago
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000);
  const stagnantDeals = projects
    .filter((p) => {
      const bps = p.readinessBps ?? p.readinessScore * 100;
      const isLowReadiness = bps < 5000;
      const isStagnant = p.lastActivityAt == null || new Date(p.lastActivityAt) < fourteenDaysAgo;
      return isLowReadiness && isStagnant;
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      readinessScore: p.readinessScore,
      daysSinceLastActivity: p.lastActivityAt
        ? Math.floor((Date.now() - new Date(p.lastActivityAt).getTime()) / 86_400_000)
        : 999,
    }))
    .sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity)
    .slice(0, 10);

  // Velocity leaderboard: top 10 by completions in last 30 days
  const velocityLeaderboard = [...projects]
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      completionsLast30Days: velocityMap.get(p.id) ?? 0,
    }))
    .filter((p) => p.completionsLast30Days > 0)
    .sort((a, b) => b.completionsLast30Days - a.completionsLast30Days)
    .slice(0, 10);

  // Upcoming deadlines: target date within next 90 days
  const now = new Date();
  const ninetyDaysOut = new Date(now.getTime() + 90 * 86_400_000);
  const upcomingDeadlines = projects
    .flatMap((p) => {
      const dates: Array<{ date: Date; label: string }> = [];
      if (p.targetLoiDate && p.targetLoiDate > now && p.targetLoiDate <= ninetyDaysOut)
        dates.push({ date: p.targetLoiDate, label: "LOI" });
      if (p.targetCloseDate && p.targetCloseDate > now && p.targetCloseDate <= ninetyDaysOut)
        dates.push({ date: p.targetCloseDate, label: "Close" });
      return dates.map((d) => ({
        id: `${p.id}-${d.label}`,
        name: p.name,
        slug: p.slug,
        targetDate: d.date,
        daysRemaining: Math.ceil((d.date.getTime() - now.getTime()) / 86_400_000),
        label: d.label,
      }));
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <div className="space-y-8">
      {/* Title + filter */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <h1
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "28px",
            fontWeight: 400,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Portfolio Overview
        </h1>
        {dealTypesInPortfolio.length > 1 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <Link
              href="/portfolio"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "5px 10px",
                borderRadius: "999px",
                border: `1px solid ${!dealTypeFilter || dealTypeFilter === "all" ? "var(--teal)" : "var(--border)"}`,
                color: !dealTypeFilter || dealTypeFilter === "all" ? "var(--teal)" : "var(--text-secondary)",
                backgroundColor: !dealTypeFilter || dealTypeFilter === "all" ? "var(--teal-soft)" : "transparent",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              All
            </Link>
            {dealTypesInPortfolio.map((dt) => (
              <Link
                key={dt}
                href={`/portfolio?dealType=${dt}`}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "5px 10px",
                  borderRadius: "999px",
                  border: `1px solid ${dealTypeFilter === dt ? "var(--teal)" : "var(--border)"}`,
                  color: dealTypeFilter === dt ? "var(--teal)" : "var(--text-secondary)",
                  backgroundColor: dealTypeFilter === dt ? "var(--teal-soft)" : "transparent",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {DEAL_TYPE_LABELS[dt] ?? formatDealType(dt)}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* No results under active filter */}
      {projects.length === 0 && (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px", color: "var(--text-secondary)" }}>
              No {DEAL_TYPE_LABELS[dealTypeFilter ?? ""] ?? dealTypeFilter} deals in your portfolio yet.{" "}
              <Link href="/portfolio" className="underline">Clear filter</Link>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bento grid: summary stats + distribution */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: "auto auto",
          gap: "12px",
        }}
        className="ls-bento-grid"
      >
        {/* Row 1, Col 1 — Total Projects */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "20px 24px",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              fontWeight: 500,
              margin: "0 0 8px",
            }}
          >
            Total Projects
          </p>
          <p
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "32px",
              color: "var(--ink)",
              margin: 0,
            }}
          >
            {projects.length}
          </p>
        </div>

        {/* Row 1, Col 2 — Total CAPEX */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "20px 24px",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              fontWeight: 500,
              margin: "0 0 8px",
            }}
          >
            Total CAPEX
          </p>
          <p
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "32px",
              color: "var(--ink)",
              margin: 0,
            }}
          >
            {formatCapex(totalCapexCents > 0 ? totalCapexCents : null)}
          </p>
        </div>

        {/* Row 1, Col 3 — Readiness Distribution */}
        <div>
          <ReadinessDistributionBar distribution={distribution} total={projects.length} />
        </div>

        {/* Row 2, Col 1 — Avg Readiness with radial gauge */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            style={{ flexShrink: 0 }}
            aria-label={`Average readiness: ${Math.round(avgReadiness)} percent`}
            role="img"
          >
            <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle
              cx="24" cy="24" r="20"
              fill="none"
              stroke={avgReadiness >= 75 ? "var(--teal)" : avgReadiness >= 40 ? "var(--gold)" : "var(--accent)"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(avgReadiness / 100) * 125.6} 125.6`}
              transform="rotate(-90 24 24)"
            />
          </svg>
          <div>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                fontWeight: 500,
                margin: "0 0 4px",
              }}
            >
              Avg Readiness
            </p>
            <p
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "32px",
                color: "var(--ink)",
                margin: 0,
                lineHeight: 1,
              }}
            >
              {Math.round(avgReadiness)}%
            </p>
          </div>
        </div>

        {/* Row 2, Cols 2-3 — Stage Breakdown */}
        <div
          className="ls-bento-stage"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "20px 24px",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              fontWeight: 500,
              margin: "0 0 12px",
            }}
          >
            By Stage
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {Object.entries(stageBreakdown).map(([stage, count]) => (
              <div key={stage} style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "6px 12px",
                borderRadius: "100px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg)",
              }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-muted)" }}>
                  {formatStage(stage)}
                </span>
                <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "18px", color: "var(--ink)" }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StagnantDealsTable deals={stagnantDeals} />
        <VelocityLeaderboard entries={velocityLeaderboard} />
      </div>

      <UpcomingDeadlines deadlines={upcomingDeadlines} />

      <PortfolioTriageBoard projects={projects} />

      <UpcomingMilestonesWidget
        milestones={milestonesResult.ok ? milestonesResult.value : []}
      />

      <DealComparisonTable
        deals={projects.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          dealType: p.dealType,
          stage: p.stage,
          countryCode: p.countryCode,
          sector: p.sector,
          readinessScore: p.readinessScore,
          capexUsdCents: p.capexUsdCents,
          completedRequirements: p.completedRequirements,
          totalRequirements: p.totalRequirements,
          targetLoiDate: p.targetLoiDate?.toISOString() ?? null,
          targetCloseDate: p.targetCloseDate?.toISOString() ?? null,
        }))}
      />

      {/* Projects table */}
      <Card>
        <CardHeader>
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
            All Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>CAPEX</TableHead>
                <TableHead>Readiness</TableHead>
                <TableHead>Deal Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link
                      href={`/projects/${project.slug}`}
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "12px",
                        color: "var(--accent)",
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                    >
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {project.sector
                        ? project.sector.charAt(0).toUpperCase() +
                          project.sector.slice(1)
                        : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {project.countryCode ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={stageVariant(project.stage)}>
                      {formatStage(project.stage)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {formatCapex(project.capexUsdCents)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress
                        value={project.readinessScore}
                        className="h-2 flex-1"
                      />
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "11px",
                          color: "var(--text-secondary)",
                          minWidth: "32px",
                          textAlign: "right",
                        }}
                      >
                        {project.readinessScore}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {formatDealType(project.dealType)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
