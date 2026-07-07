"use client";

import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { RATING_ANCHORS } from "@/lib/types";
import { useId } from "react";

interface RatingScaleProps {
  value: number; // 0 = none
  onChange: (v: number) => void;
  disabled?: boolean;
  /** show star icons instead of numbers */
  variant?: "number" | "star";
  name?: string;
}

const anchors = [1, 2, 3, 4, 5];

/**
 * 1–5 rating scale. Keyboard accessible (press 1–5).
 * Plain-language anchor label shown beneath.
 * Designed to be unmissable and thumb-friendly (≥44px targets).
 */
export function RatingScale({
  value,
  onChange,
  disabled,
  variant = "number",
  name,
}: RatingScaleProps) {
  const groupId = useId();
  const groupName = name ?? groupId;

  return (
    <div className="space-y-2">
      <div
        role="radiogroup"
        aria-label="Rating"
        className="flex flex-wrap gap-2"
        onKeyDown={(e) => {
          if (disabled) return;
          const n = Number(e.key);
          if (n >= 1 && n <= 5) {
            e.preventDefault();
            onChange(n);
          }
        }}
      >
        {anchors.map((n) => {
          const selected = value === n;
          const isStar = variant === "star";
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${n} — ${RATING_ANCHORS[n]}`}
              disabled={disabled}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(n)}
              className={cn(
                "relative flex h-11 min-w-11 items-center justify-center rounded-lg border-2 px-3 text-base font-semibold transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-primary/50 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-teal-950/40"
              )}
            >
              {isStar ? (
                <Star
                  className={cn(
                    "h-5 w-5",
                    selected && "fill-current"
                  )}
                />
              ) : (
                <span className="tabular-nums">{n}</span>
              )}
              <span className="sr-only">{RATING_ANCHORS[n]}</span>
            </button>
          );
        })}
        {value > 0 && (
          <div className="ml-1 flex items-center">
            <span
              className={cn(
                "rounded-md px-2 py-1 text-xs font-semibold",
                value <= 2
                  ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                  : value <= 3
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
              )}
            >
              {RATING_ANCHORS[value]}
            </span>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Press keys 1–5 to rate. {RATING_ANCHORS[1]} → {RATING_ANCHORS[5]}.
      </p>
    </div>
  );
}

interface CriterionBlockProps {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  index?: number;
}

export function CriterionBlock({
  label,
  hint,
  value,
  onChange,
  disabled,
  index,
}: CriterionBlockProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {index !== undefined && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                {index}
              </span>
            )}
            <h3 className="text-base font-semibold text-foreground">{label}</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </div>
        {value > 0 && (
          <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold tabular-nums text-foreground dark:bg-slate-800">
            {value}/5
          </span>
        )}
      </div>
      <RatingScale value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}
