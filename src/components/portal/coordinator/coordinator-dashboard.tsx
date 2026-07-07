"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import {
  averageScore,
  evaluationsForStudent,
  formatDate,
  getCompany,
  getStudent,
  greeting,
  hoursPercent,
  journalsForStudent,
  studentsWithOverdueJournals,
} from "@/lib/selectors";
import type { Journal, Student, ViewKey, ViewParams } from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { StatCard } from "@/components/portal/shared/stat-card";
import { SectionCard } from "@/components/portal/shared/section-card";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { ProgressBar } from "@/components/portal/shared/progress-ring";
import {
  ScoreBadge,
  JournalStatusBadge,
  UnassignedBadge,
} from "@/components/portal/shared/badges";
import { Avatar } from "@/components/portal/shared/avatar";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { StatCardSkeleton, TableSkeleton } from "@/components/portal/shared/skeletons";
import { useInitialLoading } from "@/components/portal/shared/page-transition";
import { QuickComposePopover } from "@/components/portal/shared/quick-compose-popover";
import { ToolsStatusBanner } from "@/components/portal/shared/tools-status-banner";
import { ConnectToolsSheet } from "@/components/portal/coordinator/connect-tools-sheet";
import { Button } from "@/components/ui/button";
import {
  Users,
  ClipboardCheck,
  NotebookText,
  ArrowRight,
  Plus,
  AlertTriangle,
  CalendarClock,
  XCircle,
  FileText,
} from "lucide-react";

const TERM = "2024-2025";

function isThisWeek(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = Date.now();
  const diff = now - d.getTime();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

interface CohortRow {
  student: Student;
  companyName: string;
  supervisorName: string | null;
  hoursPct: number;
  lastScore: number;
  latestJournalStatus: Journal["status"] | null;
}

type AttentionTab = "unassigned" | "noEval" | "rejected" | "overdue";

export function CoordinatorDashboard() {
  const navigate = useAppStore((s) => s.navigate);
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const evaluations = useAppStore((s) => s.evaluations);
  const journals = useAppStore((s) => s.journals);
  const loading = useInitialLoading(420);

  const [attentionTab, setAttentionTab] = React.useState<AttentionTab>("unassigned");
  const [connectOpen, setConnectOpen] = React.useState(false);

  const cohortRows: CohortRow[] = React.useMemo(() => {
    return students.map((st) => {
      const company = getCompany(companies, st.companyId);
      const sup = supervisors.find((x) => x.id === st.supervisorId);
      const evals = evaluationsForStudent(evaluations, st.id);
      const submitted = evals.find((e) => e.status === "submitted");
      const stuJournals = journalsForStudent(journals, st.id);
      const latest = stuJournals[0] ?? null;
      return {
        student: st,
        companyName: company?.name ?? "—",
        supervisorName: sup?.name ?? null,
        hoursPct: hoursPercent(st),
        lastScore: submitted ? averageScore(submitted) : 0,
        latestJournalStatus: latest?.status ?? null,
      };
    });
  }, [students, supervisors, companies, evaluations, journals]);

  // Attention lists
  const unassigned = React.useMemo(
    () => students.filter((s) => !s.supervisorId),
    [students]
  );
  const noEvaluation = React.useMemo(() => {
    return students.filter((s) => {
      if (!s.supervisorId) return false;
      const evals = evaluationsForStudent(evaluations, s.id);
      return !evals.some(
        (e) => e.status === "submitted" && e.term === TERM
      );
    });
  }, [students, evaluations]);
  const rejectedThisWeek = React.useMemo(() => {
    return journals
      .filter((j) => j.status === "rejected" && j.reviewedAt && isThisWeek(j.reviewedAt))
      .map((j) => ({ journal: j, student: getStudent(students, j.studentId) }))
      .filter((x) => x.student);
  }, [journals, students]);

  const overdueJournals = React.useMemo(
    () => studentsWithOverdueJournals(students, journals, 10),
    [students, journals]
  );

  // KPIs
  const studentsWithSupervisor = students.filter((s) => s.supervisorId);
  const evaluatedCount = studentsWithSupervisor.filter((s) =>
    evaluationsForStudent(evaluations, s.id).some(
      (e) => e.status === "submitted" && e.term === TERM
    )
  ).length;
  const evalPct = studentsWithSupervisor.length
    ? Math.round((evaluatedCount / studentsWithSupervisor.length) * 100)
    : 0;

  const approvedJournals = journals.filter((j) => j.status === "approved").length;
  const journalPct = journals.length
    ? Math.round((approvedJournals / journals.length) * 100)
    : 0;

  const attentionTabs: { key: AttentionTab; label: string; count: number }[] = [
    { key: "unassigned", label: "Unassigned", count: unassigned.length },
    { key: "noEval", label: "No evaluation", count: noEvaluation.length },
    { key: "rejected", label: "Rejected", count: rejectedThisWeek.length },
    { key: "overdue", label: "Overdue journals", count: overdueJournals.length },
  ];
  const totalAttention = attentionTabs.reduce((a, t) => a + t.count, 0);

  const columns: Column<CohortRow>[] = [
    {
      key: "name",
      header: "Student",
      sortValue: (r) => r.student.name,
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.student.name} size="sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">
              {r.student.name}
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              {r.student.studentNumber}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      sortValue: (r) => r.companyName,
      hideOnMobile: true,
      cell: (r) => (
        <span className="text-sm text-muted-foreground">{r.companyName}</span>
      ),
    },
    {
      key: "supervisor",
      header: "Supervisor",
      sortValue: (r) => r.supervisorName ?? "zzz",
      hideOnMobile: true,
      cell: (r) =>
        r.supervisorName ? (
          <span className="text-sm text-muted-foreground">{r.supervisorName}</span>
        ) : (
          <UnassignedBadge />
        ),
    },
    {
      key: "hours",
      header: "Hours",
      sortValue: (r) => r.hoursPct,
      cell: (r) => <ProgressBar value={r.hoursPct} showLabel className="w-24" />,
    },
    {
      key: "eval",
      header: "Last Eval",
      sortValue: (r) => r.lastScore,
      hideOnMobile: true,
      cell: (r) =>
        r.lastScore > 0 ? <ScoreBadge score={r.lastScore} /> : <span className="text-sm text-muted-foreground">—</span>,
    },
    {
      key: "journal",
      header: "Journal",
      cell: (r) =>
        r.latestJournalStatus ? (
          <JournalStatusBadge status={r.latestJournalStatus} />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
  ];

  if (loading) {
    return (
      <div>
        <PageHeader
          title={`${greeting()}, ${currentUser?.name?.split(" ").slice(-1)[0] ?? "Coordinator"}`}
          description={
            <span className="flex flex-wrap gap-x-2 gap-y-1">
              <span className="inline-flex items-center">{students.length} students</span>
              <span aria-hidden className="inline-flex items-center">·</span>
              <span className="inline-flex items-center">{supervisors.filter((s) => s.status === "active").length} supervisors</span>
              <span aria-hidden className="inline-flex items-center">·</span>
              <span className="inline-flex items-center">Term {TERM}</span>
            </span>
          }
          actions={
            <Button onClick={() => navigate("coordinator.student-new")} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          }
        />
        <div className="mb-4 h-11 animate-pulse rounded-xl bg-muted/60" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCardSkeleton count={4} />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TableSkeleton rows={6} cols={6} />
          </div>
          <TableSkeleton rows={4} cols={2} />
        </div>
      </div>
    );
  }

  // Current attention tab items
  const attentionItems =
    attentionTab === "unassigned"
      ? unassigned.map((s) => ({ id: s.id, label: s.name, sub: s.studentNumber }))
      : attentionTab === "noEval"
      ? noEvaluation.map((s) => ({ id: s.id, label: s.name, sub: s.studentNumber }))
      : attentionTab === "rejected"
      ? rejectedThisWeek.map(({ journal, student }) => ({
          id: journal.id,
          label: student?.name ?? "Student",
          sub: formatDate(journal.date),
        }))
      : overdueJournals.map(({ student, daysOverdue }) => ({
          id: student.id,
          label: student.name,
          sub:
            daysOverdue === Infinity
              ? "No journals submitted"
              : `${daysOverdue} days since last journal`,
        }));

  const attentionViewAll =
    attentionTab === "unassigned" || attentionTab === "noEval"
      ? "coordinator.students"
      : "coordinator.journals";

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${currentUser?.name?.split(" ").slice(-1)[0] ?? "Coordinator"}`}
        description={
          <span className="flex flex-wrap gap-x-2 gap-y-1">
            <span className="inline-flex items-center">{students.length} students</span>
            <span aria-hidden className="inline-flex items-center">·</span>
            <span className="inline-flex items-center">{supervisors.filter((s) => s.status === "active").length} supervisors</span>
            <span aria-hidden className="inline-flex items-center">·</span>
            <span className="inline-flex items-center">Term {TERM}</span>
          </span>
        }
        actions={
          <Button onClick={() => navigate("coordinator.student-new")} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Student
          </Button>
        }
      />

      <div className="space-y-5">
        {/* v5: Tools status banner — coordinator can connect/edit from here. */}
        <ToolsStatusBanner role="coordinator" onConnect={() => setConnectOpen(true)} />

        {/* KPIs — 3 cards. 2-up on phone, 3-up sm+. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard
            label="Total Students"
            value={students.length}
            icon={Users}
            tone="teal"
            hint={`${unassigned.length} unassigned`}
            compact
          />
          <StatCard
            label="Evaluations"
            value={`${evalPct}%`}
            icon={ClipboardCheck}
            tone="emerald"
            hint={`${evaluatedCount}/${studentsWithSupervisor.length} submitted`}
            compact
          />
          <StatCard
            label="Journals Approved"
            value={`${journalPct}%`}
            icon={NotebookText}
            tone="amber"
            hint={`${approvedJournals}/${journals.length} approved`}
            compact
            className="col-span-2 sm:col-span-1"
          />
        </div>

        {/* v5: Cohort journal status — at-a-glance counts + at-risk students. */}
        <CohortJournalStatus students={students} journals={journals} navigate={navigate} />

        {/* Main grid: cohort table + needs attention */}
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            title="Cohort Progress"
            description="Hours and evaluation status per student."
            className="lg:col-span-2"
            noPadding
            contentClassName="p-0"
          >
            {/* Density budget (§2.1/§2.2): cap at ~5 rows visible, scroll for
                the rest. No pagination UI clutter on a dashboard. */}
            <div
              className="max-h-[28rem] overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:theme(colors.muted-foreground/40)_transparent]"
            >
            <DataTable
              columns={columns}
              rows={cohortRows}
              getRowId={(r) => r.student.id}
              onRowClick={(r) =>
                navigate("coordinator.student-view", { studentId: r.student.id })
              }
              defaultSortKey="name"
              defaultSortDir="asc"
              pageSize={0}
              rowAccent={(r) =>
                !r.student.supervisorId ? "amber" : undefined
              }
              mobileCard={(r) => (
                <div className="space-y-3">
                  {/* Row 1: avatar + name + ID + journal status */}
                  <div className="flex items-center gap-3">
                    <Avatar name={r.student.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {r.student.name}
                      </div>
                      <div className="truncate font-mono text-xs text-muted-foreground">
                        {r.student.studentNumber}
                      </div>
                    </div>
                    {r.latestJournalStatus && (
                      <div className="shrink-0">
                        <JournalStatusBadge status={r.latestJournalStatus} />
                      </div>
                    )}
                  </div>
                  {/* Row 1b: position · department (full-width, no badge competition) */}
                  <div className="truncate text-xs text-muted-foreground">
                    {r.student.position} · {r.student.department}
                  </div>
                  {/* Row 2: meta — company / supervisor (one per line so neither truncates) */}
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0 font-medium text-foreground/60">Company:</span>
                      <span className="min-w-0 truncate">{r.companyName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0 font-medium text-foreground/60">Supervisor:</span>
                      {r.supervisorName ? (
                        <span className="min-w-0 truncate">{r.supervisorName}</span>
                      ) : (
                        <UnassignedBadge />
                      )}
                    </div>
                  </div>
                  {/* Row 3: hours progress bar + last eval */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Hours</span>
                      {r.lastScore > 0 && <ScoreBadge score={r.lastScore} />}
                    </div>
                    <ProgressBar value={r.hoursPct} showLabel className="w-full" />
                  </div>
                </div>
              )}
              emptyState={
                <div className="p-4">
                  <EmptyState
                    icon={Users}
                    title="No students yet"
                    description="Add your first student to start tracking the cohort."
                    actionLabel="Add Student"
                    onAction={() => navigate("coordinator.student-new")}
                    tone="red"
                    compact
                  />
                </div>
              }
            />
            </div>
            {/* Footer: view the full paginated Students list */}
            {cohortRows.length > 0 && (
              <div className="border-t border-border/50 px-4 py-2.5">
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-xs text-teal-700 dark:text-teal-300"
                  onClick={() => navigate("coordinator.students")}
                >
                  View all students ({cohortRows.length})
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </SectionCard>

          {/* Needs attention — consolidated single panel with tabs */}
          <SectionCard
            title="Needs attention"
            description={totalAttention === 0 ? "Everything is in order." : `${totalAttention} item${totalAttention === 1 ? "" : "s"}`}
            noPadding
            contentClassName="p-0"
          >
            {/* Tab strip */}
            <div className="flex flex-wrap gap-1 border-b border-border/50 px-3 py-2">
              {attentionTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setAttentionTab(t.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    attentionTab === t.key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums",
                      t.count > 0
                        ? attentionTab === t.key
                          ? "bg-primary/20 text-primary"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Items — density budget (§2.1): max 5 items in a bounded,
                scrollable container so this card never eats the viewport. */}
            <div className="p-3">
              {attentionItems.length === 0 ? (
                <p className="flex items-center gap-1.5 py-3 text-xs text-muted-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    ✓
                  </span>
                  All clear in this category.
                </p>
              ) : (
                <>
                  <ul
                    className="max-h-80 space-y-0.5 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:theme(colors.muted-foreground/40)_transparent]"
                  >
                    {attentionItems.slice(0, 5).map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          <AlertTriangle className="h-3 w-3" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">
                            {it.label}
                          </p>
                          {it.sub && (
                            <p className="truncate font-mono text-xs text-muted-foreground">
                              {it.sub}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1.5 h-auto px-0 text-xs text-teal-700 dark:text-teal-300"
                    onClick={() => navigate(attentionViewAll)}
                  >
                    View all ({attentionItems.length})
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Cohort by Department — breakdown card */}
        <CohortByDepartment students={students} />

        {/* Messages CTA — quick-compose to supervisor */}
        <QuickComposePopover
          messagesView="coordinator.messages"
          ctaLabel="Messages from Supervisors"
          counterpartLabel="Supervisor"
        />
      </div>

      {/* v5: Connect Tools sheet — opened from the status banner. */}
      <ConnectToolsSheet open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  );
}

/**
 * CohortJournalStatus — v5 at-a-glance journal status overview.
 * Shows 4 status count tiles + a bounded at-risk list (students whose
 * latest journal is draft/pending and overdue).
 */
function CohortJournalStatus({
  students,
  journals,
  navigate,
}: {
  students: Student[];
  journals: Journal[];
  navigate: (view: ViewKey, params?: ViewParams) => void;
}) {
  // Per-student latest journal status
  const rows = React.useMemo(() => {
    return students.map((st) => {
      const stuJournals = journalsForStudent(journals, st.id);
      const latest = stuJournals[0] ?? null;
      return { student: st, journal: latest };
    });
  }, [students, journals]);

  const counts = React.useMemo(() => {
    const c = { draft: 0, pending: 0, approved: 0, rejected: 0, none: 0 };
    for (const r of rows) {
      if (!r.journal) c.none++;
      else c[r.journal.status]++;
    }
    return c;
  }, [rows]);

  // At-risk: students whose latest journal is draft or none (not submitted)
  // AND who have been in the program > 1 week.
  const atRisk = React.useMemo(() => {
    return rows
      .filter((r) => !r.journal || r.journal.status === "draft" || r.journal.status === "rejected")
      .slice(0, 5);
  }, [rows]);

  const tiles = [
    { label: "Not started", value: counts.none, tone: "text-muted-foreground", bg: "bg-muted/40" },
    { label: "In progress", value: counts.draft, tone: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10" },
    { label: "Submitted", value: counts.pending, tone: "text-sky-700 dark:text-sky-300", bg: "bg-sky-500/10" },
    { label: "Approved", value: counts.approved, tone: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10" },
  ];

  return (
    <SectionCard
      title="Cohort journal status"
      description="Where this week's journals stand across the cohort."
    >
      {/* Status tiles */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={cn("rounded-lg p-2.5 text-center", t.bg)}
          >
            <p className={cn("text-xl font-bold tabular-nums", t.tone)}>{t.value}</p>
            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{t.label}</p>
          </div>
        ))}
      </div>

      {/* At-risk list — bounded (v3 density §2.1) */}
      {atRisk.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            Needs follow-up ({atRisk.length})
          </p>
          <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {atRisk.map(({ student, journal }) => (
              <button
                key={student.id}
                onClick={() => navigate("coordinator.student-view", { studentId: student.id })}
                className="flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-card px-2.5 py-2 text-left transition-colors hover:bg-muted/30"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{student.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {journal?.status === "rejected"
                      ? "Journal returned — needs revision"
                      : journal?.status === "draft"
                      ? "Journal in progress — not submitted"
                      : "No journal submitted yet"}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/**
 * CohortByDepartment — small breakdown card showing how many interns are in
 * each department. Helps the coordinator balance supervisor capacity.
 */
function CohortByDepartment({ students }: { students: Student[] }) {
  const counts = React.useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => {
      map.set(s.department, (map.get(s.department) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([dept, count]) => ({ dept, count }));
  }, [students]);

  const total = students.length;
  const colors: Record<string, string> = {
    Engineering: "bg-teal-500",
    QA: "bg-amber-500",
    Design: "bg-pink-500",
    Marketing: "bg-emerald-500",
    Operations: "bg-slate-500",
    Other: "bg-muted-foreground",
  };

  return (
    <SectionCard
      title="Cohort by Department"
      description={`${total} students across ${counts.length} departments.`}
    >
      <div className="space-y-3">
        {counts.map(({ dept, count }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={dept}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{dept}</span>
                <span className="text-muted-foreground">
                  <span className="font-semibold tabular-nums text-foreground">{count}</span>
                  <span className="text-muted-foreground/60"> · {pct}%</span>
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", colors[dept] ?? "bg-primary")}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
