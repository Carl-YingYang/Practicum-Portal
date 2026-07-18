"use client";

import { useState } from "react";
import {
  Lock,
  Pencil,
  Send,
  Download,
  GraduationCap,
  Building2,
  ClipboardCheck,
  FileText,
} from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import {
  getEvaluation,
  getStudent,
  getSupervisor,
  getCompany,
  averageScore,
  formatDate,
} from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { Avatar } from "@/components/portal/shared/avatar";
import {
  ScoreBadge,
  EvaluationStatusBadge,
  Badge,
} from "@/components/portal/shared/badges";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { PdfPreviewModal } from "@/components/portal/shared/pdf-preview-modal";
import { ConfirmDialog } from "@/components/portal/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RATING_CRITERIA, RATING_ANCHORS } from "@/lib/types";
import { StarRating } from "@/components/portal/shared/star-rating";
import { EvaluationRadar } from "@/components/portal/shared/evaluation-radar";

export function EvaluationView() {
  const viewParams = useAppStore((s) => s.viewParams);
  const evaluations = useAppStore((s) => s.evaluations);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const navigate = useAppStore((s) => s.navigate);
  const saveEvaluation = useAppStore((s) => s.saveEvaluation);

  const evaluation = getEvaluation(evaluations, viewParams.evaluationId);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  if (!evaluation) {
    return (
      <div>
        <PageHeader showBack title="Evaluation not found" />
        <EmptyState
          icon={FileText}
          title="Evaluation not found"
          description="This evaluation may have been removed."
          actionLabel="Back to Evaluations"
          onAction={() => navigate("supervisor.evaluations")}
        />
      </div>
    );
  }

  const student = getStudent(students, evaluation.studentId);
  const supervisor = getSupervisor(supervisors, evaluation.supervisorId);
  const company = student ? getCompany(companies, student.companyId) : undefined;
  const avg = averageScore(evaluation);
  const isDraft = evaluation.status === "draft";

  const handleSubmit = () => {
    const id = saveEvaluation({
      id: evaluation.id,
      studentId: evaluation.studentId,
      supervisorId: evaluation.supervisorId,
      term: evaluation.term,
      qualityOfWork: evaluation.qualityOfWork,
      jobKnowledge: evaluation.jobKnowledge,
      dependability: evaluation.dependability,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      recommendations: evaluation.recommendations,
      submit: true,
    });
    setSubmitOpen(false);
    toast.success("Evaluation submitted", {
      description: "The evaluation is now locked and visible to the intern.",
    });
    navigate("supervisor.evaluation-view", { evaluationId: id });
  };

  return (
    <div>
      <PageHeader
        showBack
        title="Evaluation Report"
        description={`Term ${evaluation.term}`}
        actions={
          isDraft ? (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  navigate("supervisor.evaluation-new", {
                    evaluationId: evaluation.id,
                  })
                }
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button
                disabled={
                  evaluation.qualityOfWork === 0 ||
                  evaluation.jobKnowledge === 0 ||
                  evaluation.dependability === 0
                }
                onClick={() => setSubmitOpen(true)}
              >
                <Send className="h-4 w-4" />
                Submit
              </Button>
            </>
          ) : (
            <Badge tone="teal" icon={Lock}>
              Submitted · Locked
            </Badge>
          )
        }
      />

      {/* Lock indicator for submitted evaluations */}
      {!isDraft && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">
          <Lock className="h-4 w-4" />
          <span>
            This evaluation was submitted on{" "}
            <strong>{formatDate(evaluation.submittedAt)}</strong> and is now
            locked. Wet signatures happen outside the system.
          </span>
        </div>
      )}

      {/* Context bar */}
      <SectionCard>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            {student && <Avatar name={student.name} size="lg" />}
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Intern
              </p>
              <p className="text-base font-semibold text-foreground">
                {student?.name ?? "—"}
              </p>
              {student && (
                <p className="font-mono text-xs text-muted-foreground">
                  {student.studentNumber} · {student.course}
                </p>
              )}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {company?.name ?? "—"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 sm:justify-end">
            {supervisor && <Avatar name={supervisor.name} size="lg" />}
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Evaluator
              </p>
              <p className="text-base font-semibold text-foreground">
                {supervisor?.name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                Company Supervisor
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ClipboardCheck className="h-3.5 w-3.5" />
                {company?.name ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Average + status */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SectionCard>
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Average score
            </p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-foreground">
              {avg > 0 ? avg.toFixed(2) : "—"}
              {avg > 0 && (
                <span className="text-lg font-medium text-muted-foreground">
                  /5
                </span>
              )}
            </p>
            {avg > 0 && (
              <div className="mt-2 flex justify-center">
                <StarRating value={avg} size={18} showValue={false} showLabel />
              </div>
            )}
          </div>
        </SectionCard>
        <SectionCard>
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <div className="mt-2 flex justify-center">
              <EvaluationStatusBadge status={evaluation.status} />
            </div>
          </div>
        </SectionCard>
        <SectionCard>
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isDraft ? "Created" : "Submitted"}
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {formatDate(isDraft ? evaluation.createdAt : evaluation.submittedAt)}
            </p>
          </div>
        </SectionCard>
      </div>

      {/* Criteria */}
      <div className="mt-6">
        <SectionCard title="Criteria ratings" description="1–5 scale with anchor labels.">
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <EvaluationRadar evaluation={evaluation} height={240} />
              </div>
            </div>
            <ul className="divide-y divide-border lg:col-span-3">
              {RATING_CRITERIA.map((c) => {
                const score = evaluation[c.key];
                return (
                  <li
                    key={c.key}
                    className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {c.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.hint}</p>
                      {score > 0 && (
                        <div className="mt-1.5 sm:hidden">
                          <StarRating value={score} size={14} showValue={false} />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline">
                        {score > 0 ? RATING_ANCHORS[score] : "Not rated"}
                      </span>
                      {score > 0 && (
                        <div className="hidden sm:block">
                          <StarRating value={score} size={14} showValue={false} />
                        </div>
                      )}
                      <ScoreBadge score={score} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </SectionCard>
      </div>

      {/* Comments */}
      <div className="mt-6">
        <SectionCard title="Comments">
          <div className="space-y-5">
            <CommentBlock
              label="Strengths"
              value={evaluation.strengths}
              tone="emerald"
            />
            <CommentBlock
              label="Weaknesses"
              value={evaluation.weaknesses}
              tone="amber"
            />
            <CommentBlock
              label="Recommendations"
              value={evaluation.recommendations}
              tone="teal"
            />
          </div>
        </SectionCard>
      </div>

      {/* PDF actions */}
      <div className="mt-6 flex justify-end">
        <Button onClick={() => setPdfOpen(true)}>
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* PDF preview modal */}
      <PdfPreviewModal
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        title={`Evaluation Report — ${student?.name ?? ""}`}
        subtitle={`Term ${evaluation.term} · ${isDraft ? "Draft" : "Submitted"}`}
      >
        <div className="space-y-4 text-slate-900">
          <div className="border-b border-slate-200 pb-3">
            <h1 className="text-xl font-bold">Practicum Evaluation Report</h1>
            <p className="text-xs text-slate-500">
              {company?.name ?? ""} · Term {evaluation.term}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Field label="Intern" value={student?.name ?? "—"} />
            <Field label="Student No." value={student?.studentNumber ?? "—"} />
            <Field label="Course" value={student?.course ?? "—"} />
            <Field label="Company" value={company?.name ?? "—"} />
            <Field label="Evaluator" value={supervisor?.name ?? "—"} />
            <Field
              label="Submitted"
              value={formatDate(evaluation.submittedAt)}
            />
          </div>
          <div>
            <h2 className="mb-1.5 text-sm font-semibold">Criteria ratings</h2>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th className="py-1 pr-2">Criterion</th>
                  <th className="py-1 pr-2">Score</th>
                  <th className="py-1 pr-2">Anchor</th>
                </tr>
              </thead>
              <tbody>
                {RATING_CRITERIA.map((c) => (
                  <tr key={c.key} className="border-b border-slate-100">
                    <td className="py-1 pr-2">{c.label}</td>
                    <td className="py-1 pr-2 font-medium tabular-nums">
                      {evaluation[c.key]}/5
                    </td>
                    <td className="py-1 pr-2 text-slate-600">
                      {evaluation[c.key] > 0 ? RATING_ANCHORS[evaluation[c.key]] : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-1 pr-2">Average</td>
                  <td className="py-1 pr-2 tabular-nums">
                    {avg > 0 ? avg.toFixed(2) : "—"}/5
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <PrintComment label="Strengths" value={evaluation.strengths} />
          <PrintComment label="Weaknesses" value={evaluation.weaknesses} />
          <PrintComment label="Recommendations" value={evaluation.recommendations} />
          <div className="mt-8 grid grid-cols-2 gap-6 pt-6 text-xs text-slate-500">
            <div>
              <p>Evaluator signature</p>
              <div className="mt-6 border-t border-slate-400" />
            </div>
            <div>
              <p>Date</p>
              <div className="mt-6 border-t border-slate-400" />
            </div>
          </div>
        </div>
      </PdfPreviewModal>

      {/* Submit confirmation */}
      <ConfirmDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit evaluation?"
        description="Once submitted, the evaluation will be locked and visible to the intern. You won't be able to edit it afterwards."
        confirmLabel="Submit Evaluation"
        cancelLabel="Cancel"
        onConfirm={handleSubmit}
      />
    </div>
  );
}

function CommentBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "teal";
}) {
  const toneClass = {
    emerald: "border-l-emerald-400",
    amber: "border-l-amber-400",
    teal: "border-l-teal-400",
  }[tone];
  return (
    <div className={`rounded-r-lg border-l-4 ${toneClass} bg-muted/30 p-4`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {value.trim() === "" ? (
        <p className="mt-1 text-sm italic text-muted-foreground">
          No comment provided.
        </p>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
          {value}
        </p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function PrintComment({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{label}</h3>
      <p className="whitespace-pre-wrap text-xs text-slate-700">
        {value.trim() === "" ? "(No comment provided)" : value}
      </p>
    </div>
  );
}
