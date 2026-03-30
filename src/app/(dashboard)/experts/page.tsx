import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ProgramFilter, SectorFilter } from "@/lib/experts/directory";
import { EXPERTS } from "@/lib/experts/directory";
import { ExpertsMarketplaceClient } from "@/components/experts/ExpertsMarketplaceClient";

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

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

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const resolvedParams = searchParams ? await searchParams : {};
  const sectorRaw = getSingleParam(resolvedParams.sector) ?? "all";
  const programRaw = getSingleParam(resolvedParams.program) ?? "all";

  const sector: SectorFilter = SECTOR_OPTIONS.some((option) => option.value === sectorRaw)
    ? (sectorRaw as SectorFilter)
    : "all";
  const program: ProgramFilter = PROGRAM_OPTIONS.some((option) => option.value === programRaw)
    ? (programRaw as ProgramFilter)
    : "all";

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <p className="eyebrow" style={{ marginBottom: "10px" }}>
          Marketplace
        </p>
        <h1
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "36px",
            fontWeight: 400,
            color: "var(--ink)",
            margin: "0 0 10px",
          }}
        >
          Expert Network
        </h1>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "15px",
            color: "var(--ink-muted)",
            margin: 0,
          }}
        >
          Connect with specialists who have closed EXIM and IFC project finance deals.
        </p>
      </div>

      <ExpertsMarketplaceClient
        experts={EXPERTS}
        initialSector={sector}
        initialProgram={program}
      />
    </div>
  );
}
