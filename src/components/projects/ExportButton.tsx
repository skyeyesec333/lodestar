"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import type { CSSProperties } from "react";

interface ExportButtonProps {
  params: {
    q?: string;
    sector?: string;
    readiness?: string;
    sort?: string;
  };
}

export function ExportButton({ params }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (loading) return;

    const searchParams = new URLSearchParams();

    if (params.q) searchParams.set("q", params.q);
    if (params.sector) searchParams.set("sector", params.sector);
    if (params.readiness) searchParams.set("readiness", params.readiness);
    if (params.sort) searchParams.set("sort", params.sort);

    const url = `/api/projects/export?${searchParams.toString()}`;

    setLoading(true);
    const link = document.createElement("a");
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      style={{ ...buttonStyle, opacity: loading ? 0.6 : 1, cursor: loading ? "default" : "pointer" }}
      title="Export current list as CSV"
    >
      <Download size={16} style={{ marginRight: "6px" }} />
      {loading ? "Exporting…" : "Export CSV"}
    </button>
  );
}

const buttonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "var(--ink)",
  backgroundColor: "transparent",
  border: "1px solid var(--border)",
  borderRadius: "3px",
  padding: "10px 16px",
  cursor: "pointer",
  textDecoration: "none",
};
