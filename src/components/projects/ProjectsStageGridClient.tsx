"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { ProjectPhase } from "@/types";
import { PortfolioSummaryBar } from "@/components/projects/PortfolioSummaryBar";

const STAGE_OPTIONS = [
  { value: "all", label: "All stages" },
  { value: "concept", label: "Concept" },
  { value: "pre_loi", label: "Pre-LOI" },
  { value: "loi_submitted", label: "LOI Submitted" },
  { value: "loi_approved", label: "LOI Approved" },
  { value: "pre_commitment", label: "Pre-Commitment" },
  { value: "final_commitment", label: "Final Commitment" },
  { value: "financial_close", label: "Financial Close" },
] as const satisfies ReadonlyArray<{ value: ProjectPhase | "all"; label: string }>;

const msPerDay = 86_400_000;

type ProjectsStageGridItem = {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
  sector: string;
  stage: ProjectPhase;
  targetLoiDate: string | null;
  cachedReadinessScore: number | null;
  capexUsdCents: string | null;
  lastActivityAt: string | null;
};

type ProjectsStageGridClientProps = {
  projects: ProjectsStageGridItem[];
  initialStage: ProjectPhase | "all";
  activeFilterCountWithoutStage: number;
};

function getCommittedCount(projects: readonly ProjectsStageGridItem[]): number {
  return projects.filter((project) =>
    ["loi_approved", "pre_commitment", "final_commitment", "financial_close"].includes(project.stage)
  ).length;
}

function getReadinessColor(score: number | null): string {
  if (score == null) return "var(--ink-muted)";
  if (score >= 7500) return "var(--teal)";
  if (score >= 4000) return "var(--gold)";
  return "var(--accent)";
}

type RagStatus = "on_track" | "at_risk" | "stalled" | "no_data";

type RagConfig = {
  label: string;
  color: string;
  bg: string;
  border: string;
};

const RAG_CONFIG: Record<RagStatus, RagConfig> = {
  on_track: {
    label: "On Track",
    color: "var(--teal)",
    bg: "color-mix(in srgb, var(--teal) 12%, var(--bg-card))",
    border: "var(--teal)",
  },
  at_risk: {
    label: "At Risk",
    color: "var(--gold)",
    bg: "color-mix(in srgb, var(--gold) 12%, var(--bg-card))",
    border: "var(--gold)",
  },
  stalled: {
    label: "Stalled",
    color: "var(--accent)",
    bg: "color-mix(in srgb, var(--accent) 12%, var(--bg-card))",
    border: "var(--accent)",
  },
  no_data: {
    label: "No Data",
    color: "var(--ink-muted)",
    bg: "var(--bg-card)",
    border: "var(--border)",
  },
};

function computeRagStatus(project: ProjectsStageGridItem): RagStatus {
  const score = project.cachedReadinessScore;
  const stage = project.stage;
  const now = new Date();

  // GREEN: advanced stages always on track
  if (
    stage === "loi_approved" ||
    stage === "final_commitment" ||
    stage === "financial_close"
  ) {
    return "on_track";
  }

  // GREEN: readiness >= 75%
  if (score != null && score >= 7500) {
    return "on_track";
  }

  // NO DATA: no readiness score and no LOI date
  if ((score == null || score === 0) && !project.targetLoiDate) {
    return "no_data";
  }

  const loiDate = project.targetLoiDate ? new Date(project.targetLoiDate) : null;
  const loiDaysFromNow = loiDate
    ? Math.ceil((loiDate.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) / msPerDay)
    : null;

  const lastActivity = project.lastActivityAt ? new Date(project.lastActivityAt) : null;
  const daysSinceActivity = lastActivity
    ? Math.floor((Date.now() - lastActivity.getTime()) / msPerDay)
    : null;

  // RED: LOI date is in the past and stage is still pre-LOI
  const preLoiStages: ProjectPhase[] = ["concept", "pre_loi", "loi_submitted", "pre_commitment"];
  if (loiDaysFromNow != null && loiDaysFromNow < 0 && preLoiStages.includes(stage)) {
    return "stalled";
  }

  // RED: last activity > 21 days ago and readiness < 75%
  if (daysSinceActivity != null && daysSinceActivity > 21 && (score == null || score < 7500)) {
    return "stalled";
  }

  // AMBER: readiness 30–74.99% and (LOI within 60 days OR activity > 14 days ago)
  if (score != null && score >= 3000 && score < 7500) {
    const loiSoon = loiDaysFromNow != null && loiDaysFromNow >= 0 && loiDaysFromNow <= 60;
    const recentlyQuiet = daysSinceActivity != null && daysSinceActivity > 14;
    if (loiSoon || recentlyQuiet) {
      return "at_risk";
    }
  }

  return "no_data";
}

function RagBadge({ status }: { status: RagStatus }) {
  const cfg = RAG_CONFIG[status];
  return (
    <span
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        borderRadius: "999px",
        padding: "5px 9px",
        flexShrink: 0,
        backgroundColor: cfg.bg,
      }}
    >
      {cfg.label}
    </span>
  );
}

function getLoiCountdown(targetLoiDate: string | null): {
  text: string;
  subtext: string;
  color: string;
} | null {
  if (!targetLoiDate) return null;

  const targetDate = new Date(targetLoiDate);
  const days = Math.ceil(
    (targetDate.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / msPerDay
  );

  return {
    text: days < 0 ? "passed" : days === 0 ? "today" : `${days}d`,
    subtext: new Date(targetLoiDate).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    }),
    color:
      days < 0
        ? "var(--ink-muted)"
        : days <= 30
          ? "var(--accent)"
          : days <= 90
            ? "var(--gold)"
            : "var(--teal)",
  };
}

function formatCapex(capexUsdCents: string | null): string | null {
  if (capexUsdCents == null) return null;

  const capexUsd = Number(capexUsdCents) / 100;
  if (!Number.isFinite(capexUsd)) return null;

  if (capexUsd >= 1_000_000_000) {
    return `$${(capexUsd / 1_000_000_000).toFixed(1)}B`;
  }

  if (capexUsd >= 1_000_000) {
    return `$${(capexUsd / 1_000_000).toFixed(1)}M`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(capexUsd);
}

function formatDaysSinceLastActivity(lastActivityAt: string | null): string {
  if (!lastActivityAt) return "No activity yet";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activityDay = new Date(lastActivityAt);
  activityDay.setHours(0, 0, 0, 0);

  const diffDays = Math.max(0, Math.floor((today.getTime() - activityDay.getTime()) / msPerDay));
  return diffDays === 0 ? "Active today" : `${diffDays}d since activity`;
}

function getStageLabel(stage: ProjectPhase): string {
  return STAGE_OPTIONS.find((option) => option.value === stage)?.label ?? stage.replace(/_/g, " ");
}

export function ProjectsStageGridClient({
  projects,
  initialStage,
  activeFilterCountWithoutStage,
}: ProjectsStageGridClientProps) {
  const [stageFilter, setStageFilter] = useState<ProjectPhase | "all">(initialStage);

  useEffect(() => {
    setStageFilter(initialStage);
  }, [initialStage]);

  const filteredProjects = useMemo(() => {
    if (stageFilter === "all") return projects;
    return projects.filter((project) => project.stage === stageFilter);
  }, [projects, stageFilter]);

  const summary = useMemo(() => {
    const scoredProjects = filteredProjects.filter((project) => project.cachedReadinessScore != null);
    const avgReadinessBps =
      scoredProjects.length > 0
        ? Math.round(
            scoredProjects.reduce((sum, project) => sum + (project.cachedReadinessScore ?? 0), 0) /
              scoredProjects.length
          )
        : null;

    return {
      totalDeals: filteredProjects.length,
      conceptCount: filteredProjects.filter((project) => project.stage === "concept").length,
      preLoiCount: filteredProjects.filter((project) => project.stage === "pre_loi").length,
      loiSubmittedCount: filteredProjects.filter((project) => project.stage === "loi_submitted").length,
      committedCount: getCommittedCount(filteredProjects),
      avgReadinessBps,
    };
  }, [filteredProjects]);

  const activeFilterCount =
    activeFilterCountWithoutStage + (stageFilter === "all" ? 0 : 1);

  function handleStageChange(nextStage: ProjectPhase | "all") {
    setStageFilter(nextStage);

    const params = new URLSearchParams(window.location.search);
    if (nextStage === "all") {
      params.delete("stage");
    } else {
      params.set("stage", nextStage);
    }

    const queryString = params.toString();
    const nextUrl = queryString.length > 0 ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "18px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-muted)",
            margin: 0,
          }}
        >
          {filteredProjects.length} deal{filteredProjects.length === 1 ? "" : "s"}
          {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active` : ""}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "18px",
        }}
      >
        {STAGE_OPTIONS.map((option) => {
          const isActive = stageFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleStageChange(option.value)}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: isActive ? "var(--text-inverse)" : "var(--ink-muted)",
                backgroundColor: isActive ? "var(--teal)" : "var(--bg-card)",
                border: `1px solid ${isActive ? "var(--teal)" : "var(--border)"}`,
                borderRadius: "999px",
                padding: "10px 12px",
                minHeight: "44px",
                cursor: "pointer",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {filteredProjects.length > 0 && <PortfolioSummaryBar {...summary} />}

      {filteredProjects.length === 0 ? (
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px dashed var(--border)",
            borderRadius: "4px",
            padding: "64px 32px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "20px",
              color: "var(--ink)",
              marginBottom: "8px",
            }}
          >
            {activeFilterCount > 0 ? "No matching deals" : "No deals yet"}
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "var(--ink-muted)",
              marginBottom: "24px",
            }}
          >
            {activeFilterCount > 0
              ? "Adjust the list filters or reset them to see the full portfolio."
              : "Structure your first deal to start tracking EXIM readiness."}
          </p>
          <Link
            href={activeFilterCount > 0 ? "/projects" : "/projects/new"}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--text-inverse)",
              backgroundColor: "var(--accent)",
              padding: "10px 20px",
              borderRadius: "3px",
              textDecoration: "none",
            }}
          >
            {activeFilterCount > 0 ? "Reset Filters" : "Structure a Deal"}
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "14px",
          }}
        >
          {filteredProjects.map((project) => {
            const loiCountdown = getLoiCountdown(project.targetLoiDate);
            const readinessColor = getReadinessColor(project.cachedReadinessScore);
            const stageLabel = getStageLabel(project.stage);
            const loiDays = project.targetLoiDate
              ? Math.ceil(
                  (new Date(project.targetLoiDate).setHours(0, 0, 0, 0) -
                    new Date().setHours(0, 0, 0, 0)) /
                    msPerDay
                )
              : null;

            const isAtRisk =
              (project.cachedReadinessScore == null || project.cachedReadinessScore < 4000) &&
              loiDays != null &&
              loiDays >= 0 &&
              loiDays <= 60;

            const ragStatus = computeRagStatus(project);
            const capexLabel = formatCapex(project.capexUsdCents);
            const daysSinceActivity = formatDaysSinceLastActivity(project.lastActivityAt);

            return (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    display: "grid",
                    gap: "14px",
                    minHeight: "100%",
                    padding: "18px",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "14px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "17px",
                          fontWeight: 600,
                          color: "var(--ink)",
                          lineHeight: 1.3,
                        }}
                      >
                        {project.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "9px",
                          letterSpacing: "0.10em",
                          textTransform: "uppercase",
                          color: "var(--ink-muted)",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {project.slug}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "6px",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "9px",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                          color: isAtRisk ? "var(--accent)" : "var(--ink-muted)",
                          border: `1px solid ${isAtRisk ? "var(--accent)" : "var(--border)"}`,
                          borderRadius: "999px",
                          padding: "6px 10px",
                          backgroundColor: isAtRisk
                            ? "color-mix(in srgb, var(--accent) 10%, var(--bg-card))"
                            : "color-mix(in srgb, var(--teal) 6%, var(--bg-card))",
                        }}
                      >
                        {stageLabel}
                      </span>
                      <RagBadge status={ragStatus} />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "12px",
                    }}
                  >
                    <MetricBlock label="Country" value={project.countryCode} />
                    <MetricBlock label="Sector" value={project.sector} capitalize />
                    <MetricBlock label="CAPEX" value={capexLabel ?? "—"} />
                    <MetricBlock label="Last Activity" value={daysSinceActivity} />
                  </div>

                  <div style={{ display: "grid", gap: "8px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <span style={sectionLabelStyle}>Readiness</span>
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "11px",
                          letterSpacing: "0.08em",
                          color: readinessColor,
                        }}
                      >
                        {project.cachedReadinessScore == null
                          ? "—"
                          : `${(project.cachedReadinessScore / 100).toFixed(1)}%`}
                      </span>
                    </div>
                    <div
                      style={{
                        height: "4px",
                        width: "100%",
                        backgroundColor: "var(--border)",
                        borderRadius: "999px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, Math.max(0, (project.cachedReadinessScore ?? 0) / 100))}%`,
                          backgroundColor: "var(--teal)",
                          borderRadius: "999px",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={sectionLabelStyle}>
                      {loiCountdown
                        ? `LOI ${loiCountdown.text} · ${loiCountdown.subtext}`
                        : "No LOI target"}
                    </span>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        color: loiCountdown?.color ?? "var(--ink-muted)",
                      }}
                    >
                      {isAtRisk ? "Needs attention" : "Open deal"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

const sectionLabelStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "9px",
  letterSpacing: "0.12em",
  color: "var(--ink-muted)",
  textTransform: "uppercase",
};

function MetricBlock({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: "4px" }}>
      <span style={sectionLabelStyle}>{label}</span>
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "13px",
          lineHeight: 1.5,
          color: "var(--ink)",
          textTransform: capitalize ? "capitalize" : "none",
        }}
      >
        {value}
      </span>
    </div>
  );
}
