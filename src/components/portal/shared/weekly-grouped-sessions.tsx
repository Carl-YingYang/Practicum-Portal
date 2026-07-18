"use client";

import * as React from "react";
import {
  formatDate,
  formatDuration,
  formatTime,
} from "@/lib/selectors";
import type { TimeLog } from "@/lib/types";
import { Trash2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Returns the ISO date (yyyy-mm-dd) of the Monday of the week containing `iso`. */
function weekKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "1970-01-05";
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function weekLabelFromKey(key: string): string {
  const d = new Date(key);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface WeeklyGroupedSessionsProps {
  sessions: TimeLog[];
  /** Render a trailing actions cell per session row (e.g. delete button). */
  renderRowAction?: (session: TimeLog) => React.ReactNode;
  /** Called when a session row is clicked. */
  onRowClick?: (session: TimeLog) => void;
  /** Empty-state element when there are no sessions. */
  emptyState?: React.ReactNode;
  className?: string;
}

interface WeekGroup {
  key: string;
  label: string;
  logs: TimeLog[];
  subtotalMs: number;
}

/**
 * Renders completed time-log sessions grouped by week (Monday-based), with a
 * week header row, session rows, and a weekly subtotal row. Newest week first.
 */
export function WeeklyGroupedSessions({
  sessions,
  renderRowAction,
  onRowClick,
  emptyState,
  className,
}: WeeklyGroupedSessionsProps) {
  const groups: WeekGroup[] = React.useMemo(() => {
    const completed = sessions
      .filter((t) => t.clockOutAt !== null)
      .sort((a, b) => (a.clockInAt < b.clockInAt ? 1 : -1)); // newest first
    const map = new Map<string, TimeLog[]>();
    for (const t of completed) {
      const k = weekKey(t.clockInAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return Array.from(map.entries()).map(([key, logs]) => ({
      key,
      label: weekLabelFromKey(key),
      logs,
      subtotalMs: logs.reduce((s, t) => s + (t.durationMs ?? 0), 0),
    }));
  }, [sessions]);

  if (groups.length === 0) {
    return <>{emptyState ?? null}</>;
  }

  return (
    <div className={cn("divide-y divide-border", className)}>
      {groups.map((group) => (
        <div key={group.key} className="bg-card">
          {/* Week header */}
          <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Week of {group.label}
              </span>
              <span className="text-[11px] text-muted-foreground">
                · {group.logs.length} session
                {group.logs.length === 1 ? "" : "s"}
              </span>
            </div>
            <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
              {formatDuration(group.subtotalMs)}
            </span>
          </div>
          {/* Session rows */}
          <ul className="divide-y divide-border/50">
            {group.logs.map((t) => (
              <li
                key={t.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-muted/40"
                )}
                onClick={onRowClick ? () => onRowClick(t) : undefined}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {formatDate(t.clockInAt)}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {formatTime(t.clockInAt)} → {formatTime(t.clockOutAt)}
                    </span>
                  </div>
                  {t.note && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {t.note}
                    </p>
                  )}
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {formatDuration(t.durationMs ?? 0)}
                </span>
                {renderRowAction && (
                  <div onClick={(e) => e.stopPropagation()}>
                    {renderRowAction(t)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default WeeklyGroupedSessions;
