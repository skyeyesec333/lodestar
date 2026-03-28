"use client";

import { useState, useRef, useTransition } from "react";
import type { DocumentRow } from "@/lib/db/documents";
import type { ProjectRequirementRow } from "@/lib/db/requirements";

type Props = {
  projectId: string;
  slug: string;
  requirementId?: string;
  requirementName?: string;
  initialDocuments: DocumentRow[];
  requirementRows?: ProjectRequirementRow[];
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

  const title = requirementName ? `Documents · ${requirementName}` : "Documents";

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
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          style={{
            padding: "40px 24px",
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
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              color: "var(--ink-muted)",
              margin: "6px 0 0",
              letterSpacing: "0.06em",
            }}
          >
            PDF · DOC · XLS · PPT · images · up to 50 MB
          </p>
        </div>
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
              <div
                key={doc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 24px",
                  borderBottom:
                    i < documents.length - 1 ? "1px solid var(--border)" : undefined,
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
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
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
