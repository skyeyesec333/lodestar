"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/table/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";

type Deadline = {
  id: string;
  name: string;
  slug: string;
  targetDate: Date;
  daysRemaining: number;
  label: string;
};

type Props = { deadlines: Deadline[] };

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
        Upcoming Deadlines
      </p>
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "12px",
          color: "var(--ink-muted)",
          margin: 0,
        }}
      >
        Gate dates within the next 90 days.
      </p>
    </div>
  );
}

export function UpcomingDeadlines({ deadlines }: Props) {
  const columns = useMemo<ColumnDef<Deadline, unknown>[]>(
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
        id: "label",
        accessorKey: "label",
        header: "Milestone",
        cell: ({ row }) => (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
            }}
          >
            {row.original.label}
          </span>
        ),
      },
      {
        id: "targetDate",
        header: "Target date",
        accessorFn: (row) => new Date(row.targetDate).getTime(),
        sortingFn: "basic",
        cell: ({ row }) => (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              color: "var(--ink)",
            }}
          >
            {new Date(row.original.targetDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "daysRemaining",
        header: "Days remaining",
        accessorKey: "daysRemaining",
        sortingFn: "basic",
        cell: ({ row }) => {
          const d = row.original.daysRemaining;
          const urgent = d <= 14;
          const warning = d <= 30;
          const color = urgent ? "var(--accent)" : warning ? "var(--gold)" : "var(--ink-muted)";
          return (
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                fontWeight: urgent || warning ? 600 : 400,
                color,
              }}
            >
              {d}d
            </span>
          );
        },
      },
    ],
    []
  );

  if (deadlines.length === 0) {
    return <EmptyState headline="No upcoming deadlines" body="Set LOI or close target dates on projects to see upcoming deadlines." />;
  }

  return (
    <DataTable
      data={deadlines}
      columns={columns}
      storageKey="lodestar.table.upcomingDeadlines"
      getRowId={(r) => r.id}
      headerRow={<TableHeader />}
      ariaLabel="Upcoming deadlines"
    />
  );
}
