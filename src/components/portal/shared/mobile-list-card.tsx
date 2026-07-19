"use client";

import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface MobileListCardProps {
  /** Primary identifier — the title line. */
  title: React.ReactNode;
  /** Second line — subtitle (position·department, company, date range, etc.). */
  subtitle?: React.ReactNode;
  /** Optional status pill — rendered top-right. */
  status?: React.ReactNode;
  /** Optional meta line — small muted text (e.g. "5/300 hrs"). */
  meta?: React.ReactNode;
  /** Optional left-side avatar/icon node. */
  leading?: React.ReactNode;
  /** Click handler — when provided, the whole card is tappable. */
  onClick?: () => void;
  /** Extra trailing node rendered before the chevron (e.g. a small badge). */
  trailing?: React.ReactNode;
  className?: string;
}

/**
 * MobileListCard — one card = one idea. Max 4 lines:
 *   1. Title (primary identifier)
 *   2. Subtitle (position·department / company / dates)
 *   3. Status pill (optional)
 *   4. Meta line (e.g. "5/300 hrs")
 *
 * Per Responsive Contract §2.4:
 *  - text col gets `min-w-0`; subtitle uses `line-clamp-1` so long text wraps
 *    gracefully instead of clipping; status badge `shrink-0` (never "Acti").
 *  - No font-size below 12px. Touch target ≥44px (full-card tap).
 *  - Chevron only as affordance, never a separate button.
 */
export function MobileListCard({
  title,
  subtitle,
  status,
  meta,
  leading,
  onClick,
  trailing,
  className,
}: MobileListCardProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm",
        onClick &&
          "cursor-pointer hover:bg-muted/30",
        className
      )}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 line-clamp-2 text-sm font-semibold text-foreground">
            {title}
          </p>
          {status && <div className="shrink-0">{status}</div>}
        </div>
        {subtitle && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {subtitle}
          </p>
        )}
        {meta && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground/80">{meta}</p>
        )}
      </div>
      {trailing}
      {onClick && (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      )}
    </Tag>
  );
}
