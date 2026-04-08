export function SectionSkeleton() {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div
          className="ls-skeleton-pulse"
          style={{
            width: "120px",
            height: "10px",
            borderRadius: "4px",
            backgroundColor: "var(--border)",
          }}
        />
        <div
          className="ls-skeleton-pulse"
          style={{
            width: "260px",
            height: "18px",
            borderRadius: "4px",
            backgroundColor: "var(--border)",
          }}
        />
        <div
          className="ls-skeleton-pulse"
          style={{
            width: "100%",
            maxWidth: "480px",
            height: "12px",
            borderRadius: "4px",
            backgroundColor: "var(--border)",
          }}
        />
        <div
          className="ls-skeleton-pulse"
          style={{
            width: "75%",
            maxWidth: "360px",
            height: "12px",
            borderRadius: "4px",
            backgroundColor: "var(--border)",
          }}
        />
      </div>
    </div>
  );
}
