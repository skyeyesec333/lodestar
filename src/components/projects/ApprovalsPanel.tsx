import type { ApprovalRow } from "@/lib/db/approvals";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import type { DocumentRow } from "@/lib/db/documents";
import type { ApprovalStatus } from "@prisma/client";

interface ApprovalsPanelProps {
  approvals: ApprovalRow[];
  requirementRows: ProjectRequirementRow[];
  documents: DocumentRow[];
}

const STATUS_CONFIG: Record<
  ApprovalStatus,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  draft: {
    label: "Draft",
    color: "var(--ink-muted)",
    bg: "var(--bg)",
    border: "var(--border)",
    dot: "var(--ink-muted)",
  },
  in_review: {
    label: "In Review",
    color: "#b45309",
    bg: "color-mix(in srgb, #f59e0b 10%, var(--bg-card))",
    border: "color-mix(in srgb, #f59e0b 30%, var(--border))",
    dot: "#f59e0b",
  },
  approved: {
    label: "Approved",
    color: "#15803d",
    bg: "color-mix(in srgb, var(--teal, #22c55e) 10%, var(--bg-card))",
    border: "color-mix(in srgb, var(--teal, #22c55e) 30%, var(--border))",
    dot: "var(--teal, #22c55e)",
  },
  rejected: {
    label: "Rejected",
    color: "#b91c1c",
    bg: "color-mix(in srgb, #ef4444 10%, var(--bg-card))",
    border: "color-mix(in srgb, #ef4444 30%, var(--border))",
    dot: "#ef4444",
  },
};

const STATUS_ORDER: ApprovalStatus[] = ["in_review", "approved", "rejected", "draft"];

const SECTION_LABELS: Record<ApprovalStatus, string> = {
  in_review: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  draft: "Draft",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "2px 8px",
        borderRadius: "20px",
        border: `1px solid ${cfg.border}`,
        background: cfg.bg,
        fontSize: "11px",
        fontWeight: 500,
        color: cfg.color,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
          display: "inline-block",
        }}
        aria-hidden="true"
      />
      {cfg.label}
    </span>
  );
}

export function ApprovalsPanel({
  approvals,
  requirementRows,
  documents,
}: ApprovalsPanelProps) {
  if (approvals.length === 0) {
    return (
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        <p className="eyebrow" style={{ marginBottom: "12px" }}>Approval tracker</p>
        <p
          style={{
            fontSize: "13px",
            color: "var(--ink-muted)",
            margin: 0,
          }}
        >
          No approvals have been created yet. Request approval on a requirement or document to track sign-off status here.
        </p>
      </div>
    );
  }

  const requirementNamesById = Object.fromEntries(
    requirementRows.map((r) => [r.projectRequirementId, r.name])
  );
  const documentNamesById = Object.fromEntries(
    documents.map((d) => [d.id, d.filename])
  );

  const grouped = STATUS_ORDER.reduce<Record<ApprovalStatus, ApprovalRow[]>>(
    (acc, status) => {
      acc[status] = approvals.filter((a) => a.status === status);
      return acc;
    },
    { in_review: [], approved: [], rejected: [], draft: [] }
  );

  const nonEmptySections = STATUS_ORDER.filter(
    (status) => grouped[status].length > 0
  );

  const counts = {
    in_review: grouped.in_review.length,
    approved: grouped.approved.length,
    rejected: grouped.rejected.length,
  };

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "24px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <p className="eyebrow" style={{ marginBottom: "6px" }}>Approval tracker</p>
          <p
            style={{
              fontSize: "13px",
              color: "var(--ink-muted)",
              margin: 0,
              maxWidth: "540px",
            }}
          >
            Sign-off status for requirements and documents across this project. Use the approval badge on each item to request review or record a decision.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexShrink: 0,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {counts.in_review > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <StatusBadge status="in_review" />
              <span style={{ fontSize: "12px", color: "var(--ink-muted)", fontVariantNumeric: "tabular-nums" }}>
                {counts.in_review}
              </span>
            </div>
          )}
          {counts.approved > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <StatusBadge status="approved" />
              <span style={{ fontSize: "12px", color: "var(--ink-muted)", fontVariantNumeric: "tabular-nums" }}>
                {counts.approved}
              </span>
            </div>
          )}
          {counts.rejected > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <StatusBadge status="rejected" />
              <span style={{ fontSize: "12px", color: "var(--ink-muted)", fontVariantNumeric: "tabular-nums" }}>
                {counts.rejected}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {nonEmptySections.map((status) => (
          <div key={status}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
              }}
            >
              <StatusBadge status={status} />
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--ink-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {grouped[status].length}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {grouped[status].map((approval) => {
                const isRequirement = approval.targetType === "requirement";
                const itemLabel = isRequirement
                  ? (approval.projectRequirementId
                      ? requirementNamesById[approval.projectRequirementId] ?? "Requirement"
                      : "Requirement")
                  : (approval.documentId
                      ? documentNamesById[approval.documentId] ?? "Document"
                      : "Document");

                return (
                  <div
                    key={approval.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "16px",
                      padding: "12px 14px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "4px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 500,
                            color: "var(--ink-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {isRequirement ? "Requirement" : "Document"}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--ink)",
                          margin: "0 0 4px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={itemLabel}
                      >
                        {itemLabel}
                      </p>
                      {approval.note && (
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--ink-muted)",
                            margin: 0,
                            fontStyle: "italic",
                          }}
                        >
                          &ldquo;{approval.note}&rdquo;
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "4px",
                        flexShrink: 0,
                      }}
                    >
                      <time
                        dateTime={new Date(approval.updatedAt).toISOString()}
                        style={{
                          fontSize: "11px",
                          color: "var(--ink-muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(approval.updatedAt)}
                      </time>
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
