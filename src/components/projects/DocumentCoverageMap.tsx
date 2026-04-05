import type { CSSProperties } from "react";
import type { DocumentRow } from "@/lib/db/documents";
import type { ExternalEvidenceRow } from "@/lib/db/external-evidence";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import { REQUIREMENT_CATEGORIES } from "@/lib/exim/requirements";
import { getCategoryLabel } from "@/lib/requirements/index";
import {
  detailMicroMonoStyle,
  detailMonoLabelStyle,
  detailMutedBodyStyle,
  detailSectionKickerStyle,
  detailSerifTitleStyle,
  detailSurfaceCardStyle,
} from "./projectDetailStyles";

export type DocumentCoverageMapProps = {
  projectName?: string;
  requirementRows: ProjectRequirementRow[];
  documents: DocumentRow[];
  externalEvidence?: ExternalEvidenceRow[];
};

type CoverageBucket = {
  category: string;
  label: string;
  requirements: ProjectRequirementRow[];
  coveredCount: number;
  applicableCount: number;
  evidenceCount: number;
};

type RequirementEvidenceItem = {
  id: string;
  label: string;
  linkedAt: Date;
  kind: "document" | "external";
};


const CATEGORY_ACCENTS: Record<string, string> = {
  contracts: "var(--accent)",
  financial: "var(--gold)",
  studies: "var(--teal)",
  permits: "var(--ink-mid)",
  corporate: "var(--accent)",
  environmental_social: "var(--teal)",
};

const CATEGORY_TINTS: Record<string, string> = {
  contracts: "color-mix(in srgb, var(--accent) 10%, var(--bg-card))",
  financial: "color-mix(in srgb, var(--gold) 10%, var(--bg-card))",
  studies: "color-mix(in srgb, var(--teal) 10%, var(--bg-card))",
  permits: "color-mix(in srgb, var(--ink-mid) 10%, var(--bg-card))",
  corporate: "color-mix(in srgb, var(--accent) 10%, var(--bg-card))",
  environmental_social: "color-mix(in srgb, var(--teal) 10%, var(--bg-card))",
};

function formatDate(value: Date | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function formatStatus(status: ProjectRequirementRow["status"]): string {
  switch (status) {
    case "not_started":
      return "Not started";
    case "in_progress":
      return "In progress";
    case "draft":
      return "Draft";
    case "substantially_final":
      return "Substantially final";
    case "executed":
      return "Executed";
    case "waived":
      return "Waived";
    case "not_applicable":
      return "Not applicable";
  }
}

function getCoverageLabel(row: ProjectRequirementRow, evidenceCount: number): string {
  if (!row.isApplicable) return "Not applicable";
  if (evidenceCount > 0) {
    return evidenceCount === 1 ? "1 linked source" : `${evidenceCount} linked sources`;
  }
  if (row.status === "executed" || row.status === "waived") return "Needs linked evidence";
  if (row.status === "substantially_final") return "Evidence still pending";
  return "No linked files";
}

function getStatusTone(row: ProjectRequirementRow, evidenceCount: number): string {
  if (!row.isApplicable) return "var(--ink-muted)";
  if (evidenceCount > 0) return "var(--teal)";
  if (row.status === "executed" || row.status === "waived") return "var(--gold)";
  return "var(--accent)";
}

export function DocumentCoverageMap({
  projectName = "This deal",
  requirementRows,
  documents,
  externalEvidence = [],
}: DocumentCoverageMapProps) {
  const evidenceByRequirementId = new Map<string, RequirementEvidenceItem[]>();
  const orphanedDocuments: DocumentRow[] = [];
  const orphanedExternalEvidence: ExternalEvidenceRow[] = [];

  for (const document of documents) {
    if (!document.projectRequirementId) {
      orphanedDocuments.push(document);
      continue;
    }

    const bucket = evidenceByRequirementId.get(document.projectRequirementId) ?? [];
    bucket.push({
      id: document.id,
      label: document.filename,
      linkedAt: document.createdAt,
      kind: "document",
    });
    evidenceByRequirementId.set(document.projectRequirementId, bucket);
  }

  for (const source of externalEvidence) {
    if (!source.projectRequirementId) {
      orphanedExternalEvidence.push(source);
      continue;
    }

    const bucket = evidenceByRequirementId.get(source.projectRequirementId) ?? [];
    bucket.push({
      id: source.id,
      label: source.title,
      linkedAt: source.linkedAt,
      kind: "external",
    });
    evidenceByRequirementId.set(source.projectRequirementId, bucket);
  }

  const buckets: CoverageBucket[] = REQUIREMENT_CATEGORIES.map((category) => {
    const requirements = requirementRows.filter((row) => row.category === category);
    const applicableCount = requirements.filter((row) => row.isApplicable).length;
    const coveredCount = requirements.filter((row) => {
      const evidenceForRequirement = evidenceByRequirementId.get(row.projectRequirementId) ?? [];
      return row.isApplicable && evidenceForRequirement.length > 0;
    }).length;
    const evidenceCount = requirements.reduce((sum, row) => {
      const evidenceForRequirement = evidenceByRequirementId.get(row.projectRequirementId) ?? [];
      return sum + evidenceForRequirement.length;
    }, 0);

    return {
      category,
      label: getCategoryLabel(category),
      requirements,
      coveredCount,
      applicableCount,
      evidenceCount,
    };
  });

  const applicableRequirements = requirementRows.filter((row) => row.isApplicable);
  const coveredRequirements = applicableRequirements.filter((row) => {
    const evidenceForRequirement = evidenceByRequirementId.get(row.projectRequirementId) ?? [];
    return evidenceForRequirement.length > 0;
  });
  const requiredWithDocs = coveredRequirements.length;
  const coveragePct =
    applicableRequirements.length > 0
      ? Math.round((requiredWithDocs / applicableRequirements.length) * 100)
      : 0;
  const loaCriticalRows = applicableRequirements.filter((row) => row.isPrimaryGate);
  const loaCriticalCovered = loaCriticalRows.filter((row) => {
    const evidenceForRequirement = evidenceByRequirementId.get(row.projectRequirementId) ?? [];
    return evidenceForRequirement.length > 0;
  }).length;
  const orphanedEvidenceCount = orphanedDocuments.length + orphanedExternalEvidence.length;

  return (
    <section
      style={{
        marginBottom: "32px",
        padding: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <div style={{ maxWidth: "720px" }}>
          <p
            style={{
              ...detailSectionKickerStyle,
              margin: "0 0 8px",
            }}
          >
            Document coverage
          </p>
          <h2
            style={{
              ...detailSerifTitleStyle("18px"),
              margin: 0,
            }}
          >
            {projectName} coverage by requirement
          </h2>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            padding: "6px 10px",
            borderRadius: "999px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg)",
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "var(--teal)",
              boxShadow: "0 0 0 3px color-mix(in srgb, var(--teal) 12%, transparent)",
            }}
          />
          <span
            style={{
              ...detailMonoLabelStyle,
              letterSpacing: "0.08em",
            }}
          >
            {coveragePct}% linked
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "10px",
          marginBottom: "18px",
        }}
      >
        {[
          { label: "Applicable requirements", value: applicableRequirements.length },
          { label: "Linked with evidence", value: requiredWithDocs },
          { label: "LOI-critical covered", value: `${loaCriticalCovered}/${loaCriticalRows.length}` },
          { label: "Orphaned evidence", value: orphanedEvidenceCount },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: "12px 14px",
              ...detailSurfaceCardStyle(),
              backgroundColor: "var(--bg)",
            }}
          >
            <p
              style={{
                ...detailMicroMonoStyle,
                letterSpacing: "0.12em",
                margin: "0 0 8px",
              }}
            >
              {item.label}
            </p>
            <p
              style={{
                ...detailSerifTitleStyle("20px"),
                margin: 0,
              }}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          height: "6px",
          borderRadius: "999px",
          overflow: "hidden",
          backgroundColor: "var(--border)",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            width: `${coveragePct}%`,
            height: "100%",
            background:
              "linear-gradient(90deg, var(--teal) 0%, color-mix(in srgb, var(--teal) 72%, var(--gold)) 100%)",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "12px",
          alignItems: "start",
        }}
      >
        {buckets.map((bucket) => {
          const ratio = bucket.applicableCount > 0 ? bucket.coveredCount / bucket.applicableCount : 0;
          const visibleRequirements = [...bucket.requirements]
            .sort((a, b) => {
              const aDocCount = (evidenceByRequirementId.get(a.projectRequirementId) ?? []).length;
              const bDocCount = (evidenceByRequirementId.get(b.projectRequirementId) ?? []).length;
              if (a.isPrimaryGate !== b.isPrimaryGate) return a.isPrimaryGate ? -1 : 1;
              if (aDocCount !== bDocCount) return aDocCount - bDocCount;
              return a.sortOrder - b.sortOrder;
            })
            .slice(0, 2);
          const hiddenCount = Math.max(0, bucket.requirements.length - visibleRequirements.length);

          return (
            <article
              key={bucket.category}
              style={{
                display: "grid",
                gap: "10px",
                padding: "12px",
                borderRadius: "14px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      ...detailMicroMonoStyle,
                      letterSpacing: "0.14em",
                      margin: "0 0 6px",
                    }}
                  >
                    {bucket.label}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--ink)",
                      margin: 0,
                    }}
                  >
                    {bucket.coveredCount}/{bucket.applicableCount} covered
                  </p>
                </div>

                <span
                  style={{
                    ...detailMicroMonoStyle,
                    letterSpacing: "0.12em",
                    color: CATEGORY_ACCENTS[bucket.category] ?? "var(--ink-muted)",
                    border: `1px solid ${CATEGORY_ACCENTS[bucket.category] ?? "var(--border)"}`,
                    backgroundColor: CATEGORY_TINTS[bucket.category] ?? "var(--bg-card)",
                    borderRadius: "999px",
                    padding: "5px 9px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {bucket.evidenceCount} sources
                </span>
              </div>

              <div
                style={{
                  height: "4px",
                  borderRadius: "999px",
                  backgroundColor: "var(--border)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.round(ratio * 100)}%`,
                    height: "100%",
                    backgroundColor: CATEGORY_ACCENTS[bucket.category] ?? "var(--teal)",
                    borderRadius: "999px",
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: "8px" }}>
                {visibleRequirements.map((row) => {
                  const evidenceForRequirement = [...(evidenceByRequirementId.get(row.projectRequirementId) ?? [])].sort(
                    (a, b) => b.linkedAt.getTime() - a.linkedAt.getTime()
                  );
                  const latestDoc = evidenceForRequirement[0] ?? null;
                  const docCount = evidenceForRequirement.length;
                  const tone = getStatusTone(row, docCount);

                  return (
                    <div
                      key={row.projectRequirementId}
                      style={{
                        display: "grid",
                        gap: "6px",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: "1px solid var(--border)",
                        backgroundColor: row.isApplicable
                          ? "var(--bg-card)"
                          : "color-mix(in srgb, var(--ink-muted) 6%, var(--bg-card))",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "var(--ink)",
                              margin: "0 0 4px",
                              lineHeight: 1.35,
                            }}
                          >
                            {row.name}
                          </p>
                          <p
                            style={{
                              ...detailMicroMonoStyle,
                              margin: 0,
                            }}
                          >
                            {formatStatus(row.status)}
                            {row.isPrimaryGate ? " · LOI-critical" : ""}
                          </p>
                        </div>

                        <span
                          style={{
                            ...detailMicroMonoStyle,
                            color: tone,
                            border: `1px solid ${tone}`,
                            borderRadius: "999px",
                            padding: "4px 8px",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getCoverageLabel(row, docCount)}
                        </span>
                      </div>

                      {row.applicabilityReason ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "11px",
                              color: "var(--ink-muted)",
                            }}
                          >
                            {row.applicabilityReason}
                          </span>
                        </div>
                      ) : null}

                      {latestDoc ? (
                        <div style={{ display: "grid", gap: "4px", paddingTop: "2px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "12px",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: "11px",
                                color: "var(--ink)",
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {latestDoc.label}
                            </span>
                            <span
                              style={{
                                ...detailMicroMonoStyle,
                                letterSpacing: "0.08em",
                                flexShrink: 0,
                              }}
                            >
                              {formatDate(latestDoc.linkedAt)}
                            </span>
                          </div>
                          {latestDoc.kind === "external" ? (
                            <span
                              style={{
                                ...detailMicroMonoStyle,
                                letterSpacing: "0.08em",
                              }}
                            >
                              External link
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {hiddenCount > 0 ? (
                  <div
                    style={{
                      ...detailMicroMonoStyle,
                      paddingTop: "2px",
                    }}
                  >
                    +{hiddenCount} more requirement{hiddenCount === 1 ? "" : "s"}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {orphanedEvidenceCount > 0 ? (
        <div
          style={{
            marginTop: "16px",
            padding: "14px 16px",
            borderRadius: "14px",
            border: "1px dashed var(--border)",
            backgroundColor: "color-mix(in srgb, var(--gold) 6%, var(--bg-card))",
          }}
        >
          <p
            style={{
              ...detailMonoLabelStyle,
              color: "var(--gold)",
              margin: "0 0 8px",
            }}
          >
            Unlinked evidence
          </p>
          <div style={{ display: "grid", gap: "6px" }}>
            {[
              ...orphanedDocuments.map((doc) => ({
                id: doc.id,
                label: doc.filename,
                linkedAt: doc.createdAt,
              })),
              ...orphanedExternalEvidence.map((source) => ({
                id: source.id,
                label: source.title,
                linkedAt: source.linkedAt,
              })),
            ]
              .sort((a, b) => b.linkedAt.getTime() - a.linkedAt.getTime())
              .slice(0, 4)
              .map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    color: "var(--ink)",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {doc.label}
                </span>
                <span
                  style={{
                    ...detailMonoLabelStyle,
                    letterSpacing: "0.08em",
                    flexShrink: 0,
                  }}
                >
                  {formatDate(doc.linkedAt)}
                </span>
              </div>
            ))}
            {orphanedEvidenceCount > 4 ? (
              <p
                style={{
                  ...detailMonoLabelStyle,
                  letterSpacing: "0.08em",
                  margin: "4px 0 0",
                }}
              >
                +{orphanedEvidenceCount - 4} more
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
