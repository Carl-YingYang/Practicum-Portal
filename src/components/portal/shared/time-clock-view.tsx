"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { StatCard } from "@/components/portal/shared/stat-card";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { ConfirmDialog } from "@/components/portal/shared/confirm-dialog";
import { WeeklyGroupedSessions } from "@/components/portal/shared/weekly-grouped-sessions";
import { JibbleTimesheetGrid } from "@/components/portal/shared/jibble-timesheet-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Timer,
  LogIn,
  LogOut,
  Trash2,
  CalendarDays,
  Clock,
  Hourglass,
  TrendingUp,
  Play,
  Square,
} from "lucide-react";
import {
  activeTimeLog,
  completedTimeLogsForUser,
  elapsedMs,
  formatDate,
  formatDuration,
  formatTime,
  formatTimer,
  getStudent,
  hoursPercent,
  todaysTimeLogs,
  totalCompletedTimeMs,
  weeklyTimeMs,
} from "@/lib/selectors";
import { ROLE_LABELS, type Role, type TimeLog } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Hook that re-renders every `intervalMs` (default 1s) — used for the live timer. */
function useTicker(intervalMs = 1000): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Resolve the clocking entity id + role for the currently logged-in user.
 *   - student     → userId = student record id (e.g. "s1"), role = "student"
 *   - supervisor  → userId = supervisor record id (e.g. "sup1"), role = "supervisor"
 *   - coordinator → userId = user id (e.g. "u-coord"), role = "coordinator"
 */
function resolveClockEntity(currentUser: { id: string; role: Role; studentId?: string; supervisorId?: string } | null):
  | { userId: string; role: Role }
  | null {
  if (!currentUser) return null;
  if (currentUser.role === "student" && currentUser.studentId) {
    return { userId: currentUser.studentId, role: "student" };
  }
  if (currentUser.role === "supervisor" && currentUser.supervisorId) {
    return { userId: currentUser.supervisorId, role: "supervisor" };
  }
  return { userId: currentUser.id, role: currentUser.role };
}

interface TimeClockViewProps {
  /** Override the page breadcrumb + description. Defaults are role-aware. */
  breadcrumb?: string;
  description?: string;
}

export function TimeClockView({ breadcrumb, description }: TimeClockViewProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const timeLogs = useAppStore((s) => s.timeLogs);
  const toolsConfig = useAppStore((s) => s.toolsConfig);
  const clockIn = useAppStore((s) => s.clockIn);
  const clockOut = useAppStore((s) => s.clockOut);
  const deleteTimeLog = useAppStore((s) => s.deleteTimeLog);

  const entity = resolveClockEntity(currentUser);
  const now = useTicker(1000);

  const [note, setNote] = React.useState("");
  const [outNote, setOutNote] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState<TimeLog | null>(null);
  const [tab, setTab] = React.useState<"clock" | "timesheet">("clock");

  if (!entity) {
    return (
      <EmptyState
        icon={Timer}
        title="Unable to load time clock"
        description="We couldn't resolve your user record."
      />
    );
  }

  const { userId, role } = entity;
  const student = role === "student" ? getStudent(students, userId) : undefined;

  const active = activeTimeLog(timeLogs, userId);
  const allLogs = completedTimeLogsForUser(timeLogs, userId);
  const today = todaysTimeLogs(timeLogs, userId);
  const weekMs = weeklyTimeMs(timeLogs, userId, now);
  const todayMs = today.reduce((sum, t) => sum + elapsedMs(t, now), 0);
  const totalMs = totalCompletedTimeMs(timeLogs, userId);
  const pct = student ? hoursPercent(student) : null;

  const isStudent = role === "student";
  const roleLabel = ROLE_LABELS[role];

  const defaultDescription = isStudent
    ? "Track your practicum hours with clock-in and clock-out sessions."
    : `Track your ${roleLabel.toLowerCase()} work hours with clock-in and clock-out sessions.`;

  const handleClockIn = () => {
    clockIn(userId, role, note.trim() || undefined);
    setNote("");
    toast.success("Clocked in", {
      description: `Started at ${formatTime(new Date().toISOString())}`,
    });
  };

  const handleClockOut = () => {
    const sessionMs = active ? elapsedMs(active, now) : 0;
    clockOut(userId, outNote.trim() || undefined);
    setOutNote("");
    toast.success("Clocked out", {
      description: `Session logged: ${formatDuration(sessionMs)}`,
    });
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    deleteTimeLog(confirmDelete.id);
    toast.success("Session deleted");
    setConfirmDelete(null);
  };

  const columns: Column<TimeLog>[] = [
    {
      key: "date",
      header: "Date",
      cell: (t) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {formatDate(t.clockInAt)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {formatTime(t.clockInAt)} → {formatTime(t.clockOutAt)}
          </span>
        </div>
      ),
      sortValue: (t) => t.clockInAt,
    },
    {
      key: "duration",
      header: "Duration",
      cell: (t) => (
        <span className="font-mono text-sm font-medium tabular-nums text-foreground">
          {formatDuration(t.durationMs ?? 0)}
        </span>
      ),
      sortValue: (t) => t.durationMs ?? 0,
      align: "right",
    },
    {
      key: "note",
      header: "Note",
      hideOnMobile: true,
      cell: (t) =>
        t.note ? (
          <span className="line-clamp-1 text-sm text-muted-foreground">{t.note}</span>
        ) : (
          <span className="text-sm text-muted-foreground/50">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (t) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete(t);
          }}
          aria-label="Delete session"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumb={breadcrumb ?? "Time Clock"}
        description={description ?? defaultDescription}
        actions={
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setTab("clock")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === "clock"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Clock
            </button>
            <button
              type="button"
              onClick={() => setTab("timesheet")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === "timesheet"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Timesheet
            </button>
          </div>
        }
      />

      {tab === "timesheet" ? (
        <div className="space-y-4">
          <JibbleTimesheetGrid
            sessions={allLogs}
            entityLabel={
              isStudent
                ? `${student?.name ?? "Student"} · ${student?.studentNumber ?? ""}`
                : `${roleLabel} time tracking`
            }
            jibbleUrl={toolsConfig.jibbleInviteUrl || undefined}
          />
          <p className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <Clock className="mr-1 inline h-3 w-3" />
            This monthly timesheet mirrors your Jibble clock-in/out sessions.
            {toolsConfig.jibbleInviteUrl
              ? " Click “Open in Jibble” above to view the full timesheet in Jibble."
              : " Connect Jibble in the coordinator dashboard to link the full timesheet."}
          </p>
        </div>
      ) : (
      <div className="space-y-6">
        {/* HERO: Clock-in / clock-out widget */}
        <SectionCard noPadding contentClassName="p-0">
          <div
            className={cn(
              "relative overflow-hidden rounded-t-xl border-b border-border/60 p-6 transition-colors sm:p-8",
              active
                ? "bg-gradient-to-br from-teal-50 to-emerald-50/40 dark:from-teal-950/30 dark:to-emerald-950/20"
                : "bg-muted/30"
            )}
          >
            {/* status pill */}
            <div className="flex items-center justify-between gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                  active
                    ? "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/60"
                    : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    active ? "animate-pulse bg-emerald-500" : "bg-slate-400"
                  )}
                />
                {active ? "On the clock" : "Clocked out"}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            {/* big timer / status */}
            <div className="mt-5 flex flex-col items-center text-center sm:mt-6">
              {active ? (
                <>
                  <p className="font-mono text-5xl font-bold tabular-nums tracking-tight text-foreground sm:text-6xl">
                    {formatTimer(elapsedMs(active, now))}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Clocked in at {formatTime(active.clockInAt)}
                    {active.note ? ` · ${active.note}` : ""}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    Ready to start?
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isStudent
                      ? "Clock in to begin tracking your practicum hours for today."
                      : `Clock in to begin tracking your ${roleLabel.toLowerCase()} work hours for today.`}
                  </p>
                </>
              )}
            </div>

            {/* action + note */}
            <div className="mt-6 flex flex-col gap-3 sm:mx-auto sm:max-w-md">
              {!active && (
                <div className="space-y-1.5">
                  <Label htmlFor="in-note" className="text-[13px] font-medium">
                    What are you working on? <span className="text-muted-foreground/60">(optional)</span>
                  </Label>
                  <Input
                    id="in-note"
                    placeholder={
                      isStudent
                        ? "e.g. Feature development, onboarding…"
                        : "e.g. Intern mentoring, evaluation review…"
                    }
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-10"
                  />
                </div>
              )}
              {active && (
                <div className="space-y-1.5">
                  <Label htmlFor="out-note" className="text-[13px] font-medium">
                    Add a note to this session <span className="text-muted-foreground/60">(optional)</span>
                  </Label>
                  <Textarea
                    id="out-note"
                    placeholder="Summary of what you accomplished…"
                    value={outNote}
                    onChange={(e) => setOutNote(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              )}
              {active ? (
                <Button
                  size="lg"
                  variant="destructive"
                  className="h-12 w-full text-base"
                  onClick={handleClockOut}
                >
                  <Square className="h-4 w-4" fill="currentColor" />
                  Clock Out
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="h-12 w-full text-base"
                  onClick={handleClockIn}
                >
                  <Play className="h-4 w-4" fill="currentColor" />
                  Clock In
                </Button>
              )}
            </div>
          </div>

          {/* mini quick-stats strip */}
          <div className="grid grid-cols-3 divide-x divide-border/60">
            <QuickStat
              icon={Clock}
              label="Today"
              value={formatDuration(todayMs)}
              sub={`${today.length} session${today.length === 1 ? "" : "s"}`}
            />
            <QuickStat
              icon={CalendarDays}
              label="This week"
              value={formatDuration(weekMs)}
              sub="Last 7 days"
            />
            <QuickStat
              icon={Hourglass}
              label={isStudent ? "Total logged" : "All-time"}
              value={isStudent ? `${student?.loggedHours ?? 0}h` : formatDuration(totalMs)}
              sub={
                isStudent
                  ? `${pct}% of ${student?.requiredHours ?? 0}h required`
                  : `${allLogs.length} session${allLogs.length === 1 ? "" : "s"}`
              }
            />
          </div>
        </SectionCard>

        {/* Stat cards row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Today"
            value={formatDuration(todayMs)}
            icon={Clock}
            tone="teal"
            hint={`${today.length} session${today.length === 1 ? "" : "s"} today`}
          />
          <StatCard
            label="This Week"
            value={formatDuration(weekMs)}
            icon={TrendingUp}
            tone="emerald"
            hint="Rolling 7-day total"
          />
          {isStudent ? (
            <StatCard
              label="Progress"
              value={`${pct}%`}
              icon={Hourglass}
              tone="amber"
              hint={`${student?.loggedHours ?? 0}h / ${student?.requiredHours ?? 0}h required`}
            />
          ) : (
            <StatCard
              label="All-Time Total"
              value={formatDuration(totalMs)}
              icon={Hourglass}
              tone="amber"
              hint={`${allLogs.length} completed session${allLogs.length === 1 ? "" : "s"}`}
            />
          )}
        </div>

        {/* Today's sessions */}
        <SectionCard
          title="Today's Sessions"
          description={new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
          noPadding
        >
          {today.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={LogIn}
                title="No sessions today"
                description="Clock in above to start your first session of the day."
              />
            </div>
          ) : (
            <DataTable
              columns={columns.filter((c) => c.key !== "note")}
              rows={today}
              getRowId={(t) => t.id}
              defaultSortKey="date"
              defaultSortDir="desc"
              mobileCard={(t) => (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {formatDate(t.clockInAt)}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {formatTime(t.clockInAt)} → {formatTime(t.clockOutAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold tabular-nums text-foreground">
                      {formatDuration(t.durationMs ?? 0)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Duration
                    </p>
                  </div>
                </div>
              )}
              emptyState={
                <div className="p-5">
                  <EmptyState icon={LogIn} title="No sessions today" />
                </div>
              }
            />
          )}
        </SectionCard>

        {/* Full history — grouped by week with subtotals */}
        <SectionCard
          title="Session History"
          description={`${allLogs.length} completed session${allLogs.length === 1 ? "" : "s"} · grouped by week`}
          noPadding
          contentClassName="p-0"
        >
          <WeeklyGroupedSessions
            sessions={allLogs}
            renderRowAction={(t) => (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmDelete(t)}
                aria-label="Delete session"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            emptyState={
              <div className="p-5">
                <EmptyState
                  icon={Timer}
                  title="No sessions yet"
                  description="Your completed clock-in/out sessions will appear here, grouped by week."
                />
              </div>
            }
          />
        </SectionCard>
      </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete this session?"
        description={
          confirmDelete && (
            <>
              This will permanently remove the session from{" "}
              <span className="font-medium text-foreground">
                {formatDate(confirmDelete.clockInAt)}
              </span>{" "}
              ({formatDuration(confirmDelete.durationMs ?? 0)}). This action
              cannot be undone.
            </>
          )
        }
        confirmLabel="Delete session"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-4 text-center">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-mono text-lg font-bold tabular-nums text-foreground">
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

export default TimeClockView;
