"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

type PersistedState = {
  sorting?: SortingState;
  visibility?: VisibilityState;
};

function readPersisted(key: string): PersistedState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedState;
    return parsed;
  } catch {
    return {};
  }
}

function writePersisted(key: string, state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  storageKey?: string;
  getRowId?: (row: T) => string;
  emptyState?: ReactNode;
  headerRow?: ReactNode;
  ariaLabel?: string;
};

export function DataTable<T>({
  data,
  columns,
  storageKey,
  getRowId,
  emptyState,
  headerRow,
  ariaLabel,
}: DataTableProps<T>) {
  const persisted = useMemo(() => (storageKey ? readPersisted(storageKey) : {}), [storageKey]);
  const [sorting, setSorting] = useState<SortingState>(persisted.sorting ?? []);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(persisted.visibility ?? {});

  useEffect(() => {
    if (!storageKey) return;
    writePersisted(storageKey, { sorting, visibility: columnVisibility });
  }, [storageKey, sorting, columnVisibility]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
  });

  if (data.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      {headerRow}
      <table
        aria-label={ariaLabel}
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} style={{ borderBottom: "1px solid var(--border)" }}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                const align = (header.column.columnDef.meta as { align?: "left" | "right" | "center" } | undefined)?.align ?? "left";
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={
                      sortDir === "asc"
                        ? "ascending"
                        : sortDir === "desc"
                          ? "descending"
                          : canSort
                            ? "none"
                            : undefined
                    }
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      fontWeight: 500,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                      textAlign: align,
                      padding: "8px 20px",
                      userSelect: "none",
                    }}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        aria-label={`Sort by ${typeof header.column.columnDef.header === "string" ? header.column.columnDef.header : header.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "none",
                          border: "none",
                          padding: 0,
                          color: "inherit",
                          font: "inherit",
                          letterSpacing: "inherit",
                          textTransform: "inherit",
                          cursor: "pointer",
                        }}
                      >
                        <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        <span aria-hidden="true" style={{ opacity: sortDir ? 1 : 0.4, fontSize: "8px" }}>
                          {sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : "↕"}
                        </span>
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="ls-table-row"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              {row.getVisibleCells().map((cell) => {
                const align = (cell.column.columnDef.meta as { align?: "left" | "right" | "center" } | undefined)?.align ?? "left";
                return (
                  <td
                    key={cell.id}
                    style={{ padding: "12px 20px", textAlign: align }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
