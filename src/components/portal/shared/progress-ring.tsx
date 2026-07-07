"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}

/** Circular progress ring for hours completion. Amber <60%, emerald >=60%, check at 100%. */
export function ProgressRing({
  value,
  size = 88,
  strokeWidth = 8,
  label,
  sublabel,
  className,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const complete = clamped >= 100;
  const color = complete ? "#059669" : clamped >= 60 ? "#059669" : "#d97706";

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
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {complete ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        ) : (
          <span className="text-lg font-bold tabular-nums text-foreground">
            {clamped}%
          </span>
        )}
        {label && (
          <span className="text-[10px] font-medium text-muted-foreground">
            {label}
          </span>
        )}
      </div>
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
