import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { CSSProperties } from "react";
import type {
  ProjectListQuery,
  ProjectListSort,
  ProjectReadinessFilter,
} from "@/types";
import { getProjectsByUser } from "@/lib/db/projects";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { getProjectsListChatPresets } from "@/lib/ai/chat-presets";
import { CreateDemoProjectButton } from "@/components/projects/CreateDemoProjectButton";
import { DailyPriorityWidget } from "@/components/projects/DailyPriorityWidget";
import { ProjectsStageGridClient } from "@/components/projects/ProjectsStageGridClient";
import { ExportButton } from "@/components/projects/ExportButton";

const STAGE_OPTIONS = [
  { value: "all", label: "All stages" },
  { value: "concept", label: "Concept" },
  { value: "pre_loi", label: "Pre-LOI" },
  { value: "loi_submitted", label: "LOI Submitted" },
  { value: "loi_approved", label: "LOI Approved" },
  { value: "pre_commitment", label: "Pre-Commitment" },
  { value: "final_commitment", label: "Final Commitment" },
  { value: "financial_close", label: "Financial Close" },
] as const;

const SECTOR_OPTIONS = [
  { value: "all", label: "All sectors" },
  { value: "power", label: "Power" },
  { value: "transport", label: "Transport" },
  { value: "water", label: "Water" },
  { value: "telecom", label: "Telecom" },
  { value: "mining", label: "Mining" },
  { value: "other", label: "Other" },
] as const;

const READINESS_OPTIONS: ReadonlyArray<{
  value: ProjectReadinessFilter;
  label: string;
}> = [
  { value: "all", label: "Any readiness" },
  { value: "not_started", label: "Not started" },
  { value: "at_risk", label: "0.01% to 39.99%" },
  { value: "progressing", label: "40.00% to 74.99%" },
  { value: "ready", label: "75.00%+" },
];

const SORT_OPTIONS: ReadonlyArray<{
  value: ProjectListSort;
  label: string;
}> = [
  { value: "last_activity_desc", label: "Recently active" },
  { value: "created_desc", label: "Newest first" },
  { value: "loi_asc", label: "Nearest LOI" },
  { value: "readiness_desc", label: "Highest readiness" },
  { value: "name_asc", label: "Name A-Z" },
];

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseProjectListQuery(searchParams: SearchParams): Required<ProjectListQuery> {
  const q = getSingleParam(searchParams.q)?.trim() ?? "";
  const sector = getSingleParam(searchParams.sector);
  const stage = getSingleParam(searchParams.stage);
  const readiness = getSingleParam(searchParams.readiness);
  const sort = getSingleParam(searchParams.sort);

  return {
    q,
    sector: SECTOR_OPTIONS.some((option) => option.value === sector)
      ? (sector as Required<ProjectListQuery>["sector"])
      : "all",
    stage: STAGE_OPTIONS.some((option) => option.value === stage)
      ? (stage as Required<ProjectListQuery>["stage"])
      : "all",
    readiness: READINESS_OPTIONS.some((option) => option.value === readiness)
      ? (readiness as ProjectReadinessFilter)
      : "all",
    sort: SORT_OPTIONS.some((option) => option.value === sort)
      ? (sort as ProjectListSort)
      : "last_activity_desc",
  };
}

function getActiveFilterCount(
  query: Required<ProjectListQuery>,
  options?: { includeStage?: boolean }
): number {
  const includeStage = options?.includeStage ?? true;

  return [
    query.q.length > 0,
    query.sector !== "all",
    includeStage && query.stage !== "all",
    query.readiness !== "all",
    query.sort !== "last_activity_desc",
  ].filter(Boolean).length;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = parseProjectListQuery(resolvedSearchParams);
  const result = await getProjectsByUser(userId, { ...query, stage: "all" });

  if (!result.ok) {
    return (
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "var(--accent)" }}>
        Failed to load projects: {result.error.message}
      </p>
    );
  }

  const projects = result.value;
  const activeFilterCount = getActiveFilterCount(query);
  const activeFilterCountWithoutStage = getActiveFilterCount(query, { includeStage: false });
  const chatPresets = getProjectsListChatPresets();
  const serializedProjects = projects.map((project) => ({
    id: project.id,
    name: project.name,
    slug: project.slug,
    countryCode: project.countryCode,
    sector: project.sector,
    stage: project.stage,
    targetLoiDate: project.targetLoiDate?.toISOString() ?? null,
    cachedReadinessScore: project.cachedReadinessScore,
    capexUsdCents: project.capexUsdCents?.toString() ?? null,
    lastActivityAt: project.lastActivityAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <ChatWidget
        presetQuestions={chatPresets}
        title="Portfolio Assistant"
        subtitle="Ask about filters, readiness bands, and portfolio triage."
        pageContext={`Deals portfolio page. ${projects.length} deals loaded. ${activeFilterCount} active filters. Sort is ${query.sort.replace(/_/g, " ")}.`}
        context={{ page: "projects_list" }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "32px",
          gap: "24px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p className="eyebrow" style={{ marginBottom: "10px" }}>
            Portfolio
          </p>
          <h1
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "36px",
              fontWeight: 400,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Deals
          </h1>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <CreateDemoProjectButton />
          <ExportButton params={{ q: query.q, sector: query.sector, readiness: query.readiness, sort: query.sort }} />
          <Link
            href="/templates"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--ink)",
              backgroundColor: "transparent",
              border: "1px solid var(--border)",
              padding: "10px 18px",
              minHeight: "44px",
              display: "inline-flex",
              alignItems: "center",
              borderRadius: "3px",
              textDecoration: "none",
            }}
          >
            Templates
          </Link>
          <Link
            href="/projects/new"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--text-inverse)",
              backgroundColor: "var(--accent)",
              padding: "10px 20px",
              minHeight: "44px",
              display: "inline-flex",
              alignItems: "center",
              borderRadius: "3px",
              textDecoration: "none",
            }}
          >
            New Deal
          </Link>
        </div>
      </div>

      <DailyPriorityWidget projects={projects} />

      <form
        method="get"
        className="ls-filter-form"
      >
        <label style={{ display: "block" }}>
          <span className="label-mono" style={{ display: "block", marginBottom: "6px" }}>
            Search
          </span>
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder="Deal, slug, or country"
            style={filterInputStyle}
          />
        </label>

        <label style={{ display: "block" }}>
          <span className="label-mono" style={{ display: "block", marginBottom: "6px" }}>
            Sector
          </span>
          <select name="sector" defaultValue={query.sector} style={filterInputStyle}>
            {SECTOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block" }}>
          <span className="label-mono" style={{ display: "block", marginBottom: "6px" }}>
            Readiness
          </span>
          <select name="readiness" defaultValue={query.readiness} style={filterInputStyle}>
            {READINESS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block" }}>
          <span className="label-mono" style={{ display: "block", marginBottom: "6px" }}>
            Sort
          </span>
          <select name="sort" defaultValue={query.sort} style={filterInputStyle}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button type="submit" style={primaryButtonStyle}>
            Apply
          </button>
          <Link href="/projects" style={secondaryButtonStyle}>
            Reset
          </Link>
        </div>
      </form>

      <ProjectsStageGridClient
        projects={serializedProjects}
        initialStage={query.stage}
        activeFilterCountWithoutStage={activeFilterCountWithoutStage}
      />
    </div>
  );
}

const filterInputStyle: CSSProperties = {
  width: "100%",
  fontFamily: "'Inter', sans-serif",
  fontSize: "14px",
  color: "var(--ink)",
  backgroundColor: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "10px 12px",
  outline: "none",
};

const primaryButtonStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--text-inverse)",
  backgroundColor: "var(--accent)",
  border: "none",
  borderRadius: "3px",
  padding: "11px 16px",
  minHeight: "44px",
  textDecoration: "none",
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  backgroundColor: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "10px 16px",
  minHeight: "44px",
  textDecoration: "none",
};
