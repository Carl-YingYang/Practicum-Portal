"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  averageScore,
  formatDate,
  getCompany,
  getEvaluation,
  getStudent,
  getSupervisor,
} from "@/lib/selectors";
import { RATING_ANCHORS, RATING_CRITERIA } from "@/lib/types";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { PdfPreviewModal } from "@/components/portal/shared/pdf-preview-modal";
import {
  EvaluationStatusBadge,
  ScoreBadge,
} from "@/components/portal/shared/badges";
import { Avatar } from "@/components/portal/shared/avatar";
import { StarRating } from "@/components/portal/shared/star-rating";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, FileText } from "lucide-react";
import { toast } from "sonner";

export function EvaluationView({ evaluationId }: { evaluationId?: string }) {
  const navigate = useAppStore((s) => s.navigate);
  const evaluations = useAppStore((s) => s.evaluations);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);

  const [pdfOpen, setPdfOpen] = React.useState(false);
  const evaluation = getEvaluation(evaluations, evaluationId);

  if (!evaluation) {
    return (
      <div>
        <PageHeader title="Evaluation" showBack breadcrumb="Evaluations" />
        <EmptyState
          icon={AlertCircle}
          title="Evaluation not found"
          description="This evaluation may have been removed."
          actionLabel="Back to evaluations"
          onAction={() => navigate("coordinator.evaluations")}
        />
      </div>
    );
  }

  const student = getStudent(students, evaluation.studentId);
  const supervisor = getSupervisor(supervisors, evaluation.supervisorId);
  const company = student ? getCompany(companies, student.companyId) : undefined;
  const avg = averageScore(evaluation);

  const scores: { label: string; value: number }[] = RATING_CRITERIA.map((c) => ({
    label: c.label,
    value: evaluation[c.key],
  }));

  return (
    <div>
      <PageHeader
        title="Evaluation Report"
        breadcrumb="Evaluations"
        showBack
        actions={
          <Button onClick={() => setPdfOpen(true)}>
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        }
      />

      {/* Read-only report */}
      <SectionCard
        title={`Term ${evaluation.term}`}
        description={
          evaluation.status === "submitted"
            ? `Submitted ${formatDate(evaluation.submittedAt)}`
            : "Draft — not yet submitted"
        }
        actions={
          <div className="flex items-center gap-2">
            <EvaluationStatusBadge status={evaluation.status} />
            <ScoreBadge score={avg} />
          </div>
        }
      >
        <div className="space-y-6">
          {/* Context */}
          <div className="grid gap-4 sm:grid-cols-2">
            <ContextBlock label="Student">
              {student ? (
                <div className="flex items-center gap-2.5">
                  <Avatar name={student.name} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{student.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {student.studentNumber} · {student.course}
                    </p>
                    <p className="text-xs text-muted-foreground">{company?.name}</p>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Unknown</span>
              )}
            </ContextBlock>
            <ContextBlock label="Supervisor">
              {supervisor ? (
                <div className="flex items-center gap-2.5">
                  <Avatar name={supervisor.name} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{supervisor.name}</p>
                    <p className="text-xs text-muted-foreground">{supervisor.email}</p>
                  </div>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Unknown</span>
              )}
            </ContextBlock>
          </div>

          {/* Criteria scores */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">
              Performance Ratings
            </h3>
            <div className="space-y-2">
              {scores.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.value > 0 ? RATING_ANCHORS[s.value] : "Not rated"}
                    </p>
                    {s.value > 0 && (
                      <div className="mt-1.5 sm:hidden">
                        <StarRating value={s.value} size={13} showValue={false} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {s.value > 0 && (
                      <div className="hidden sm:block">
                        <StarRating value={s.value} size={14} showValue={false} />
                      </div>
                    )}
                    <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {s.value > 0 ? `${s.value}/5` : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Average */}
          <div className="flex flex-col gap-2 rounded-md bg-teal-50 px-4 py-3 dark:bg-teal-950/30 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-foreground">Overall Average</span>
            <div className="flex items-center gap-3">
              {avg > 0 && (
                <StarRating value={avg} size={16} showValue={false} showLabel />
              )}
              <span className="font-mono text-lg font-bold tabular-nums text-teal-700 dark:text-teal-300">
                {avg > 0 ? `${avg.toFixed(2)}/5` : "—"}
              </span>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-3">
            <CommentBlock label="Strengths" value={evaluation.strengths} />
            <CommentBlock label="Areas for Improvement" value={evaluation.weaknesses} />
            <CommentBlock label="Recommendations" value={evaluation.recommendations} />
          </div>

          {/* Signature lines */}
          <div className="grid gap-6 border-t border-border pt-4 sm:grid-cols-2">
            <SignatureLine label="Supervisor Signature" name={supervisor?.name} date={evaluation.submittedAt} />
            <SignatureLine label="Coordinator Signature" name="Prof. Patricia Lim" />
          </div>
        </div>
      </SectionCard>

      <PdfPreviewModal
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        title={`Evaluation — ${student?.name ?? "Student"}`}
        subtitle={`Term ${evaluation.term} · ${company?.name ?? ""}`}
      >
        <EvaluationPrintDoc
          studentName={student?.name ?? "—"}
          studentNumber={student?.studentNumber ?? "—"}
          studentCourse={student?.course ?? "—"}
          companyName={company?.name ?? "—"}
          supervisorName={supervisor?.name ?? "—"}
          term={evaluation.term}
          submittedAt={evaluation.submittedAt}
          createdAt={evaluation.createdAt}
          status={evaluation.status}
          scores={scores}
          avg={avg}
          strengths={evaluation.strengths}
          weaknesses={evaluation.weaknesses}
          recommendations={evaluation.recommendations}
        />
      </PdfPreviewModal>
    </div>
  );
}

function ContextBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function CommentBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {value.trim() ? (
        <p className="text-sm leading-relaxed text-foreground">{value}</p>
      ) : (
        <p className="text-sm italic text-muted-foreground">No comment provided.</p>
      )}
    </div>
  );
}

function SignatureLine({
  label,
  name,
  date,
}: {
  label: string;
  name?: string;
  date?: string | null;
}) {
  return (
    <div>
      <div className="mb-1 h-8 border-b border-slate-400" />
      <p className="text-xs font-medium text-foreground">{label}</p>
      {(name || date) && (
        <p className="text-[11px] text-muted-foreground">
          {name}
          {date ? ` · ${formatDate(date)}` : ""}
        </p>
      )}
    </div>
  );
}

function EvaluationPrintDoc({
  studentName,
  studentNumber,
  studentCourse,
  companyName,
  supervisorName,
  term,
  submittedAt,
  createdAt,
  status,
  scores,
  avg,
  strengths,
  weaknesses,
  recommendations,
}: {
  studentName: string;
  studentNumber: string;
  studentCourse: string;
  companyName: string;
  supervisorName: string;
  term: string;
  submittedAt: string | null;
  createdAt: string;
  status: "draft" | "submitted";
  scores: { label: string; value: number }[];
  avg: number;
  strengths: string;
  weaknesses: string;
  recommendations: string;
}) {
  return (
    <div className="space-y-4 text-slate-900">
      <div className="flex items-center justify-between border-b border-slate-300 pb-3">
        <div>
          <h1 className="text-lg font-bold">Practicum Evaluation Report</h1>
          <p className="text-xs text-slate-600">Term {term}</p>
        </div>
        <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] uppercase tracking-wide">
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Student</p>
          <p className="font-semibold">{studentName}</p>
          <p className="font-mono text-xs">{studentNumber}</p>
          <p className="text-xs">{studentCourse} · {companyName}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Supervisor</p>
          <p className="font-semibold">{supervisorName}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Submitted</p>
          <p className="text-xs">
            {formatDate(submittedAt ?? createdAt) || "—"}
          </p>
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
            {scores.map((s) => (
              <tr key={s.label} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{s.label}</td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {s.value > 0 ? RATING_ANCHORS[s.value] : "—"}
                </td>
                <td className="px-3 py-2 text-right font-mono font-semibold">
                  {s.value > 0 ? `${s.value}/5` : "—"}
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

      <PrintComment label="Strengths" value={strengths} />
      <PrintComment label="Areas for Improvement" value={weaknesses} />
      <PrintComment label="Recommendations" value={recommendations} />

      <div className="grid grid-cols-2 gap-6 border-t border-slate-300 pt-4">
        <div>
          <div className="mb-1 h-6 border-b border-slate-400" />
          <p className="text-xs">Supervisor Signature</p>
          <p className="text-[10px] text-slate-600">{supervisorName}</p>
        </div>
        <div>
          <div className="mb-1 h-6 border-b border-slate-400" />
          <p className="text-xs">Coordinator Signature</p>
          <p className="text-[10px] text-slate-600">Prof. Patricia Lim</p>
        </div>
      </div>

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
      <p className="mt-0.5 text-sm text-slate-800">
        {value.trim() ? value : "—"}
      </p>
    </div>
  );
}
