"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ExpertCard } from "@/components/experts/ExpertCard";
import type { Expert, ProgramFilter, SectorFilter } from "@/lib/experts/directory";

const SECTOR_OPTIONS: Array<{ value: SectorFilter; label: string }> = [
  { value: "all", label: "All Sectors" },
  { value: "power", label: "Power" },
  { value: "mining", label: "Mining" },
  { value: "water", label: "Water" },
  { value: "transport", label: "Transport" },
  { value: "telecom", label: "Telecom" },
];

const PROGRAM_OPTIONS: Array<{ value: ProgramFilter; label: string }> = [
  { value: "all", label: "All Programs" },
  { value: "exim", label: "EXIM" },
  { value: "ifc", label: "IFC" },
];

type ExpertsMarketplaceClientProps = {
  experts: Expert[];
  initialSector: SectorFilter;
  initialProgram: ProgramFilter;
};

function filterExperts(
  experts: Expert[],
  sector: SectorFilter,
  program: ProgramFilter
): Expert[] {
  return experts.filter((expert) => {
    const sectorMatch = sector === "all" || expert.sectors.includes(sector);
    const programMatch = program === "all" || expert.programs.includes(program);
    return sectorMatch && programMatch;
  });
}

export function ExpertsMarketplaceClient({
  experts,
  initialSector,
  initialProgram,
}: ExpertsMarketplaceClientProps) {
  const [sector, setSector] = useState<SectorFilter>(initialSector);
  const [program, setProgram] = useState<ProgramFilter>(initialProgram);

  useEffect(() => {
    setSector(initialSector);
  }, [initialSector]);

  useEffect(() => {
    setProgram(initialProgram);
  }, [initialProgram]);

  const visible = useMemo(
    () => filterExperts(experts, sector, program),
    [experts, program, sector]
  );

  function updateUrl(nextSector: SectorFilter, nextProgram: ProgramFilter) {
    const params = new URLSearchParams(window.location.search);

    if (nextSector === "all") {
      params.delete("sector");
    } else {
      params.set("sector", nextSector);
    }

    if (nextProgram === "all") {
      params.delete("program");
    } else {
      params.set("program", nextProgram);
    }

    const queryString = params.toString();
    const nextUrl = queryString.length > 0 ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }

  function handleSectorChange(nextSector: SectorFilter) {
    setSector(nextSector);
    updateUrl(nextSector, program);
  }

  function handleProgramChange(nextProgram: ProgramFilter) {
    setProgram(nextProgram);
    updateUrl(sector, nextProgram);
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "32px",
          padding: "16px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          alignItems: "center",
        }}
      >
        <span style={filterLabelStyle}>Sector</span>
        {SECTOR_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSectorChange(option.value)}
            style={sector === option.value ? filterBtnActive : filterBtnInactive}
          >
            {option.label}
          </button>
        ))}

        <span style={{ ...filterLabelStyle, marginLeft: "16px" }}>Program</span>
        {PROGRAM_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleProgramChange(option.value)}
            style={program === option.value ? filterBtnActive : filterBtnInactive}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          marginBottom: "20px",
        }}
      >
        {visible.length} expert{visible.length === 1 ? "" : "s"}
        {sector !== "all" || program !== "all" ? " · filtered" : ""}
      </p>

      {visible.length === 0 ? (
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px dashed var(--border)",
            borderRadius: "4px",
            padding: "64px 32px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "20px",
              color: "var(--ink)",
              marginBottom: "8px",
            }}
          >
            No experts match these filters
          </p>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "var(--ink-muted)",
              marginBottom: "24px",
            }}
          >
            Try broadening your sector or program selection.
          </p>
          <button
            type="button"
            onClick={() => {
              setSector("all");
              setProgram("all");
              updateUrl("all", "all");
            }}
            style={resetButtonStyle}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
            gap: "16px",
          }}
        >
          {visible.map((expert) => (
            <ExpertCard key={expert.id} expert={expert} />
          ))}
        </div>
      )}
    </>
  );
}

const filterLabelStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
};

const filterBtnBase: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  padding: "6px 12px",
  borderRadius: "3px",
  border: "1px solid var(--border)",
  cursor: "pointer",
};

const filterBtnActive: CSSProperties = {
  ...filterBtnBase,
  backgroundColor: "var(--teal)",
  color: "#ffffff",
  borderColor: "var(--teal)",
};

const filterBtnInactive: CSSProperties = {
  ...filterBtnBase,
  backgroundColor: "transparent",
  color: "var(--ink-muted)",
};

const resetButtonStyle: CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  color: "#ffffff",
  backgroundColor: "var(--accent)",
  border: "none",
  borderRadius: "3px",
  padding: "10px 20px",
  cursor: "pointer",
};
