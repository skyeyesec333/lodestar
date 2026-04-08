import { resolveShareToken } from "@/lib/db/share-links";
import { getProjectDocuments } from "@/lib/db/documents";
import { getProjectByIdPublic } from "@/lib/db/projects";
import { getProjectDocumentRequests } from "@/lib/db/document-requests";
import { countryLabel } from "@/lib/projects/country-label";
import { DownloadButton } from "@/components/share/DownloadButton";
import { FeedbackForm } from "@/components/share/FeedbackForm";
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

function formatCapex(cents: number | null): string {
  if (!cents) return "—";
  const millions = cents / 100_000_000;
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
    blended_finance: "Blended Finance",
  };
  return map[dt] ?? dt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function docTypeIcon(contentType: string): string {
  if (contentType.includes("pdf")) return "PDF";
  if (contentType.includes("spreadsheet") || contentType.includes("excel")) return "XLS";
  if (contentType.includes("word") || contentType.includes("document")) return "DOC";
  if (contentType.includes("presentation") || contentType.includes("powerpoint")) return "PPT";
  if (contentType.includes("image")) return "IMG";
  return "FILE";
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
            color: "var(--ink-muted, #9ca3af)",
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
            color: "var(--ink, #111827)",
            marginBottom: "12px",
          }}
        >
          This link is no longer valid
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--ink-mid, #6b7280)",
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
            border: "1px solid var(--border, #e5e7eb)",
            fontSize: "13px",
            color: "var(--ink-mid, #6b7280)",
          }}
        >
          Contact the project team for access
        </div>
      </div>
    </div>
  );
}

// ── Radial readiness gauge (SVG) ─────────────────────────────────────────────

function ReadinessRing({ pct }: { pct: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  const color = pct >= 80 ? "var(--teal, #2ba37a)" : pct >= 50 ? "var(--gold, #d4a843)" : "var(--accent, #e05252)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="140" height="140" viewBox="0 0 120 120" aria-label={`Readiness: ${pct}%`}>
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke="var(--border, #e5e7eb)"
          strokeWidth="8"
        />
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
        <text
          x="60" y="55"
          textAnchor="middle"
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "28px",
            fill: "var(--ink, #111827)",
          }}
        >
          {pct}%
        </text>
        <text
          x="60" y="72"
          textAnchor="middle"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "8px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fill: "var(--ink-muted, #9ca3af)",
          }}
        >
          Readiness
        </text>
      </svg>
    </div>
  );
}

// ── KPI tile ──────────────────────────────────────────────────────────────────

function KpiTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "12px",
        padding: "18px 20px",
        backgroundColor: "var(--bg-card, #ffffff)",
      }}
    >
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-muted, #9ca3af)",
          margin: "0 0 8px",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: "20px",
          fontWeight: 400,
          color: accent ? "var(--teal, #2ba37a)" : "var(--ink, #111827)",
          margin: 0,
          lineHeight: 1.2,
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

  const [documentsResult, projectResult, docRequestsResult] = await Promise.all([
    getProjectDocuments(projectId),
    getProjectByIdPublic(projectId),
    getProjectDocumentRequests(projectId),
  ]);

  const documents = documentsResult.ok ? documentsResult.value.items : [];
  const currentDocuments = documents.filter((d) => d.state === "current");
  const project = projectResult.ok ? projectResult.value : null;
  const openRequests = docRequestsResult.ok
    ? docRequestsResult.value.filter((r) => r.status === "requested")
    : [];

  const readinessPctNum = project?.cachedReadinessScore != null
    ? Math.round(project.cachedReadinessScore / 100)
    : null;

  const location = project
    ? [project.subNationalLocation, countryLabel(project.countryCode)]
        .filter(Boolean)
        .join(", ")
    : "—";

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg, #f9f8f6)",
        fontFamily: "'Inter', sans-serif",
        padding: "0 0 80px",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border, #e5e7eb)",
          backgroundColor: "var(--bg-card, #ffffff)",
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
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
                color: "var(--ink-muted, #9ca3af)",
                margin: "0 0 4px",
              }}
            >
              Lodestar · Investor Data Room
            </p>
            <h1
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "24px",
                fontWeight: 400,
                color: "var(--ink, #111827)",
                margin: 0,
              }}
            >
              {projectName}
            </h1>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span
              style={{
                padding: "5px 12px",
                borderRadius: "999px",
                backgroundColor: "color-mix(in srgb, var(--teal, #2ba37a) 10%, var(--bg-card, #ffffff))",
                border: "1px solid color-mix(in srgb, var(--teal, #2ba37a) 25%, var(--border, #e5e7eb))",
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--teal, #2ba37a)",
              }}
            >
              Read-only
            </span>
            {project && (
              <span
                style={{
                  padding: "5px 12px",
                  borderRadius: "999px",
                  border: "1px solid var(--border, #e5e7eb)",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted, #9ca3af)",
                }}
              >
                {formatDealType(project.dealType)}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Hero: Readiness + Key metrics bento */}
        {project && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "28px",
              alignItems: "start",
              marginBottom: "40px",
              padding: "28px 32px",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: "16px",
              backgroundColor: "var(--bg-card, #ffffff)",
            }}
            className="grid grid-cols-1 sm:grid-cols-[auto_1fr]"
          >
            {readinessPctNum !== null && (
              <ReadinessRing pct={readinessPctNum} />
            )}
            <div style={{ display: "grid", gap: "14px" }}>
              <div>
                <h2
                  style={{
                    fontFamily: "'DM Serif Display', Georgia, serif",
                    fontSize: "22px",
                    fontWeight: 400,
                    color: "var(--ink, #111827)",
                    margin: "0 0 6px",
                  }}
                >
                  Deal Overview
                </h2>
                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--ink-mid, #6b7280)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {project.description || `${projectName} — ${formatDealType(project.dealType)} opportunity in ${location}.`}
                </p>
              </div>
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
              >
                <KpiTile label="Location" value={location} />
                <KpiTile label="Sector" value={formatSector(project.sector)} />
                <KpiTile label="Stage" value={formatStage(project.stage)} />
                <KpiTile label="CAPEX" value={formatCapex(project.capexUsdCents)} accent={!!project.capexUsdCents} />
              </div>
            </div>
          </div>
        )}

        {/* Document table */}
        <div style={{ marginBottom: "40px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--ink-muted, #9ca3af)",
                  margin: "0 0 6px",
                }}
              >
                Data Room
              </p>
              <h2
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "22px",
                  fontWeight: 400,
                  color: "var(--ink, #111827)",
                  margin: 0,
                }}
              >
                Published Documents
              </h2>
            </div>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-muted, #9ca3af)",
                padding: "5px 12px",
                borderRadius: "999px",
                border: "1px solid var(--border, #e5e7eb)",
              }}
            >
              {currentDocuments.length} file{currentDocuments.length !== 1 ? "s" : ""}
            </span>
          </div>

          {currentDocuments.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                border: "1px dashed var(--border, #e5e7eb)",
                borderRadius: "12px",
                color: "var(--ink-muted, #9ca3af)",
                fontSize: "14px",
                backgroundColor: "var(--bg-card, #ffffff)",
              }}
            >
              No documents have been published to this data room yet.
            </div>
          ) : (
            <div
              style={{
                border: "1px solid var(--border, #e5e7eb)",
                borderRadius: "12px",
                overflow: "hidden",
                backgroundColor: "var(--bg-card, #ffffff)",
              }}
            >
              {/* Table header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 60px 80px 100px 140px",
                  gap: "8px",
                  padding: "10px 20px",
                  borderBottom: "1px solid var(--border, #e5e7eb)",
                  backgroundColor: "var(--bg, #f9f8f6)",
                }}
                className="hidden sm:grid"
              >
                {["Document", "Type", "Size", "Uploaded", ""].map((col) => (
                  <p
                    key={col || "action"}
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted, #9ca3af)",
                      margin: 0,
                    }}
                  >
                    {col}
                  </p>
                ))}
              </div>

              {currentDocuments.map((doc, idx) => (
                <div
                  key={doc.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 60px 80px 100px 140px",
                    gap: "8px",
                    padding: "14px 20px",
                    alignItems: "center",
                    borderTop: idx === 0 ? "none" : "1px solid color-mix(in srgb, var(--border, #e5e7eb) 50%, transparent)",
                    transition: "background-color 0.12s ease",
                  }}
                  className="grid-cols-1 sm:grid-cols-[1fr_60px_80px_100px_140px]"
                >
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "var(--ink, #111827)",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {doc.filename}
                    </p>
                    {doc.version > 1 && (
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "9px",
                          color: "var(--ink-muted, #9ca3af)",
                        }}
                      >
                        v{doc.version}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted, #9ca3af)",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      border: "1px solid var(--border, #e5e7eb)",
                      textAlign: "center",
                      width: "fit-content",
                    }}
                  >
                    {docTypeIcon(doc.contentType)}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--ink-mid, #6b7280)",
                    }}
                  >
                    {formatBytes(doc.sizeBytes)}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--ink-mid, #6b7280)",
                    }}
                  >
                    {formatDate(doc.createdAt)}
                  </span>
                  <DownloadButton token={token} documentId={doc.id} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Document requests */}
        {openRequests.length > 0 && (
          <div style={{ marginBottom: "40px" }}>
            <div style={{ marginBottom: "16px" }}>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--accent, #e05252)",
                  margin: "0 0 6px",
                }}
              >
                Requested from you
              </p>
              <h2
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: "22px",
                  fontWeight: 400,
                  color: "var(--ink, #111827)",
                  margin: 0,
                }}
              >
                Outstanding Document Requests
              </h2>
            </div>

            <div
              style={{
                border: "1px solid var(--border, #e5e7eb)",
                borderLeft: "3px solid var(--accent, #e05252)",
                borderRadius: "12px",
                overflow: "hidden",
                backgroundColor: "var(--bg-card, #ffffff)",
              }}
            >
              {openRequests.map((req, idx) => (
                <div
                  key={req.id}
                  style={{
                    padding: "14px 20px",
                    borderTop: idx === 0 ? "none" : "1px solid var(--border, #e5e7eb)",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "var(--ink, #111827)",
                        margin: "0 0 4px",
                      }}
                    >
                      {req.title}
                    </p>
                    {req.description && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--ink-mid, #6b7280)",
                          margin: "0 0 4px",
                          lineHeight: 1.5,
                        }}
                      >
                        {req.description}
                      </p>
                    )}
                    {req.requirementName && (
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "9px",
                          letterSpacing: "0.08em",
                          color: "var(--ink-muted, #9ca3af)",
                        }}
                      >
                        Linked to: {req.requirementName}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        padding: "4px 10px",
                        borderRadius: "999px",
                        border: "1px solid var(--gold, #d4a843)",
                        color: "var(--gold, #d4a843)",
                      }}
                    >
                      Requested
                    </span>
                    {req.dueDate && (
                      <p
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          color: "var(--ink-muted, #9ca3af)",
                          margin: "6px 0 0",
                        }}
                      >
                        Due {formatDate(req.dueDate)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback form */}
        <div style={{ marginBottom: "40px" }}>
          <FeedbackForm token={token} />
        </div>

        {/* Confidentiality notice */}
        <div
          style={{
            padding: "18px 22px",
            border: "1px solid color-mix(in srgb, var(--gold, #d4a843) 30%, var(--border, #e5e7eb))",
            borderRadius: "12px",
            backgroundColor: "color-mix(in srgb, var(--gold, #d4a843) 5%, var(--bg-card, #ffffff))",
            marginBottom: "40px",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--gold, #d4a843)",
              margin: "0 0 8px",
            }}
          >
            Confidentiality Notice
          </p>
          <p
            style={{
              fontSize: "13px",
              color: "var(--ink-mid, #6b7280)",
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            This data room and its contents are shared on a confidential basis. The information
            contained herein is intended solely for the use of the authorized recipient. Any
            redistribution, copying, or disclosure of this information without prior written
            consent of the project sponsor is strictly prohibited.
          </p>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.08em",
              color: "var(--ink-muted, #9ca3af)",
              margin: "0 0 6px",
            }}
          >
            Powered by Lodestar
          </p>
          <p
            style={{
              fontSize: "11px",
              color: "color-mix(in srgb, var(--ink-muted, #9ca3af) 60%, transparent)",
              margin: 0,
            }}
          >
            This link may expire or be revoked at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
