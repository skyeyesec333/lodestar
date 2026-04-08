"use client";

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 14px",
        borderRadius: "8px",
        border: "1px solid var(--border)",
        backgroundColor: "var(--bg-card)",
        color: "var(--ink)",
        fontFamily: "'Inter', sans-serif",
        fontSize: "13px",
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      Print Report
    </button>
  );
}
