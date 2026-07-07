"use client";

import * as React from "react";
import {
  GraduationCap,
  NotebookText,
  Timer,
  ClipboardCheck,
  Award,
  CheckCircle2,
  XCircle,
  Clock as ClockIcon,
} from "lucide-react";
import type {
  Student,
  Supervisor,
  Company,
  Journal,
  Evaluation,
  ToolsConfig,
} from "@/lib/types";
import { RATING_CRITERIA, RATING_ANCHORS } from "@/lib/types";
import {
  averageScore,
  formatDate,
  formatDuration,
  hoursPercent,
  totalCompletedTimeMs,
  weekLabel,
} from "@/lib/selectors";

interface AccreditationDocumentProps {
  student: Student;
  supervisor: Supervisor | null;
  company: Company | null;
  journals: Journal[];
  evaluations: Evaluation[];
  toolsConfig: ToolsConfig;
  completedTimeMs: number;
  coordinatorName: string;
  /** Optional: signed-on date (for re-print of an already-signed doc). */
  signedAt?: string | null;
}

/**
 * AccreditationDocument — the portal's "moat" (per RESEARCH-free-tools-discovery.md §11).
 *
 * A print-optimized document that stitches together:
 *   1. Cover page (student + cohort + term + sign-off summary)
 *   2. Weekly journals index (status + Doc link per week)
 *   3. Timesheet summary (hours + progress)
 *   4. Evaluation results (criteria scores + comments)
 *   5. Sign-off page (manual signature lines for student / supervisor / coordinator)
 *
 * Browser Print → PDF. No e-sign API (Phase 2 honest boundary per research doc §7).
 * Renders inside a PdfPreviewModal — uses .print-area + .no-print CSS from globals.
 */
export function AccreditationDocument({
  student,
  supervisor,
  company,
  journals,
  evaluations,
  toolsConfig,
  completedTimeMs,
  coordinatorName,
  signedAt,
}: AccreditationDocumentProps) {
  const pct = hoursPercent(student);
  const totalMs = completedTimeMs;
  const trackedHours = Math.round(totalMs / 3600_000);
  const approvedJournals = journals.filter((j) => j.status === "approved");
  const pendingJournals = journals.filter((j) => j.status === "pending");
  const rejectedJournals = journals.filter((j) => j.status === "rejected");
  const draftJournals = journals.filter((j) => j.status === "draft");
  const submittedEval = evaluations.find((e) => e.status === "submitted");
  const evalAvg = submittedEval ? averageScore(submittedEval) : 0;
  const termLabel = `${formatDate(toolsConfig.termStart)} – ${formatDate(toolsConfig.termEnd)}`;
  const generatedAt = formatDate(new Date().toISOString());

  return (
    <div className="space-y-6 text-slate-900">
      {/* ============ 1. COVER PAGE ============ */}
      <section className="cover-page space-y-5">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-teal-700" />
            <div>
              <h1 className="text-base font-bold leading-tight">
                Practicum Accreditation Document
              </h1>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Official Record · Term {termLabel}
              </p>
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            <p>Generated {generatedAt}</p>
            <p className="font-mono">DOC-{student.studentNumber}</p>
          </div>
        </div>

        <div className="rounded border border-slate-300 bg-slate-50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Student
          </p>
          <p className="mt-1 text-lg font-bold">{student.name}</p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="text-slate-500">Student No: </span>
              <span className="font-mono font-medium">{student.studentNumber}</span>
            </div>
            <div>
              <span className="text-slate-500">Course: </span>
              <span className="font-medium">{student.course}</span>
            </div>
            <div>
              <span className="text-slate-500">Position: </span>
              <span className="font-medium">{student.position}</span>
            </div>
            <div>
              <span className="text-slate-500">Work Mode: </span>
              <span className="font-medium capitalize">{student.workMode}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded border border-slate-300 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Host Company
            </p>
            <p className="mt-1 text-sm font-bold">{company?.name ?? "—"}</p>
            <p className="text-[10px] text-slate-500">Practicum placement</p>
          </div>
          <div className="rounded border border-slate-300 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Company Supervisor
            </p>
            <p className="mt-1 text-sm font-bold">{supervisor?.name ?? "Unassigned"}</p>
            <p className="text-[10px] text-slate-500">
              {supervisor?.title ?? "—"}
            </p>
          </div>
        </div>

        <div className="rounded border-2 border-teal-700 bg-teal-50 p-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold text-teal-800">
                {approvedJournals.length}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-teal-700">
                Journals Approved
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-800">
                {trackedHours}
                <span className="text-xs font-normal">/{student.requiredHours}</span>
              </p>
              <p className="text-[10px] uppercase tracking-wide text-teal-700">
                Hours Completed
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-800">
                {submittedEval ? evalAvg.toFixed(1) : "—"}
                <span className="text-xs font-normal">/5</span>
              </p>
              <p className="text-[10px] uppercase tracking-wide text-teal-700">
                Eval Average
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-800">{pct}%</p>
              <p className="text-[10px] uppercase tracking-wide text-teal-700">
                Completion
              </p>
            </div>
          </div>
        </div>

        <div className="rounded border border-slate-300 p-3 text-[10px] text-slate-600">
          <p className="font-semibold uppercase tracking-wider text-slate-500">
            Accreditation Status
          </p>
          <p className="mt-1">
            {pct >= 100 && approvedJournals.length >= 5 && submittedEval
              ? "✓ Eligible for accreditation — all requirements met."
              : "◐ In progress — see detailed sections below for outstanding requirements."}
          </p>
        </div>
      </section>

      {/* ============ 2. WEEKLY JOURNALS INDEX ============ */}
      <section className="page-break-before space-y-3">
        <SectionHeader
          icon={<NotebookText className="h-4 w-4" />}
          title="Weekly Journals Index"
          subtitle={`${journals.length} total · ${approvedJournals.length} approved · ${pendingJournals.length} pending · ${rejectedJournals.length} returned · ${draftJournals.length} not started`}
        />

        {journals.length === 0 ? (
          <p className="rounded border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
            No journals recorded for this term.
          </p>
        ) : (
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 text-left">
                <th className="px-2 py-1.5 font-semibold">Week</th>
                <th className="px-2 py-1.5 font-semibold">Date</th>
                <th className="px-2 py-1.5 font-semibold">Hours</th>
                <th className="px-2 py-1.5 font-semibold">Status</th>
                <th className="px-2 py-1.5 font-semibold">Doc Link</th>
              </tr>
            </thead>
            <tbody>
              {journals.map((j, i) => (
                <tr key={j.id} className="border-b border-slate-200 align-top">
                  <td className="px-2 py-1.5 font-mono">{`W${i + 1}`}</td>
                  <td className="px-2 py-1.5">{weekLabel(j.date)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{j.hours}h</td>
                  <td className="px-2 py-1.5">
                    <StatusPill status={j.status} />
                    {j.status === "rejected" && j.rejectionReason && (
                      <p className="mt-0.5 text-[10px] italic text-red-700">
                        Returned: {j.rejectionReason.slice(0, 80)}
                        {j.rejectionReason.length > 80 ? "…" : ""}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {j.docUrl ? (
                      <span className="font-mono text-[10px] text-teal-700 underline">
                        {truncateUrl(j.docUrl)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {toolsConfig.journalTemplateUrl && (
          <p className="text-[10px] text-slate-500">
            Journal template:{" "}
            <span className="font-mono underline">
              {truncateUrl(toolsConfig.journalTemplateUrl)}
            </span>
          </p>
        )}
      </section>

      {/* ============ 3. TIMESHEET SUMMARY ============ */}
      <section className="page-break-before space-y-3">
        <SectionHeader
          icon={<Timer className="h-4 w-4" />}
          title="Timesheet Summary"
          subtitle="Hours tracked via Jibble + portal time clock"
        />

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded border border-slate-300 p-3 text-center">
            <p className="text-xl font-bold tabular-nums">{trackedHours}h</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              Tracked Total
            </p>
          </div>
          <div className="rounded border border-slate-300 p-3 text-center">
            <p className="text-xl font-bold tabular-nums">
              {student.requiredHours}h
            </p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              Required
            </p>
          </div>
          <div className="rounded border border-slate-300 p-3 text-center">
            <p className="text-xl font-bold tabular-nums">
              {Math.max(0, student.requiredHours - trackedHours)}h
            </p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              Remaining
            </p>
          </div>
        </div>

        <div className="rounded border border-slate-300 p-3">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="font-medium">Completion Progress</span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-teal-600"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>

        {toolsConfig.jibbleInviteUrl && (
          <p className="text-[10px] text-slate-500">
            Timesheet source: Jibble (
            <span className="font-mono underline">
              {truncateUrl(toolsConfig.jibbleInviteUrl)}
            </span>
            )
          </p>
        )}
      </section>

      {/* ============ 4. EVALUATION RESULTS ============ */}
      <section className="page-break-before space-y-3">
        <SectionHeader
          icon={<ClipboardCheck className="h-4 w-4" />}
          title="Supervisor Evaluation"
          subtitle={
            submittedEval
              ? `Submitted by ${supervisor?.name ?? "supervisor"} on ${formatDate(submittedEval.submittedAt)}`
              : "Not yet submitted — pending supervisor completion"
          }
        />

        {submittedEval ? (
          <>
            <div className="rounded border border-slate-300 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Criteria Ratings
              </p>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-slate-300 text-left">
                    <th className="py-1 font-medium">Criterion</th>
                    <th className="py-1 text-center font-medium">Rating</th>
                    <th className="py-1 font-medium">Anchor</th>
                  </tr>
                </thead>
                <tbody>
                  {RATING_CRITERIA.map((c) => {
                    const score = submittedEval[c.key];
                    return (
                      <tr key={c.key} className="border-b border-slate-100">
                        <td className="py-1.5">
                          <p className="font-medium">{c.label}</p>
                          <p className="text-[10px] text-slate-500">{c.hint}</p>
                        </td>
                        <td className="py-1.5 text-center">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800">
                            {score}
                          </span>
                        </td>
                        <td className="py-1.5 text-slate-700">
                          {RATING_ANCHORS[score] ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300">
                    <td className="py-1.5 font-bold">Average</td>
                    <td className="py-1.5 text-center">
                      <span className="font-bold tabular-nums">
                        {evalAvg.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-1.5 text-slate-700">
                      {RATING_ANCHORS[Math.round(evalAvg)] ?? "—"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {(submittedEval.strengths ||
              submittedEval.weaknesses ||
              submittedEval.recommendations) && (
              <div className="space-y-2">
                {submittedEval.strengths && (
                  <EvalCommentBlock
                    label="Strengths"
                    text={submittedEval.strengths}
                    tone="positive"
                  />
                )}
                {submittedEval.weaknesses && (
                  <EvalCommentBlock
                    label="Areas for Improvement"
                    text={submittedEval.weaknesses}
                    tone="warning"
                  />
                )}
                {submittedEval.recommendations && (
                  <EvalCommentBlock
                    label="Recommendations"
                    text={submittedEval.recommendations}
                    tone="neutral"
                  />
                )}
              </div>
            )}

            {toolsConfig.formUrl && (
              <p className="text-[10px] text-slate-500">
                Evaluation form:{" "}
                <span className="font-mono underline">
                  {truncateUrl(toolsConfig.formUrl)}
                </span>
              </p>
            )}
          </>
        ) : (
          <div className="rounded border border-dashed border-slate-300 p-6 text-center">
            <ClockIcon className="mx-auto h-6 w-6 text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-600">
              Evaluation pending
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              The supervisor has not yet submitted the evaluation form for this
              term. This section will be populated once submitted.
            </p>
          </div>
        )}
      </section>

      {/* ============ 5. SIGN-OFF PAGE ============ */}
      <section className="page-break-before space-y-4">
        <SectionHeader
          icon={<Award className="h-4 w-4" />}
          title="Accreditation Sign-off"
          subtitle="Manual signatures — print this page, sign, and submit to the practicum office"
        />

        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-[10px] text-amber-800">
          <p className="font-semibold">Instructions</p>
          <p className="mt-0.5">
            Print this document (Ctrl+P or Cmd+P → Save as PDF). Each signatory
            signs their line below. Submit the signed PDF to the Practicum
            Coordinator&apos;s office for archival.
          </p>
        </div>

        <div className="space-y-6 pt-4">
          <SignatureLine
            label="Student"
            name={student.name}
            role={student.position}
            date={signedAt}
          />
          <SignatureLine
            label="Company Supervisor"
            name={supervisor?.name ?? "—"}
            role={supervisor?.title ?? "—"}
            date={signedAt}
          />
          <SignatureLine
            label="Practicum Coordinator"
            name={coordinatorName}
            role="Practicum Coordinator"
            date={signedAt}
          />
        </div>

        <div className="mt-8 border-t border-slate-300 pt-3 text-[9px] text-slate-400">
          <p>
            This document was generated by the Practicum Evaluation Portal on
            {" "}
            {generatedAt}. It aggregates workflow status (journal approvals,
            hours completed, evaluation results) tracked by the portal — the
            underlying content lives in the linked external tools (Google Docs
            for journals, Jibble for attendance, Google Forms for evaluations).
          </p>
          <p className="mt-1">
            Verification: cross-reference the Doc/Jibble/Form links above with
            the external tools. Discrepancies should be reported to the
            Practicum Coordinator.
          </p>
        </div>
      </section>
    </div>
  );
}

// ---------- helpers ----------

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-2 border-b border-slate-300 pb-2">
      <span className="mt-0.5 text-teal-700">{icon}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {subtitle && (
          <p className="text-[10px] text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Journal["status"] }) {
  const map: Record<
    Journal["status"],
    { label: string; bg: string; text: string; icon: React.ReactNode }
  > = {
    approved: {
      label: "Approved",
      bg: "bg-emerald-100",
      text: "text-emerald-800",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    pending: {
      label: "Submitted",
      bg: "bg-amber-100",
      text: "text-amber-800",
      icon: <ClockIcon className="h-3 w-3" />,
    },
    rejected: {
      label: "Returned",
      bg: "bg-red-100",
      text: "text-red-800",
      icon: <XCircle className="h-3 w-3" />,
    },
    draft: {
      label: "Not started",
      bg: "bg-slate-100",
      text: "text-slate-600",
      icon: <ClockIcon className="h-3 w-3" />,
    },
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.bg} ${s.text}`}
    >
      {s.icon}
      {s.label}
    </span>
  );
}

function EvalCommentBlock({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "positive" | "warning" | "neutral";
}) {
  const toneClass = {
    positive: "border-emerald-300 bg-emerald-50",
    warning: "border-amber-300 bg-amber-50",
    neutral: "border-slate-300 bg-slate-50",
  }[tone];
  return (
    <div className={`rounded border p-3 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-800">
        {text}
      </p>
    </div>
  );
}

function SignatureLine({
  label,
  name,
  role,
  date,
}: {
  label: string;
  name: string;
  role: string;
  date?: string | null;
}) {
  return (
    <div className="grid grid-cols-[1fr_140px] gap-4">
      <div>
        <div className="mb-1 h-12 border-b-2 border-slate-900" />
        <p className="text-[11px] font-semibold text-slate-900">
          {label}: {name}
        </p>
        <p className="text-[10px] text-slate-500">{role}</p>
      </div>
      <div>
        <div className="mb-1 h-12 border-b-2 border-slate-900" />
        <p className="text-[11px] font-semibold text-slate-900">Date</p>
        <p className="text-[10px] text-slate-500">
          {date ? formatDate(date) : "________________"}
        </p>
      </div>
    </div>
  );
}

function truncateUrl(url: string, max = 50): string {
  if (url.length <= max) return url;
  return `${url.slice(0, 22)}…${url.slice(-22)}`;
}
