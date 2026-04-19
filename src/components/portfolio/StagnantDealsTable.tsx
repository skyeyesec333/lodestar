"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/table/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";

type StagnantDeal = {
  id: string;
  name: string;
  slug: string;
  readinessScore: number;
  daysSinceLastActivity: number;
};

type Props = { deals: StagnantDeal[] };

function TableHeader() {
  return (
    <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--border)" }}>
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-muted)",
          margin: "0 0 2px",
        }}
      >
        Stagnant Deals
      </p>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "12px",
          color: "var(--ink-muted)",
          margin: 0,
        }}
      >
        Projects below 50% readiness with no activity in the last 14 days.
      </p>
    </div>
  );
}

export function StagnantDealsTable({ deals }: Props) {
  const columns = useMemo<ColumnDef<StagnantDeal, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Project",
        cell: ({ row }) => (
          <Link
            href={`/projects/${row.original.slug}`}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--ink)",
              textDecoration: "none",
              transition: "color 0.15s ease",
            }}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "readinessScore",
        accessorKey: "readinessScore",
        header: "Readiness",
        sortingFn: "basic",
        cell: ({ row }) => (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                flex: 1,
                maxWidth: "80px",
                height: "4px",
                backgroundColor: "var(--border)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${row.original.readinessScore}%`,
                  backgroundColor: "var(--accent)",
                  borderRadius: "2px",
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                color: "var(--ink-muted)",
                minWidth: "30px",
              }}
            >
              {row.original.readinessScore}%
            </span>
          </div>
        ),
      },
      {
        id: "daysSinceLastActivity",
        accessorKey: "daysSinceLastActivity",
        header: "Last activity",
        sortingFn: "basic",
        cell: ({ row }) => (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              color: row.original.daysSinceLastActivity > 30 ? "var(--accent)" : "var(--gold)",
              letterSpacing: "0.04em",
            }}
          >
            {row.original.daysSinceLastActivity}d ago
          </span>
        ),
      },
    ],
    []
  );

  if (deals.length === 0) {
    return <EmptyState headline="No stagnant deals" body="All projects are progressing — no deals have been inactive for 14+ days." />;
  }

  return (
    <DataTable
      data={deals}
      columns={columns}
      storageKey="lodestar.table.stagnantDeals"
      getRowId={(r) => r.id}
      headerRow={<TableHeader />}
      ariaLabel="Stagnant deals"
    />
  );
}
