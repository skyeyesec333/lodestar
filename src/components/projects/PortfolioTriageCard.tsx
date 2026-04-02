import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { PortfolioTriageLane, PortfolioTriageProject } from "@/lib/projects/portfolio-triage";

type PortfolioTriageCardProps = {
  project: PortfolioTriageProject;
  lane: PortfolioTriageLane;
};

function formatCapex(cents: bigint | null): string {
  if (cents == null) return "—";
  const dollars = Number(cents) / 100;
  const millions = dollars / 1_000_000;
  return `$${millions.toFixed(1)}M`;
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatGateWindow(label: string, daysToNextGate: number | null): string {
  if (daysToNextGate == null) return `${label} not set`;
  if (daysToNextGate < 0) return `${label} passed ${Math.abs(daysToNextGate)}d ago`;
  if (daysToNextGate === 0) return `${label} today`;
  return `${label} in ${daysToNextGate}d`;
}

function formatLastActivity(daysInactive: number | null): string {
  if (daysInactive == null) return "No activity logged";
  if (daysInactive === 0) return "Active today";
  return `Active ${daysInactive}d ago`;
}

function MetricPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        borderRadius: "999px",
        border: "1px solid var(--border)",
        padding: "6px 10px",
        fontFamily: "'DM Mono', monospace",
        fontSize: "10px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--ink-muted)",
        backgroundColor: "var(--bg)",
      }}
    >
      <span>{label}</span>
      <strong style={{ color: "var(--ink)" }}>{value}</strong>
    </span>
  );
}

export function PortfolioTriageCard({ project, lane }: PortfolioTriageCardProps) {
  return (
    <Card
      style={{
        borderColor: lane.tone,
        borderWidth: "1px",
        boxShadow: "none",
      }}
    >
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/projects/${project.slug}`}
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "20px",
                  color: "var(--ink)",
                  textDecoration: "none",
                }}
              >
                {project.name}
              </Link>
              <Badge
                variant={lane.badgeVariant}
                className="border-current/20"
                style={{
                  borderColor: lane.tone,
                  color: lane.tone,
                  backgroundColor: "transparent",
                }}
              >
                {lane.label}
              </Badge>
            </div>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
              }}
            >
              {formatLabel(project.sector)} · {project.countryCode} · {formatLabel(project.stage)} · {formatLabel(project.dealType)}
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                marginBottom: "4px",
              }}
            >
              Readiness
            </p>
            <p
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "28px",
                lineHeight: 1,
                color: lane.tone,
                margin: 0,
              }}
            >
              {project.readinessScore}%
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Progress value={project.readinessScore} className="h-2 flex-1" />
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                minWidth: "42px",
                textAlign: "right",
              }}
            >
              {project.readinessScore}%
            </span>
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
            {project.laneReason}
          </p>

          <div className="flex flex-wrap gap-2">
            <MetricPill label="Next gate" value={formatGateWindow(project.primaryGateLabel, project.metrics.daysToNextGate)} />
            <MetricPill label="Hard" value={String(project.metrics.hardBlockerCount)} />
            <MetricPill label="Ownerless" value={String(project.metrics.unassignedCriticalCount)} />
            <MetricPill label="Evidence" value={String(project.metrics.missingEvidenceCount)} />
            <MetricPill label="Activity" value={formatLastActivity(project.daysInactive)} />
            {project.capexUsdCents != null ? <MetricPill label="CAPEX" value={formatCapex(project.capexUsdCents)} /> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
