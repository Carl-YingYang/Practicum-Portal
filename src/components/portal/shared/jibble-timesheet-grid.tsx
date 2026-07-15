"use client";

import * as React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  Plus,
  Download,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { TimeLog, Role } from "@/lib/types";
import { useAppStore } from "@/store/use-app-store";

/**
 * JibbleTimesheetGrid — a native monthly timesheet rendered inside the portal,
 * styled to mirror the Jibble "Timesheets → Monthly" view the user referenced.
 *
 * Layout:
 *   - Month navigator (‹ June 2026 ›) with a "Monthly Timesheets" label
 *   - A grid where each row is a week, columns are Mon–Sun, the last column is
 *     the weekly total. Empty days show "—".
 *   - A "Monthly total" footer in the bottom-right.
 *   - Day cells are CLICKABLE: tapping a day with sessions opens a detail
 *     dialog (clock-in/out times + durations + notes + delete).
 *   - An "Add entry" button opens a manual-entry form (back-dated session).
 *   - An "Export" button downloads the current month's sessions as .xlsx.
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
  /**
   * The user this timesheet belongs to (for manual entry creation).
   * If omitted, manual entry + delete are disabled (read-only view).
   */
  ownerUserId?: string;
  ownerRole?: Role;
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

/** Sessions whose clockIn falls on the given day key. */
function sessionsForDay(sessions: TimeLog[], key: string): TimeLog[] {
  return sessions.filter((s) => dayKey(new Date(s.clockInAt)) === key);
}

/** Sum durations for sessions whose clockIn falls on the given day key. */
function hoursForDay(sessions: TimeLog[], key: string): number {
  return sessionsForDay(sessions, key).reduce(
    (sum, s) => sum + (s.durationMs ?? 0),
    0,
  );
}

function formatHours(ms: number): string {
  if (ms <= 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function JibbleTimesheetGrid({
  sessions,
  initialMonth,
  entityLabel,
  jibbleUrl,
  className,
  ownerUserId,
  ownerRole,
}: JibbleTimesheetGridProps) {
  const [cursor, setCursor] = React.useState<Date>(
    initialMonth ? monthStart(initialMonth) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Build week rows: each row starts on Monday.
  const weeks: Date[][] = React.useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
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

  // ---- Export this month's sessions to Excel ----
  const handleExportMonth = () => {
    const monthSessions = sessions
      .filter((s) => {
        const d = new Date(s.clockInAt);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .sort((a, b) => a.clockInAt.localeCompare(b.clockInAt));
    if (monthSessions.length === 0) {
      toast.error("No sessions to export for this month.");
      return;
    }
    const headers = ["Date", "Day", "Clock In", "Clock Out", "Duration", "Note"];
    const data = monthSessions.map((s) => {
      const d = new Date(s.clockInAt);
      return [
        dayKey(d),
        d.toLocaleDateString("en-US", { weekday: "short" }),
        formatTime(s.clockInAt),
        s.clockOutAt ? formatTime(s.clockOutAt) : "— (active)",
        formatHours(s.durationMs ?? 0),
        s.note ?? "",
      ];
    });
    // Add a total row.
    data.push(["", "", "", "", "TOTAL", formatHours(monthMs)]);
    const ws = XLSX.utils.aoa_to_sheet([
      [`Timesheet · ${monthLabel}`],
      entityLabel ? [entityLabel] : [],
      [],
      headers,
      ...data,
    ]);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 6 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, monthLabel.slice(0, 31));
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([out], { type: "application/octet-stream" }),
      `timesheet-${year}-${String(month + 1).padStart(2, "0")}.xlsx`,
    );
    toast.success(`Exported ${monthSessions.length} session${monthSessions.length === 1 ? "" : "s"}`, {
      description: monthLabel,
    });
  };

  const canMutate = !!ownerUserId && !!ownerRole;

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
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {canMutate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddOpen(true)}
              className="h-8"
            >
              <Plus className="h-3.5 w-3.5" /> Add entry
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMonth}
            className="h-8"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
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
                    const dayMs = hoursForDay(sessions, dayKey(d));
                    const daySessions = sessionsForDay(sessions, dayKey(d));
                    const isToday = dayKey(d) === dayKey(new Date());
                    const dim = !inMonth(d);
                    const hasSessions = daySessions.length > 0;
                    return (
                      <td
                        key={dayKey(d)}
                        className={cn(
                          "border-b border-border px-1 py-1 text-center align-top transition-colors",
                          dim && "bg-muted/20",
                          hasSessions && !dim && "hover:bg-teal-50/60 dark:hover:bg-teal-950/20",
                          hasSessions && "cursor-pointer",
                        )}
                        onClick={hasSessions ? () => setSelectedDay(d) : undefined}
                        role={hasSessions ? "button" : undefined}
                        tabIndex={hasSessions ? 0 : undefined}
                        onKeyDown={
                          hasSessions
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedDay(d);
                                }
                              }
                            : undefined
                        }
                        title={
                          hasSessions
                            ? `${daySessions.length} session${daySessions.length === 1 ? "" : "s"} · click to view`
                            : undefined
                        }
                      >
                        <div className="flex flex-col items-center gap-0.5 px-1 py-1">
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
                              "rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums",
                              dayMs > 0
                                ? "font-semibold text-foreground bg-teal-50 dark:bg-teal-950/40"
                                : "text-muted-foreground/40",
                              isToday && dayMs > 0 && "text-teal-700 dark:text-teal-300 ring-1 ring-teal-300/50",
                            )}
                          >
                            {formatHours(dayMs)}
                          </span>
                          {hasSessions && (
                            <span className="mt-0.5 flex gap-0.5" aria-hidden>
                              {daySessions.slice(0, 3).map((_, i) => (
                                <span
                                  key={i}
                                  className="h-1 w-1 rounded-full bg-teal-500"
                                />
                              ))}
                            </span>
                          )}
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

      {/* Day detail dialog */}
      <DayDetailDialog
        day={selectedDay}
        sessions={selectedDay ? sessionsForDay(sessions, dayKey(selectedDay)) : []}
        onClose={() => setSelectedDay(null)}
        canDelete={canMutate}
      />

      {/* Manual entry dialog */}
      {canMutate && (
        <AddEntryDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          defaultDate={selectedDay ?? new Date()}
          ownerUserId={ownerUserId!}
          ownerRole={ownerRole!}
        />
      )}
    </div>
  );
}

// ============================================================
// Day detail dialog — shows all sessions for a clicked day
// ============================================================

function DayDetailDialog({
  day,
  sessions,
  onClose,
  canDelete,
}: {
  day: Date | null;
  sessions: TimeLog[];
  onClose: () => void;
  canDelete: boolean;
}) {
  const deleteTimeLog = useAppStoreDeleteTimeLog();
  const dayLabel = day
    ? day.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const totalMs = sessions.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);

  const handleDelete = (id: string) => {
    deleteTimeLog(id);
    toast.success("Session deleted");
  };

  return (
    <Dialog open={!!day} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-teal-600" />
            {dayLabel}
          </DialogTitle>
          <DialogDescription>
            {sessions.length} session{sessions.length === 1 ? "" : "s"} ·{" "}
            <span className="font-mono font-semibold text-foreground">
              {formatHours(totalMs)}
            </span>{" "}
            total
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No sessions on this day.
            </p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-border bg-card p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="rounded bg-muted px-1.5 py-0.5">
                      {formatTime(s.clockInAt)}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="rounded bg-muted px-1.5 py-0.5">
                      {s.clockOutAt ? formatTime(s.clockOutAt) : "active"}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {formatHours(s.durationMs ?? 0)}
                  </span>
                </div>
                {s.note && (
                  <p className="mt-2 text-xs text-muted-foreground">{s.note}</p>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(s.id)}
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Add entry dialog — manual back-dated session
// ============================================================

function AddEntryDialog({
  open,
  onOpenChange,
  defaultDate,
  ownerUserId,
  ownerRole,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate: Date;
  ownerUserId: string;
  ownerRole: Role;
}) {
  const addManualTimeLog = useAppStoreAddManualTimeLog();
  const [date, setDate] = React.useState(dayKey(defaultDate));
  const [clockIn, setClockIn] = React.useState("09:00");
  const [clockOut, setClockOut] = React.useState("17:00");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState("");

  // Reset when opened with a new default date.
  React.useEffect(() => {
    if (open) {
      setDate(dayKey(defaultDate));
      setClockIn("09:00");
      setClockOut("17:00");
      setNote("");
      setError("");
    }
  }, [open, defaultDate]);

  const handleSubmit = () => {
    if (!date || !clockIn || !clockOut) {
      setError("Please fill in date, clock-in, and clock-out times.");
      return;
    }
    const inD = new Date(`${date}T${clockIn}:00`);
    const outD = new Date(`${date}T${clockOut}:00`);
    if (isNaN(inD.getTime()) || isNaN(outD.getTime())) {
      setError("Invalid date or time format.");
      return;
    }
    if (outD <= inD) {
      setError("Clock-out must be after clock-in.");
      return;
    }
    addManualTimeLog({
      userId: ownerUserId,
      role: ownerRole,
      clockInAt: inD.toISOString(),
      clockOutAt: outD.toISOString(),
      note: note.trim() || undefined,
    });
    toast.success("Manual entry added", {
      description: `${formatHours(outD.getTime() - inD.getTime())} on ${date}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-teal-600" />
            Add manual time entry
          </DialogTitle>
          <DialogDescription>
            Back-fill a missed clock-in. Hours count toward the student&apos;s total.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="entry-date" className="text-xs font-semibold">
              Date
            </Label>
            <Input
              id="entry-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="entry-in" className="text-xs font-semibold">
                Clock in
              </Label>
              <Input
                id="entry-in"
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-out" className="text-xs font-semibold">
                Clock out
              </Label>
              <Input
                id="entry-out"
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="entry-note" className="text-xs font-semibold">
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="entry-note"
              type="text"
              placeholder="e.g. Made up hours for missed clock-in"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-10"
            />
          </div>
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-3.5 w-3.5" /> Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Plus className="h-3.5 w-3.5" /> Add entry
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Tiny store-binding helpers — keep the main component free of
// useAppStore boilerplate so it stays presentational.
// ============================================================

function useAppStoreDeleteTimeLog() {
  return useAppStore((s) => s.deleteTimeLog);
}

function useAppStoreAddManualTimeLog() {
  return useAppStore((s) => s.addManualTimeLog);
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
