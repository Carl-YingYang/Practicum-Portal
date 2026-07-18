"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Building2,
  GraduationCap,
  FileText,
  Eye,
  Pencil,
  Lock,
  Download,
  NotebookText,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Timer,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import {
  getStudent,
  getCompany,
  getSupervisor,
  journalsForStudent,
  evaluationsForStudent,
  averageScore,
  hoursPercent,
  formatDate,
  formatDuration,
  formatTime,
  weekLabel,
  timeLogsForStudent,
  weeklyTimeMs,
  totalCompletedTimeMs,
} from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { Avatar } from "@/components/portal/shared/avatar";
import { ProgressRing, ProgressBar } from "@/components/portal/shared/progress-ring";
import {
  ScoreBadge,
  EvaluationStatusBadge,
  JournalStatusBadge,
  Badge,
} from "@/components/portal/shared/badges";
import { SectionCard } from "@/components/portal/shared/section-card";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { WeeklyGroupedSessions } from "@/components/portal/shared/weekly-grouped-sessions";
import { PdfPreviewModal } from "@/components/portal/shared/pdf-preview-modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RATING_CRITERIA, RATING_ANCHORS } from "@/lib/types";
import type { Journal, Evaluation } from "@/lib/types";

export function InternDetail() {
  const viewParams = useAppStore((s) => s.viewParams);
  const students = useAppStore((s) => s.students);
  const journals = useAppStore((s) => s.journals);
  const evaluations = useAppStore((s) => s.evaluations);
  const timeLogs = useAppStore((s) => s.timeLogs);
  const companies = useAppStore((s) => s.companies);
  const supervisors = useAppStore((s) => s.supervisors);
  const currentUser = useAppStore((s) => s.currentUser);
  const navigate = useAppStore((s) => s.navigate);

  const supervisorId = currentUser?.supervisorId ?? "";
  const student = getStudent(students, viewParams.studentId);

  const [pdfOpen, setPdfOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const studentJournals = useMemo(
    () => (student ? journalsForStudent(journals, student.id) : []),
    [journals, student]
  );
  const studentEvals = useMemo(
    () =>
      student
        ? evaluationsForStudent(evaluations, student.id).filter(
            (e) => e.supervisorId === supervisorId
          )
        : [],
    [evaluations, student, supervisorId]
  );
  const studentTimeLogs = useMemo(
    () => (student ? timeLogsForStudent(timeLogs, student.id) : []),
    [timeLogs, student]
  );

  if (!student) {
    return (
      <div>
        <PageHeader title="Intern not found" showBack breadcrumb="My Interns" />
        <EmptyState
          icon={GraduationCap}
          title="Intern not found"
          description="This intern may have been removed."
          actionLabel="Back to My Interns"
          onAction={() => navigate("supervisor.interns")}
        />
      </div>
    );
  }

  const company = getCompany(companies, student.companyId);
  const supervisor = getSupervisor(supervisors, student.supervisorId);
  const pct = hoursPercent(student);

  const submittedEval = studentEvals.find((e) => e.status === "submitted");
  const draftEval = studentEvals.find((e) => e.status === "draft");

  const counts = {
    approved: studentJournals.filter((j) => j.status === "approved").length,
    pending: studentJournals.filter((j) => j.status === "pending").length,
    rejected: studentJournals.filter((j) => j.status === "rejected").length,
    drafts: studentJournals.filter((j) => j.status === "draft").length,
  };

  const journalColumns: Column<Journal>[] = [
    {
      key: "date",
      header: "Date",
      cell: (j) => <span className="font-medium">{formatDate(j.date)}</span>,
      sortValue: (j) => j.date,
    },
    {
      key: "week",
      header: "Week",
      cell: (j) => <span className="text-muted-foreground">{weekLabel(j.date)}</span>,
      sortValue: (j) => weekLabel(j.date),
      hideOnMobile: true,
    },
    {
      key: "hours",
      header: "Hours",
      cell: (j) => <span className="tabular-nums">{j.hours}h</span>,
      sortValue: (j) => j.hours,
      align: "right",
    },
    {
      key: "status",
      header: "Status",
      cell: (j) => <JournalStatusBadge status={j.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (j) =>
        j.status === "pending" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              navigate("supervisor.journal-review", { journalId: j.id });
            }}
          >
            Review
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  const handleEvaluateClick = () => {
    if (submittedEval) return;
    if (draftEval) {
      navigate("supervisor.evaluation-new", { evaluationId: draftEval.id });
    } else {
      navigate("supervisor.evaluation-new", { preselectStudentId: student.id });
    }
  };

  const weekMs = weeklyTimeMs(timeLogs, student.id, now);
  const totalMs = totalCompletedTimeMs(timeLogs, student.id);
  const activeLog = studentTimeLogs.find((t) => t.clockOutAt === null);

  return (
    <div>
      <PageHeader showBack breadcrumb="My Interns" />

      {/* Profile header card — position + department in the header. */}
      <SectionCard>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={student.name} size="xl" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {student.name}
            </h2>
            <p className="mt-0.5 text-sm text-foreground/80">
              {student.position}
            </p>
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
              {student.studentNumber} · {student.course} · {student.department}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{company?.name ?? "—"}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4 shrink-0" />
                <span className="truncate">{supervisor?.name ?? "Unassigned"}</span>
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-2 sm:items-end">
            <ProgressRing value={pct} size={92} label="complete" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {student.loggedHours}h
              </span>{" "}
              / {student.requiredHours}h
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Primary actions — above the fold on desktop; duplicated in the
          sticky bottom action bar on mobile (see below). */}
      <div className="mt-4 hidden flex-wrap items-center gap-2 lg:flex">
        {submittedEval ? (
          <>
            <Button disabled variant="outline">
              <Lock className="h-4 w-4" />
              Evaluation submitted
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                navigate("supervisor.evaluation-view", {
                  evaluationId: submittedEval.id,
                })
              }
            >
              <Eye className="h-4 w-4" />
              View evaluation
            </Button>
            <span className="text-xs text-muted-foreground">
              A submitted evaluation already exists for this term.
            </span>
          </>
        ) : (
          <Button onClick={handleEvaluateClick}>
            {draftEval ? (
              <>
                <Pencil className="h-4 w-4" />
                Edit Evaluation
              </>
            ) : (
              <>
                <ClipboardCheck className="h-4 w-4" />
                Evaluate
              </>
            )}
          </Button>
        )}
        <Button variant="outline" onClick={() => setPdfOpen(true)}>
          <Download className="h-4 w-4" />
          Generate PDF
        </Button>
      </div>

      {/* Sticky bottom action bar (mobile + tablet) — primary CTA flex-1.
          Sits above the bottom tab bar (56px + safe area). */}
      <div className="sticky bottom-[calc(56px+env(safe-area-inset-bottom,0px))] z-20 mt-6 -mx-4 flex gap-2 border-t border-border bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6 lg:hidden">
        {submittedEval ? (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() =>
              navigate("supervisor.evaluation-view", {
                evaluationId: submittedEval.id,
              })
            }
          >
            <Eye className="h-4 w-4" />
            View evaluation
          </Button>
        ) : (
          <Button className="flex-1" onClick={handleEvaluateClick}>
            {draftEval ? (
              <>
                <Pencil className="h-4 w-4" />
                Edit Evaluation
              </>
            ) : (
              <>
                <ClipboardCheck className="h-4 w-4" />
                Evaluate
              </>
            )}
          </Button>
        )}
        <Button variant="outline" onClick={() => setPdfOpen(true)} aria-label="Generate PDF">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="journals">
              Journals
              <span className="ml-1 text-xs text-muted-foreground">
                ({studentJournals.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="evaluations">
              Evaluations
              <span className="ml-1 text-xs text-muted-foreground">
                ({studentEvals.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="time">
              Time Logs
              <span className="ml-1 text-xs text-muted-foreground">
                ({studentTimeLogs.length})
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SectionCard title="Hours progress">
                <div className="flex items-center gap-5">
                  <ProgressRing value={pct} size={96} label="complete" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Logged / Required</p>
                      <p className="text-lg font-semibold tabular-nums text-foreground">
                        {student.loggedHours}h{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          / {student.requiredHours}h
                        </span>
                      </p>
                    </div>
                    <ProgressBar value={pct} showLabel />
                    <p className="text-xs text-muted-foreground">
                      {pct >= 100
                        ? "Required hours complete."
                        : `${student.requiredHours - student.loggedHours}h remaining.`}
                    </p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Activity summary">
                <dl className="grid grid-cols-2 gap-3">
                  <CountTile
                    label="Approved journals"
                    value={counts.approved}
                    icon={CheckCircle2}
                    tone="emerald"
                  />
                  <CountTile
                    label="Pending"
                    value={counts.pending}
                    icon={Clock}
                    tone="amber"
                  />
                  <CountTile
                    label="Rejected"
                    value={counts.rejected}
                    icon={XCircle}
                    tone="red"
                  />
                  <CountTile
                    label="Submitted evals"
                    value={studentEvals.filter((e) => e.status === "submitted").length}
                    icon={ClipboardCheck}
                    tone="teal"
                  />
                </dl>
              </SectionCard>
            </div>
          </TabsContent>

          <TabsContent value="journals" className="mt-4">
            <SectionCard
              title="Weekly journals"
              description={`${studentJournals.length} journal(s) on file.`}
              noPadding
            >
              {studentJournals.length === 0 ? (
                <EmptyState
                  icon={NotebookText}
                  title="No journals yet"
                  description="This intern hasn't submitted any weekly journals."
                />
              ) : (
                <DataTable
                  columns={journalColumns}
                  rows={studentJournals}
                  getRowId={(j) => j.id}
                  defaultSortKey="date"
                  defaultSortDir="desc"
                  rowAccent={(j) =>
                    j.status === "pending"
                      ? "amber"
                      : j.status === "rejected"
                      ? "red"
                      : undefined
                  }
                  mobileCard={(j) => (
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {formatDate(j.date)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {weekLabel(j.date)} · {j.hours}h
                          </p>
                        </div>
                        <div className="shrink-0">
                          <JournalStatusBadge status={j.status} />
                        </div>
                      </div>
                      {j.status === "pending" && (
                        <div className="flex items-center justify-end gap-1 pt-1 text-xs font-medium text-primary">
                          Review
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  )}
                />
              )}
            </SectionCard>
          </TabsContent>

          <TabsContent value="evaluations" className="mt-4">
            <SectionCard title="Evaluations" noPadding>
              {studentEvals.length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No evaluations yet"
                  description="You haven't created any evaluations for this intern."
                  actionLabel="Create evaluation"
                  onAction={() =>
                    navigate("supervisor.evaluation-new", {
                      preselectStudentId: student.id,
                    })
                  }
                />
              ) : (
                <ul className="divide-y divide-border">
                  {studentEvals.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          {e.term} Term
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {e.status === "submitted"
                            ? `Submitted ${formatDate(e.submittedAt)}`
                            : `Draft · last updated ${formatDate(e.createdAt)}`}
                        </p>
                      </div>
                      <ScoreBadge score={averageScore(e)} />
                      <EvaluationStatusBadge status={e.status} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate("supervisor.evaluation-view", {
                            evaluationId: e.id,
                          })
                        }
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </TabsContent>

          <TabsContent value="time" className="mt-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <SectionCard title="This week" className="lg:col-span-1">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100 dark:bg-teal-950/50 dark:text-teal-300 dark:ring-teal-900/60">
                    <Timer className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                      {formatDuration(weekMs)}
                    </p>
                    <p className="text-xs text-muted-foreground">Last 7 days</p>
                  </div>
                </div>
                {activeLog && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/60">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Currently on the clock since {formatTime(activeLog.clockInAt)}
                  </div>
                )}
              </SectionCard>
              <SectionCard title="All-time tracked" className="lg:col-span-1">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900/60">
                    <Clock className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                      {formatDuration(totalMs)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {studentTimeLogs.length} session{studentTimeLogs.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </SectionCard>
              <SectionCard title="Hours progress" className="lg:col-span-1">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/60">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                      {student.loggedHours}h
                    </p>
                    <p className="text-xs text-muted-foreground">
                      / {student.requiredHours}h required ({pct}%)
                    </p>
                  </div>
                </div>
              </SectionCard>
            </div>

            <SectionCard
              title="Clock-in / clock-out history"
              description={`${studentTimeLogs.length} session(s) · grouped by week`}
              noPadding
              contentClassName="p-0"
              className="mt-4"
            >
              {studentTimeLogs.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={Timer}
                    title="No time logs yet"
                    description="This intern hasn't clocked any sessions yet."
                  />
                </div>
              ) : (
                <WeeklyGroupedSessions sessions={studentTimeLogs} />
              )}
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* PDF preview modal — per-intern report */}
      <PdfPreviewModal
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        title={`Intern Report — ${student.name}`}
        subtitle="Print-ready summary of hours, journals, and latest evaluation."
      >
        <div className="space-y-4 text-slate-900">
          <div className="border-b border-slate-200 pb-3">
            <h1 className="text-xl font-bold">Practicum Intern Report</h1>
            <p className="text-xs text-slate-500">Acme Corp · Term 2024-2025</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Field label="Name" value={student.name} />
            <Field label="Student No." value={student.studentNumber} />
            <Field label="Course" value={student.course} />
            <Field label="Company" value={company?.name ?? "—"} />
            <Field label="Supervisor" value={supervisor?.name ?? "—"} />
            <Field
              label="Hours"
              value={`${student.loggedHours} / ${student.requiredHours} (${pct}%)`}
            />
          </div>
          <div>
            <h2 className="mb-1.5 text-sm font-semibold">Approved journals</h2>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th className="py-1 pr-2">Date</th>
                  <th className="py-1 pr-2">Week</th>
                  <th className="py-1 pr-2 text-right">Hours</th>
                </tr>
              </thead>
              <tbody>
                {studentJournals
                  .filter((j) => j.status === "approved")
                  .map((j) => (
                    <tr key={j.id} className="border-b border-slate-100">
                      <td className="py-1 pr-2">{formatDate(j.date)}</td>
                      <td className="py-1 pr-2 text-slate-600">
                        {weekLabel(j.date)}
                      </td>
                      <td className="py-1 pr-2 text-right tabular-nums">
                        {j.hours}h
                      </td>
                    </tr>
                  ))}
                {studentJournals.filter((j) => j.status === "approved").length ===
                  0 && (
                  <tr>
                    <td colSpan={3} className="py-2 text-slate-500">
                      No approved journals.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {submittedEval && (
            <div>
              <h2 className="mb-1.5 text-sm font-semibold">Latest evaluation</h2>
              <div className="space-y-1 text-xs">
                {RATING_CRITERIA.map((c) => (
                  <div
                    key={c.key}
                    className="flex justify-between border-b border-slate-100 py-1"
                  >
                    <span>{c.label}</span>
                    <span className="font-medium">
                      {submittedEval[c.key]}/5 — {RATING_ANCHORS[submittedEval[c.key]]}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between py-1 font-semibold">
                  <span>Average</span>
                  <span>{averageScore(submittedEval).toFixed(2)}/5</span>
                </div>
              </div>
            </div>
          )}
          <div className="mt-6 grid grid-cols-2 gap-6 pt-6 text-xs text-slate-500">
            <div>
              <p>Supervisor signature</p>
              <div className="mt-6 border-t border-slate-400" />
            </div>
            <div>
              <p>Date</p>
              <div className="mt-6 border-t border-slate-400" />
            </div>
          </div>
        </div>
      </PdfPreviewModal>
    </div>
  );
}

function CountTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof CheckCircle2;
  tone: "emerald" | "amber" | "red" | "teal";
}) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <span className={`flex h-9 w-9 items-center justify-center rounded-md ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
