import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { getCachedProjectBySlug } from "@/lib/db/projects";
import { getProjectRequirements } from "@/lib/db/requirements";
import { getProjectConcept } from "@/lib/db/project-concepts";
import { getProjectMembers } from "@/lib/db/members";
import { computeReadiness, mapRequirementStatuses } from "@/lib/scoring/index";
import { buildGateReview } from "@/lib/projects/gate-review";
import { getStageLabel } from "@/lib/requirements/index";
import { formatDealTypeLabel, formatTargetDate } from "@/lib/projects/labels";
import { ProjectConceptPanel } from "@/components/projects/ProjectConceptPanel";
import { ConceptBeaconBrief } from "@/components/projects/ConceptBeaconBrief";
import { ConceptCoach } from "@/components/projects/ConceptCoach";

export default async function ProjectConceptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const { slug } = await params;

  const projectResult = await getCachedProjectBySlug(slug, userId);
  if (!projectResult.ok) {
    if (projectResult.error.code === "NOT_FOUND") notFound();
    throw new Error(projectResult.error.message);
  }
  const project = projectResult.value;

  const [reqResult, conceptResult, membersResult] = await Promise.all([
    getProjectRequirements(project.id, project.dealType, project.sector),
    getProjectConcept(project.id),
    getProjectMembers(project.id),
  ]);
  if (!reqResult.ok) throw new Error(reqResult.error.message);

  const rows = reqResult.value;
  const concept = conceptResult.ok ? conceptResult.value : null;
  const members = membersResult.ok ? membersResult.value : [];

  const currentMembership = members.find((m) => m.clerkUserId === userId);
  const currentProjectRole =
    project.ownerClerkId === userId
      ? "owner"
      : currentMembership?.role === "editor"
        ? "editor"
        : "viewer";
  const canEditProjectContent = currentProjectRole !== "viewer";

  const { scoreBps } = computeReadiness(mapRequirementStatuses(rows), project.dealType);
  const isExim = project.dealType === "exim_project_finance";
  const dealTypeLabel = formatDealTypeLabel(project.dealType);
  const currentStageLabel = getStageLabel(project.stage, project.dealType);
  const targetGateDate = isExim
    ? (project.targetLoiDate ?? project.targetCloseDate)
    : (project.targetCloseDate ?? project.targetLoiDate);

  const gateReview = buildGateReview({
    project,
    requirements: rows,
    scoreBps,
    concept,
  });
  const gateReviewTone =
    gateReview.status === "ready"
      ? "var(--teal)"
      : gateReview.status === "at_risk"
        ? "var(--gold)"
        : "var(--accent)";

  const conceptPrompts = [
    !concept?.thesis && !project.description ? "Add a concise deal thesis and sponsor rationale." : null,
    !concept?.targetOutcome ? "State the concrete outcome this deal is trying to achieve." : null,
    !concept?.sponsorRationale ? "Explain why the sponsor is pursuing this deal now." : null,
    !concept?.knownUnknowns ? "Capture the unknowns that could materially change the capital path." : null,
    !concept?.fatalFlaws ? "Write down the fatal flaws the team needs to disprove early." : null,
    !concept?.nextActions ? "List the next actions needed to move the concept toward the next gate." : null,
    !concept?.goNoGoRecommendation ? "Record a current go / no-go recommendation before advancing." : null,
    project.capexUsdCents == null ? "Set a working CAPEX range for the team." : null,
    !targetGateDate ? "Add a target milestone date to activate urgency tracking." : null,
    isExim && !project.eximCoverType ? "Choose an initial EXIM cover path to frame lender conversations." : null,
  ].filter(Boolean) as string[];

  return (
    <section id="section-concept" style={{ marginBottom: "40px", scrollMarginTop: "72px" }}>
      <div style={{ marginBottom: "16px" }}>
        <p className="eyebrow" style={{ marginBottom: "8px" }}>Concept workspace</p>
        <h2
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "24px",
            fontWeight: 400,
            color: "var(--ink)",
            margin: "0 0 8px",
          }}
        >
          Deal framing
        </h2>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            color: "var(--ink-mid)",
            lineHeight: 1.6,
            margin: 0,
            maxWidth: "760px",
          }}
        >
          This workspace holds the project thesis, the target structure, and the reasons the team believes this deal deserves active pursuit before Capital and Workplan deepen it.
        </p>
      </div>

      {canEditProjectContent ? (
        <div style={{ marginBottom: "18px" }}>
          <ConceptCoach project={project} concept={concept} />
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)",
          gap: "18px",
          alignItems: "start",
        }}
      >
        <ProjectConceptPanel
          projectId={project.id}
          slug={project.slug}
          initialConcept={concept}
          canEdit={canEditProjectContent}
        />

        <div style={{ display: "grid", gap: "14px" }}>
          {/* Deal snapshot */}
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "20px 22px",
            }}
          >
            <p className="eyebrow" style={{ marginBottom: "14px" }}>Deal snapshot</p>
            <div style={{ display: "grid", gap: "12px" }}>
              {[
                { label: "Capital path", value: dealTypeLabel, filled: true },
                { label: "Current stage", value: currentStageLabel, filled: true },
                {
                  label: "Target outcome",
                  value: concept?.targetOutcome ?? null,
                  filled: !!concept?.targetOutcome,
                },
                {
                  label: isExim ? "Target LOI" : "Target close",
                  value: formatTargetDate(targetGateDate),
                  filled: !!targetGateDate,
                },
                {
                  label: "Readiness",
                  value: `${Math.round(scoreBps / 100)}%`,
                  filled: scoreBps > 0,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                      paddingTop: "2px",
                      flexShrink: 0,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "13px",
                      color: item.filled ? "var(--ink)" : "var(--ink-muted)",
                      lineHeight: 1.45,
                      textAlign: "right",
                      fontStyle: item.filled ? "normal" : "italic",
                    }}
                  >
                    {item.value ?? "Not set"}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "14px",
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: "var(--bg)",
                border: `1px solid ${gateReviewTone}`,
              }}
            >
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: gateReviewTone,
                  margin: "0 0 4px",
                }}
              >
                Gate review
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "12px",
                  color: "var(--ink)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {gateReview.summary}
              </p>
            </div>
          </div>

          {/* Concept completion */}
          {(() => {
            const conceptFields = [
              { label: "Thesis", done: !!(concept?.thesis || project.description) },
              { label: "Sponsor rationale", done: !!concept?.sponsorRationale },
              { label: "Target outcome", done: !!concept?.targetOutcome },
              { label: "Known unknowns", done: !!concept?.knownUnknowns },
              { label: "Fatal flaws", done: !!concept?.fatalFlaws },
              { label: "Next actions", done: !!concept?.nextActions },
              { label: "Go / no-go rec.", done: !!concept?.goNoGoRecommendation },
            ];
            const doneCount = conceptFields.filter((f) => f.done).length;
            const totalCount = conceptFields.length;
            const pct = Math.round((doneCount / totalCount) * 100);
            return (
              <div
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "20px 22px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <p className="eyebrow" style={{ margin: 0 }}>Concept completeness</p>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "11px",
                      color: pct === 100 ? "var(--teal)" : "var(--ink-muted)",
                      fontWeight: 500,
                    }}
                  >
                    {doneCount}/{totalCount}
                  </span>
                </div>
                <div
                  style={{
                    height: "4px",
                    borderRadius: "2px",
                    backgroundColor: "var(--border)",
                    marginBottom: "14px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      borderRadius: "2px",
                      backgroundColor: pct === 100 ? "var(--teal)" : "var(--accent)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  {conceptFields.map((field) => (
                    <div key={field.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        aria-hidden="true"
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "3px",
                          border: `1.5px solid ${field.done ? "var(--teal)" : "var(--border)"}`,
                          backgroundColor: field.done ? "var(--teal)" : "transparent",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {field.done ? (
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "12px",
                          color: field.done ? "var(--ink)" : "var(--ink-muted)",
                          lineHeight: 1.4,
                        }}
                      >
                        {field.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {conceptPrompts.length > 0 ? (
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "20px 22px",
              }}
            >
              <p className="eyebrow" style={{ marginBottom: "12px" }}>Open gaps</p>
              <div style={{ display: "grid", gap: "8px" }}>
                {conceptPrompts.slice(0, 5).map((prompt) => (
                  <div key={prompt} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <span
                      aria-hidden="true"
                      style={{
                        marginTop: "6px",
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        backgroundColor: "var(--accent)",
                        flexShrink: 0,
                      }}
                    />
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "12px",
                        color: "var(--ink-mid)",
                        lineHeight: 1.55,
                        margin: 0,
                      }}
                    >
                      {prompt}
                    </p>
                  </div>
                ))}
                {conceptPrompts.length > 5 ? (
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--ink-muted)", margin: "4px 0 0", letterSpacing: "0.08em" }}>
                    +{conceptPrompts.length - 5} more
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          marginTop: "18px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "18px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, maxWidth: "760px" }}>
            <p className="eyebrow" style={{ marginBottom: "8px" }}>Gate review</p>
            <h3
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "22px",
                fontWeight: 400,
                color: gateReviewTone,
                margin: "0 0 8px",
              }}
            >
              {gateReview.nextStageLabel ? `${gateReview.nextStageLabel} review` : "Final stage"}
            </h3>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "var(--ink-mid)",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              {gateReview.focusText}
            </p>
          </div>

          <div
            style={{
              padding: "8px 10px",
              borderRadius: "999px",
              border: `1px solid ${gateReviewTone}`,
              color: gateReviewTone,
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {gateReview.summary}
          </div>
        </div>
      </div>

      <ConceptBeaconBrief
        thesis={concept?.thesis ?? null}
        knownUnknowns={concept?.knownUnknowns ?? null}
        fatalFlaws={concept?.fatalFlaws ?? null}
        nextActions={concept?.nextActions ?? null}
        goNoGoRecommendation={concept?.goNoGoRecommendation ?? null}
        gateReviewSummary={gateReview.summary}
        conceptPromptsCount={conceptPrompts.length}
        isExim={isExim}
      />
    </section>
  );
}
