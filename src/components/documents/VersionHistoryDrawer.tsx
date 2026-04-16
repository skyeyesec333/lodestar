"use client";

import { useEffect, useState } from "react";
import type { DocumentRow } from "@/lib/db/documents";

type Props = {
  documentGroupId: string;
  projectId: string;
  currentVersion: number;
  filename: string;
  onClose: () => void;
  open: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function VersionHistoryDrawer({
  documentGroupId,
  projectId,
  currentVersion,
  filename,
  onClose,
  open,
}: Props) {
  const [versions, setVersions] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch(`/api/documents/${documentGroupId}/versions?projectId=${projectId}`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Failed to load versions (${res.status})`);
        }
        return res.json() as Promise<DocumentRow[]>;
      })
      .then((data) => setVersions(data))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load version history.");
      })
      .finally(() => setLoading(false));
  }, [open, documentGroupId, projectId]);

  async function handleDownloadVersion(versionId: string, versionFilename: string) {
    setDownloadingId(versionId);
    try {
      const res = await fetch(`/api/documents/${versionId}/signed-url`);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const { url } = (await res.json()) as { url: string };
      const a = document.createElement("a");
      a.href = url;
      a.download = versionFilename;
      a.target = "_blank";
      a.click();
    } catch {
      setError("Failed to download version.");
    } finally {
      setDownloadingId(null);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.35)",
          zIndex: 40,
        }}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Version history for ${filename}`}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 100vw)",
          backgroundColor: "var(--bg-card)",
          borderLeft: "1px solid var(--border)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
                margin: "0 0 4px",
              }}
            >
              Version History
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--ink)",
                margin: 0,
                wordBreak: "break-word",
              }}
            >
              {filename}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close version history"
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
              flexShrink: 0,
            }}
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: "16px 0" }}>
          {loading && (
            <div style={{ padding: "24px" }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    height: "64px",
                    backgroundColor: "var(--bg)",
                    borderRadius: "4px",
                    marginBottom: "8px",
                    opacity: 1 - i * 0.25,
                  }}
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div style={{ padding: "24px" }}>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "var(--accent)",
                  margin: 0,
                }}
              >
                {error}
              </p>
            </div>
          )}

          {!loading && !error && versions.length === 0 && (
            <div style={{ padding: "24px" }}>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  color: "var(--ink-muted)",
                  margin: 0,
                }}
              >
                No version history found.
              </p>
            </div>
          )}

          {!loading && !error && versions.length > 0 && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {versions.map((v, i) => {
                const isCurrent = v.version === currentVersion;
                return (
                  <li
                    key={v.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "14px 24px",
                      borderBottom:
                        i < versions.length - 1
                          ? "1px solid var(--border)"
                          : undefined,
                    }}
                  >
                    {/* Version badge */}
                    <div
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: isCurrent ? "var(--teal)" : "var(--ink-muted)",
                        backgroundColor: isCurrent
                          ? "var(--teal-soft)"
                          : "var(--bg)",
                        borderRadius: "3px",
                        padding: "3px 8px",
                        flexShrink: 0,
                        border: "1px solid",
                        borderColor: isCurrent ? "var(--teal)" : "var(--border)",
                      }}
                    >
                      v{v.version}
                    </div>

                    {/* Meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <p
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "var(--ink)",
                            margin: 0,
                          }}
                        >
                          {formatDate(v.createdAt)}
                        </p>
                        {isCurrent && (
                          <span
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: "9px",
                              fontWeight: 600,
                              letterSpacing: "0.10em",
                              textTransform: "uppercase",
                              color: "var(--teal)",
                              backgroundColor: "var(--teal-soft)",
                              borderRadius: "2px",
                              padding: "1px 6px",
                            }}
                          >
                            Current
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px",
                          color: "var(--ink-muted)",
                          margin: "2px 0 0",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {formatBytes(v.sizeBytes)} ·{" "}
                        {v.uploadedBy.length > 20
                          ? `${v.uploadedBy.slice(0, 8)}…${v.uploadedBy.slice(-6)}`
                          : v.uploadedBy}
                      </p>
                    </div>

                    {/* Download button */}
                    <button
                      onClick={() => void handleDownloadVersion(v.id, v.filename)}
                      disabled={downloadingId === v.id}
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
                        cursor: downloadingId === v.id ? "not-allowed" : "pointer",
                        opacity: downloadingId === v.id ? 0.5 : 1,
                        flexShrink: 0,
                      }}
                    >
                      {downloadingId === v.id ? "…" : "Download"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
