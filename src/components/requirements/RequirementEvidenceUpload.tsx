"use client";

import { useEffect, useRef, useState } from "react";
import type { DocumentRow } from "@/lib/db/documents";

export type { DocumentRow as UploadedDoc };

type Props = {
  projectId: string;
  requirementId: string; // requirement definition ID (used by the upload route)
  projectRequirementId: string; // ProjectRequirement row ID (used for display keying)
  slug: string;
  requirementName: string;
  existingDocCount: number;
  canEdit: boolean;
  onUploaded?: (doc: DocumentRow) => void;
};

export function RequirementEvidenceUpload({
  projectId,
  requirementId,
  projectRequirementId,
  slug,
  requirementName,
  existingDocCount,
  canEdit,
  onUploaded,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCount, setLocalCount] = useState(existingDocCount);

  useEffect(() => {
    setLocalCount(existingDocCount);
  }, [existingDocCount]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploaded(false);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("projectId", projectId);
    fd.append("slug", slug);
    fd.append("requirementId", requirementId);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload failed (${res.status})`);
      }

      const json = (await res.json()) as { ok: boolean; document: DocumentRow };
      setLocalCount((c) => c + 1);
      setUploaded(true);
      onUploaded?.(json.document);

      // Clear the "Uploaded" confirmation after 2 s
      setTimeout(() => setUploaded(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleClick() {
    if (!canEdit || uploading) return;
    fileInputRef.current?.click();
  }

  const hasDoc = localCount > 0;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={!canEdit || uploading}
        title={
          !canEdit
            ? "You don't have permission to attach documents"
            : uploading
              ? "Uploading…"
              : hasDoc
                ? `${localCount} document${localCount !== 1 ? "s" : ""} — click to attach another`
                : `Attach a document to ${requirementName}`
        }
        aria-label={
          uploading
            ? "Uploading…"
            : hasDoc
              ? `${localCount} document${localCount !== 1 ? "s" : ""} attached`
              : "Attach document"
        }
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.08em",
          color: uploaded
            ? "var(--teal)"
            : hasDoc
              ? "var(--teal)"
              : "var(--ink-muted)",
          background: "none",
          border: "none",
          padding: "2px 4px",
          cursor: canEdit && !uploading ? "pointer" : "not-allowed",
          opacity: uploading ? 0.5 : canEdit ? 1 : 0.4,
          transition: "opacity 0.15s, color 0.15s",
        }}
      >
        {uploading ? (
          /* Spinner */
          <svg
            width="11"
            height="11"
            viewBox="0 0 12 12"
            fill="none"
            style={{ animation: "ls-spin 0.8s linear infinite" }}
          >
            <circle
              cx="6"
              cy="6"
              r="4.5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="14 8"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          /* Paperclip icon */
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path
              d="M10 5.5L5.5 10a3 3 0 01-4.243-4.243l5-5a2 2 0 012.829 2.829L4.586 8.086A1 1 0 013.172 6.672L7.5 2.343"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {uploaded && (
          <span style={{ textTransform: "uppercase", color: "var(--teal)" }}>
            Uploaded
          </span>
        )}
        {!uploaded && localCount > 0 && !uploading && (
          <span style={{ textTransform: "uppercase" }}>{localCount}</span>
        )}
      </button>

      {/* Inline error */}
      {error && (
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "10px",
            color: "var(--accent)",
            maxWidth: "180px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={error}
        >
          {error}
        </span>
      )}


      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp"
        style={{ display: "none" }}
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFileChange}
      />
    </span>
  );
}
