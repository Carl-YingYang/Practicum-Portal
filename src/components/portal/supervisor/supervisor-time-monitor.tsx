"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { StatCard } from "@/components/portal/shared/stat-card";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { Avatar } from "@/components/portal/shared/avatar";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { TimeLogReportLauncher } from "@/components/portal/shared/time-log-report-launcher";
import { Button } from "@/components/ui/button";
import {
  Timer,
  Users,
  Radio,
  TrendingUp,
  Hourglass,
  ArrowRight,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { downloadCsv } from "@/lib/client-pdf";
import { toast } from "sonner";
import {
  activeTimeLog,
  activeTimeLogsForRole,
  completedTimeLogsForUser,
  elapsedMs,
  formatDuration,
  formatTimer,
  getCompany,
  getStudent,
  getSupervisor,
  hoursPercent,
  studentsForSupervisor,
  totalCompletedTimeMs,
  weeklyTimeMs,
} from "@/lib/selectors";
import type { Student } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Re-renders every 5s for live "on the clock" elapsed timers. */
function useTicker(intervalMs = 5000): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

interface InternClockRow {
  id: string;
  name: string;
  studentNumber: string;
  status: "active" | "off";
  elapsedMs: number;
  weekMs: number;
  loggedHours: number;
  requiredHours: number;
  pct: number;
}

/**
 * Supervisor time-tracking monitor: a full view of every intern's clock-in/out
 * status, this-week hours, and overall progress. Lets the supervisor audit
 * practicum hours for their team at a glance.
 */
export function SupervisorTimeMonitor() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const companies = useAppStore((s) => s.companies);
  const supervisors = useAppStore((s) => s.supervisors);
  const timeLogs = useAppStore((s) => s.timeLogs);
  const navigate = useAppStore((s) => s.navigate);
  const now = useTicker(5000);

  const supervisorId = currentUser?.supervisorId ?? "";
  const supervisor = getSupervisor(supervisors, supervisorId);

  const interns = React.useMemo(
    () => studentsForSupervisor(students, supervisorId),
    [students, supervisorId]
  );

  const activeCount = React.useMemo(() => {
    const activeIds = new Set(
      activeTimeLogsForRole(timeLogs, "student").map((t) => t.userId)
    );
    return interns.filter((i) => activeIds.has(i.id)).length;
  }, [timeLogs, interns]);

  const teamWeekMs = React.useMemo(
    () =>
      interns.reduce((sum, st) => sum + weeklyTimeMs(timeLogs, st.id, now), 0),
    [interns, timeLogs, now]
  );

  // Build report rows for the PDF (completed sessions per intern)
  const reportRows = React.useMemo(
    () =>
      interns.map((st) => ({
        student: st,
        companyName: getCompany(companies, st.companyId)?.name,
        supervisorName: supervisor?.name,
        sessions: completedTimeLogsForUser(timeLogs, st.id),
      })),
    [interns, companies, supervisor, timeLogs]
  );
  const reportTotalSessions = reportRows.reduce(
    (n, r) => n + r.sessions.length,
    0
  );
  const reportTotalMs = reportRows.reduce(
    (ms, r) => ms + totalCompletedTimeMs(timeLogs, r.student.id),
    0
  );

  const rows: InternClockRow[] = React.useMemo(() => {
    return interns
      .map((st) => {
        const active = activeTimeLog(timeLogs, st.id);
        return {
          id: st.id,
          name: st.name,
          studentNumber: st.studentNumber,
          status: active ? ("active" as const) : ("off" as const),
          elapsedMs: active ? elapsedMs(active, now) : 0,
          weekMs: weeklyTimeMs(timeLogs, st.id, now),
          loggedHours: st.loggedHours,
          requiredHours: st.requiredHours,
          pct: hoursPercent(st),
        };
      })
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "active" ? -1 : 1;
        return b.weekMs - a.weekMs;
      });
  }, [interns, timeLogs, now]);

  /** Export the live team table (one row per intern) to CSV. */
  const handleExportCsv = () => {
    const head = [
      "Intern",
      "Student Number",
      "Status",
      "Elapsed (live)",
      "This Week",
      "Logged Hours",
      "Required Hours",
      "Completion %",
    ];
    const body = rows.map((r) => [
      r.name,
      r.studentNumber,
      r.status === "active" ? "On the clock" : "Off",
      r.status === "active" ? formatTimer(r.elapsedMs) : "—",
      formatDuration(r.weekMs),
      r.loggedHours,
      r.requiredHours,
      `${Math.min(100, Math.round(r.pct))}%`,
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `team-time-tracking-${stamp}.csv`;
    downloadCsv(filename, head, body);
    toast.success("CSV exported", {
      description: `${rows.length} interns exported to ${filename}`,
    });
  };

  const columns: Column<InternClockRow>[] = [
    {
      key: "student",
      header: "Intern",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name={r.name} size="md" />
            {r.status === "active" && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
            )}
          </div>
          <div className="min-w-0 flex-col">
            <span className="block truncate text-sm font-semibold text-foreground">
              {r.name}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {r.studentNumber}
            </span>
          </div>
        </div>
      ),
      sortValue: (r) => r.name,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) =>
        r.status === "active" ? (
          <div className="flex flex-col">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/60">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              On the clock
            </span>
            <span className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
              {formatTimer(r.elapsedMs)}
            </span>
          </div>
        ) : (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Off
          </span>
        ),
      sortValue: (r) => (r.status === "active" ? 1 : 0),
    },
    {
      key: "week",
      header: "This Week",
      cell: (r) => (
        <span className="font-mono text-sm font-medium tabular-nums text-foreground">
          {formatDuration(r.weekMs)}
        </span>
      ),
      sortValue: (r) => r.weekMs,
      align: "right",
    },
    {
      key: "progress",
      header: "Progress",
      hideOnMobile: true,
      cell: (r) => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {r.loggedHours}h / {r.requiredHours}h
          </span>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                r.pct >= 100
                  ? "bg-emerald-500"
                  : r.pct >= 60
                    ? "bg-teal-500"
                    : "bg-amber-500"
              )}
              style={{ width: `${Math.min(100, r.pct)}%` }}
            />
          </div>
        </div>
      ),
      sortValue: (r) => r.pct,
      align: "right",
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            navigate("supervisor.intern-view", { studentId: r.id });
          }}
        >
          Details
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        breadcrumb="Time Tracking"
        description="Monitor clock-in/out activity across your interns in real time."
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="w-full sm:w-auto"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>
            <TimeLogReportLauncher
              trigger={
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              }
              title="Team Time Log Report"
              subtitle={`${interns.length} interns · Supervisor: ${supervisor?.name ?? "—"}`}
              summaryStats={[
                { label: "Interns", value: String(interns.length) },
                { label: "Total Sessions", value: String(reportTotalSessions) },
                { label: "Total Tracked", value: formatDuration(reportTotalMs) },
                {
                  label: "On the Clock Now",
                  value: String(activeCount),
                },
                {
                  label: "Hours This Week",
                  value: formatDuration(teamWeekMs),
                },
              ]}
              rows={reportRows}
            />
          </div>
        }
      />

      <div className="space-y-6">
        {/* Team KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="On the Clock Now"
            value={activeCount}
            icon={Radio}
            tone="emerald"
            hint={`${activeCount === 1 ? "intern is" : "interns are"} clocked in right now`}
          />
          <StatCard
            label="Hours This Week"
            value={formatDuration(teamWeekMs)}
            icon={TrendingUp}
            tone="teal"
            hint="Rolling 7-day team total"
          />
          <StatCard
            label="Total Interns"
            value={interns.length}
            icon={Users}
            tone="slate"
            hint="Under your supervision"
          />
          <StatCard
            label="Avg Progress"
            value={`${
              interns.length
                ? Math.round(
                    interns.reduce((s, i) => s + hoursPercent(i), 0) /
                      interns.length
                  )
                : 0
            }%`}
            icon={Hourglass}
            tone="amber"
            hint="Mean cohort-hour completion"
          />
        </div>

        {/* Full team table */}
        <SectionCard
          title="Intern Time Tracking"
          description="Live clock-in/out status and hour progress for your team."
          noPadding
          actions={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/60">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              LIVE
            </span>
          }
        >
          <DataTable
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            defaultSortKey="status"
            defaultSortDir="desc"
            onRowClick={(r) =>
              navigate("supervisor.intern-view", { studentId: r.id })
            }
            mobileCard={(r) => (
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="relative">
                    <Avatar name={r.name} size="sm" />
                    {r.status === "active" && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {r.name}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {r.studentNumber}
                    </p>
                  </div>
                  {r.status === "active" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/60">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700">
                      Off
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2 text-xs">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      This week
                    </p>
                    <p className="font-mono font-semibold tabular-nums text-foreground">
                      {formatDuration(r.weekMs)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Progress
                    </p>
                    <p className="font-mono font-semibold tabular-nums text-foreground">
                      {r.loggedHours}/{r.requiredHours}h
                    </p>
                  </div>
                </div>
                {r.status === "active" && (
                  <p className="font-mono text-[11px] tabular-nums text-emerald-700 dark:text-emerald-300">
                    Elapsed: {formatTimer(r.elapsedMs)}
                  </p>
                )}
                <div className="flex items-center justify-end pt-1 text-xs font-medium text-primary">
                  Details
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}
            emptyState={
              <div className="p-5">
                <EmptyState
                  icon={Timer}
                  title="No interns assigned"
                  description="Interns assigned to you will appear here."
                />
              </div>
            }
          />
        </SectionCard>
      </div>

    </>
  );
}

export default SupervisorTimeMonitor;
