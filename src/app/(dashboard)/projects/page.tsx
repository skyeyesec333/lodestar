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
    sector: SECTOR_OPTIONS.some((option) => option.value === sector) ? (sector as Required<ProjectListQuery>["sector"]) : "all",
    stage: STAGE_OPTIONS.some((option) => option.value === stage) ? (stage as Required<ProjectListQuery>["stage"]) : "all",
    readiness: READINESS_OPTIONS.some((option) => option.value === readiness)
      ? (readiness as ProjectReadinessFilter)
      : "all",
    sort: SORT_OPTIONS.some((option) => option.value === sort)
      ? (sort as ProjectListSort)
      : "created_desc",
  };
}

function getActiveFilterCount(query: Required<ProjectListQuery>): number {
  return [
    query.q.length > 0,
    query.sector !== "all",
    query.stage !== "all",
    query.readiness !== "all",
    query.sort !== "created_desc",
  ].filter(Boolean).length;
}

function getLoiCountdown(targetLoiDate: Date | null): {
  text: string;
  subtext: string;
  color: string;
} | null {
  if (!targetLoiDate) return null;

  const days = Math.ceil(
    (new Date(targetLoiDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000
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

function getReadinessColor(score: number | null): string {
  if (score == null) return "var(--ink-muted)";
  if (score >= 7500) return "var(--teal)";
  if (score >= 4000) return "var(--gold)";
  return "var(--accent)";
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
  const result = await getProjectsByUser(userId, query);

  if (!result.ok) {
    return (
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", color: "var(--accent)" }}>
        Failed to load projects: {result.error.message}
      </p>
    );
  }

  const projects = result.value;
  const activeFilterCount = getActiveFilterCount(query);
  const chatPresets = getProjectsListChatPresets();

  return (
    <div>
      <ChatWidget
        presetQuestions={chatPresets}
        title="Portfolio Assistant"
        subtitle="Ask about filters, readiness bands, and portfolio triage."
        pageContext={`Projects portfolio page. ${projects.length} projects visible. ${activeFilterCount} active filters. Sort is ${query.sort.replace(/_/g, " ")}.`}
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
            Projects
          </h1>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "start", flexWrap: "wrap" }}>
          <CreateDemoProjectButton />
          <Link
            href="/projects/new"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "#ffffff",
              backgroundColor: "var(--accent)",
              padding: "10px 20px",
              borderRadius: "3px",
              textDecoration: "none",
            }}
          >
            New Project
          </Link>
        </div>
      </div>

      <form
        method="get"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 1.4fr) repeat(4, minmax(140px, 1fr)) auto",
          gap: "12px",
          alignItems: "end",
          marginBottom: "24px",
          padding: "18px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
        }}
      >
        <label style={{ display: "block" }}>
          <span className="label-mono" style={{ display: "block", marginBottom: "6px" }}>
            Search
          </span>
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder="Project, slug, or country"
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
            Stage
          </span>
          <select name="stage" defaultValue={query.stage} style={filterInputStyle}>
            {STAGE_OPTIONS.map((option) => (
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
          {projects.length} project{projects.length === 1 ? "" : "s"}
          {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active` : ""}
        </p>
      </div>

      {projects.length === 0 ? (
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
            {activeFilterCount > 0 ? "No matching projects" : "No projects yet"}
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
              : "Create your first project to start tracking EXIM readiness."}
          </p>
          <Link
            href={activeFilterCount > 0 ? "/projects" : "/projects/new"}
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "#ffffff",
              backgroundColor: "var(--accent)",
              padding: "10px 20px",
              borderRadius: "3px",
              textDecoration: "none",
            }}
          >
            {activeFilterCount > 0 ? "Reset Filters" : "Create Project"}
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 80px 120px 120px 90px 100px",
              padding: "0 24px 10px",
              gap: "16px",
            }}
          >
            {["Project", "Country", "Sector", "Stage", "LOI", "Readiness"].map((heading) => (
              <span
                key={heading}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted)",
                }}
              >
                {heading}
              </span>
            ))}
          </div>

          {projects.map((project) => {
            const loiCountdown = getLoiCountdown(project.targetLoiDate);
            const readinessColor = getReadinessColor(project.cachedReadinessScore);

            return (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  className="project-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 80px 120px 120px 90px 100px",
                    alignItems: "center",
                    padding: "18px 24px",
                    gap: "16px",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "15px",
                        fontWeight: 500,
                        color: "var(--ink)",
                        marginBottom: "4px",
                      }}
                    >
                      {project.name}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.06em",
                        color: "var(--ink-muted)",
                      }}
                    >
                      {project.slug}
                    </span>
                  </div>

                  <span style={monoValueStyle}>{project.countryCode}</span>
                  <span style={{ ...monoValueStyle, textTransform: "capitalize" }}>{project.sector}</span>
                  <span style={{ ...monoValueStyle, textTransform: "capitalize" }}>
                    {project.stage.replace(/_/g, " ")}
                  </span>

                  {loiCountdown ? (
                    <div>
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: loiCountdown.color,
                          display: "block",
                        }}
                      >
                        {loiCountdown.text}
                      </span>
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "9px",
                          color: "var(--ink-muted)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {loiCountdown.subtext}
                      </span>
                    </div>
                  ) : (
                    <span style={monoValueStyle}>-</span>
                  )}

                  <div>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: readinessColor,
                        display: "block",
                        marginBottom: "5px",
                      }}
                    >
                      {project.cachedReadinessScore == null
                        ? "-"
                        : `${(project.cachedReadinessScore / 100).toFixed(1)}%`}
                    </span>
                    {project.cachedReadinessScore != null && (
                      <div
                        style={{
                          height: "3px",
                          width: "80px",
                          backgroundColor: "var(--border)",
                          borderRadius: "2px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${project.cachedReadinessScore / 100}%`,
                            backgroundColor: readinessColor,
                            borderRadius: "2px",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
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
  color: "#ffffff",
  backgroundColor: "var(--accent)",
  border: "none",
  borderRadius: "3px",
  padding: "11px 16px",
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
  textDecoration: "none",
};

const monoValueStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  letterSpacing: "0.08em",
  color: "var(--ink-muted)",
  textTransform: "uppercase",
};
