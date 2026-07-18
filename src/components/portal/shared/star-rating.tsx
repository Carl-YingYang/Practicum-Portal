"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Star, StarHalf } from "lucide-react";
import { RATING_ANCHORS } from "@/lib/types";

interface StarRatingProps {
  /** Score 0–5 (decimals supported for half-stars, e.g. 3.7). */
  value: number;
  /** Max stars (default 5). */
  max?: number;
  /** Star size in px (default 16). */
  size?: number;
  /** Show the numeric value next to the stars (default true). */
  showValue?: boolean;
  /** Show the anchor label (e.g. "Exceeds") next to the stars. */
  showLabel?: boolean;
  /** Animate fill on mount (default true). */
  animate?: boolean;
  className?: string;
}

/**
 * Read-only star rating DISPLAY component (not an input).
 *
 * Renders filled / half-filled / empty stars to visualise an evaluation
 * score. Supports decimal values via half-stars (e.g. 3.7 → 3 full + 1 half).
 * Animates the fill on mount for a polished micro-interaction.
 *
 * For the INPUT (selectable) variant, use `RatingScale` instead.
 */
export function StarRating({
  value,
  max = 5,
  size = 16,
  showValue = true,
  showLabel = false,
  animate = true,
  className,
}: StarRatingProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const [displayValue, setDisplayValue] = useState(animate ? 0 : clamped);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(clamped);
      return;
    }
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplayValue(clamped);
      return;
    }
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayValue(clamped * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, animate]);

  const fullStars = Math.floor(displayValue);
  const hasHalf = displayValue - fullStars >= 0.25 && displayValue - fullStars < 0.85;
  const roundedLabel = Math.round(clamped);
  const label =
    clamped > 0 && roundedLabel >= 1 && roundedLabel <= 5
      ? RATING_ANCHORS[roundedLabel as 1 | 2 | 3 | 4 | 5]
      : null;

  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      role="img"
      aria-label={`Rating: ${clamped.toFixed(1)} out of ${max}${
        label ? `, ${label}` : ""
      }`}
    >
      <div className="flex items-center" style={{ gap: size * 0.08 }}>
        {Array.from({ length: max }).map((_, i) => {
          const isFull = i < fullStars;
          const isHalf = i === fullStars && hasHalf;
          return (
            <span
              key={i}
              className="relative inline-block"
              style={{ width: size, height: size }}
            >
              {/* Empty star (background) */}
              <Star
                className="absolute inset-0 text-slate-200 dark:text-slate-700"
                style={{ width: size, height: size }}
                strokeWidth={1.5}
              />
              {/* Filled star (foreground) */}
              {(isFull || isHalf) && (
                <>
                  {isHalf ? (
                    <StarHalf
                      className="absolute inset-0 text-amber-400"
                      style={{ width: size, height: size }}
                      fill="currentColor"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <Star
                      className="absolute inset-0 text-amber-400"
                      style={{ width: size, height: size }}
                      fill="currentColor"
                      strokeWidth={1.5}
                    />
                  )}
                </>
              )}
            </span>
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {clamped.toFixed(1)}
          <span className="ml-0.5 text-xs font-normal text-muted-foreground">
            /{max}
          </span>
        </span>
      )}
      {showLabel && label && (
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            roundedLabel <= 2
              ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
              : roundedLabel === 3
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
