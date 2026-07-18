"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  hint?: string;
  tone?: "teal" | "amber" | "emerald" | "slate" | "red";
  className?: string;
  /** Compact variant: smaller padding + inline hint, for dense dashboards. */
  compact?: boolean;
}

const toneIcon = {
  teal: "text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300",
  amber:
    "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300",
  emerald:
    "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
  slate:
    "text-slate-700 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300",
  red: "text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300",
};

/**
 * StatCard — KPI tile.
 *
 * Per Responsive Contract §2.5 / §2.6:
 *  - NO fixed height — content defines height (`flex flex-col gap-1`).
 *  - Icon `shrink-0` top-right so the hint/secondary line never clips.
 *  - Hint (secondary line, e.g. "1 unassigned") always visible — no clipping.
 *  - Card grid uses `grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4` upstream.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "teal",
  className,
  compact,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "card-refined gradient-tint group/stat relative flex flex-col gap-1 overflow-hidden border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md",
        compact ? "p-4" : "p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-muted-foreground text-xs">
            {label}
          </p>
          <p
            className={cn(
              "stat-number-gradient mt-1 font-bold leading-none tracking-tight tabular-nums transition-colors",
              compact ? "text-2xl" : "text-3xl"
            )}
          >
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover/stat:scale-110",
            compact ? "h-9 w-9" : "h-10 w-10",
            toneIcon[tone]
          )}
        >
          <Icon className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} strokeWidth={2} />
        </span>
      </div>
      {hint && (
        <p
          className={cn(
            "mt-1 leading-snug text-muted-foreground text-xs"
          )}
        >
          {hint}
        </p>
      )}
    </Card>
  );
}
