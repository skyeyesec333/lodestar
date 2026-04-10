type CovenantHealth = {
  total: number;
  active: number;
  breached: number;
  atRisk: number;
  waived: number;
  satisfied: number;
};

export function CovenantHealthSummary({ health }: { health: CovenantHealth }) {
  if (health.total === 0) return null;

  const metrics = [
    { label: "Active",    value: health.active,    color: "var(--ink)",       bg: "var(--bg)" },
    { label: "Breached",  value: health.breached,  color: "var(--accent)",    bg: "var(--accent-soft)" },
    { label: "At risk",   value: health.atRisk,    color: "var(--gold)",      bg: "var(--gold-soft)" },
    { label: "Waived",    value: health.waived,     color: "var(--ink-muted)", bg: "var(--bg)" },
    { label: "Satisfied", value: health.satisfied,  color: "var(--teal)",      bg: "var(--teal-soft)" },
  ];

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "20px 22px",
        backgroundColor: "var(--bg-card)",
      }}
    >
      {health.breached > 0 && (
        <div
          style={{
            backgroundColor: "var(--accent-soft)",
            border: "1px solid var(--accent)",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "var(--accent)", fontWeight: 600 }}>
            {health.breached} covenant{health.breached !== 1 ? "s" : ""} breached across portfolio
          </span>
        </div>
      )}

      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          fontWeight: 500,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          marginBottom: "14px",
        }}
      >
        Covenant health · {health.total} total
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          gap: "8px",
        }}
      >
        {metrics.map((m) => (
          <div
            key={m.label}
            style={{
              border: `1px solid ${m.value > 0 ? m.color : "var(--border)"}`,
              borderRadius: "8px",
              padding: "10px 12px",
              backgroundColor: m.value > 0 ? m.bg : "var(--bg)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "22px",
                lineHeight: 1,
                color: m.value > 0 ? m.color : "var(--ink-muted)",
                margin: "0 0 4px",
              }}
            >
              {m.value}
            </p>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "8px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: m.value > 0 ? m.color : "var(--ink-muted)",
                margin: 0,
              }}
            >
              {m.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
