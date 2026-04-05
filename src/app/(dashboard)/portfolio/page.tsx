import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortfolioStats } from "@/lib/db/portfolio";
import { getUpcomingMilestones } from "@/lib/db/milestones-upcoming";
import { PortfolioTriageBoard } from "@/components/projects/PortfolioTriageBoard";
import { UpcomingMilestonesWidget } from "@/components/projects/UpcomingMilestonesWidget";
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

  const result = await getPortfolioStats(userId);
  const milestonesResult = await getUpcomingMilestones(userId);

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

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "32px",
                color: "var(--text-primary)",
              }}
            >
              {projects.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              Total CAPEX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "32px",
                color: "var(--text-primary)",
              }}
            >
              {formatCapex(totalCapexCents > 0 ? totalCapexCents : null)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              Avg Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "32px",
                color: "var(--text-primary)",
              }}
            >
              {Math.round(avgReadiness)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              By Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {Object.entries(stageBreakdown).map(([stage, count]) => (
                <li
                  key={stage}
                  className="flex items-center justify-between"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                  }}
                >
                  <span>{formatStage(stage)}</span>
                  <span
                    style={{ color: "var(--text-primary)", fontWeight: 600 }}
                  >
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <PortfolioTriageBoard projects={projects} />

      <UpcomingMilestonesWidget
        milestones={milestonesResult.ok ? milestonesResult.value : []}
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
