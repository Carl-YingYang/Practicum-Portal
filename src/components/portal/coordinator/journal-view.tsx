"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  formatDate,
  formatDateTime,
  getCompany,
  getJournal,
  getStudent,
  getSupervisor,
  weekLabel,
} from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { PdfPreviewModal } from "@/components/portal/shared/pdf-preview-modal";
import {
  JournalStatusBadge,
  Badge,
} from "@/components/portal/shared/badges";
import { Avatar } from "@/components/portal/shared/avatar";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, Clock, XCircle } from "lucide-react";

export function JournalView({ journalId }: { journalId?: string }) {
  const navigate = useAppStore((s) => s.navigate);
  const journals = useAppStore((s) => s.journals);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);

  const [pdfOpen, setPdfOpen] = React.useState(false);
  const journal = getJournal(journals, journalId);

  if (!journal) {
    return (
      <div>
        <PageHeader title="Journal" showBack breadcrumb="Journals" />
        <EmptyState
          icon={AlertCircle}
          title="Journal not found"
          description="This journal entry may have been removed."
          actionLabel="Back to journals"
          onAction={() => navigate("coordinator.journals")}
        />
      </div>
    );
  }

  const student = getStudent(students, journal.studentId);
  const supervisor = getSupervisor(supervisors, student?.supervisorId ?? null);
  const company = student ? getCompany(companies, student.companyId) : undefined;
  const reviewer = getSupervisor(supervisors, journal.reviewedBy ?? null);

  return (
    <div>
      <PageHeader
        title={weekLabel(journal.date)}
        description={`${formatDate(journal.date)} · ${journal.hours} hours`}
        breadcrumb="Journals"
        showBack
        actions={
          <Button onClick={() => setPdfOpen(true)}>
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        }
      />

      {/* Context */}
      <SectionCard
        title="Journal Entry"
        actions={<JournalStatusBadge status={journal.status} />}
      >
        <div className="space-y-6">
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
                <Badge tone="amber" outline>Unassigned</Badge>
              )}
            </ContextBlock>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Meta label="Week" value={weekLabel(journal.date)} />
            <Meta label="Date" value={formatDate(journal.date)} />
            <Meta label="Hours" value={`${journal.hours}h`} />
            <Meta
              label="Submitted"
              value={journal.submittedAt ? formatDateTime(journal.submittedAt) : "—"}
            />
          </div>

          {/* Tasks */}
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tasks Completed
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {journal.tasks || "—"}
            </p>
          </div>

          {/* Learnings */}
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Learnings & Reflections
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {journal.learnings || "—"}
            </p>
          </div>

          {/* Rejection reason */}
          {journal.status === "rejected" && journal.rejectionReason && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Rejected by {reviewer?.name ?? "supervisor"}
                  {journal.reviewedAt ? ` · ${formatDate(journal.reviewedAt)}` : ""}
                </p>
              </div>
              <p className="mt-2 text-sm text-amber-900 dark:text-amber-200">
                {journal.rejectionReason}
              </p>
            </div>
          )}

          {/* Review info */}
          {(journal.status === "approved" || journal.status === "rejected") && journal.reviewedAt && (
            <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Reviewed {formatDateTime(journal.reviewedAt)}
                {reviewer ? ` by ${reviewer.name}` : ""}
              </span>
            </div>
          )}
        </div>
      </SectionCard>

      <PdfPreviewModal
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        title={`Journal — ${student?.name ?? "Student"}`}
        subtitle={weekLabel(journal.date)}
      >
        <JournalPrintDoc
          studentName={student?.name ?? "—"}
          studentNumber={student?.studentNumber ?? "—"}
          studentCourse={student?.course ?? "—"}
          companyName={company?.name ?? "—"}
          supervisorName={supervisor?.name ?? "—"}
          date={journal.date}
          hours={journal.hours}
          status={journal.status}
          tasks={journal.tasks}
          learnings={journal.learnings}
          rejectionReason={journal.rejectionReason}
          reviewedBy={reviewer?.name}
          reviewedAt={journal.reviewedAt}
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function JournalPrintDoc({
  studentName,
  studentNumber,
  studentCourse,
  companyName,
  supervisorName,
  date,
  hours,
  status,
  tasks,
  learnings,
  rejectionReason,
  reviewedBy,
  reviewedAt,
}: {
  studentName: string;
  studentNumber: string;
  studentCourse: string;
  companyName: string;
  supervisorName: string;
  date: string;
  hours: number;
  status: "draft" | "pending" | "approved" | "rejected";
  tasks: string;
  learnings: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string | null;
}) {
  return (
    <div className="space-y-4 text-slate-900">
      <div className="flex items-center justify-between border-b border-slate-300 pb-3">
        <div>
          <h1 className="text-lg font-bold">Weekly Journal</h1>
          <p className="text-xs text-slate-600">{weekLabel(date)} · {formatDate(date)}</p>
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
          <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Hours</p>
          <p className="text-xs">{hours}h</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Tasks Completed
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">
          {tasks || "—"}
        </p>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Learnings &amp; Reflections
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">
          {learnings || "—"}
        </p>
      </div>

      {status === "rejected" && rejectionReason && (
        <div className="rounded border border-amber-400 bg-amber-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            Rejection Reason
          </p>
          <p className="mt-0.5 text-sm text-amber-900">{rejectionReason}</p>
        </div>
      )}

      {(status === "approved" || status === "rejected") && (
        <div className="border-t border-slate-300 pt-3 text-xs text-slate-600">
          Reviewed {formatDate(reviewedAt)}
          {reviewedBy ? ` by ${reviewedBy}` : ""}
        </div>
      )}

      <p className="text-center text-[10px] text-slate-500">
        Practicum Evaluation Portal · Confidential · Generated {formatDate(new Date().toISOString())}
      </p>
    </div>
  );
}
