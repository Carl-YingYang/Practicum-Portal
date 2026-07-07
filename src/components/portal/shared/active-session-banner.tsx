"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { Button } from "@/components/ui/button";
import { Timer, X, Square } from "lucide-react";
import {
  activeTimeLog,
  elapsedMs,
  formatTimer,
  formatTime,
} from "@/lib/selectors";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Re-renders every 1s for an accurate live timer. */
function useTicker(intervalMs = 1000): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Sticky reminder banner shown when a student is currently on the clock but
 * viewing a page OTHER than their Time Clock page. Provides a live timer,
 * a one-click "Clock Out", and a link back to the Time Clock page.
 *
 * Hidden for supervisors/coordinators (they monitor, they don't track a
 * personal practicum requirement) and hidden when already on the time-clock
 * view (the full widget is already visible there).
 */
export function ActiveSessionBanner() {
  const currentUser = useAppStore((s) => s.currentUser);
  const view = useAppStore((s) => s.view);
  const timeLogs = useAppStore((s) => s.timeLogs);
  const clockOut = useAppStore((s) => s.clockOut);
  const navigate = useAppStore((s) => s.navigate);
  const [dismissed, setDismissed] = React.useState(false);
  const now = useTicker(1000);

  // Only students have a practicum clock session.
  const studentId = currentUser?.role === "student" ? currentUser.studentId : null;
  const active = studentId ? activeTimeLog(timeLogs, studentId) : undefined;

  // Reset dismissal when the session ends or view changes to time-clock.
  React.useEffect(() => {
    if (!active) setDismissed(false);
  }, [active]);
  React.useEffect(() => {
    if (view === "student.time-clock") setDismissed(false);
  }, [view]);

  if (!active || dismissed || view === "student.time-clock") return null;

  const sessionMs = elapsedMs(active, now);

  const handleClockOut = () => {
    clockOut(studentId!);
    toast.success("Clocked out", {
      description: `Session logged: ${formatTimer(sessionMs)}`,
    });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sticky top-0 z-30 border-b border-emerald-200/70 bg-gradient-to-r from-teal-50 to-emerald-50/60 px-4 py-2.5 backdrop-blur-sm dark:border-emerald-900/50 dark:from-teal-950/40 dark:to-emerald-950/30 sm:px-6"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3">
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <Timer className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span className="truncate text-foreground">
            <span className="font-semibold">On the clock</span>
            <span className="mx-1.5 text-muted-foreground" aria-hidden="true">·</span>
            <span
              className="font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-300"
              aria-label={`Elapsed time ${formatTimer(sessionMs)}`}
            >
              {formatTimer(sessionMs)}
            </span>
            <span className="mx-1.5 hidden text-muted-foreground sm:inline" aria-hidden="true">·</span>
            <span className="hidden text-muted-foreground sm:inline">
              since {formatTime(active.clockInAt)}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-emerald-200 bg-white/60 text-emerald-800 hover:bg-white hover:text-emerald-900 dark:border-emerald-900/60 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            onClick={() => navigate("student.time-clock")}
          >
            View
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-8"
            onClick={handleClockOut}
          >
            <Square className="h-3 w-3" fill="currentColor" />
            Clock Out
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss reminder"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ActiveSessionBanner;
