export function WorkspaceFocusStrip({
  items,
}: {
  items: Array<{ label: string; detail: string }>;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "12px",
        marginBottom: "18px",
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "14px 16px",
          }}
        >
          <p className="eyebrow" style={{ marginBottom: "8px" }}>
            {item.label}
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "var(--ink-mid)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {item.detail}
          </p>
        </div>
      ))}
    </div>
  );
}
