"use client";

import { useState } from "react";

type DownloadButtonProps = {
  token: string;
  documentId: string;
};

export function DownloadButton({ token, documentId }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/share/${token}/documents/${documentId}`);
      if (!res.ok) return;
      const { url } = await res.json();
      window.open(url, "_blank");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      style={{
        padding: "5px 12px",
        borderRadius: "999px",
        border: "1px solid var(--border, #e5e7eb)",
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: loading ? "var(--ink-muted, #9ca3af)" : "var(--teal, #2ba37a)",
        backgroundColor: "var(--bg, #f9f8f6)",
        textAlign: "center",
        whiteSpace: "nowrap",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? "Loading..." : "Download"}
    </button>
  );
}
