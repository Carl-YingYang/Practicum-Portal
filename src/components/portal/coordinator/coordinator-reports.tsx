"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  averageScore,
  evaluationsForStudent,
  formatDate,
  getCompany,
  getStudent,
  getSupervisor,
  hoursPercent,
  journalsForStudent,
  weekLabel,
  completedTimeLogsForUser,
  totalCompletedTimeMs,
  formatDuration,
  cohortTotalHours,
} from "@/lib/selectors";
import { RATING_ANCHORS } from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { PdfPreviewModal } from "@/components/portal/shared/pdf-preview-modal";
import { TimeLogReportLauncher } from "@/components/portal/shared/time-log-report-launcher";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  ClipboardList,
  ClipboardCheck,
  NotebookText,
  Download,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { downloadPdfReport } from "@/lib/client-pdf";

type ReportKind =
  | "all-evaluations"
  | "journal-compliance"
  | "per-student-eval"
  | "per-student-journal";

export function CoordinatorReports() {
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const evaluations = useAppStore((s) => s.evaluations);
  const journals = useAppStore((s) => s.journals);
  const timeLogs = useAppStore((s) => s.timeLogs);

  const [activeReport, setActiveReport] = React.useState<ReportKind | null>(null);
  const [evalStudentId, setEvalStudentId] = React.useState<string>("");
  const [journalStudentId, setJournalStudentId] = React.useState<string>("");

  // Cohort time-log rows (precomputed for the report + summary card)
  const cohortTimeRows = React.useMemo(
    () =>
      students.map((s) => ({
        student: s,
        companyName: getCompany(companies, s.companyId)?.name,
        supervisorName: getSupervisor(supervisors, s.supervisorId)?.name,
        sessions: completedTimeLogsForUser(timeLogs, s.id),
      })),
    [students, companies, supervisors, timeLogs]
  );
  const cohortTotalSessions = cohortTimeRows.reduce(
    (n, r) => n + r.sessions.length,
    0
  );
  const cohortTotalMs = cohortTimeRows.reduce(
    (ms, r) => ms + totalCompletedTimeMs(timeLogs, r.student.id),
    0
  );

  const openReport = (kind: ReportKind) => {
    if (kind === "per-student-eval" && !evalStudentId) {
      toast.error("Select a student first.");
      return;
    }
    if (kind === "per-student-journal" && !journalStudentId) {
      toast.error("Select a student first.");
      return;
    }
    setActiveReport(kind);
  };

  const evalStudent = getStudent(students, evalStudentId);
  const journalStudent = getStudent(students, journalStudentId);

  // ---------- Real PDF download builders ----------
  const buildAllEvaluationsPdf = () => {
    const submitted = evaluations
      .filter((e) => e.status === "submitted")
      .map((e) => {
        const st = getStudent(students, e.studentId);
        const sup = getSupervisor(supervisors, e.supervisorId);
        const company = st ? getCompany(companies, st.companyId) : undefined;
        return {
          id: e.id,
          studentName: st?.name ?? "Unknown",
          studentNumber: st?.studentNumber ?? "",
          supervisorName: sup?.name ?? "—",
          companyName: company?.name ?? "—",
          avg: averageScore(e),
          date: e.submittedAt ?? e.createdAt,
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    downloadPdfReport({
      filename: "all-evaluations-bundle",
      title: "All Evaluations — Cohort Bundle",
      subtitle: `${submitted.length} submitted evaluations · Term 2024-2025`,
      meta: [
        { label: "Students", value: String(students.length) },
        { label: "Submitted", value: String(submitted.length) },
        { label: "Term", value: "2024-2025" },
      ],
      sections: [
        {
          table: {
            head: ["Student", "Supervisor", "Company", "Avg", "Date"],
            body: submitted.map((r) => [
              `${r.studentName}\n${r.studentNumber}`,
              r.supervisorName,
              r.companyName,
              r.avg > 0 ? r.avg.toFixed(2) : "—",
              formatDate(r.date),
            ]),
            align: ["left", "left", "left", "center", "left"],
          },
        },
      ],
    });
  };

  const buildJournalCompliancePdf = () => {
    const rows = students.map((s) => {
      const sj = journalsForStudent(journals, s.id);
      const sup = getSupervisor(supervisors, s.supervisorId);
      const company = getCompany(companies, s.companyId);
      return {
        id: s.id,
        name: s.name,
        studentNumber: s.studentNumber,
        companyName: company?.name ?? "—",
        supervisorName: sup?.name ?? "—",
        approved: sj.filter((j) => j.status === "approved").length,
        pending: sj.filter((j) => j.status === "pending").length,
        rejected: sj.filter((j) => j.status === "rejected").length,
        draft: sj.filter((j) => j.status === "draft").length,
        loggedHours: s.loggedHours,
        requiredHours: s.requiredHours,
      };
    });
    downloadPdfReport({
      filename: "journal-compliance-report",
      title: "Journal Compliance Report",
      subtitle: `${students.length} students · Term 2024-2025`,
      meta: [
        { label: "Students", value: String(students.length) },
        {
          label: "Approved",
          value: String(rows.reduce((s, r) => s + r.approved, 0)),
        },
        {
          label: "Pending",
          value: String(rows.reduce((s, r) => s + r.pending, 0)),
        },
      ],
      sections: [
        {
          table: {
            head: [
              "Student",
              "Supervisor",
              "Appr",
              "Pend",
              "Rej",
              "Draft",
              "Hours",
            ],
            body: rows.map((r) => [
              `${r.name}\n${r.studentNumber}`,
              r.supervisorName,
              r.approved,
              r.pending,
              r.rejected,
              r.draft,
              `${r.loggedHours}/${r.requiredHours}h`,
            ]),
            align: [
              "left",
              "left",
              "center",
              "center",
              "center",
              "center",
              "center",
            ],
          },
        },
      ],
    });
  };

  const buildPerStudentEvalPdf = () => {
    if (!evalStudent) return;
    const evals = evaluationsForStudent(evaluations, evalStudent.id);
    const submitted = evals.find((e) => e.status === "submitted");
    const avg = submitted ? averageScore(submitted) : 0;
    const companyName = getCompany(companies, evalStudent.companyId)?.name ?? "—";
    const supervisorName =
      getSupervisor(supervisors, evalStudent.supervisorId)?.name ?? "—";
    downloadPdfReport({
      filename: `evaluation-${evalStudent.studentNumber}`,
      title: `Evaluation Report — ${evalStudent.name}`,
      subtitle: `${evalStudent.studentNumber} · ${evalStudent.course} · ${companyName} · Term 2024-2025`,
      meta: [
        { label: "Student No.", value: evalStudent.studentNumber },
        { label: "Course", value: evalStudent.course },
        { label: "Company", value: companyName },
        { label: "Supervisor", value: supervisorName },
        { label: "Submitted", value: submitted ? formatDate(submitted.submittedAt) : "—" },
        { label: "Average", value: avg > 0 ? avg.toFixed(2) : "—" },
      ],
      sections: submitted
        ? [
            {
              heading: "Criteria Scores",
              table: {
                head: ["Criterion", "Anchor", "Score"],
                body: [
                  [
                    "Quality of Work",
                    submitted.qualityOfWork > 0 ? RATING_ANCHORS[submitted.qualityOfWork] : "—",
                    submitted.qualityOfWork > 0 ? `${submitted.qualityOfWork}/5` : "—",
                  ],
                  [
                    "Job Knowledge",
                    submitted.jobKnowledge > 0 ? RATING_ANCHORS[submitted.jobKnowledge] : "—",
                    submitted.jobKnowledge > 0 ? `${submitted.jobKnowledge}/5` : "—",
                  ],
                  [
                    "Dependability",
                    submitted.dependability > 0 ? RATING_ANCHORS[submitted.dependability] : "—",
                    submitted.dependability > 0 ? `${submitted.dependability}/5` : "—",
                  ],
                ],
                foot: ["Overall Average", "", avg > 0 ? avg.toFixed(2) : "—"],
                align: ["left", "left", "center"],
              },
            },
            {
              heading: "Supervisor Comments",
              paragraphs: [
                { label: "Strengths", text: submitted.strengths || "—" },
                {
                  label: "Areas for Improvement",
                  text: submitted.weaknesses || "—",
                },
                { label: "Recommendations", text: submitted.recommendations || "—" },
              ],
            },
          ]
        : [
            {
              paragraphs: [
                { text: "No submitted evaluation on record for this student." },
              ],
            },
          ],
    });
  };

  const buildPerStudentJournalPdf = () => {
    if (!journalStudent) return;
    const studentJournals = journalsForStudent(journals, journalStudent.id);
    const companyName = getCompany(companies, journalStudent.companyId)?.name ?? "—";
    const supervisorName =
      getSupervisor(supervisors, journalStudent.supervisorId)?.name ?? "—";
    downloadPdfReport({
      filename: `journal-report-${journalStudent.studentNumber}`,
      title: `Journal Report — ${journalStudent.name}`,
      subtitle: `${journalStudent.studentNumber} · ${journalStudent.course} · ${companyName}`,
      meta: [
        { label: "Student No.", value: journalStudent.studentNumber },
        { label: "Course", value: journalStudent.course },
        { label: "Company", value: companyName },
        { label: "Supervisor", value: supervisorName },
        {
          label: "Entries",
          value: String(studentJournals.length),
        },
        {
          label: "Hours",
          value: `${journalStudent.loggedHours}/${journalStudent.requiredHours}h (${hoursPercent(journalStudent)}%)`,
        },
      ],
      sections:
        studentJournals.length === 0
          ? [{ paragraphs: [{ text: "No journal entries on record." }] }]
          : studentJournals.map((j) => ({
              heading: `${weekLabel(j.date)} · ${formatDate(j.date)} · ${j.hours}h`,
              keyValue: [{ label: "Status", value: j.status.toUpperCase() }],
              paragraphs: [
                { label: "Tasks", text: j.tasks || "—" },
                { label: "Learnings", text: j.learnings || "—" },
                ...(j.status === "rejected" && j.rejectionReason
                  ? [{ label: "Rejection reason", text: j.rejectionReason }]
                  : []),
              ],
            })),
    });
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate PDF exports for archival, sharing, or compliance review."
        breadcrumb="Reports"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* All evaluations bundle */}
        <ReportCard
          icon={FileText}
          tone="teal"
          title="All Evaluations (Bundle)"
          description="A single PDF listing every submitted evaluation with student, supervisor, company, average score, and date."
          actionLabel="Generate"
          onAction={() => openReport("all-evaluations")}
        />

        {/* Journal compliance */}
        <ReportCard
          icon={ClipboardList}
          tone="amber"
          title="Journal Compliance Report"
          description="Per-student summary of journal counts (approved / pending / rejected / draft) with logged hours."
          actionLabel="Generate"
          onAction={() => openReport("journal-compliance")}
        />

        {/* Cohort time log report */}
        <SectionCard>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Timer className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground">
                Cohort Time Log Report
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Every student&apos;s clock-in/out sessions grouped by week with
                subtotals. {cohortTotalSessions} sessions ·{" "}
                {formatDuration(cohortTotalMs)} tracked.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {cohortTotalSessions}
              </span>{" "}
              sessions · {formatDuration(cohortTotalMs)}
            </span>
            <TimeLogReportLauncher
              trigger={
                <Button size="sm">
                  <Download className="h-3.5 w-3.5" />
                  Generate
                </Button>
              }
              title="Cohort Time Log Report"
              subtitle={`${students.length} students · Term 2024-2025`}
              summaryStats={[
                { label: "Students", value: String(students.length) },
                {
                  label: "Total Sessions",
                  value: String(cohortTotalSessions),
                },
                { label: "Total Tracked", value: formatDuration(cohortTotalMs) },
                {
                  label: "Cohort Hours",
                  value: `${Math.round(cohortTotalHours(timeLogs))}h`,
                },
              ]}
              rows={cohortTimeRows}
            />
          </div>
        </SectionCard>

        {/* Per-student evaluation */}
        <ReportCard
          icon={ClipboardCheck}
          tone="emerald"
          title="Per-Student Evaluation"
          description="Generate a full evaluation report PDF for a specific student."
          actionLabel="Generate"
          onAction={() => openReport("per-student-eval")}
        >
          <div className="mt-3">
            <Label className="mb-1.5 block text-xs">Select student</Label>
            <Select value={evalStudentId} onValueChange={setEvalStudentId}>
              <SelectTrigger className="w-full" size="sm">
                <SelectValue placeholder="Choose a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.studentNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </ReportCard>

        {/* Per-student journal */}
        <ReportCard
          icon={NotebookText}
          tone="slate"
          title="Per-Student Journal Report"
          description="Generate a full journal log PDF for a specific student."
          actionLabel="Generate"
          onAction={() => openReport("per-student-journal")}
        >
          <div className="mt-3">
            <Label className="mb-1.5 block text-xs">Select student</Label>
            <Select value={journalStudentId} onValueChange={setJournalStudentId}>
              <SelectTrigger className="w-full" size="sm">
                <SelectValue placeholder="Choose a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.studentNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </ReportCard>
      </div>

      {/* All evaluations bundle */}
      <PdfPreviewModal
        open={activeReport === "all-evaluations"}
        onOpenChange={(o) => !o && setActiveReport(null)}
        title="All Evaluations Bundle"
        subtitle="All submitted evaluations across the cohort"
        onDownloadPdf={buildAllEvaluationsPdf}
        downloadFilename="all-evaluations-bundle.pdf"
      >
        <AllEvaluationsPrintDoc
          students={students}
          supervisors={supervisors}
          companies={companies}
          evaluations={evaluations}
        />
      </PdfPreviewModal>

      {/* Journal compliance */}
      <PdfPreviewModal
        open={activeReport === "journal-compliance"}
        onOpenChange={(o) => !o && setActiveReport(null)}
        title="Journal Compliance Report"
        subtitle="Per-student journal status summary"
        onDownloadPdf={buildJournalCompliancePdf}
        downloadFilename="journal-compliance-report.pdf"
      >
        <JournalCompliancePrintDoc
          students={students}
          supervisors={supervisors}
          companies={companies}
          journals={journals}
        />
      </PdfPreviewModal>

      {/* Per-student evaluation */}
      <PdfPreviewModal
        open={activeReport === "per-student-eval"}
        onOpenChange={(o) => !o && setActiveReport(null)}
        title={`Evaluation — ${evalStudent?.name ?? ""}`}
        subtitle={evalStudent ? `${evalStudent.studentNumber} · Term 2024-2025` : ""}
        onDownloadPdf={buildPerStudentEvalPdf}
        downloadFilename={evalStudent ? `evaluation-${evalStudent.studentNumber}.pdf` : undefined}
      >
        {evalStudent && (
          <PerStudentEvalPrintDoc
            student={evalStudent}
            companyName={getCompany(companies, evalStudent.companyId)?.name ?? "—"}
            supervisorName={
              getSupervisor(supervisors, evalStudent.supervisorId)?.name ?? "—"
            }
            evaluations={evaluationsForStudent(evaluations, evalStudent.id)}
          />
        )}
      </PdfPreviewModal>

      {/* Per-student journal */}
      <PdfPreviewModal
        open={activeReport === "per-student-journal"}
        onOpenChange={(o) => !o && setActiveReport(null)}
        title={`Journal Report — ${journalStudent?.name ?? ""}`}
        subtitle={journalStudent ? `${journalStudent.studentNumber}` : ""}
        onDownloadPdf={buildPerStudentJournalPdf}
        downloadFilename={journalStudent ? `journal-report-${journalStudent.studentNumber}.pdf` : undefined}
      >
        {journalStudent && (
          <PerStudentJournalPrintDoc
            student={journalStudent}
            companyName={getCompany(companies, journalStudent.companyId)?.name ?? "—"}
            supervisorName={
              getSupervisor(supervisors, journalStudent.supervisorId)?.name ?? "—"
            }
            journals={journalsForStudent(journals, journalStudent.id)}
          />
        )}
      </PdfPreviewModal>

      {/* Cohort time log report is rendered by TimeLogReportLauncher */}
    </div>
  );
}

function ReportCard({
  icon: Icon,
  tone,
  title,
  description,
  actionLabel,
  onAction,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "teal" | "amber" | "emerald" | "slate";
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  children?: React.ReactNode;
}) {
  const toneMap = {
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <SectionCard>
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneMap[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
      <div className="mt-4 flex justify-end">
        <Button onClick={onAction}>
          <Download className="h-4 w-4" />
          {actionLabel}
        </Button>
      </div>
    </SectionCard>
  );
}

// ---------- Print documents ----------

function AllEvaluationsPrintDoc({
  students,
  supervisors,
  companies,
  evaluations,
}: {
  students: ReturnType<typeof useAppStore.getState>["students"];
  supervisors: ReturnType<typeof useAppStore.getState>["supervisors"];
  companies: ReturnType<typeof useAppStore.getState>["companies"];
  evaluations: ReturnType<typeof useAppStore.getState>["evaluations"];
}) {
  const submitted = evaluations
    .filter((e) => e.status === "submitted")
    .map((e) => {
      const st = getStudent(students, e.studentId);
      const sup = getSupervisor(supervisors, e.supervisorId);
      const company = st ? getCompany(companies, st.companyId) : undefined;
      return {
        id: e.id,
        studentName: st?.name ?? "Unknown",
        studentNumber: st?.studentNumber ?? "",
        supervisorName: sup?.name ?? "—",
        companyName: company?.name ?? "—",
        avg: averageScore(e),
        date: e.submittedAt ?? e.createdAt,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-3 text-slate-900">
      <div className="border-b border-slate-300 pb-2">
        <h1 className="text-lg font-bold">All Evaluations — Cohort Bundle</h1>
        <p className="text-xs text-slate-600">
          {submitted.length} submitted · Term 2024-2025 · Generated {formatDate(new Date().toISOString())}
        </p>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="px-2 py-1">Student</th>
            <th className="px-2 py-1">Supervisor</th>
            <th className="px-2 py-1">Company</th>
            <th className="px-2 py-1 text-right">Avg</th>
            <th className="px-2 py-1">Date</th>
          </tr>
        </thead>
        <tbody>
          {submitted.map((r) => (
            <tr key={r.id} className="border-b border-slate-200">
              <td className="px-2 py-1 font-medium">
                {r.studentName}
                <span className="block font-mono text-[10px] text-slate-500">{r.studentNumber}</span>
              </td>
              <td className="px-2 py-1">{r.supervisorName}</td>
              <td className="px-2 py-1">{r.companyName}</td>
              <td className="px-2 py-1 text-right font-mono font-semibold">
                {r.avg > 0 ? r.avg.toFixed(2) : "—"}
              </td>
              <td className="px-2 py-1">{formatDate(r.date)}</td>
            </tr>
          ))}
          {submitted.length === 0 && (
            <tr>
              <td colSpan={5} className="px-2 py-4 text-center text-slate-500">
                No submitted evaluations.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="text-center text-[10px] text-slate-500">
        Practicum Evaluation Portal · Confidential
      </p>
    </div>
  );
}

function JournalCompliancePrintDoc({
  students,
  supervisors,
  companies,
  journals,
}: {
  students: ReturnType<typeof useAppStore.getState>["students"];
  supervisors: ReturnType<typeof useAppStore.getState>["supervisors"];
  companies: ReturnType<typeof useAppStore.getState>["companies"];
  journals: ReturnType<typeof useAppStore.getState>["journals"];
}) {
  const rows = students.map((s) => {
    const sj = journalsForStudent(journals, s.id);
    const sup = getSupervisor(supervisors, s.supervisorId);
    const company = getCompany(companies, s.companyId);
    return {
      id: s.id,
      name: s.name,
      studentNumber: s.studentNumber,
      companyName: company?.name ?? "—",
      supervisorName: sup?.name ?? "—",
      approved: sj.filter((j) => j.status === "approved").length,
      pending: sj.filter((j) => j.status === "pending").length,
      rejected: sj.filter((j) => j.status === "rejected").length,
      draft: sj.filter((j) => j.status === "draft").length,
      hoursPct: hoursPercent(s),
      loggedHours: s.loggedHours,
      requiredHours: s.requiredHours,
    };
  });

  return (
    <div className="space-y-3 text-slate-900">
      <div className="border-b border-slate-300 pb-2">
        <h1 className="text-lg font-bold">Journal Compliance Report</h1>
        <p className="text-xs text-slate-600">
          {students.length} students · Generated {formatDate(new Date().toISOString())}
        </p>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-slate-100 text-left">
          <tr>
            <th className="px-2 py-1">Student</th>
            <th className="px-2 py-1">Supervisor</th>
            <th className="px-2 py-1 text-right">Appr</th>
            <th className="px-2 py-1 text-right">Pend</th>
            <th className="px-2 py-1 text-right">Rej</th>
            <th className="px-2 py-1 text-right">Draft</th>
            <th className="px-2 py-1 text-right">Hours</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-200">
              <td className="px-2 py-1 font-medium">
                {r.name}
                <span className="block font-mono text-[10px] text-slate-500">{r.studentNumber}</span>
              </td>
              <td className="px-2 py-1">{r.supervisorName}</td>
              <td className="px-2 py-1 text-right font-mono">{r.approved}</td>
              <td className="px-2 py-1 text-right font-mono">{r.pending}</td>
              <td className="px-2 py-1 text-right font-mono">{r.rejected}</td>
              <td className="px-2 py-1 text-right font-mono">{r.draft}</td>
              <td className="px-2 py-1 text-right font-mono">
                {r.loggedHours}/{r.requiredHours}h
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-center text-[10px] text-slate-500">
        Practicum Evaluation Portal · Confidential
      </p>
    </div>
  );
}

function PerStudentEvalPrintDoc({
  student,
  companyName,
  supervisorName,
  evaluations,
}: {
  student: ReturnType<typeof useAppStore.getState>["students"][number];
  companyName: string;
  supervisorName: string;
  evaluations: ReturnType<typeof useAppStore.getState>["evaluations"];
}) {
  const submitted = evaluations.find((e) => e.status === "submitted");
  const avg = submitted ? averageScore(submitted) : 0;
  return (
    <div className="space-y-4 text-slate-900">
      <div className="border-b border-slate-300 pb-2">
        <h1 className="text-lg font-bold">Evaluation Report — {student.name}</h1>
        <p className="text-xs text-slate-600">
          {student.studentNumber} · {student.course} · {companyName} · Term 2024-2025
        </p>
      </div>
      {submitted ? (
        <>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Supervisor</p>
              <p className="font-semibold">{supervisorName}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Submitted</p>
              <p className="text-xs">{formatDate(submitted.submittedAt)}</p>
            </div>
          </div>
          <div className="rounded border border-slate-300">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs">
                <tr>
                  <th className="px-3 py-2">Criterion</th>
                  <th className="px-3 py-2">Anchor</th>
                  <th className="px-3 py-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    { label: "Quality of Work", value: submitted.qualityOfWork },
                    { label: "Job Knowledge", value: submitted.jobKnowledge },
                    { label: "Dependability", value: submitted.dependability },
                  ] as const
                ).map((r) => (
                  <tr key={r.label} className="border-t border-slate-200">
                    <td className="px-3 py-2 font-medium">{r.label}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {r.value > 0 ? RATING_ANCHORS[r.value] : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">
                      {r.value > 0 ? `${r.value}/5` : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-400 bg-slate-50">
                  <td className="px-3 py-2 font-bold" colSpan={2}>
                    Overall Average
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-base font-bold text-teal-700">
                    {avg > 0 ? avg.toFixed(2) : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <PrintComment label="Strengths" value={submitted.strengths} />
          <PrintComment label="Areas for Improvement" value={submitted.weaknesses} />
          <PrintComment label="Recommendations" value={submitted.recommendations} />
        </>
      ) : (
        <p className="text-sm text-slate-600">
          No submitted evaluation on record for this student.
        </p>
      )}
      <p className="text-center text-[10px] text-slate-500">
        Practicum Evaluation Portal · Confidential · Generated {formatDate(new Date().toISOString())}
      </p>
    </div>
  );
}

function PerStudentJournalPrintDoc({
  student,
  companyName,
  supervisorName,
  journals,
}: {
  student: ReturnType<typeof useAppStore.getState>["students"][number];
  companyName: string;
  supervisorName: string;
  journals: ReturnType<typeof useAppStore.getState>["journals"];
}) {
  return (
    <div className="space-y-4 text-slate-900">
      <div className="border-b border-slate-300 pb-2">
        <h1 className="text-lg font-bold">Journal Report — {student.name}</h1>
        <p className="text-xs text-slate-600">
          {student.studentNumber} · {student.course} · {companyName} · Supervisor: {supervisorName}
        </p>
        <p className="text-xs text-slate-600">
          {journals.length} entries · {student.loggedHours}/{student.requiredHours}h logged ({hoursPercent(student)}%)
        </p>
      </div>
      {journals.length === 0 ? (
        <p className="text-sm text-slate-600">No journal entries on record.</p>
      ) : (
        <div className="space-y-3">
          {journals.map((j) => (
            <div key={j.id} className="rounded border border-slate-300 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {weekLabel(j.date)}
                </p>
                <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                  {j.status}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {formatDate(j.date)} · {j.hours}h
              </p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Tasks
              </p>
              <p className="whitespace-pre-wrap text-xs text-slate-800">{j.tasks || "—"}</p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Learnings
              </p>
              <p className="whitespace-pre-wrap text-xs text-slate-800">{j.learnings || "—"}</p>
              {j.status === "rejected" && j.rejectionReason && (
                <p className="mt-1.5 text-xs text-amber-700">
                  Rejected: {j.rejectionReason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-center text-[10px] text-slate-500">
        Practicum Evaluation Portal · Confidential · Generated {formatDate(new Date().toISOString())}
      </p>
    </div>
  );
}

function PrintComment({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-slate-800">{value.trim() ? value : "—"}</p>
    </div>
  );
}
