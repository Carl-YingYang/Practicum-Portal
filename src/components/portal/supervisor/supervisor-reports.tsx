"use client";

import { useMemo, useState } from "react";
import {
  FileText,
  ClipboardCheck,
  NotebookText,
  Download,
  Users,
  Timer,
} from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import {
  studentsForSupervisor,
  evaluationsForStudent,
  journalsForStudent,
  averageScore,
  getCompany,
  getSupervisor,
  formatDate,
  weekLabel,
  hoursPercent,
  completedTimeLogsForUser,
  totalCompletedTimeMs,
  formatDuration,
} from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { PdfPreviewModal } from "@/components/portal/shared/pdf-preview-modal";
import { TimeLogReportLauncher } from "@/components/portal/shared/time-log-report-launcher";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RATING_ANCHORS } from "@/lib/types";
import type { Student, Evaluation, Journal } from "@/lib/types";
import { downloadPdfReport } from "@/lib/client-pdf";

type ReportType = "evaluation-summary" | "journal-report" | "time-log-report";

export function SupervisorReports() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const evaluations = useAppStore((s) => s.evaluations);
  const journals = useAppStore((s) => s.journals);
  const companies = useAppStore((s) => s.companies);
  const supervisors = useAppStore((s) => s.supervisors);
  const timeLogs = useAppStore((s) => s.timeLogs);

  const supervisorId = currentUser?.supervisorId ?? "";
  const [openReport, setOpenReport] = useState<ReportType | null>(null);

  const interns = useMemo(
    () => studentsForSupervisor(students, supervisorId),
    [students, supervisorId]
  );

  // For evaluation summary: latest submitted eval per intern.
  const evalSummary = useMemo(() => {
    return interns.map((s) => {
      const submitted = evaluationsForStudent(evaluations, s.id)
        .filter((e) => e.supervisorId === supervisorId && e.status === "submitted")
        .sort((a, b) => (a.submittedAt ?? "") < (b.submittedAt ?? "") ? 1 : -1)[0];
      return { student: s, evaluation: submitted as Evaluation | undefined };
    });
  }, [interns, evaluations, supervisorId]);

  // For journal report: approved journals per intern.
  const journalReport = useMemo(() => {
    return interns.map((s) => {
      const all = journalsForStudent(journals, s.id);
      const approved = all.filter((j) => j.status === "approved");
      const totalApprovedHours = approved.reduce((sum, j) => sum + j.hours, 0);
      return { student: s, approvedJournals: approved as Journal[], totalApprovedHours };
    });
  }, [interns, journals]);

  // For time log report: completed sessions per intern.
  const timeLogReport = useMemo(() => {
    return interns.map((s) => {
      const sessions = completedTimeLogsForUser(timeLogs, s.id);
      const totalMs = totalCompletedTimeMs(timeLogs, s.id);
      return { student: s, sessions, totalMs };
    });
  }, [interns, timeLogs]);

  const totalSessions = timeLogReport.reduce((s, r) => s + r.sessions.length, 0);
  const totalMs = timeLogReport.reduce((s, r) => s + r.totalMs, 0);

  const open = openReport !== null;
  const close = () => setOpenReport(null);

  const reportTitle =
    openReport === "evaluation-summary"
      ? "Evaluation Summary — All Interns"
      : openReport === "journal-report"
      ? "Per-Intern Journal Report"
      : openReport === "time-log-report"
      ? "Per-Intern Time Log Report"
      : "";

  // ---------- Real PDF download builders ----------
  const buildEvaluationSummaryPdf = () => {
    downloadPdfReport({
      filename: "evaluation-summary-all-interns",
      title: "Evaluation Summary — All Interns",
      subtitle: `${interns.length} interns · ${evalSummary.filter((r) => r.evaluation).length} evaluated · Term 2024-2025`,
      meta: [
        { label: "Interns", value: String(interns.length) },
        {
          label: "Evaluated",
          value: String(evalSummary.filter((r) => r.evaluation).length),
        },
        { label: "Term", value: "2024-2025" },
      ],
      sections: [
        {
          table: {
            head: [
              "Intern",
              "Student No.",
              "Course",
              "Company",
              "Quality",
              "Job Knwl.",
              "Depend.",
              "Avg",
            ],
            body: evalSummary.map(({ student, companyName, evaluation }) => [
              student.name,
              student.studentNumber,
              student.course,
              companyName ?? "—",
              evaluation ? `${evaluation.qualityOfWork}/5` : "—",
              evaluation ? `${evaluation.jobKnowledge}/5` : "—",
              evaluation ? `${evaluation.dependability}/5` : "—",
              evaluation ? averageScore(evaluation).toFixed(2) : "—",
            ]),
            align: [
              "left",
              "left",
              "left",
              "left",
              "center",
              "center",
              "center",
              "center",
            ],
          },
          paragraphs: [
            {
              label: "Rating anchors",
              text: "1 = Poor · 2 = Below Expectations · 3 = Meets Expectations · 4 = Exceeds · 5 = Outstanding",
            },
          ],
        },
      ],
    });
  };

  const buildJournalReportPdf = () => {
    downloadPdfReport({
      filename: "per-intern-journal-report",
      title: "Per-Intern Journal Report",
      subtitle: `${interns.length} interns · ${journalReport.reduce((s, r) => s + r.approvedJournals.length, 0)} approved journals · Term 2024-2025`,
      meta: [
        { label: "Interns", value: String(interns.length) },
        {
          label: "Approved Journals",
          value: String(
            journalReport.reduce((s, r) => s + r.approvedJournals.length, 0),
          ),
        },
        { label: "Term", value: "2024-2025" },
      ],
      sections: journalReport.map(
        ({ student, companyName, approvedJournals, totalApprovedHours }) => ({
          heading: `${student.name} · ${student.studentNumber}`,
          keyValue: [
            { label: "Course", value: student.course },
            { label: "Company", value: companyName ?? "—" },
            {
              label: "Approved hours",
              value: `${totalApprovedHours}h / ${student.requiredHours}h (${hoursPercent(student)}%)`,
            },
            {
              label: "Remaining",
              value: `${Math.max(0, student.requiredHours - totalApprovedHours)}h`,
            },
          ],
          table:
            approvedJournals.length > 0
              ? {
                  head: ["Date", "Week", "Hours"],
                  body: approvedJournals.map((j) => [
                    formatDate(j.date),
                    weekLabel(j.date),
                    `${j.hours}h`,
                  ]),
                  foot: [
                    "Total",
                    "",
                    `${approvedJournals.reduce((s, j) => s + j.hours, 0)}h`,
                  ],
                  align: ["left", "left", "right"],
                }
              : undefined,
          paragraphs:
            approvedJournals.length === 0
              ? [{ text: "No approved journals on file." }]
              : undefined,
        }),
      ),
    });
  };

  return (
    <div>
      <PageHeader
        title="Reports & PDFs"
        description="Generate print-ready reports across all your interns."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Evaluation summary card */}
        <Card className="gap-0 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-foreground">
                Evaluation Summary
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                All interns with their latest submitted evaluation scores and
                averages for the current term.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">
                {evalSummary.filter((r) => r.evaluation).length}
              </span>{" "}
              of {interns.length} evaluated
            </span>
            <Button
              size="sm"
              onClick={() => setOpenReport("evaluation-summary")}
              disabled={interns.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              Open preview
            </Button>
          </div>
        </Card>

        {/* Per-intern journal report card */}
        <Card className="gap-0 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <NotebookText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-foreground">
                Per-Intern Journal Report
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Approved weekly journals per intern with hours and progress
                toward required totals.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">
                {journalReport.reduce((s, r) => s + r.approvedJournals.length, 0)}
              </span>{" "}
              approved journals across {interns.length} interns
            </span>
            <Button
              size="sm"
              onClick={() => setOpenReport("journal-report")}
              disabled={interns.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              Open preview
            </Button>
          </div>
        </Card>

        {/* Per-intern time log report card */}
        <Card className="gap-0 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Timer className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-foreground">
                Per-Intern Time Log Report
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Clock-in/out sessions per intern, grouped by week with subtotals
                and a grand total toward required hours.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">{totalSessions}</span>{" "}
              sessions · {formatDuration(totalMs)} tracked
            </span>
            {interns.length === 0 || totalSessions === 0 ? (
              <Button size="sm" disabled>
                <Download className="h-3.5 w-3.5" />
                Open preview
              </Button>
            ) : (
              <TimeLogReportLauncher
                trigger={
                  <Button size="sm">
                    <Download className="h-3.5 w-3.5" />
                    Open preview
                  </Button>
                }
                title="Per-Intern Time Log Report"
                subtitle={`${interns.length} interns · ${totalSessions} sessions · ${formatDuration(totalMs)}`}
                rows={timeLogReport.map((r) => ({
                  student: r.student,
                  companyName: getCompany(companies, r.student.companyId)?.name,
                  supervisorName: getSupervisor(supervisors, supervisorId)?.name,
                  sessions: r.sessions,
                }))}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Hint card when no interns */}
      {interns.length === 0 && (
        <div className="mt-6">
          <SectionCard>
            <div className="flex flex-col items-center py-6 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Users className="h-6 w-6" />
              </span>
              <h3 className="text-base font-semibold text-foreground">
                No interns assigned
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Reports become available once you have at least one intern
                assigned to your supervision.
              </p>
            </div>
          </SectionCard>
        </div>
      )}

      {/* PDF preview modal */}
      <PdfPreviewModal
        open={open}
        onOpenChange={(o) => !o && close()}
        title={reportTitle}
        subtitle="Print-ready · Download a real PDF or print to paper."
        onDownloadPdf={
          openReport === "evaluation-summary"
            ? buildEvaluationSummaryPdf
            : openReport === "journal-report"
              ? buildJournalReportPdf
              : undefined
        }
        downloadFilename={
          openReport === "evaluation-summary"
            ? "evaluation-summary-all-interns.pdf"
            : openReport === "journal-report"
              ? "per-intern-journal-report.pdf"
              : undefined
        }
      >
        {openReport === "evaluation-summary" && (
          <EvaluationSummaryPrint
            rows={evalSummary.map((r) => ({
              student: r.student,
              companyName: getCompany(companies, r.student.companyId)?.name ?? "—",
              evaluation: r.evaluation,
            }))}
          />
        )}
        {openReport === "journal-report" && (
          <JournalReportPrint
            rows={journalReport.map((r) => ({
              student: r.student,
              companyName: getCompany(companies, r.student.companyId)?.name ?? "—",
              approvedJournals: r.approvedJournals,
              totalApprovedHours: r.totalApprovedHours,
            }))}
          />
        )}
      </PdfPreviewModal>
    </div>
  );
}

// ============================================================
// Print layouts
// ============================================================

function PrintHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-slate-200 pb-3">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="text-xs text-slate-500">
        Practicum Evaluation Portal · Generated{" "}
        {formatDate(new Date().toISOString())}
      </p>
    </div>
  );
}

function PrintFooter() {
  return (
    <div className="mt-8 grid grid-cols-2 gap-6 pt-6 text-xs text-slate-500">
      <div>
        <p>Supervisor signature</p>
        <div className="mt-6 border-t border-slate-400" />
      </div>
      <div>
        <p>Date</p>
        <div className="mt-6 border-t border-slate-400" />
      </div>
    </div>
  );
}

function EvaluationSummaryPrint({
  rows,
}: {
  rows: {
    student: Student;
    companyName: string;
    evaluation?: Evaluation;
  }[];
}) {
  return (
    <div className="space-y-4 text-slate-900">
      <PrintHeader title="Evaluation Summary — All Interns" />
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-300 text-left">
            <th className="py-1.5 pr-2">Intern</th>
            <th className="py-1.5 pr-2">Student No.</th>
            <th className="py-1.5 pr-2">Course</th>
            <th className="py-1.5 pr-2">Company</th>
            <th className="py-1.5 pr-2 text-center">Quality</th>
            <th className="py-1.5 pr-2 text-center">Job Knowledge</th>
            <th className="py-1.5 pr-2 text-center">Dependability</th>
            <th className="py-1.5 pr-2 text-center">Avg</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ student, companyName, evaluation }) => (
            <tr key={student.id} className="border-b border-slate-100">
              <td className="py-1.5 pr-2 font-medium">{student.name}</td>
              <td className="py-1.5 pr-2 font-mono">{student.studentNumber}</td>
              <td className="py-1.5 pr-2">{student.course}</td>
              <td className="py-1.5 pr-2">{companyName}</td>
              <td className="py-1.5 pr-2 text-center tabular-nums">
                {evaluation ? `${evaluation.qualityOfWork}/5` : "—"}
              </td>
              <td className="py-1.5 pr-2 text-center tabular-nums">
                {evaluation ? `${evaluation.jobKnowledge}/5` : "—"}
              </td>
              <td className="py-1.5 pr-2 text-center tabular-nums">
                {evaluation ? `${evaluation.dependability}/5` : "—"}
              </td>
              <td className="py-1.5 pr-2 text-center font-semibold tabular-nums">
                {evaluation ? averageScore(evaluation).toFixed(2) : "—"}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="py-3 text-slate-500">
                No interns assigned.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="text-[10px] text-slate-500">
        Rating anchors: 1=Poor · 2=Below Expectations · 3=Meets Expectations ·
        4=Exceeds · 5=Outstanding
      </p>
      <PrintFooter />
    </div>
  );
}

function JournalReportPrint({
  rows,
}: {
  rows: {
    student: Student;
    companyName: string;
    approvedJournals: Journal[];
    totalApprovedHours: number;
  }[];
}) {
  return (
    <div className="space-y-4 text-slate-900">
      <PrintHeader title="Per-Intern Journal Report" />
      {rows.map(({ student, companyName, approvedJournals, totalApprovedHours }) => {
        const pct = hoursPercent(student);
        const remaining = Math.max(0, student.requiredHours - totalApprovedHours);
        return (
          <div
            key={student.id}
            className="break-inside-avoid border border-slate-200 p-3"
          >
            <div className="mb-2 flex items-baseline justify-between border-b border-slate-100 pb-1.5">
              <div>
                <p className="text-sm font-semibold">{student.name}</p>
                <p className="text-[10px] text-slate-500">
                  {student.studentNumber} · {student.course} · {companyName}
                </p>
              </div>
              <div className="text-right text-[10px] text-slate-600">
                <p>
                  Approved hours:{" "}
                  <strong className="tabular-nums">{totalApprovedHours}h</strong>{" "}
                  / {student.requiredHours}h ({pct}%)
                </p>
                <p>
                  Remaining:{" "}
                  <strong className="tabular-nums">{remaining}h</strong>
                </p>
              </div>
            </div>
            {approvedJournals.length === 0 ? (
              <p className="py-2 text-center text-[11px] italic text-slate-500">
                No approved journals on file.
              </p>
            ) : (
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-1 pr-2">Date</th>
                    <th className="py-1 pr-2">Week</th>
                    <th className="py-1 pr-2 text-right">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedJournals.map((j) => (
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
                </tbody>
              </table>
            )}
          </div>
        );
      })}
      {rows.length === 0 && (
        <p className="py-3 text-slate-500">No interns assigned.</p>
      )}
      <PrintFooter />
    </div>
  );
}
