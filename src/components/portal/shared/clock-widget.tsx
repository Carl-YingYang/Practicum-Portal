"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/use-app-store";
import { usePrefersMotion } from "@/lib/use-prefers-motion";
import { Button } from "@/components/ui/button";
import {
  Timer,
  Clock,
  Square,
  Play,
  ChevronRight,
} from "lucide-react";
import {
  activeTimeLog,
  elapsedMs,
  formatDuration,
  formatTime,
  formatTimer,
} from "@/lib/selectors";
import type { Role, ViewKey } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Re-renders every second so the live timer stays accurate. */
function useTicker(intervalMs = 1000): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function resolveEntity(
  currentUser: { id: string; role: Role; studentId?: string; supervisorId?: string } | null
): { userId: string; role: Role; view: ViewKey } | null {
  if (!currentUser) return null;
  if (currentUser.role === "student" && currentUser.studentId) {
    return { userId: currentUser.studentId, role: "student", view: "student.time-clock" };
  }
  if (currentUser.role === "supervisor" && currentUser.supervisorId) {
    return { userId: currentUser.supervisorId, role: "supervisor", view: "supervisor.time-clock" };
  }
  if (currentUser.role === "coordinator") {
    return { userId: currentUser.id, role: "coordinator", view: "coordinator.time-clock" };
  }
  return null;
}

interface ClockWidgetProps {
  /** Hide the "open time clock" chevron (e.g. when already on the time-clock page). */
  hideNavigation?: boolean;
  className?: string;
}

/**
 * Slim clock-in / clock-out status bar shown on every role dashboard.
 * Auto-resolves the logged-in user's clocking entity and renders a live
 * timer + toggle button. Clicking navigates to the role's Time Clock page.
 */
export function ClockWidget({ hideNavigation, className }: ClockWidgetProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const timeLogs = useAppStore((s) => s.timeLogs);
  const clockIn = useAppStore((s) => s.clockIn);
  const clockOut = useAppStore((s) => s.clockOut);
  const navigate = useAppStore((s) => s.navigate);
  const motionAllowed = usePrefersMotion();

  const now = useTicker(1000);
  const entity = resolveEntity(currentUser);

  if (!entity) return null;
  const { userId, role, view } = entity;
  const active = activeTimeLog(timeLogs, userId);

  const handleClockIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    clockIn(userId, role);
    toast.success("Clocked in", {
      description: `Started at ${formatTime(new Date().toISOString())}`,
    });
  };

  const handleClockOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sessionMs = active ? elapsedMs(active, now) : 0;
    clockOut(userId);
    toast.success("Clocked out", {
      description: `Session logged: ${formatDuration(sessionMs)}`,
    });
  };

  const MotionWrapper = motionAllowed ? motion.div : "div";
  const motionProps = motionAllowed
    ? {
        whileTap: { scale: 0.995 },
        transition: { type: "spring" as const, stiffness: 400, damping: 25 },
      }
    : {};

  return (
    <MotionWrapper
      role="button"
      tabIndex={0}
      {...motionProps}
      className={cn(
        "card-refined relative flex items-center gap-3 overflow-hidden rounded-xl border px-4 py-2.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-teal-200/70 bg-teal-50/50 dark:border-teal-900/50 dark:bg-teal-950/20"
          : "border-border/60 bg-card",
        className
      )}
      onClick={() => !hideNavigation && navigate(view)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !hideNavigation) {
          e.preventDefault();
          navigate(view);
        }
      }}
    >
      {/* Status dot */}
      <span
        className={cn(
          "flex h-2 w-2 shrink-0 rounded-full",
          active ? "animate-pulse bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {active ? "On the clock" : "Clocked out"}
          </span>
          {active && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <p className="font-mono text-base font-semibold tabular-nums tracking-tight text-foreground">
                {formatTimer(elapsedMs(active, now))}
              </p>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                since {formatTime(active.clockInAt)}
                {active.note ? ` · ${active.note}` : ""}
              </span>
            </>
          )}
          {!active && (
            <span className="text-xs text-muted-foreground">
              Clock in to track today&apos;s session
            </span>
          )}
        </div>
      </div>
      {active ? (
        <Button
          variant="destructive"
          size="sm"
          className="shrink-0 h-8"
          onClick={handleClockOut}
        >
          <Square className="h-3 w-3" fill="currentColor" />
          Clock Out
        </Button>
      ) : (
        <Button
          size="sm"
          className="shrink-0 h-8"
          onClick={handleClockIn}
        >
          <Play className="h-3 w-3" fill="currentColor" />
          Clock In
        </Button>
      )}
      {!hideNavigation && (
        <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
      )}
    </MotionWrapper>
  );
}

export default ClockWidget;
