"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  averageScore,
  evaluationsForStudent,
  formatDate,
  formatDuration,
  formatTime,
  getCompany,
  getSupervisor,
  hoursPercent,
  journalsForStudent,
  timeLogsForStudent,
  weeklyTimeMs,
  totalCompletedTimeMs,
  weekLabel,
} from "@/lib/selectors";
import type { Journal, Evaluation, Student } from "@/lib/types";
import { WORK_MODE_LABELS } from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { DataTable, type Column } from "@/components/portal/shared/data-table";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { WeeklyGroupedSessions } from "@/components/portal/shared/weekly-grouped-sessions";
import { Avatar } from "@/components/portal/shared/avatar";
import { ProgressRing } from "@/components/portal/shared/progress-ring";
import {
  ScoreBadge,
  JournalStatusBadge,
  EvaluationStatusBadge,
  UnassignedBadge,
  Badge,
} from "@/components/portal/shared/badges";
import { PdfPreviewModal } from "@/components/portal/shared/pdf-preview-modal";
import { AccreditationDocument } from "@/components/portal/shared/accreditation-document";
import { CentralizedTimesheetLauncher } from "@/components/portal/shared/centralized-timesheet-launcher";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Pencil,
  FileText,
  Eye,
  Building2,
  Mail,
  AlertCircle,
  Clock,
  ClipboardCheck,
  NotebookText,
  Timer,
  CalendarRange,
  UserCog,
  Award,
} from "lucide-react";
import { ReassignSupervisorSheet } from "@/components/portal/shared/reassign-supervisor-sheet";

export function StudentDetail({ studentId }: { studentId?: string }) {
  const navigate = useAppStore((s) => s.navigate);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const evaluations = useAppStore((s) => s.evaluations);
  const journals = useAppStore((s) => s.journals);
  const timeLogs = useAppStore((s) => s.timeLogs);
  const toolsConfig = useAppStore((s) => s.toolsConfig);
  const currentUser = useAppStore((s) => s.currentUser);

  const student = students.find((s) => s.id === studentId);
  const [pdfOpen, setPdfOpen] = React.useState(false);
  const [accreditationOpen, setAccreditationOpen] = React.useState(false);
  const [reassignOpen, setReassignOpen] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!student) {
    return (
      <div>
        <PageHeader title="Student Detail" showBack breadcrumb="Students" />
        <EmptyState
          icon={AlertCircle}
          title="Student not found"
          description="This student may have been removed."
          actionLabel="Back to students"
          onAction={() => navigate("coordinator.students")}
        />
      </div>
    );
  }

  const company = getCompany(companies, student.companyId);
  const supervisor = getSupervisor(supervisors, student.supervisorId);
  const studentJournals = journalsForStudent(journals, student.id);
  const studentEvals = evaluationsForStudent(evaluations, student.id);
  const studentTimeLogs = timeLogsForStudent(timeLogs, student.id);
  const activeLog = studentTimeLogs.find((t) => t.clockOutAt === null);
  const weekMs = weeklyTimeMs(timeLogs, student.id, now);
  const totalMs = totalCompletedTimeMs(timeLogs, student.id);
  const submittedEval = studentEvals.find((e) => e.status === "submitted");
  const pct = hoursPercent(student);

  const journalCounts = {
    approved: studentJournals.filter((j) => j.status === "approved").length,
    pending: studentJournals.filter((j) => j.status === "pending").length,
    rejected: studentJournals.filter((j) => j.status === "rejected").length,
    draft: studentJournals.filter((j) => j.status === "draft").length,
  };

  const journalColumns: Column<Journal>[] = [
    {
      key: "date",
      header: "Date",
      sortValue: (j) => j.date,
      cell: (j) => <span className="text-sm">{formatDate(j.date)}</span>,
    },
    {
      key: "week",
      header: "Week",
      hideOnMobile: true,
      cell: (j) => <span className="text-sm text-muted-foreground">{weekLabel(j.date)}</span>,
    },
    {
      key: "hours",
      header: "Hours",
      sortValue: (j) => j.hours,
      align: "right",
      cell: (j) => <span className="text-sm tabular-nums">{j.hours}h</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (j) => <JournalStatusBadge status={j.status} />,
    },
    {
      key: "view",
      header: "",
      align: "right",
      cell: (j) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate("coordinator.journal-view", { journalId: j.id });
          }}
        >
          <Eye className="h-4 w-4" />
          View
        </Button>
      ),
    },
  ];

  const evalColumns: Column<Evaluation>[] = [
    {
      key: "supervisor",
      header: "Supervisor",
      cell: (e) => {
        const sup = getSupervisor(supervisors, e.supervisorId);
        return <span className="text-sm">{sup?.name ?? "—"}</span>;
      },
    },
    {
      key: "date",
      header: "Submitted",
      sortValue: (e) => e.submittedAt ?? e.createdAt,
      hideOnMobile: true,
      cell: (e) => (
        <span className="text-sm text-muted-foreground">{formatDate(e.submittedAt ?? e.createdAt)}</span>
      ),
    },
    {
      key: "avg",
      header: "Average",
      sortValue: (e) => averageScore(e),
      align: "right",
      cell: (e) => <ScoreBadge score={averageScore(e)} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (e) => <EvaluationStatusBadge status={e.status} />,
    },
    {
      key: "view",
      header: "",
      align: "right",
      cell: (e) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(ev) => {
            ev.stopPropagation();
            navigate("coordinator.evaluation-view", { evaluationId: e.id });
          }}
        >
          <Eye className="h-4 w-4" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={student.name}
        breadcrumb="Students"
        showBack
        actions={
          <>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() =>
                navigate("coordinator.student-new", { studentId: student.id })
              }
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button onClick={() => setPdfOpen(true)} className="w-full sm:w-auto">
              <FileText className="h-4 w-4" />
              Generate PDF
            </Button>
            <Button
              onClick={() => setAccreditationOpen(true)}
              className="w-full sm:w-auto"
            >
              <Award className="h-4 w-4" />
              Accreditation
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setReassignOpen(true)}
            >
              <UserCog className="h-4 w-4" />
              Reassign
            </Button>
          </>
        }
      />

      {/* Profile header — position + department in the header. */}
      <SectionCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={student.name} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{student.name}</h2>
              <Badge tone={student.status === "active" ? "emerald" : "slate"}>
                {student.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-foreground/80">
              {student.position}
            </p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              {student.studentNumber} · {student.course} · {student.department}
            </p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{company?.name ?? "—"}</span>
                <span className="shrink-0 text-muted-foreground/60">·</span>
                <span className="shrink-0 text-xs">{WORK_MODE_LABELS[student.workMode]}</span>
              </p>
              <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{student.email}</span>
              </p>
              <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <ClipboardCheck className="h-4 w-4 shrink-0" />
                {supervisor ? (
                  <span className="min-w-0 truncate">
                    {supervisor.name}
                    <span className="text-muted-foreground/70"> · {supervisor.title}</span>
                  </span>
                ) : (
                  <UnassignedBadge />
                )}
              </p>
              <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <CalendarRange className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">{formatDate(student.startDate)} → {formatDate(student.endDate)}</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-2 sm:w-44">
            <ProgressRing value={pct} size={104} label="complete" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                {student.loggedHours}h / {student.requiredHours}h
              </p>
              <p className="text-xs text-muted-foreground">Logged hours</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Tabs */}
      <div className="mt-4">
        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="journals">Journals ({studentJournals.length})</TabsTrigger>
            <TabsTrigger value="evaluations">Evaluations ({studentEvals.length})</TabsTrigger>
            <TabsTrigger value="time">Time Logs ({studentTimeLogs.length})</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SectionCard title="Hours Progress">
                <div className="flex items-center gap-3">
                  <ProgressRing value={pct} size={64} strokeWidth={6} />
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-foreground">{pct}%</p>
                    <p className="text-xs text-muted-foreground">
                      {student.loggedHours} of {student.requiredHours}h
                    </p>
                  </div>
                </div>
              </SectionCard>
              <SectionCard title="Journals Submitted">
                <div className="space-y-1.5 text-sm">
                  <p className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Approved
                    </span>
                    <span className="font-semibold tabular-nums">{journalCounts.approved}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Pending
                    </span>
                    <span className="font-semibold tabular-nums">{journalCounts.pending}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Rejected
                    </span>
                    <span className="font-semibold tabular-nums">{journalCounts.rejected}</span>
                  </p>
                </div>
              </SectionCard>
              <SectionCard title="Evaluations">
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {studentEvals.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {studentEvals.filter((e) => e.status === "submitted").length} submitted ·{" "}
                  {studentEvals.filter((e) => e.status === "draft").length} draft
                </p>
              </SectionCard>
              <SectionCard title="Latest Average">
                {submittedEval ? (
                  <>
                    <ScoreBadge score={averageScore(submittedEval)} className="text-base" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Term {submittedEval.term}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No submitted evaluation yet.</p>
                )}
              </SectionCard>
            </div>
          </TabsContent>

          {/* Journals */}
          <TabsContent value="journals" className="mt-4">
            <SectionCard noPadding contentClassName="p-0">
              <DataTable
                columns={journalColumns}
                rows={studentJournals}
                getRowId={(j) => j.id}
                onRowClick={(j) =>
                  navigate("coordinator.journal-view", { journalId: j.id })
                }
                defaultSortKey="date"
                defaultSortDir="desc"
                mobileCard={(j) => (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
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
                )}
                emptyState={
                  <EmptyState
                    icon={NotebookText}
                    title="No journals yet"
                    description="This student has not submitted any weekly journals."
                  />
                }
              />
            </SectionCard>
          </TabsContent>

          {/* Evaluations */}
          <TabsContent value="evaluations" className="mt-4">
            <SectionCard noPadding contentClassName="p-0">
              <DataTable
                columns={evalColumns}
                rows={studentEvals}
                getRowId={(e) => e.id}
                onRowClick={(e) =>
                  navigate("coordinator.evaluation-view", { evaluationId: e.id })
                }
                defaultSortKey="date"
                defaultSortDir="desc"
                mobileCard={(e) => {
                  const sup = getSupervisor(supervisors, e.supervisorId);
                  return (
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {sup?.name ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(e.submittedAt ?? e.createdAt)}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <EvaluationStatusBadge status={e.status} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Average
                        </span>
                        <ScoreBadge score={averageScore(e)} />
                      </div>
                    </div>
                  );
                }}
                emptyState={
                  <EmptyState
                    icon={ClipboardCheck}
                    title="No evaluations yet"
                    description="The supervisor has not created an evaluation for this student."
                  />
                }
              />
            </SectionCard>
          </TabsContent>

          {/* Time Logs */}
          <TabsContent value="time" className="mt-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <SectionCard title="This week">
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
              <SectionCard title="All-time tracked">
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
              <SectionCard title="Hours progress">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/60">
                    <ClipboardCheck className="h-5 w-5" />
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
              actions={
                <CentralizedTimesheetLauncher
                  trigger={
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      View Timesheet
                    </Button>
                  }
                  companyName={getCompany(companies, student.companyId)?.name ?? "Practicum Host"}
                  student={student}
                  supervisorName={getSupervisor(supervisors, student.supervisorId)?.name}
                  sessions={studentTimeLogs}
                  institutionName="Practicum Evaluation Portal"
                />
              }
            >
              {studentTimeLogs.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={Timer}
                    title="No time logs yet"
                    description="This student hasn't clocked any sessions yet."
                  />
                </div>
              ) : (
                <WeeklyGroupedSessions sessions={studentTimeLogs} />
              )}
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky bottom action bar (mobile + tablet) — primary CTAs thumb-reachable. */}
      <div className="sticky bottom-[calc(56px+env(safe-area-inset-bottom,0px))] z-20 mt-6 -mx-5 flex gap-2 border-t border-border bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6 lg:hidden">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() =>
            navigate("coordinator.student-new", { studentId: student.id })
          }
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setReassignOpen(true)}
        >
          <UserCog className="h-4 w-4" />
          Reassign
        </Button>
        <Button onClick={() => setPdfOpen(true)} aria-label="Generate PDF">
          <FileText className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => setAccreditationOpen(true)}
          aria-label="Accreditation PDF"
        >
          <Award className="h-4 w-4" />
        </Button>
      </div>

      <PdfPreviewModal
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        title={`${student.name} — Summary`}
        subtitle={`${student.studentNumber} · ${company?.name ?? ""} · ${student.course}`}
      >
        <StudentSummaryDoc
          student={student}
          companyName={company?.name ?? "—"}
          supervisorName={supervisor?.name ?? null}
          journals={studentJournals}
          evaluations={studentEvals}
        />
      </PdfPreviewModal>

      <PdfPreviewModal
        open={accreditationOpen}
        onOpenChange={setAccreditationOpen}
        title={`${student.name} — Accreditation Document`}
        subtitle={`Official record · ${student.studentNumber} · ${company?.name ?? ""}`}
      >
        <AccreditationDocument
          student={student}
          supervisor={supervisor ?? null}
          company={company ?? null}
          journals={studentJournals}
          evaluations={studentEvals}
          toolsConfig={toolsConfig}
          completedTimeMs={totalMs}
          coordinatorName={currentUser?.name ?? "Practicum Coordinator"}
        />
      </PdfPreviewModal>

      <ReassignSupervisorSheet
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        student={student}
      />
    </div>
  );
}

function StudentSummaryDoc({
  student,
  companyName,
  supervisorName,
  journals,
  evaluations,
}: {
  student: Student;
  companyName: string;
  supervisorName: string | null;
  journals: Journal[];
  evaluations: Evaluation[];
}) {
  const pct = hoursPercent(student);
  const submitted = evaluations.find((e) => e.status === "submitted");
  const avg = submitted ? averageScore(submitted) : 0;
  return (
    <div className="space-y-4 text-slate-900">
      <div className="flex items-center justify-between border-b border-slate-300 pb-3">
        <div>
          <h1 className="text-lg font-bold">Practicum Summary</h1>
          <p className="text-xs text-slate-600">Term 2024-2025</p>
        </div>
        <div className="text-right text-xs text-slate-600">
          <p>Generated {formatDate(new Date().toISOString())}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="font-semibold">{student.name}</p>
          <p className="font-mono text-xs">{student.studentNumber}</p>
          <p className="text-xs">{student.email}</p>
          <p className="text-xs">{student.course}</p>
        </div>
        <div className="text-right">
          <p className="text-xs">Company</p>
          <p className="font-medium">{companyName}</p>
          <p className="mt-1 text-xs">Supervisor</p>
          <p className="font-medium">{supervisorName ?? "—"}</p>
        </div>
      </div>
      <div className="rounded border border-slate-300 p-3 text-sm">
        <p className="font-semibold">Hours Completion</p>
        <p className="mt-1">
          {student.loggedHours} / {student.requiredHours} hours ({pct}%)
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-teal-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="rounded border border-slate-300 p-3 text-sm">
        <p className="font-semibold">Evaluation Summary</p>
        {submitted ? (
          <div className="mt-1 space-y-1 text-xs">
            <p>Quality of Work: {submitted.qualityOfWork}/5</p>
            <p>Job Knowledge: {submitted.jobKnowledge}/5</p>
            <p>Dependability: {submitted.dependability}/5</p>
            <p className="font-semibold">Average: {avg.toFixed(2)}/5</p>
            <p className="text-slate-600">Submitted {formatDate(submitted.submittedAt)}</p>
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-600">No submitted evaluation on record.</p>
        )}
      </div>
      <div className="rounded border border-slate-300 p-3 text-sm">
        <p className="font-semibold">Journal Log ({journals.length} entries)</p>
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-1">Date</th>
              <th className="py-1">Hours</th>
              <th className="py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {journals.slice(0, 12).map((j) => (
              <tr key={j.id} className="border-b border-slate-200">
                <td className="py-1">{formatDate(j.date)}</td>
                <td className="py-1">{j.hours}h</td>
                <td className="py-1 capitalize">{j.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-center text-[10px] text-slate-500">
        Practicum Evaluation Portal · Coordinator summary · Confidential
      </p>
    </div>
  );
}
