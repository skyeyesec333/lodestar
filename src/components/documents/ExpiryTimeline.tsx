import Link from "next/link";
import type { DocumentRow } from "@/lib/db/documents";

interface ExpiryTimelineProps {
  documents: DocumentRow[];
  projectSlug: string;
}

function formatExpiry(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max - 1) + "…";
}

type Band = "week" | "month" | "later";

function getBand(days: number): Band {
  if (days <= 7) return "week";
  if (days <= 30) return "month";
  return "later";
}

const BAND_LABELS: Record<Band, string> = {
  week: "This week",
  month: "This month",
  later: "Next 90 days",
};

const BAND_BG: Record<Band, string> = {
  week: "rgba(239, 68, 68, 0.06)",
  month: "rgba(245, 158, 11, 0.06)",
  later: "transparent",
};

const BAND_BORDER: Record<Band, string> = {
  week: "rgba(239, 68, 68, 0.25)",
  month: "rgba(245, 158, 11, 0.25)",
  later: "var(--border)",
};

export function ExpiryTimeline({ documents, projectSlug }: ExpiryTimelineProps) {
  if (documents.length === 0) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 14px",
          borderRadius: "10px",
          backgroundColor: "rgba(20, 184, 166, 0.07)",
          border: "1px solid rgba(20, 184, 166, 0.25)",
          marginTop: "16px",
        }}
      >
        <span style={{ fontSize: "13px", color: "var(--teal, #14b8a6)", fontFamily: "'Inter', sans-serif" }}>
          No expiring documents in next 90 days
        </span>
      </div>
    );
  }

  const grouped: Record<Band, DocumentRow[]> = { week: [], month: [], later: [] };
  for (const doc of documents) {
    if (!doc.expiresAt) continue;
    const days = daysUntil(doc.expiresAt);
    grouped[getBand(days)].push(doc);
  }

  const bands: Band[] = ["week", "month", "later"];
  const activeBands = bands.filter((b) => grouped[b].length > 0);

  return (
    <div style={{ marginTop: "20px" }}>
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          margin: "0 0 14px",
        }}
      >
        Expiring Documents
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {activeBands.map((band) => (
          <div key={band}>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                margin: "0 0 8px",
              }}
            >
              {BAND_LABELS[band]}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {grouped[band].map((doc) => {
                const days = doc.expiresAt ? daysUntil(doc.expiresAt) : 0;
                const expired = days < 0;
                return (
                  <div
                    key={doc.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      backgroundColor: BAND_BG[band],
                      border: `1px solid ${BAND_BORDER[band]}`,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--ink)",
                          margin: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {truncate(doc.filename, 40)}
                      </p>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "12px",
                          color: "var(--ink-muted)",
                          margin: "2px 0 0",
                        }}
                      >
                        {doc.expiresAt ? formatExpiry(doc.expiresAt) : ""}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "11px",
                          color: expired ? "var(--accent, #ef4444)" : "var(--ink-mid)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {expired
                          ? `EXPIRED ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`
                          : days === 0
                            ? "expires today"
                            : `in ${days} day${days === 1 ? "" : "s"}`}
                      </span>

                      <Link
                        href={`/projects/${projectSlug}`}
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--ink-muted)",
                          textDecoration: "none",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--card-bg, var(--bg-card))",
                          whiteSpace: "nowrap",
                        }}
                      >
                        View
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
