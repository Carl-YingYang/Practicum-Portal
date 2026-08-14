"use client";

import { Card } from "@/components/ui/card";
import { Avatar } from "./avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Student } from "@/lib/types";
import { hoursPercent, formatTimer } from "@/lib/selectors";
import { ChevronRight, GraduationCap, Radio } from "lucide-react";

interface InternCardProps {
  student: Student;
  companyName?: string;
  /** The intern's affiliated school/program short name (multi-school ready). */
  schoolName?: string;
  lastScore?: number;
  hasEvaluation: boolean;
  onOpen: () => void;
  onEvaluate?: () => void;
  evaluateLabel?: string;
  /** Whether this intern is currently on the clock (has an open time-log session). */
  isActive?: boolean;
  /** Live elapsed ms for the active session (only shown when isActive is true). */
  activeElapsedMs?: number;
}

/**
 * InternCard — mobile-first, clean, app-like.
 *
 * Design principles (Joyride-inspired):
 * - One clear primary action: tap the whole card to open the intern detail.
 * - Progress shown as a slim bar (not a ring) — less visual noise.
 * - Status shown as a single inline pill — no competing badges.
 * - No secondary buttons on the card face; the evaluate/edit action lives
 *   on the detail page so the list stays scannable.
 * - Generous padding, rounded-2xl, subtle border.
 */
export function InternCard({
  student,
  companyName,
  schoolName,
  lastScore,
  hasEvaluation,
  onOpen,
  onEvaluate,
  evaluateLabel = "Evaluate",
  isActive = false,
  activeElapsedMs = 0,
}: InternCardProps) {
  const pct = Math.min(100, hoursPercent(student));
  // Suppress unused warnings — onEvaluate/evaluateLabel are kept in the API
  // for backward compatibility but the card face is now single-action.
  void onEvaluate;
  void evaluateLabel;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="card-refined cursor-pointer gap-0 border-border/60 p-4 transition-all hover:border-border hover:shadow-sm active:scale-[0.99]"
    >
      {/* Row 1: avatar + name/ID + chevron */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar name={student.name} size="md" />
          {isActive && (
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-500"
              title="On the clock now"
              aria-label="On the clock now"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {student.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {student.studentNumber} · {student.course}
          </p>
          <p className="truncate text-xs text-muted-foreground/80">
            {student.position}
          </p>
        </div>
        {isActive ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/60">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              On the clock
            </span>
            <span className="font-mono text-[10px] tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatTimer(activeElapsedMs)}
            </span>
          </div>
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/60" />
        )}
      </div>

      {/* Live banner — only when active */}
      {isActive && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
          <Radio className="h-3 w-3 shrink-0" />
          <span>Present now · {formatTimer(activeElapsedMs)} elapsed</span>
        </div>
      )}

      {/* Row 2: slim progress bar + hours summary */}
      <div className="mt-3.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Hours progress
          </span>
          <span className="text-xs font-semibold tabular-nums text-foreground">
            {student.loggedHours}h / {student.requiredHours}h
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-teal-500" : "bg-amber-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Row 3: status pills — shrink-0 badge + truncate meta */}
      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
        {hasEvaluation ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Score: {lastScore?.toFixed(1) ?? "—"}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Evaluation due
          </span>
        )}
        {schoolName && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <GraduationCap className="h-3 w-3" />
            {schoolName}
          </span>
        )}
        {companyName && (
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            {companyName}
          </span>
        )}
      </div>
    </Card>
  );
}
