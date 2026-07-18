"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { Avatar } from "@/components/portal/shared/avatar";
import { Button } from "@/components/ui/button";
import {
  Timer,
  Radio,
  ChevronRight,
} from "lucide-react";
import {
  allActiveTimeLogs,
  elapsedMs,
  formatTimer,
  formatTime,
  getStudent,
  getCompany,
} from "@/lib/selectors";
import type { Student, TimeLog, ViewKey } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Re-renders every 5s — enough resolution for a monitoring list (lighter than 1s). */
function useTicker(intervalMs = 5000): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

interface ActiveClockMonitorProps {
  /**
   * Restrict the monitor to a specific supervisor's interns. When provided,
   * only active sessions belonging to this supervisor's interns are shown.
   * When omitted, ALL active student sessions across the cohort are shown
   * (for the coordinator).
   */
  supervisorId?: string;
  /** Where clicking a student row should navigate. */
  navigateView: ViewKey;
  /** Whether to show the company name (coordinator view spans companies). */
  showCompany?: boolean;
  className?: string;
}

/**
 * Live monitoring widget showing students who are CURRENTLY on the clock.
 * When empty, renders a compact one-line strip (not a tall empty card).
 */
export function ActiveClockMonitor({
  supervisorId,
  navigateView,
  showCompany = false,
  className,
}: ActiveClockMonitorProps) {
  const students = useAppStore((s) => s.students);
  const companies = useAppStore((s) => s.companies);
  const timeLogs = useAppStore((s) => s.timeLogs);
  const navigate = useAppStore((s) => s.navigate);
  const now = useTicker(5000);

  const activeStudentLogs = allActiveTimeLogs(timeLogs).filter(
    (t) => t.role === "student"
  );

  const rows: Array<{ log: TimeLog; student: Student }> = [];
  for (const log of activeStudentLogs) {
    const student = getStudent(students, log.userId);
    if (!student) continue;
    if (supervisorId && student.supervisorId !== supervisorId) continue;
    rows.push({ log, student });
  }
  rows.sort((a, b) => (a.log.clockInAt < b.log.clockInAt ? 1 : -1));

  const count = rows.length;
  const label = supervisorId ? "Interns on the clock" : "Students on the clock";

  return (
    <>
      {count === 0 ? (
        // Hidden when empty — no value in showing "none active".
        null
      ) : (
        <div
          className={cn(
            "card-refined overflow-hidden rounded-xl border border-border/60 bg-card",
            className
          )}
        >
          {/* header — compact */}
          <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-2 sm:px-5">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1",
                  "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50"
                )}
              >
                <Radio className="h-3 w-3" />
              </span>
              <h3 className="truncate text-[12.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                {label}
              </h3>
              <span className="text-[11px] text-muted-foreground">
                {count} active
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              LIVE
            </span>
          </div>

          <ul
            className="divide-y divide-border/50"
            role="list"
            aria-live="polite"
            aria-label={`${count} student${count === 1 ? "" : "s"} currently on the clock`}
          >
            {rows.map(({ log, student }) => {
              const company = getCompany(companies, student.companyId);
              const elapsed = elapsedMs(log, now);
              return (
                <li
                  key={log.id}
                  className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-muted/40 sm:px-5"
                >
                  <div className="relative">
                    <Avatar name={student.name} size="sm" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-medium text-foreground">
                        {student.name}
                      </p>
                      {showCompany && company && (
                        <span className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
                          {company.name}
                        </span>
                      )}
                    </div>
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Timer className="h-3 w-3 text-emerald-600" />
                      <span className="font-mono font-semibold tabular-nums text-foreground">
                        {formatTimer(elapsed)}
                      </span>
                      <span className="text-muted-foreground/60">·</span>
                      <span>since {formatTime(log.clockInAt)}</span>
                      {log.note && (
                        <>
                          <span className="text-muted-foreground/60">·</span>
                          <span className="truncate">{log.note}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-7 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => navigate(navigateView, { studentId: student.id })}
                  >
                    View
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

export default ActiveClockMonitor;
