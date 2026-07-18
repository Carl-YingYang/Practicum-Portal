"use client";

import * as React from "react";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { ScoreBadge } from "@/components/portal/shared/badges";
import { ProgressBar } from "@/components/portal/shared/progress-ring";
import { PdfPreviewModal } from "@/components/portal/shared/pdf-preview-modal";
import { useAppStore } from "@/store/use-app-store";
import {
  averageScore,
  evaluationsForStudent,
  formatDate,
  getCompany,
  getEvaluation,
  getStudent,
  getSupervisor,
} from "@/lib/selectors";
import { RATING_ANCHORS, RATING_CRITERIA, type Evaluation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClipboardCheck, Download, Printer } from "lucide-react";
import { StarRating } from "@/components/portal/shared/star-rating";
import { EvaluationRadar } from "@/components/portal/shared/evaluation-radar";
import { toast } from "sonner";

export function EvaluationView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const evaluations = useAppStore((s) => s.evaluations);
  const companies = useAppStore((s) => s.companies);
  const supervisors = useAppStore((s) => s.supervisors);
  const viewParams = useAppStore((s) => s.viewParams);
  const navigate = useAppStore((s) => s.navigate);

  const [pdfOpen, setPdfOpen] = React.useState(false);

  const student = getStudent(students, currentUser?.studentId);
  const evaluation = getEvaluation(evaluations, viewParams.evaluationId);

  if (!student) return null;

  if (!evaluation || evaluation.studentId !== student.id) {
    return (
      <>
        <PageHeader breadcrumb="Evaluations" showBack />
        <EmptyState
          icon={ClipboardCheck}
          title="Evaluation not found"
          description="This evaluation may have been removed."
          actionLabel="Back to evaluations"
          onAction={() => navigate("student.evaluations")}
        />
      </>
    );
  }

  const company = getCompany(companies, student.companyId);
  const supervisor = getSupervisor(supervisors, evaluation.supervisorId);
  const avg = averageScore(evaluation);
  const isDraft = evaluation.status === "draft";

  // Find prior evaluation for comparison radar (same student, earlier date).
  const priorEvaluations = evaluationsForStudent(evaluations, student.id)
    .filter((e) => e.id !== evaluation.id && e.status !== "draft")
    .filter((e) => (e.submittedAt ?? e.createdAt) < (evaluation.submittedAt ?? evaluation.createdAt));
  const previousEvaluation = priorEvaluations[0] ?? null;

  return (
    <>
      <PageHeader
        breadcrumb="Evaluations"
        title="Evaluation Report"
        description={`Term ${evaluation.term}`}
        showBack
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setPdfOpen(true)}
              disabled={isDraft}
            >
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.print();
                toast.success("Print dialog opened");
              }}
              disabled={isDraft}
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        }
      />

      {isDraft && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          This evaluation is still a draft and hasn&apos;t been submitted by
          your supervisor yet.
        </div>
      )}

      <EvaluationReportCard
        evaluation={evaluation}
        studentName={student.name}
        studentNumber={student.studentNumber}
        course={student.course}
        companyName={company?.name}
        supervisorName={supervisor?.name}
        previousEvaluation={previousEvaluation}
      />

      <PdfPreviewModal
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        title="Evaluation Report"
        subtitle={`${student.name} · Term ${evaluation.term}`}
      >
        <EvaluationDocument
          evaluation={evaluation}
          studentName={student.name}
          studentNumber={student.studentNumber}
          course={student.course}
          companyName={company?.name}
          supervisorName={supervisor?.name}
        />
      </PdfPreviewModal>
    </>
  );
}

interface EvaluationReportCardProps {
  evaluation: Evaluation;
  studentName: string;
  studentNumber: string;
  course: string;
  companyName?: string;
  supervisorName?: string;
  previousEvaluation?: Evaluation | null;
}

/**
 * On-screen, print-styled report card. Mirrors the PDF document layout so
 * what the student sees is what prints.
 */
export function EvaluationReportCard({
  evaluation,
  studentName,
  studentNumber,
  course,
  companyName,
  supervisorName,
  previousEvaluation,
}: EvaluationReportCardProps) {
  const avg = averageScore(evaluation);

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {/* Header */}
      <div className="border-b border-border bg-muted/30 px-6 py-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Practicum Evaluation Report
            </p>
            <h2 className="mt-1 text-lg font-bold text-foreground">
              {studentName}
            </h2>
            <p className="font-mono text-xs text-muted-foreground">
              {studentNumber} · {course}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-muted-foreground">Average score</p>
            <p className="text-3xl font-bold tabular-nums text-foreground">
              {avg.toFixed(1)}
              <span className="ml-1 text-base font-medium text-muted-foreground">
                / 5
              </span>
            </p>
            {avg > 0 && (
              <div className="mt-1.5 flex justify-start sm:justify-end">
                <StarRating value={avg} size={16} showValue={false} showLabel />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {/* Context */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Company
            </dt>
            <dd className="mt-0.5 text-foreground">{companyName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Supervisor
            </dt>
            <dd className="mt-0.5 text-foreground">
              {supervisorName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Term
            </dt>
            <dd className="mt-0.5 text-foreground">{evaluation.term}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Submitted
            </dt>
            <dd className="mt-0.5 text-foreground">
              {formatDate(evaluation.submittedAt)}
            </dd>
          </div>
        </dl>

        {/* Criteria scores */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Criteria scores
            </h3>
            {previousEvaluation && (
              <span className="text-[11px] font-medium text-muted-foreground">
                vs. previous term
              </span>
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <EvaluationRadar
                  evaluation={evaluation}
                  comparison={previousEvaluation}
                  height={240}
                />
              </div>
            </div>
            <div className="space-y-4 lg:col-span-3">
              {RATING_CRITERIA.map((c) => {
                const score = evaluation[c.key];
                const prevScore = previousEvaluation?.[c.key];
                const delta =
                  prevScore != null && score > 0 && prevScore > 0
                    ? score - prevScore
                    : null;
                return (
                  <div
                    key={c.key}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {c.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{c.hint}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {score > 0 && (
                          <div className="hidden sm:block">
                            <StarRating value={score} size={13} showValue={false} />
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {RATING_ANCHORS[score] ?? "—"}
                        </span>
                        <ScoreBadge score={score} />
                        {delta != null && delta !== 0 && (
                          <span
                            className={
                              delta > 0
                                ? "rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300"
                            }
                            title={`Previous: ${prevScore}/5`}
                          >
                            {delta > 0 ? "+" : ""}
                            {delta.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    {score > 0 && (
                      <div className="mb-2 sm:hidden">
                        <StarRating value={score} size={13} showValue={false} />
                      </div>
                    )}
                    <ProgressBar value={(score / 5) * 100} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="space-y-4">
          <CommentBlock
            label="Strengths"
            text={evaluation.strengths}
            tone="emerald"
          />
          <CommentBlock
            label="Areas for improvement"
            text={evaluation.weaknesses}
            tone="amber"
          />
          <CommentBlock
            label="Recommendations"
            text={evaluation.recommendations}
            tone="teal"
          />
        </div>
      </div>
    </Card>
  );
}

function CommentBlock({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "emerald" | "amber" | "teal";
}) {
  const toneClass = {
    emerald:
      "border-l-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20",
    amber: "border-l-amber-400 bg-amber-50/40 dark:bg-amber-950/20",
    teal: "border-l-teal-400 bg-teal-50/40 dark:bg-teal-950/20",
  }[tone];

  return (
    <div className={`rounded-lg border border-border border-l-4 p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {text.trim() || "—"}
      </p>
    </div>
  );
}

/**
 * Print-styled evaluation document — used inside the PdfPreviewModal.
 * Plain black-on-white layout that prints cleanly via `window.print()`.
 */
export interface EvaluationDocumentProps {
  evaluation: Evaluation;
  studentName: string;
  studentNumber: string;
  course: string;
  companyName?: string;
  supervisorName?: string;
}

export function EvaluationDocument({
  evaluation,
  studentName,
  studentNumber,
  course,
  companyName,
  supervisorName,
}: EvaluationDocumentProps) {
  const avg = averageScore(evaluation);
  return (
    <div className="space-y-6 text-black">
      <div className="border-b border-slate-300 pb-4">
        <h1 className="text-xl font-bold">Practicum Evaluation Report</h1>
        <p className="text-xs text-slate-600">
          Practicum Evaluation Portal · Term {evaluation.term}
        </p>
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
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Supervisor
          </p>
          <p>{supervisorName ?? "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Submitted
          </p>
          <p>{formatDate(evaluation.submittedAt)}</p>
        </div>
      </div>

      <div className="rounded border border-slate-300 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Overall average
        </p>
        <p className="text-lg font-bold tabular-nums">
          {avg.toFixed(1)} / 5.0
        </p>
      </div>

      <div>
        <h2 className="mb-2 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
          Criteria Scores
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[10px] uppercase tracking-wide text-slate-500">
              <th className="py-1.5">Criterion</th>
              <th className="py-1.5">Score</th>
              <th className="py-1.5">Rating</th>
            </tr>
          </thead>
          <tbody>
            {RATING_CRITERIA.map((c) => {
              const score = evaluation[c.key];
              return (
                <tr key={c.key} className="border-b border-slate-200">
                  <td className="py-1.5 pr-2 font-medium">{c.label}</td>
                  <td className="py-1.5 tabular-nums">{score}/5</td>
                  <td className="py-1.5 text-slate-600">
                    {RATING_ANCHORS[score] ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CommentDocBlock label="Strengths" text={evaluation.strengths} />
      <CommentDocBlock
        label="Areas for improvement"
        text={evaluation.weaknesses}
      />
      <CommentDocBlock
        label="Recommendations"
        text={evaluation.recommendations}
      />

      <div className="border-t border-slate-300 pt-4 text-[10px] text-slate-500">
        Generated on {formatDate(new Date().toISOString())} · Practicum
        Evaluation Portal
      </div>
    </div>
  );
}

function CommentDocBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <h2 className="mb-2 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
        {label}
      </h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {text.trim() || "—"}
      </p>
    </div>
  );
}

export default EvaluationView;
