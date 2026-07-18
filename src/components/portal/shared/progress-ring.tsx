"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
  /** Animate from 0 to value on mount. Default true. */
  animate?: boolean;
}

/**
 * Circular progress ring for hours completion. Amber <60%, emerald >=60%,
 * check at 100%. Animates the ring fill + counts the percentage up from 0
 * on mount for a polished, engaging micro-interaction.
 */
export function ProgressRing({
  value,
  size = 88,
  strokeWidth = 8,
  label,
  sublabel,
  className,
  animate = true,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const complete = clamped >= 100;
  const color = complete ? "#059669" : clamped >= 60 ? "#059669" : "#d97706";

  // Mount animation: ring fills 0 → value, percentage counts up.
  const [displayValue, setDisplayValue] = useState(animate ? 0 : clamped);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(clamped);
      return;
    }
    // Respect reduced-motion preference.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplayValue(clamped);
      return;
    }
    const duration = 1100; // ms
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic for a nice decelerate.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayValue(Math.round(clamped * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, animate]);

  const offset = circumference - (displayValue / 100) * circumference;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-200 ease-out"
          style={{
            filter: complete
              ? "drop-shadow(0 0 6px rgba(5,150,105,0.35))"
              : undefined,
          }}
        >
          {animate && (
            <animate
              attributeName="stroke-dashoffset"
              from={circumference}
              to={offset}
              dur="1.1s"
              fill="freeze"
              calcMode="spline"
              keySplines="0.22 1 0.36 1"
            />
          )}
        </circle>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {complete ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-600 animate-in zoom-in-50 duration-500" />
        ) : (
          <span className="text-lg font-bold tabular-nums text-foreground">
            {displayValue}%
          </span>
        )}
        {label && (
          <span className="text-[10px] font-medium text-muted-foreground">
            {label}
          </span>
        )}
      </div>
      {sublabel && (
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-muted-foreground">
          {sublabel}
        </span>
      )}
    </div>
  );
}

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  tone?: "auto" | "teal" | "amber" | "emerald";
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  className,
  tone = "auto",
  showLabel,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  let barClass = "bg-primary";
  if (tone === "auto") {
    barClass = clamped >= 100 ? "bg-emerald-500" : clamped >= 60 ? "bg-emerald-500" : "bg-amber-500";
  } else if (tone === "amber") barClass = "bg-amber-500";
  else if (tone === "emerald") barClass = "bg-emerald-500";
  else barClass = "bg-primary";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barClass)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="w-10 text-right text-xs font-medium tabular-nums text-muted-foreground">
          {clamped}%
        </span>
      )}
    </div>
  );
}
