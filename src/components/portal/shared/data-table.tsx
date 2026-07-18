"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePagination,
  DataTablePagination,
} from "@/components/portal/shared/pagination";

export interface Column<T> {
  key: string;
  /** Header label — either a string or a render function (for checkboxes, etc). */
  header: string | (() => React.ReactNode);
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
  /** Hidden below the md breakpoint to reduce horizontal crowding on mobile. */
  hideOnMobile?: boolean;
  align?: "left" | "right" | "center";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  defaultSortKey?: string;
  defaultSortDir?: "asc" | "desc";
  rowAccent?: (row: T) => "amber" | "red" | undefined;
  emptyState?: React.ReactNode;
  className?: string;
  /**
   * Optional mobile card renderer. When provided, the table switches to a
   * vertical card list below the md breakpoint (instead of a cramped
   * horizontal-scroll table). Each card receives the full row and is
   * responsible for its own internal layout. This is the recommended
   * mobile pattern for multi-column data.
   *
   * NOTE: The card is wrapped in a clickable <div> (NOT a <button>), so any
   * interactive elements rendered inside (e.g. action <Button>s) are valid
   * HTML. Inner buttons must call `e.stopPropagation()` to avoid triggering
   * the row click.
   */
  mobileCard?: (row: T) => React.ReactNode;
  /**
   * Page size for built-in pagination. Defaults to 10.
   * Set to 0 to disable pagination entirely (show all rows).
   */
  pageSize?: number;
  /** Page size options shown in the selector. Defaults to [10, 25, 50]. */
  pageSizeOptions?: number[];
  /** When true, renders skeleton rows instead of data. */
  loading?: boolean;
  /** Number of skeleton rows to render when loading. Defaults to 6. */
  loadingRowCount?: number;
}

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50];

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  defaultSortKey,
  defaultSortDir = "asc",
  rowAccent,
  emptyState,
  className,
  mobileCard,
  pageSize = DEFAULT_PAGE_SIZE,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  loading = false,
  loadingRowCount = 6,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">(defaultSortDir);

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  const sortedRows = React.useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [rows, sortKey, sortDir, columns]);

  // Pagination — reset to page 1 when the row set identity changes.
  const rowsSignature = React.useMemo(
    () => `${rows.length}:${rows[0] ? getRowId(rows[0]) : ""}`,
    [rows, getRowId]
  );
  const {
    page,
    setPage,
    size,
    setSize,
    totalPages,
    paginating,
    pageRows,
    fromIndex,
    toIndex,
  } = usePagination({ rows: sortedRows, pageSize, resetKey: rowsSignature });

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <DataTableSkeleton
        columns={columns}
        rows={loadingRowCount}
        mobileCard={!!mobileCard}
      />
    );
  }

  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  // Mobile card list — shown below md breakpoint when mobileCard is provided.
  // Wrapped in a <div> (NOT a <button>) so inner action buttons are valid HTML.
  // The div is clickable (row navigation) with cursor-pointer + keyboard handler.
  const mobileCardList = mobileCard ? (
    <div className="space-y-2.5 md:hidden">
      {pageRows.map((row) => {
        const accent = rowAccent?.(row);
        return (
          <div
            key={getRowId(row)}
            role={onRowClick ? "button" : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onClick={() => onRowClick?.(row)}
            onKeyDown={(e) => {
              if (!onRowClick) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onRowClick(row);
              }
            }}
            className={cn(
              "relative block w-full rounded-2xl border bg-card p-4 text-left transition-all",
              onRowClick && "cursor-pointer hover:border-border hover:shadow-sm active:scale-[0.99] active:bg-muted/40",
              accent === "amber"
                ? "border-amber-200/70 dark:border-amber-900/40"
                : accent === "red"
                ? "border-red-200/70 dark:border-red-900/40"
                : "border-border/70"
            )}
          >
            {/* Accent bar on the left edge for at-a-glance priority */}
            {accent && (
              <span
                className={cn(
                  "absolute left-0 top-4 bottom-4 w-[3px] rounded-full",
                  accent === "amber" ? "bg-amber-400" : "bg-red-400"
                )}
              />
            )}
            {mobileCard(row)}
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      {mobileCardList}
      {/* Desktop / tablet table — hidden on mobile when a mobileCard is provided. */}
      <div
        className={cn(
          "overflow-x-auto scroll-area-custom",
          mobileCard && "hidden md:block",
          className
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              {columns.map((col, idx) => {
                const isSortable = !!col.sortValue;
                const isActive = sortKey === col.key;
                return (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "h-11 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground/90",
                      idx === 0 && "pl-5 sm:pl-6",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.hideOnMobile && "hidden md:table-cell",
                      col.headerClassName
                    )}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                          col.align === "right" && "flex-row-reverse",
                          isActive && "text-foreground"
                        )}
                      >
                        {typeof col.header === "function" ? col.header() : col.header}
                        {isActive ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </button>
                    ) : (
                      typeof col.header === "function" ? col.header() : col.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => {
              const accent = rowAccent?.(row);
              return (
                <TableRow
                  key={getRowId(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "h-[56px] border-border/70 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-muted/50",
                    accent === "amber" &&
                      "bg-amber-50/40 dark:bg-amber-950/15",
                    accent === "red" &&
                      "bg-red-50/40 dark:bg-red-950/15"
                  )}
                >
                  {columns.map((col, idx) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        idx === 0 && "pl-5 sm:pl-6",
                        accent === "amber" && idx === 0 && "relative",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.hideOnMobile && "hidden md:table-cell",
                        col.className
                      )}
                    >
                      {accent && idx === 0 ? (
                        <span className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full",
                              accent === "amber" ? "bg-amber-400" : "bg-red-400"
                            )}
                          />
                          <span className="flex items-center gap-2.5">{col.cell(row)}</span>
                        </span>
                      ) : (
                        col.cell(row)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer — clean, app-like. Only renders when paginating. */}
      {paginating && (
        <DataTablePagination
          page={page}
          totalPages={totalPages}
          size={size}
          pageSizeOptions={pageSizeOptions}
          totalItems={sortedRows.length}
          fromIndex={fromIndex}
          toIndex={toIndex}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setSize(s);
            setPage(1);
          }}
        />
      )}
    </>
  );
}

// ============================================================
// Skeleton — cleaner loading state
// ============================================================

interface DataTableSkeletonProps<T> {
  columns: Column<T>[];
  rows: number;
  mobileCard: boolean;
}

function DataTableSkeleton<T>({ columns, rows, mobileCard }: DataTableSkeletonProps<T>) {
  // Mobile skeleton — card-based, mirrors the mobileCard layout.
  if (mobileCard) {
    return (
      <div className="space-y-2.5 md:hidden">
        {Array.from({ length: Math.min(rows, 4) }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/70 bg-card p-4"
          >
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const visibleCols = columns.filter((c) => !c.hideOnMobile).length;

  return (
    <div className="overflow-x-auto scroll-area-custom">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            {columns.map((col, idx) => (
              <TableHead
                key={col.key}
                className={cn(
                  "h-11 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground/90",
                  idx === 0 && "pl-5 sm:pl-6",
                  col.hideOnMobile && "hidden md:table-cell"
                )}
              >
                <Skeleton className="h-3 w-16" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, r) => (
            <TableRow key={r} className="h-[56px] border-border/70">
              {columns.map((col, idx) => (
                <TableCell
                  key={col.key}
                  className={cn(
                    idx === 0 && "pl-5 sm:pl-6",
                    col.hideOnMobile && "hidden md:table-cell"
                  )}
                >
                  {idx === 0 ? (
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-2.5 w-16" />
                      </div>
                    </div>
                  ) : (
                    <Skeleton className="h-3 w-14" />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-center gap-2 border-t border-border/60 px-4 py-3">
        {Array.from({ length: Math.min(visibleCols, 5) }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-7 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
