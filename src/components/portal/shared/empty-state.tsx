"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  /** Visual tone for the icon chip. */
  tone?: "teal" | "amber" | "emerald" | "slate" | "red";
  /** Compact variant: less padding, smaller icon. */
  compact?: boolean;
}

const toneChip: Record<string, string> = {
  teal:
    "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400",
  amber:
    "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  emerald:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  slate:
    "bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300",
  red: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
};

/**
 * EmptyState — friendly empty placeholder.
 *
 * Per Responsive Contract §2.10:
 *  - Single icon chip (no duplicate avatar), `max-w-sm mx-auto` so it stays
 *    centered and never stretches edge-to-edge on tablet.
 *  - `p-6` generous padding; `text-base` title; `text-sm` description.
 *  - No font-size below 12px.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  tone = "slate",
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-sm flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 p-6 text-center",
        compact && "p-4",
        className
      )}
    >
      <span
        className={cn(
          "empty-halo mb-4 flex items-center justify-center rounded-2xl",
          compact ? "h-10 w-10" : "h-12 w-12",
          toneChip[tone]
        )}
      >
        <Icon
          className={compact ? "h-5 w-5" : "h-6 w-6"}
          strokeWidth={1.75}
        />
      </span>
      <h3
        className={cn(
          "font-semibold text-foreground",
          compact ? "text-sm" : "text-base"
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "mt-1.5 max-w-sm leading-relaxed text-muted-foreground",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="mt-5"
          size="sm"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
