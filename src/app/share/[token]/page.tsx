import { resolveShareToken } from "@/lib/db/share-links";
import { getProjectDocuments } from "@/lib/db/documents";
import { getProjectByIdPublic } from "@/lib/db/projects";
import { countryLabel } from "@/lib/projects/country-label";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared Data Room · Lodestar",
  robots: { index: false, follow: false },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCapex(cents: bigint | null): string {
  if (!cents) return "—";
  const millions = Number(cents) / 100_000_000;
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B`;
  return `$${millions.toFixed(1)}M`;
}

function formatStage(stage: string): string {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSector(sector: string): string {
  return sector.charAt(0).toUpperCase() + sector.slice(1);
}

function formatDealType(dt: string): string {
  const map: Record<string, string> = {
    exim_project_finance: "EXIM Project Finance",
    commercial_finance: "Commercial Finance",
    development_finance: "Development Finance",
    private_equity: "Private Equity",
  };
  return map[dt] ?? dt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Invalid / expired state ───────────────────────────────────────────────────

function InvalidLinkPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg, #f9f8f6)",
        fontFamily: "'Inter', sans-serif",
        padding: "40px 24px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "420px" }}>
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "#9ca3af",
            marginBottom: "16px",
          }}
        >
          Lodestar · Shared Data Room
        </p>
        <h1
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "28px",
            fontWeight: 400,
            color: "#111827",
            marginBottom: "12px",
          }}
        >
          This link is no longer valid
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#6b7280",
            lineHeight: 1.6,
            marginBottom: "32px",
          }}
        >
          The share link you followed has either expired, been revoked, or never
          existed. Please contact the project team to request a new link.
        </p>
        <div
          style={{
            display: "inline-block",
            padding: "10px 20px",
            borderRadius: "999px",
            border: "1px solid #e5e7eb",
            fontSize: "13px",
            color: "#6b7280",
          }}
        >
          Contact the project team for access
        </div>
      </div>
    </div>
  );
}

// ── KPI tile ──────────────────────────────────────────────────────────────────

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "14px 18px",
        backgroundColor: "#ffffff",
      }}
    >
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#9ca3af",
          margin: "0 0 6px",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: "18px",
          fontWeight: 400,
          color: "#111827",
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SharedDataRoomPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const tokenResult = await resolveShareToken(token);

  if (!tokenResult.ok || !tokenResult.value.isValid) {
    return <InvalidLinkPage />;
  }

  const { projectId, projectName } = tokenResult.value;

  const [documentsResult, projectResult] = await Promise.all([
    getProjectDocuments(projectId),
    getProjectByIdPublic(projectId),
  ]);

  const documents = documentsResult.ok ? documentsResult.value.items : [];
  const currentDocuments = documents.filter((d) => d.state === "current");
  const project = projectResult.ok ? projectResult.value : null;

  const readinessPct = project?.cachedReadinessScore != null
    ? `${Math.round(project.cachedReadinessScore / 100)}%`
    : "—";

  const location = project
    ? [project.subNationalLocation, countryLabel(project.countryCode)]
        .filter(Boolean)
        .join(", ")
    : "—";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f9f8f6",
        fontFamily: "'Inter', sans-serif",
        padding: "0 0 80px",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#ffffff",
          padding: "20px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "#9ca3af",
              margin: "0 0 4px",
            }}
          >
            Lodestar · Read-Only Data Room
          </p>
          <h1
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "22px",
              fontWeight: 400,
              color: "#111827",
              margin: 0,
            }}
          >
            {projectName}
          </h1>
        </div>
        <div
          style={{
            padding: "6px 14px",
            borderRadius: "999px",
            border: "1px solid #e5e7eb",
            fontSize: "12px",
            color: "#6b7280",
            backgroundColor: "#f9fafb",
            whiteSpace: "nowrap",
          }}
        >
          View-only access
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Notice banner */}
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: "10px",
            padding: "14px 18px",
            marginBottom: "32px",
            fontSize: "13px",
            color: "#92400e",
            lineHeight: 1.6,
          }}
        >
          <strong>Read-only access.</strong> You are viewing a shared data room
          for <strong>{projectName}</strong>. No login is required. To request
          document downloads or further information, contact the project team
          directly.
        </div>

        {/* Project overview */}
        {project && (
          <div style={{ marginBottom: "40px" }}>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "#9ca3af",
                margin: "0 0 14px",
              }}
            >
              Project Overview
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "10px",
                marginBottom: project.description ? "20px" : "0",
              }}
            >
              <KpiTile label="Location" value={location} />
              <KpiTile label="Sector" value={formatSector(project.sector)} />
              <KpiTile label="Deal Type" value={formatDealType(project.dealType)} />
              <KpiTile label="Stage" value={formatStage(project.stage)} />
              <KpiTile label="CAPEX" value={formatCapex(project.capexUsdCents)} />
              <KpiTile label="Readiness" value={readinessPct} />
            </div>

            {project.description && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "18px 20px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  backgroundColor: "#ffffff",
                }}
              >
                <p
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#9ca3af",
                    margin: "0 0 8px",
                  }}
                >
                  Concept
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#374151",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {project.description}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Document list */}
        <div>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "#9ca3af",
              margin: "0 0 16px",
            }}
          >
            Documents · {currentDocuments.length} file
            {currentDocuments.length !== 1 ? "s" : ""}
          </p>

          {currentDocuments.length === 0 ? (
            <div
              style={{
                padding: "40px 24px",
                textAlign: "center",
                border: "1px dashed #e5e7eb",
                borderRadius: "12px",
                color: "#9ca3af",
                fontSize: "14px",
              }}
            >
              No documents have been published to this data room yet.
            </div>
          ) : (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                overflow: "hidden",
                backgroundColor: "#ffffff",
              }}
            >
              {currentDocuments.map((doc, idx) => (
                <div
                  key={doc.id}
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    borderTop: idx === 0 ? "none" : "1px solid #f3f4f6",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#111827",
                        margin: "0 0 4px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {doc.filename}
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#9ca3af",
                        margin: 0,
                      }}
                    >
                      {doc.contentType} · {formatBytes(doc.sizeBytes)} ·
                      Uploaded {formatDate(doc.createdAt)}
                      {doc.version > 1 ? ` · v${doc.version}` : ""}
                    </p>
                  </div>
                  <div
                    style={{
                      padding: "6px 14px",
                      borderRadius: "999px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                      color: "#9ca3af",
                      backgroundColor: "#f9fafb",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Contact team for download
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <p
          style={{
            fontSize: "12px",
            color: "#d1d5db",
            textAlign: "center",
            marginTop: "48px",
          }}
        >
          Powered by Lodestar · This link may expire or be revoked at any time.
        </p>
      </div>
    </div>
  );
}
