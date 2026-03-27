import { REQUIREMENTS_BY_ID } from "@/lib/exim/requirements";

type LoiBlockersPanelProps = {
  blockerIds: string[];
};

export function LoiBlockersPanel({ blockerIds }: LoiBlockersPanelProps) {
  if (blockerIds.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: "#faf3e0",
        border: "1px solid #b07d2a",
        borderLeft: "3px solid #b07d2a",
        borderRadius: "4px",
        padding: "24px 28px",
        marginBottom: "32px",
      }}
    >
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#b07d2a",
          margin: "0 0 16px",
        }}
      >
        LOI Blockers · {blockerIds.length} remaining
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {blockerIds.map((id) => {
          const req = REQUIREMENTS_BY_ID.get(id);
          return (
            <div
              key={id}
              style={{ display: "flex", alignItems: "center", gap: "10px" }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#b07d2a",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  color: "#3a3a35",
                }}
              >
                {req?.name ?? id}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
