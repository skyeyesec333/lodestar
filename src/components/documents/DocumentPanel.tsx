"use client";

import { useState, useRef, useTransition } from "react";
import type { DocumentRow } from "@/lib/db/documents";
import type { ProjectRequirementRow } from "@/lib/db/requirements";
import type { DocumentReviewResult } from "@/lib/ai/document-review";
import type { CommentRow } from "@/lib/db/comments";
import type { ApprovalRow } from "@/lib/db/approvals";
import type { TeamMember } from "@/types/collaboration";
import { CommentThread } from "@/components/collaboration/CommentThread";
import { ApprovalBadge } from "@/components/collaboration/ApprovalBadge";
import { WatchButton } from "@/components/collaboration/WatchButton";

type Props = {
  projectId: string;
  slug: string;
  requirementId?: string;
  requirementName?: string;
  initialDocuments: DocumentRow[];
  requirementRows?: ProjectRequirementRow[];
  // Collaboration
  teamMembers?: TeamMember[];
  currentUserId?: string;
  actorName?: string;
  commentsByDocumentId?: Record<string, CommentRow[]>;
  approvalsByDocumentId?: Record<string, ApprovalRow>;
  watchedDocumentIds?: Set<string>;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(contentType: string): string {
  if (contentType === "application/pdf") return "PDF";
  if (contentType.includes("word")) return "DOC";
  if (contentType.includes("sheet") || contentType.includes("excel")) return "XLS";
  if (contentType.includes("presentation") || contentType.includes("powerpoint")) return "PPT";
  if (contentType.startsWith("image/")) return "IMG";
  return "FILE";
}

export function DocumentPanel({
  projectId,
  slug,
  requirementId,
  requirementName,
  initialDocuments,
  requirementRows,
  teamMembers = [],
  currentUserId,
  actorName,
  commentsByDocumentId = {},
  approvalsByDocumentId = {},
  watchedDocumentIds = new Set(),
}: Props) {
  // Build a lookup: projectRequirementId (UUID) → requirement name
  const reqNameById = requirementRows
    ? new Map(requirementRows.map((r) => [r.projectRequirementId, r.name]))
    : new Map<string, string>();
  const [documents, setDocuments] = useState<DocumentRow[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // AI Review state
  const [reviewOpenId, setReviewOpenId] = useState<string | null>(null);
  const [reviewContexts, setReviewContexts] = useState<Record<string, string>>({});
  const [reviewResults, setReviewResults] = useState<Record<string, DocumentReviewResult>>({});
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    setUploadError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("projectId", projectId);
    fd.append("slug", slug);
    if (requirementId) fd.append("requirementId", requirementId);

    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload failed (${res.status})`);
      }
      const json = await res.json();
      startTransition(() => {
        setDocuments((prev) => [json.document as DocumentRow, ...prev]);
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(docId: string) {
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    if (res.ok) {
      startTransition(() => {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      });
    }
  }

  async function handleDownload(docId: string, filename: string) {
    const res = await fetch(`/api/documents/${docId}/signed-url`);
    if (!res.ok) return;
    const { url } = await res.json();
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.click();
  }

  async function handleRunReview(docId: string) {
    setReviewLoading(docId);
    try {
      const res = await fetch("/api/documents/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: docId,
          projectId,
          additionalContext: reviewContexts[docId] ?? "",
        }),
      });
      if (res.ok) {
        const result = await res.json() as DocumentReviewResult;
        setReviewResults((prev) => ({ ...prev, [docId]: result }));
      }
    } finally {
      setReviewLoading(null);
    }
  }

  const title = requirementName ? `Data Room · ${requirementName}` : "Data Room";

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        marginBottom: "24px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: "0 0 2px",
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "12px",
              color: "var(--ink-muted)",
              margin: 0,
            }}
          >
            {documents.length} file{documents.length !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--accent)",
            backgroundColor: "transparent",
            border: "1px solid var(--accent)",
            borderRadius: "3px",
            padding: "6px 14px",
            cursor: uploading ? "not-allowed" : "pointer",
            opacity: uploading ? 0.5 : 1,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {uploading ? "Uploading…" : "+ Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          style={{ display: "none" }}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Drop zone — shown when empty */}
      {documents.length === 0 && (
        <>
          <div
            style={{
              backgroundColor: "var(--gold-soft)",
              borderBottom: "1px solid var(--gold)",
              padding: "18px 24px",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--gold)",
                margin: "0 0 7px",
              }}
            >
              EXIM Data Room Files
            </p>
            <p
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "17px",
                fontWeight: 400,
                color: "var(--ink)",
                margin: "0 0 8px",
              }}
            >
              Link every data room file to its workplan item
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                color: "var(--ink-mid)",
                margin: "0 0 8px",
                lineHeight: 1.6,
                maxWidth: "520px",
              }}
            >
              EXIM data room files include executed contracts, feasibility studies,
              environmental impact assessments, and financial models. Upload each file and
              link it to the corresponding workplan item so reviewers can trace every
              data room file directly to its EXIM requirement.
            </p>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                color: "var(--ink-mid)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Accepted: PDF · DOC · XLS · PPT · images · up to 50 MB
            </p>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            style={{
              padding: "32px 24px",
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: dragOver ? "var(--accent-soft)" : "transparent",
              border: dragOver ? "1px dashed var(--accent)" : "none",
              transition: "background-color 0.15s",
            }}
          >
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                color: "var(--ink-muted)",
                margin: 0,
              }}
            >
              Drag & drop a file here, or click to browse
            </p>
          </div>
        </>
      )}

      {/* File list */}
      {documents.length > 0 && (
        <div>
          {/* Drop overlay on existing list */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          >
            {documents.map((doc, i) => (
              <div key={doc.id}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 24px",
                  borderBottom:
                    i < documents.length - 1 && reviewOpenId !== doc.id ? "1px solid var(--border)" : undefined,
                }}
              >
                {/* Icon badge */}
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    color: "var(--accent)",
                    backgroundColor: "var(--accent-soft)",
                    borderRadius: "3px",
                    padding: "3px 6px",
                    flexShrink: 0,
                  }}
                >
                  {fileIcon(doc.contentType)}
                </div>

                {/* Filename + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--ink)",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {doc.filename}
                  </p>
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      color: "var(--ink-muted)",
                      margin: "2px 0 0",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {formatBytes(doc.sizeBytes)} ·{" "}
                    {new Date(doc.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  {doc.projectRequirementId && reqNameById.has(doc.projectRequirementId) && (
                    <p
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        color: "var(--teal)",
                        backgroundColor: "var(--teal-soft)",
                        display: "inline-block",
                        padding: "1px 6px",
                        borderRadius: "2px",
                        margin: "4px 0 0",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {reqNameById.get(doc.projectRequirementId)}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px", flexShrink: 0, alignItems: "center", flexWrap: "wrap" }}>
                  {/* Collaboration: approval + watch */}
                  {currentUserId && (
                    <>
                      <ApprovalBadge
                        projectId={projectId}
                        slug={slug}
                        targetType="document"
                        targetId={doc.id}
                        approval={approvalsByDocumentId[doc.id] ?? null}
                        currentUserId={currentUserId}
                        actorName={actorName}
                        canAct
                      />
                      <WatchButton
                        projectId={projectId}
                        targetType="document"
                        targetId={doc.id}
                        initialWatching={watchedDocumentIds.has(doc.id)}
                        actorName={actorName}
                        variant="icon"
                      />
                    </>
                  )}
                  <button
                    onClick={() => handleDownload(doc.id, doc.filename)}
                    title="Download"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.06em",
                      color: "var(--ink-muted)",
                      backgroundColor: "transparent",
                      border: "1px solid var(--border)",
                      borderRadius: "3px",
                      padding: "4px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Download
                  </button>
                  <button
                    onClick={() =>
                      setReviewOpenId((prev) => (prev === doc.id ? null : doc.id))
                    }
                    title="AI Review"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                      backgroundColor: "transparent",
                      border: "1px solid var(--border)",
                      borderRadius: "3px",
                      padding: "4px 10px",
                      cursor: "pointer",
                    }}
                  >
                    AI Review
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    title="Delete"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.06em",
                      color: "var(--accent)",
                      backgroundColor: "transparent",
                      border: "1px solid var(--accent)",
                      borderRadius: "3px",
                      padding: "4px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Inline AI Review panel */}
              {reviewOpenId === doc.id && (

                <div
                  style={{
                    padding: "16px 24px",
                    borderTop: "1px solid var(--border)",
                    backgroundColor: "var(--bg-card)",
                  }}
                >
                  <textarea
                    placeholder="Additional context (optional)"
                    value={reviewContexts[doc.id] ?? ""}
                    onChange={(e) =>
                      setReviewContexts((prev) => ({
                        ...prev,
                        [doc.id]: e.target.value,
                      }))
                    }
                    rows={2}
                    style={{
                      width: "100%",
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "13px",
                      color: "var(--ink)",
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "3px",
                      padding: "8px 10px",
                      resize: "vertical",
                      boxSizing: "border-box",
                      marginBottom: "10px",
                    }}
                  />
                  <button
                    onClick={() => handleRunReview(doc.id)}
                    disabled={reviewLoading === doc.id}
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#fff",
                      backgroundColor:
                        reviewLoading === doc.id ? "var(--teal-soft)" : "var(--teal)",
                      border: "none",
                      borderRadius: "3px",
                      padding: "6px 14px",
                      cursor: reviewLoading === doc.id ? "not-allowed" : "pointer",
                      opacity: reviewLoading === doc.id ? 0.7 : 1,
                    }}
                  >
                    {reviewLoading === doc.id ? "Reviewing..." : "Run AI Review"}
                  </button>

                  {/* Review results */}
                  {reviewResults[doc.id] && (
                    <ReviewResultDisplay result={reviewResults[doc.id]} />
                  )}
                </div>
              )}

              {/* Collaboration comment thread */}
              {currentUserId && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "12px 24px", background: "var(--bg)" }}>
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      fontWeight: 500,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                      margin: "0 0 10px",
                    }}
                  >
                    Team Comments
                  </p>
                  <CommentThread
                    projectId={projectId}
                    slug={slug}
                    targetType="document"
                    targetId={doc.id}
                    initialComments={commentsByDocumentId[doc.id] ?? []}
                    currentUserId={currentUserId}
                    teamMembers={teamMembers}
                    actorName={actorName}
                    compact
                  />
                </div>
              )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "12px",
              color: "var(--accent)",
              margin: 0,
            }}
          >
            {uploadError}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReviewResultDisplay — shown inline below the AI Review run button
// ---------------------------------------------------------------------------

type AssessmentMeta = {
  label: string;
  color: string;
  bg: string;
};

function assessmentMeta(
  value: DocumentReviewResult["overallAssessment"]
): AssessmentMeta {
  switch (value) {
    case "substantially_final":
      return { label: "Substantially Final", color: "var(--teal)", bg: "var(--teal-soft)" };
    case "needs_work":
      return { label: "Needs Work", color: "var(--gold)", bg: "var(--gold-soft)" };
    case "early_draft":
      return { label: "Early Draft", color: "var(--accent)", bg: "var(--accent-soft)" };
    case "cannot_assess":
      return { label: "Cannot Assess", color: "var(--ink-muted)", bg: "var(--bg-card)" };
  }
}

function severityColor(severity: "blocking" | "major" | "minor"): string {
  switch (severity) {
    case "blocking":
      return "var(--accent)";
    case "major":
      return "var(--gold)";
    case "minor":
      return "var(--ink-muted)";
  }
}

function ReviewResultDisplay({ result }: { result: DocumentReviewResult }) {
  const meta = assessmentMeta(result.overallAssessment);

  return (
    <div style={{ marginTop: "16px" }}>
      {/* Assessment badge */}
      <div style={{ marginBottom: "10px" }}>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: meta.color,
            backgroundColor: meta.bg,
            border: `1px solid ${meta.color}`,
            borderRadius: "3px",
            padding: "3px 10px",
          }}
        >
          {meta.label}
        </span>
      </div>

      {/* Summary */}
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "14px",
          color: "var(--ink-mid)",
          margin: "0 0 14px",
          lineHeight: 1.6,
        }}
      >
        {result.summary}
      </p>

      {/* Gaps */}
      {result.gaps.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: "0 0 8px",
            }}
          >
            GAPS IDENTIFIED
          </p>
          {result.gaps.map((gap, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: "10px",
                paddingLeft: "10px",
                borderLeft: `2px solid ${severityColor(gap.severity)}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: severityColor(gap.severity),
                  }}
                >
                  {gap.severity}
                </span>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  {gap.issue}
                </span>
              </div>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "12px",
                  color: "var(--ink-mid)",
                  margin: "0 0 2px",
                  lineHeight: 1.5,
                }}
              >
                {gap.recommendation}
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "11px",
                  color: "var(--ink-muted)",
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                {gap.eximStandard}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Strengths */}
      {result.strengths.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: "0 0 8px",
            }}
          >
            STRENGTHS
          </p>
          {result.strengths.map((strength, idx) => (
            <div key={idx} style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "12px",
                  color: "var(--teal)",
                  flexShrink: 0,
                }}
              >
                ✓
              </span>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "var(--ink-mid)",
                }}
              >
                {strength}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Next steps */}
      {result.nextSteps.length > 0 && (
        <div>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: "0 0 8px",
            }}
          >
            NEXT STEPS
          </p>
          <ol style={{ margin: 0, paddingLeft: "18px" }}>
            {result.nextSteps.map((step, idx) => (
              <li
                key={idx}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "var(--ink-mid)",
                  marginBottom: "4px",
                  lineHeight: 1.5,
                }}
              >
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
