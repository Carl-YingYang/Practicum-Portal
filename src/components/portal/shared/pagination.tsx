"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

/**
 * Reusable pagination footer — clean, app-like, joyride-inspired.
 * Used by DataTable and any custom table that needs pagination.
 */

interface UsePaginationProps<T> {
  rows: T[];
  pageSize: number;
  /** Signature string that, when changed, resets to page 1 (e.g. filter change). */
  resetKey?: string;
}

interface UsePaginationReturn<T> {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  size: number;
  setSize: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  paginating: boolean;
  pageRows: T[];
  fromIndex: number;
  toIndex: number;
}

/**
 * Hook that manages pagination state for a list of rows.
 * Automatically clamps the page when rows shrink and resets to page 1
 * when the resetKey changes.
 */
export function usePagination<T>({
  rows,
  pageSize,
  resetKey,
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(pageSize);

  const paginating = size > 0 && rows.length > size;
  const totalPages = paginating ? Math.max(1, Math.ceil(rows.length / size)) : 1;
  const clampedPage = Math.min(page, totalPages);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const prevReset = React.useRef(resetKey);
  React.useEffect(() => {
    if (prevReset.current !== resetKey) {
      prevReset.current = resetKey;
      setPage(1);
    }
  }, [resetKey]);

  const pageRows = paginating
    ? rows.slice((clampedPage - 1) * size, clampedPage * size)
    : rows;

  const fromIndex = paginating ? (clampedPage - 1) * size + 1 : 1;
  const toIndex = paginating
    ? Math.min(clampedPage * size, rows.length)
    : rows.length;

  return {
    page: clampedPage,
    setPage,
    size,
    setSize,
    totalPages,
    paginating,
    pageRows,
    fromIndex,
    toIndex,
  };
}

/**
 * Build a compact page-number list with ellipsis.
 * Always shows first, last, current, and neighbors.
 */
function getPageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) pages.push("ellipsis");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

interface DataTablePaginationProps {
  page: number;
  totalPages: number;
  size: number;
  pageSizeOptions?: number[];
  totalItems: number;
  fromIndex: number;
  toIndex: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (s: number) => void;
  className?: string;
}

export function DataTablePagination({
  page,
  totalPages,
  size,
  pageSizeOptions = [10, 25, 50],
  totalItems,
  fromIndex,
  toIndex,
  onPageChange,
  onPageSizeChange,
  className,
}: DataTablePaginationProps) {
  const pages = getPageRange(page, totalPages);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 border-t border-border/60 px-4 py-3 sm:flex-row sm:px-6",
        className
      )}
    >
      {/* Left: results summary + page size selector (desktop only) */}
      <div className="flex items-center gap-4">
        <p className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground tabular-nums">{fromIndex}</span>
          {"–"}
          <span className="font-medium text-foreground tabular-nums">{toIndex}</span>{" "}
          of{" "}
          <span className="font-medium text-foreground tabular-nums">{totalItems}</span>
        </p>
        {onPageSizeChange && (
          <div className="hidden items-center gap-1.5 sm:flex">
            {pageSizeOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onPageSizeChange(opt)}
                className={cn(
                  "h-7 min-w-[2rem] rounded-md px-2 text-xs font-medium tabular-nums transition-colors",
                  size === opt
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {opt}
              </button>
            ))}
            <span className="ml-1 text-[11px] text-muted-foreground/70">/ page</span>
          </div>
        )}
      </div>

      {/* Right: page navigation */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => canPrev && onPageChange(page - 1)}
          disabled={!canPrev}
          aria-label="Previous page"
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
            canPrev
              ? "border-border bg-card text-foreground hover:bg-muted"
              : "border-border/50 bg-transparent text-muted-foreground/40 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers — desktop shows full list, mobile shows compact "Page X of Y" */}
        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((p, i) =>
            p === "ellipsis" ? (
              <span
                key={`e-${i}`}
                className="flex h-8 w-8 items-center justify-center text-muted-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "h-8 min-w-[2rem] rounded-lg px-2 text-xs font-semibold tabular-nums transition-colors",
                  p === page
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Mobile compact indicator */}
        <span className="px-2 text-xs font-medium text-muted-foreground tabular-nums sm:hidden">
          {page} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => canNext && onPageChange(page + 1)}
          disabled={!canNext}
          aria-label="Next page"
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
            canNext
              ? "border-border bg-card text-foreground hover:bg-muted"
              : "border-border/50 bg-transparent text-muted-foreground/40 cursor-not-allowed"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
