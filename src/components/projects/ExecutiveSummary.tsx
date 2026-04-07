import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Project } from "@/types";
import type { CategoryBreakdown } from "@/lib/db/requirements";
import type { GateReview } from "@/lib/projects/gate-review";
import type { TimelineRisk } from "@/lib/db/timeline-risks";
import type { DealMilestoneRow } from "@/lib/db/milestones";

interface ExecutiveSummaryProps {
  project: Project;
  readinessScoreBps: number;
  breakdown: CategoryBreakdown[];
  gateReview: GateReview;
  timelineRisks: TimelineRisk[];
  upcomingMilestones: DealMilestoneRow[];
}

function formatCapex(capexUsdCents: number | null): string {
  if (capexUsdCents == null) return "—";
  const usd = capexUsdCents / 100;
  if (usd >= 1_000_000_000) {
    return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  }
  if (usd >= 1_000_000) {
    return `$${(usd / 1_000_000).toFixed(0)}M`;
  }
  return `$${(usd / 1_000).toFixed(0)}K`;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(date: Date | null | undefined): number | null {
  if (!date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

const STAGE_LABELS: Record<string, string> = {
  concept: "Concept",
  pre_loi: "Pre-LOI",
  loi_submitted: "LOI Submitted",
  loi_approved: "LOI Approved",
  pre_commitment: "Pre-Commitment",
  final_commitment: "Final Commitment",
  financial_close: "Financial Close",
};

const DEAL_TYPE_LABELS: Record<string, string> = {
  exim_project_finance: "US EXIM Project Finance",
  commercial_finance: "Commercial Finance",
  development_finance: "Development Finance",
  private_equity: "Private Equity",
  other: "Undecided Path",
};

function stageBadgeStyle(stage: string): React.CSSProperties {
  if (stage === "financial_close") return { backgroundColor: "var(--teal-soft)", color: "var(--teal)", borderColor: "var(--teal)" };
  if (stage === "final_commitment" || stage === "pre_commitment") return { backgroundColor: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" };
  if (stage === "loi_approved" || stage === "loi_submitted") return { backgroundColor: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" };
  return { backgroundColor: "var(--bg)", color: "var(--ink-muted)", borderColor: "var(--border)" };
}

function gateStatusStyle(status: GateReview["status"]): React.CSSProperties {
  if (status === "ready") return { backgroundColor: "var(--teal-soft)", color: "var(--teal)", borderColor: "var(--teal)" };
  if (status === "at_risk") return { backgroundColor: "var(--gold-soft)", color: "var(--gold)", borderColor: "var(--gold)" };
  return { backgroundColor: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" };
}

function severityStyle(severity: TimelineRisk["severity"]): React.CSSProperties {
  return severity === "critical"
    ? { backgroundColor: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" }
    : { backgroundColor: "var(--gold-soft)", color: "var(--gold)", borderColor: "var(--gold)" };
}

export function ExecutiveSummary({
  project,
  readinessScoreBps,
  breakdown,
  gateReview,
  timelineRisks,
  upcomingMilestones,
}: ExecutiveSummaryProps) {
  const readinessPct = readinessScoreBps / 100;
  const stageLabel = STAGE_LABELS[project.stage] ?? project.stage.replace(/_/g, " ");
  const dealTypeLabel = DEAL_TYPE_LABELS[project.dealType] ?? project.dealType.replace(/_/g, " ");
  const isExim = project.dealType === "exim_project_finance";

  const topRisks = [...timelineRisks]
    .sort((a, b) => {
      if (a.severity === b.severity) return 0;
      return a.severity === "critical" ? -1 : 1;
    })
    .slice(0, 5);

  const loiDays = daysUntil(project.targetLoiDate);
  const closeDays = daysUntil(project.targetCloseDate);

  return (
    <div
      style={{
        display: "grid",
        gap: "18px",
        maxWidth: "900px",
      }}
    >
      {/* 1 — Deal Snapshot */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold tracking-tight">Deal Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
            <div>
              <p style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "22px", fontWeight: 400, color: "var(--ink)", margin: "0 0 4px" }}>
                {project.name}
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-mid)", margin: 0 }}>
                {dealTypeLabel} &middot; {project.countryCode} &middot; {project.sector}
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <Badge variant="outline" style={stageBadgeStyle(project.stage)}>{stageLabel}</Badge>
              {isExim && project.eximCoverType && (
                <Badge variant="outline">{project.eximCoverType.replace(/_/g, " ")}</Badge>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "14px" }}>
            {[
              { label: "CAPEX", value: formatCapex(project.capexUsdCents) },
              { label: "Target LOI", value: formatDate(project.targetLoiDate) },
              { label: "Target Close", value: formatDate(project.targetCloseDate) },
              { label: "Readiness", value: `${readinessPct.toFixed(1)}%` },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", margin: "0 0 3px" }}>
                  {label}
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 500, color: "var(--ink)", margin: 0 }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Progress value={readinessPct} className="h-2 flex-1" />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "var(--ink-mid)", flexShrink: 0 }}>
              {readinessPct.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2 — Next Gate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold tracking-tight">Next Gate</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "12px" }}>
            <div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 500, color: "var(--ink)", margin: "0 0 4px" }}>
                {gateReview.nextStageLabel ?? "Final Commitment"}
              </p>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-mid)", margin: 0 }}>
                {gateReview.summary}
              </p>
            </div>
            <Badge variant="outline" style={gateStatusStyle(gateReview.status)}>
              {gateReview.status === "ready" ? "Ready" : gateReview.status === "at_risk" ? "At Risk" : "Blocked"}
            </Badge>
          </div>

          {(loiDays !== null || closeDays !== null) && (
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              {isExim && loiDays !== null && (
                <div>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", margin: "0 0 2px" }}>
                    Days to LOI target
                  </p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 500, color: loiDays < 0 ? "var(--accent)" : "var(--ink)", margin: 0 }}>
                    {loiDays < 0 ? `${Math.abs(loiDays)}d overdue` : `${loiDays}d`}
                  </p>
                </div>
              )}
              {closeDays !== null && (
                <div>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", margin: "0 0 2px" }}>
                    Days to close target
                  </p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 500, color: closeDays < 0 ? "var(--accent)" : "var(--ink)", margin: 0 }}>
                    {closeDays < 0 ? `${Math.abs(closeDays)}d overdue` : `${closeDays}d`}
                  </p>
                </div>
              )}
            </div>
          )}

          {gateReview.openGateItems > 0 && (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-mid)", margin: "12px 0 0" }}>
              {gateReview.openGateItems} gate-band requirement{gateReview.openGateItems !== 1 ? "s" : ""} still open.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 3 — Active Blockers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold tracking-tight">Active Blockers</CardTitle>
        </CardHeader>
        <CardContent>
          {topRisks.length === 0 ? (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink-mid)", margin: 0 }}>
              No active blockers detected.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "8px" }}>
              {topRisks.map((risk, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    backgroundColor: risk.severity === "critical" ? "var(--accent-soft)" : "var(--gold-soft)",
                    border: `1px solid ${risk.severity === "critical" ? "var(--accent)" : "var(--gold)"}`,
                  }}
                >
                  <Badge variant="outline" style={{ flexShrink: 0, marginTop: "1px", ...severityStyle(risk.severity) }}>
                    {risk.severity === "critical" ? "Critical" : "Warning"}
                  </Badge>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink)", margin: 0, lineHeight: 1.5 }}>
                    {risk.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4 — Key Dates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold tracking-tight">Key Dates</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: "6px", marginBottom: upcomingMilestones.length > 0 ? "16px" : 0 }}>
            {[
              { label: isExim ? "Target LOI" : "Target milestone", value: formatDate(project.targetLoiDate), actual: project.actualLoiSubmittedDate ? `Submitted ${formatDate(project.actualLoiSubmittedDate)}` : null },
              { label: isExim ? "LOI Approved" : null, value: project.actualLoiApprovedDate ? formatDate(project.actualLoiApprovedDate) : null, actual: null },
              { label: "Target Close", value: formatDate(project.targetCloseDate), actual: project.actualCloseDate ? `Closed ${formatDate(project.actualCloseDate)}` : null },
              { label: "Final Commitment", value: project.actualCommitmentDate ? formatDate(project.actualCommitmentDate) : null, actual: null },
            ]
              .filter((row) => row.label !== null && row.value !== null && row.value !== "Not set")
              .map((row) => (
                <div key={row.label} style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", margin: 0, minWidth: "100px", flexShrink: 0 }}>
                    {row.label}
                  </p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink)", margin: 0 }}>
                    {row.value}
                    {row.actual ? (
                      <span style={{ color: "var(--ink-mid)", marginLeft: "8px" }}>({row.actual})</span>
                    ) : null}
                  </p>
                </div>
              ))}
          </div>

          {upcomingMilestones.length > 0 && (
            <>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-muted)", margin: "0 0 8px" }}>
                Upcoming milestones
              </p>
              <div style={{ display: "grid", gap: "6px" }}>
                {upcomingMilestones.map((milestone) => (
                  <div key={milestone.id} style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--ink)", margin: 0, flex: 1 }}>
                      {milestone.name}
                    </p>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "var(--ink-mid)", margin: 0, flexShrink: 0 }}>
                      {formatDate(milestone.targetDate)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 5 — Readiness by Category */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold tracking-tight">Readiness by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="ls-table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  {["Category", "Score", "Progress", "Blockers"].map((heading) => (
                    <TableHead
                      key={heading}
                      scope="col"
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "var(--ink-muted)",
                        fontWeight: 500,
                      }}
                    >
                      {heading}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((cat) => (
                  <TableRow key={cat.category}>
                    <TableCell style={{ color: "var(--ink)", whiteSpace: "nowrap", fontFamily: "'Inter', sans-serif", fontSize: "13px" }}>
                      {cat.label}
                    </TableCell>
                    <TableCell style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontFamily: "'Inter', sans-serif", fontSize: "13px" }}>
                      {cat.scorePct}%
                    </TableCell>
                    <TableCell style={{ minWidth: "120px" }}>
                      <Progress value={cat.scorePct} className="h-1.5" />
                    </TableCell>
                    <TableCell style={{ color: cat.blockingRequirements.length > 0 ? "var(--accent)" : "var(--ink-muted)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontFamily: "'Inter', sans-serif", fontSize: "13px" }}>
                      {cat.blockingRequirements.length > 0 ? cat.blockingRequirements.length : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
