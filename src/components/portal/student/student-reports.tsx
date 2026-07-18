"use client";

import * as React from "react";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { PdfPreviewModal } from "@/components/portal/shared/pdf-preview-modal";
import {
  EvaluationDocument,
} from "./evaluation-view";
import { TimeLogReportLauncher } from "@/components/portal/shared/time-log-report-launcher";
import { useAppStore } from "@/store/use-app-store";
import {
  evaluationsForStudent,
  formatDate,
  getCompany,
  getStudent,
  getSupervisor,
  hoursPercent,
  journalsForStudent,
  averageScore,
  completedTimeLogsForUser,
  totalCompletedTimeMs,
  formatDuration,
} from "@/lib/selectors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ClipboardCheck,
  Download,
  FileText,
  NotebookText,
  Clock,
  Timer,
  Award,
} from "lucide-react";
import { AccreditationDocument } from "@/components/portal/shared/accreditation-document";
import { mockUsers } from "@/lib/mock-data";

export function StudentReports() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const evaluations = useAppStore((s) => s.evaluations);
  const journals = useAppStore((s) => s.journals);
  const companies = useAppStore((s) => s.companies);
  const supervisors = useAppStore((s) => s.supervisors);
  const timeLogs = useAppStore((s) => s.timeLogs);
  const toolsConfig = useAppStore((s) => s.toolsConfig);

  const [evalPdfOpen, setEvalPdfOpen] = React.useState(false);
  const [journalPdfOpen, setJournalPdfOpen] = React.useState(false);
  const [accreditationOpen, setAccreditationOpen] = React.useState(false);

  const student = getStudent(students, currentUser?.studentId);
  if (!student) return null;

  const myEvaluations = evaluationsForStudent(evaluations, student.id);
  const latestEval =
    myEvaluations.find((e) => e.status === "submitted") ?? myEvaluations[0];
  const hasEval = !!latestEval && latestEval.status === "submitted";

  const company = getCompany(companies, student.companyId);
  const supervisor = getSupervisor(supervisors, latestEval?.supervisorId);

  const myJournals = journalsForStudent(journals, student.id);
  const approvedJournals = myJournals.filter((j) => j.status === "approved");
  const pct = hoursPercent(student);

  // Time log data
  const myCompletedSessions = completedTimeLogsForUser(timeLogs, student.id);
  const myTotalMs = totalCompletedTimeMs(timeLogs, student.id);
  const hasSessions = myCompletedSessions.length > 0;

  // Mock "last generated" timestamps (purely cosmetic).
  const evalLastGenerated = "Jun 2, 2025";
  const journalLastGenerated = "Jun 16, 2025";
  const timeLogLastGenerated = "Jun 21, 2025";

  // Coordinator name (for the accreditation sign-off page)
  const coordinator = mockUsers.find((u) => u.role === "coordinator");
  const coordinatorName = coordinator?.name ?? "Practicum Coordinator";

  return (
    <>
      <PageHeader
        breadcrumb="Reports"
        description="Download PDF copies of your practicum evaluation, journal history, and time logs."
      />

      {/* Accreditation banner — the "moat" document that stitches everything */}
      <Card className="mb-4 border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-5 dark:border-teal-900 dark:from-teal-950/40 dark:to-emerald-950/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300">
              <Award className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">
                  Accreditation Document
                </h2>
                <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Official
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                The complete practicum record — cover page, weekly journals
                index, timesheet summary, evaluation results, and signature
                lines. Print to PDF, sign manually, and submit to the
                Practicum Office.
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <NotebookText className="h-3 w-3" />
                  {approvedJournals.length} journals
                </span>
                <span className="inline-flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  {student.loggedHours}h / {student.requiredHours}h
                </span>
                <span className="inline-flex items-center gap-1">
                  <ClipboardCheck className="h-3 w-3" />
                  {hasEval ? "Eval submitted" : "Eval pending"}
                </span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setAccreditationOpen(true)}
            className="w-full shrink-0 sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Generate Document
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Evaluation report card */}
        <Card className="flex flex-col gap-0 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Evaluation Report
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A full breakdown of your supervisor&apos;s evaluation —
                criteria scores, strengths, areas for improvement, and
                recommendations.
              </p>
            </div>
          </div>

          {hasEval && latestEval ? (
            <>
              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Average</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                    {averageScore(latestEval).toFixed(1)} / 5
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Term</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {latestEval.term}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Supervisor</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {supervisor?.name ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Submitted</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {formatDate(latestEval.submittedAt)}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">
                Last generated: {evalLastGenerated}
              </p>
              <Button
                className="mt-3 w-full"
                onClick={() => setEvalPdfOpen(true)}
              >
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            </>
          ) : (
            <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileText className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-foreground">
                No evaluation available
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Your supervisor hasn&apos;t submitted an evaluation for you
                this term yet. Check back once it&apos;s submitted.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                disabled
                aria-disabled
              >
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            </div>
          )}
        </Card>

        {/* Journal report card */}
        <Card className="flex flex-col gap-0 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <NotebookText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Journal Report
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A compliance summary of your approved weekly journals — dates,
                hours logged, and progress toward your required total.
              </p>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Approved journals</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                {approvedJournals.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Hours completed</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                {student.loggedHours} / {student.requiredHours}h
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="mb-1 text-xs text-muted-foreground">
                Completion ({pct}%)
              </dt>
              <dd className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Last generated: {journalLastGenerated}
          </p>
          <Button
            className="mt-3 w-full"
            variant="outline"
            onClick={() => setJournalPdfOpen(true)}
            disabled={approvedJournals.length === 0}
          >
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          {approvedJournals.length === 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              No approved journals to report yet.
            </p>
          )}
        </Card>

        {/* Time Log report card */}
        <Card className="flex flex-col gap-0 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Timer className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Time Log Report
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Every clock-in/out session grouped by week, with subtotals and a
                grand total toward your practicum hours.
              </p>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Sessions</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                {myCompletedSessions.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Total tracked</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-foreground">
                {formatDuration(myTotalMs)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="mb-1 text-xs text-muted-foreground">
                Of required {student.requiredHours}h
              </dt>
              <dd className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((myTotalMs / 3600_000 / student.requiredHours) * 100))}%`,
                  }}
                />
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Last generated: {timeLogLastGenerated}
          </p>
          {hasSessions ? (
            <TimeLogReportLauncher
              trigger={
                <Button
                  className="mt-3 w-full"
                  variant="outline"
                  disabled={!hasSessions}
                >
                  <Download className="h-4 w-4" /> Download PDF
                </Button>
              }
              title="Time Log Report"
              subtitle={`${student.name} · ${student.studentNumber}`}
              rows={[
                {
                  student,
                  companyName: company?.name,
                  supervisorName: supervisor?.name,
                  sessions: myCompletedSessions,
                },
              ]}
            />
          ) : (
            <Button
              className="mt-3 w-full"
              variant="outline"
              disabled
              aria-disabled
            >
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          )}
          {!hasSessions && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              No completed sessions to report yet.
            </p>
          )}
        </Card>
      </div>

      {/* Evaluation PDF */}
      <PdfPreviewModal
        open={evalPdfOpen}
        onOpenChange={setEvalPdfOpen}
        title="Evaluation Report"
        subtitle={`${student.name} · Term ${latestEval?.term ?? ""}`}
      >
        {latestEval ? (
          <EvaluationDocument
            evaluation={latestEval}
            studentName={student.name}
            studentNumber={student.studentNumber}
            course={student.course}
            companyName={company?.name}
            supervisorName={supervisor?.name}
          />
        ) : null}
      </PdfPreviewModal>

      {/* Journal PDF */}
      <PdfPreviewModal
        open={journalPdfOpen}
        onOpenChange={setJournalPdfOpen}
        title="Journal Compliance Report"
        subtitle={`${student.name} · ${approvedJournals.length} approved journals`}
      >
        <JournalReportDocument
          studentName={student.name}
          studentNumber={student.studentNumber}
          course={student.course}
          companyName={company?.name}
          requiredHours={student.requiredHours}
          loggedHours={student.loggedHours}
          journals={approvedJournals}
        />
      </PdfPreviewModal>

      {/* Accreditation PDF — the "moat" document */}
      <PdfPreviewModal
        open={accreditationOpen}
        onOpenChange={setAccreditationOpen}
        title="Accreditation Document"
        subtitle={`${student.name} · ${student.studentNumber} · ${company?.name ?? ""}`}
      >
        <AccreditationDocument
          student={student}
          supervisor={supervisor ?? null}
          company={company ?? null}
          journals={myJournals}
          evaluations={myEvaluations}
          toolsConfig={toolsConfig}
          completedTimeMs={myTotalMs}
          coordinatorName={coordinatorName}
        />
      </PdfPreviewModal>

      {/* Time Log PDF is rendered by TimeLogReportLauncher */}
    </>
  );
}

interface JournalReportDocumentProps {
  studentName: string;
  studentNumber: string;
  course: string;
  companyName?: string;
  requiredHours: number;
  loggedHours: number;
  journals: Array<{
    id: string;
    date: string;
    hours: number;
  }>;
}

function JournalReportDocument({
  studentName,
  studentNumber,
  course,
  companyName,
  requiredHours,
  loggedHours,
  journals,
}: JournalReportDocumentProps) {
  const pct = requiredHours > 0 ? Math.min(100, Math.round((loggedHours / requiredHours) * 100)) : 0;
  return (
    <div className="space-y-6 text-black">
      <div className="border-b border-slate-300 pb-4">
        <h1 className="text-xl font-bold">Journal Compliance Report</h1>
        <p className="text-xs text-slate-600">Practicum Evaluation Portal</p>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Student
          </p>
          <p className="font-medium">{studentName}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Student Number
          </p>
          <p className="font-mono">{studentNumber}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Course
          </p>
          <p>{course}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Company
          </p>
          <p>{companyName ?? "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded border border-slate-300 p-3 text-sm">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Required
          </p>
          <p className="text-base font-bold tabular-nums">{requiredHours}h</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Logged
          </p>
          <p className="text-base font-bold tabular-nums">{loggedHours}h</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Completion
          </p>
          <p className="text-base font-bold tabular-nums">{pct}%</p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
          Approved Journals ({journals.length})
        </h2>
        {journals.length === 0 ? (
          <p className="text-sm text-slate-600">
            No approved journals on record.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left text-[10px] uppercase tracking-wide text-slate-500">
                <th className="py-1.5">#</th>
                <th className="py-1.5">Date</th>
                <th className="py-1.5">Week of</th>
                <th className="py-1.5 text-right">Hours</th>
              </tr>
            </thead>
            <tbody>
              {journals.map((j, i) => (
                <tr key={j.id} className="border-b border-slate-200">
                  <td className="py-1.5 tabular-nums">{i + 1}</td>
                  <td className="py-1.5">{formatDate(j.date)}</td>
                  <td className="py-1.5 text-slate-600">
                    {weekOfLabel(j.date)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{j.hours}h</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-400 font-semibold">
                <td className="py-2" colSpan={3}>
                  Total
                </td>
                <td className="py-2 text-right tabular-nums">
                  {journals.reduce((s, j) => s + j.hours, 0)}h
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-500">
        <Clock className="h-3 w-3" />
        Generated on {formatDate(new Date().toISOString())} · Practicum
        Evaluation Portal
      </div>
    </div>
  );
}

function weekOfLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default StudentReports;
