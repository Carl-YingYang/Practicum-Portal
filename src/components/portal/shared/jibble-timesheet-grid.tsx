"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TimeLog } from "@/lib/types";

/**
 * JibbleTimesheetGrid — a native monthly timesheet rendered inside the portal,
 * styled to mirror the Jibble "Timesheets → Monthly" view the user referenced.
 *
 * Layout:
 *   - Month navigator (‹ June 2026 ›) with a "Monthly Timesheets" label
 *   - A grid where each row is a week, columns are Mon–Sun, the last column is
 *     the weekly total. Empty days show "—".
 *   - A "Monthly total" footer in the bottom-right.
 *
 * Data comes from the portal's TimeLog store (mock clock-in/out sessions), so
 * the grid stays in sync with the clock widget without needing a real Jibble
 * API.
 */
export interface JibbleTimesheetGridProps {
  /** All completed time logs for the user being viewed. */
  sessions: TimeLog[];
  /** Optional initial month (ISO). Defaults to current month. */
  initialMonth?: string;
  /** Optional label for the entity being tracked (e.g. student name). */
  entityLabel?: string;
  /** External Jibble URL — shown as "Open in Jibble" link. */
  jibbleUrl?: string;
  className?: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Parse "YYYY-MM" or ISO into a Date at local midnight (1st of month). */
function monthStart(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Format a Date key as YYYY-MM-DD (local, no timezone drift). */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Sum durations for sessions whose clockIn falls on the given day key. */
function hoursForDay(sessions: TimeLog[], key: string): number {
  return sessions.reduce((sum, s) => {
    const d = new Date(s.clockInAt);
    if (dayKey(d) === key) {
      return sum + (s.durationMs ?? 0);
    }
    return sum;
  }, 0);
}

function formatHours(ms: number): string {
  if (ms <= 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function JibbleTimesheetGrid({
  sessions,
  initialMonth,
  entityLabel,
  jibbleUrl,
  className,
}: JibbleTimesheetGridProps) {
  const [cursor, setCursor] = React.useState<Date>(
    initialMonth ? monthStart(initialMonth) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Build week rows: each row starts on Monday. We find the Monday on/before
  // the 1st of the month, then step forward in 7-day chunks until we pass the
  // last day of the month.
  const weeks: Date[][] = React.useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    // day: 0=Sun..6=Sat → convert to Mon-first offset
    const firstDow = (first.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - firstDow);
    const rows: Date[][] = [];
    let rowStart = new Date(gridStart);
    while (rowStart <= last) {
      const row: Date[] = [];
      for (let i = 0; i < 7; i++) {
        row.push(new Date(rowStart.getFullYear(), rowStart.getMonth(), rowStart.getDate() + i));
      }
      rows.push(row);
      rowStart = new Date(rowStart.getFullYear(), rowStart.getMonth(), rowStart.getDate() + 7);
    }
    return rows;
  }, [year, month]);

  const monthMs = React.useMemo(() => {
    let total = 0;
    for (const w of weeks) {
      for (const d of w) {
        if (d.getMonth() === month) {
          total += hoursForDay(sessions, dayKey(d));
        }
      }
    }
    return total;
  }, [weeks, sessions, month]);

  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));
  const goToday = () =>
    setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      {/* Header — mirrors Jibble's Timesheets header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border/70 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-foreground">Timesheets</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Monthly view
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday} className="h-8">
            <CalendarDays className="h-3.5 w-3.5" /> Today
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-semibold text-foreground">
              {monthLabel}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Entity strip */}
      {(entityLabel || jibbleUrl) && (
        <div className="flex items-center gap-2 border-b border-border/60 bg-card px-4 py-2 text-xs">
          {entityLabel && (
            <span className="font-medium text-foreground">{entityLabel}</span>
          )}
          {jibbleUrl && (
            <a
              href={jibbleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-teal-700 hover:underline dark:text-teal-300"
            >
              Open in Jibble ↗
            </a>
          )}
        </div>
      )}

      {/* Grid — horizontal scroll on small screens */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="sticky left-0 z-10 w-12 border-b border-border bg-muted/40 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Wk
              </th>
              {WEEKDAYS.map((d) => (
                <th
                  key={d}
                  className="border-b border-border px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {d}
                </th>
              ))}
              <th className="border-b border-l border-border bg-muted/50 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => {
              const weekStart = week[0];
              const weekTotal = week.reduce(
                (sum, d) => sum + hoursForDay(sessions, dayKey(d)),
                0,
              );
              const inMonth = (d: Date) => d.getMonth() === month;
              return (
                <tr key={wi} className="hover:bg-muted/20">
                  <td className="sticky left-0 z-10 border-b border-border bg-card px-2 py-2 text-center align-top text-[11px] font-medium text-muted-foreground">
                    {weekStart.getDate()}
                  </td>
                  {week.map((d) => {
                    const ms = hoursForDay(sessions, dayKey(d));
                    const isToday = dayKey(d) === dayKey(new Date());
                    const dim = !inMonth(d);
                    return (
                      <td
                        key={dayKey(d)}
                        className={cn(
                          "border-b border-border px-2 py-2 text-center align-top",
                          dim && "bg-muted/20",
                        )}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={cn(
                              "text-[10px]",
                              dim ? "text-muted-foreground/40" : "text-muted-foreground",
                              isToday && "font-bold text-teal-600 dark:text-teal-400",
                            )}
                          >
                            {d.getDate()}
                          </span>
                          <span
                            className={cn(
                              "font-mono text-[12px] tabular-nums",
                              ms > 0
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground/40",
                              isToday && ms > 0 && "text-teal-700 dark:text-teal-300",
                            )}
                          >
                            {formatHours(ms)}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="border-b border-l border-border bg-muted/20 px-3 py-2 text-right align-top">
                    <span className="font-mono text-[13px] font-bold tabular-nums text-foreground">
                      {formatHours(weekTotal)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/40">
              <td
                colSpan={8}
                className="border-t border-border px-3 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Monthly total
              </td>
              <td className="border-t border-l border-border bg-muted/50 px-3 py-2.5 text-right">
                <span className="font-mono text-base font-bold tabular-nums text-foreground">
                  {formatHours(monthMs)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 gap-px border-t border-border bg-border/60 sm:grid-cols-3">
        <SummaryChip
          icon={Clock}
          label="Sessions this month"
          value={String(
            sessions.filter((s) => {
              const d = new Date(s.clockInAt);
              return d.getFullYear() === year && d.getMonth() === month;
            }).length,
          )}
        />
        <SummaryChip
          icon={TrendingUp}
          label="Avg per working day"
          value={formatHours(
            (() => {
              const workingDays = weeks.flat().filter((d) => {
                if (d.getMonth() !== month) return false;
                const dow = d.getDay();
                return dow !== 0 && dow !== 6 && hoursForDay(sessions, dayKey(d)) > 0;
              }).length;
              return workingDays > 0 ? monthMs / workingDays : 0;
            })(),
          )}
        />
        <SummaryChip
          icon={CalendarDays}
          label="Days logged"
          value={String(
            new Set(
              weeks
                .flat()
                .filter((d) => d.getMonth() === month && hoursForDay(sessions, dayKey(d)) > 0)
                .map((d) => dayKey(d)),
            ).size,
          )}
        />
      </div>
    </div>
  );
}

function SummaryChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-card px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-mono text-sm font-bold tabular-nums text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

export default JibbleTimesheetGrid;
