"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

interface Column {
  key: string;
  label: string;
  render?: (val: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
}

type SortDir = "asc" | "desc" | null;

export default function DataTable({ columns, data, loading = false }: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) =>
        prev === "asc" ? "desc" : prev === "desc" ? null : "asc"
      );
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal === bVal) return 0;
    const cmp = aVal > bVal ? 1 : -1;
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="relative rounded-xl border border-card-border overflow-hidden bg-card-bg">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card-bg/70">
          <LoadingSpinner size="lg" />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-card-border bg-teal-muted/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 font-semibold text-foreground cursor-pointer select-none whitespace-nowrap"
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <ChevronUp size={14} className="text-teal-deep" />
                      ) : (
                        <ChevronDown size={14} className="text-teal-deep" />
                      )
                    ) : (
                      <ChevronUp size={14} className="text-muted opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 && !loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-10 text-center text-muted"
                >
                  Aucune donnée disponible
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="border-b border-card-border last:border-0 hover:bg-teal-muted transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-foreground">
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
