"use client";

import * as React from "react";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { JournalStatusBadge } from "@/components/portal/shared/badges";
import { ConfirmDialog } from "@/components/portal/shared/confirm-dialog";
import { useAppStore } from "@/store/use-app-store";
import {
  formatDate,
  getCompany,
  getJournal,
  getStudent,
  getSupervisor,
  weekLabel,
} from "@/lib/selectors";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertTriangle,
  Edit3,
  FileText,
  FileDown,
  Send,
  FileType2,
} from "lucide-react";
import { exportJournalToDocx } from "@/lib/docx-export";
import { downloadPdfReport } from "@/lib/client-pdf";

export function JournalDetail() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const journals = useAppStore((s) => s.journals);
  const companies = useAppStore((s) => s.companies);
  const supervisors = useAppStore((s) => s.supervisors);
  const schoolIdentity = useAppStore((s) => s.schoolIdentity);
  const viewParams = useAppStore((s) => s.viewParams);
  const navigate = useAppStore((s) => s.navigate);
  const submitJournal = useAppStore((s) => s.submitJournal);

  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  const student = getStudent(students, currentUser?.studentId);
  const journal = getJournal(journals, viewParams.journalId);

  if (!student) return null;

  if (!journal || journal.studentId !== student.id) {
    return (
      <>
        <PageHeader breadcrumb="Journals" showBack />
        <EmptyState
          icon={FileText}
          title="Journal not found"
          description="This journal may have been removed."
          actionLabel="Back to journals"
          onAction={() => navigate("student.journals")}
        />
      </>
    );
  }

  const company = getCompany(companies, student.companyId);
  const reviewer = getSupervisor(supervisors, journal.reviewedBy);
  const supervisor = getSupervisor(supervisors, student.supervisorId);
  const isDraft = journal.status === "draft";
  const isRejected = journal.status === "rejected";

  const handleSubmitConfirm = () => {
    setSubmitOpen(false);
    submitJournal(journal.id);
    toast.success("Journal submitted for approval", {
      description: "Your supervisor will review it shortly.",
    });
    navigate("student.journals");
  };

  const handleDownloadWord = async () => {
    setDownloading(true);
    try {
      await exportJournalToDocx({
        studentName: student.name,
        studentNumber: student.studentNumber,
        course: student.course,
        companyName: company?.name ?? "",
        supervisorName: supervisor?.name ?? "",
        weekLabel: weekLabel(journal.date),
        dateLabel: formatDate(journal.date),
        tasks: journal.tasks,
        learnings: journal.learnings,
        status: journal.status,
        schoolName: schoolIdentity.name,
      });
      toast.success("Word document downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't generate the Word document.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdf = () => {
    try {
      const filename = `journal-${formatDate(journal.date).replace(/\s+/g, "-").toLowerCase()}.pdf`;
      downloadPdfReport({
        filename,
        title: "Weekly Practicum Journal",
        subtitle: `${schoolIdentity.name} · Week of ${formatDate(journal.date)}`,
        meta: [
          { label: "Student", value: student.name },
          { label: "Student No.", value: student.studentNumber },
          { label: "Course", value: student.course },
          { label: "Company", value: company?.name ?? "—" },
          { label: "Supervisor", value: supervisor?.name ?? "—" },
          { label: "Hours", value: `${journal.hours}h` },
          { label: "Status", value: journal.status },
          { label: "Generated", value: formatDate(new Date().toISOString()) },
        ],
        sections: [
          {
            heading: "Tasks Performed",
            paragraphs: [
              { text: journal.tasks || "Not provided." },
            ],
          },
          {
            heading: "Learnings & Reflections",
            paragraphs: [
              { text: journal.learnings || "Not provided." },
            ],
          },
          {
            heading: "Review Information",
            keyValue: [
              { label: "Submitted On", value: journal.submittedAt ? formatDate(journal.submittedAt) : "—" },
              { label: "Reviewed By", value: reviewer?.name ?? "—" },
              { label: "Reviewed On", value: journal.reviewedAt ? formatDate(journal.reviewedAt) : "—" },
              ...(journal.rejectionReason
                ? [{ label: "Rejection Reason", value: journal.rejectionReason }]
                : []),
            ],
          },
        ],
      });
      toast.success("PDF downloaded", {
        description: `${filename} saved to your downloads.`,
      });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't generate the PDF.");
    }
  };

  return (
    <>
      <PageHeader
        breadcrumb="Journals"
        title={`Journal · ${formatDate(journal.date)}`}
        description={weekLabel(journal.date)}
        showBack
        actions={
          isDraft ? (
            <Button onClick={() => setSubmitOpen(true)}>
              <Send className="h-4 w-4" /> Submit for Approval
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadWord}
                disabled={downloading}
              >
                <FileDown className="h-4 w-4" />
                {downloading ? "Generating…" : "Word"}
              </Button>
              <Button onClick={handleDownloadPdf}>
                <FileType2 className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          )
        }
      />

      <div className="space-y-6">
        {/* Rejection reason callout */}
        {isRejected && journal.rejectionReason && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                This journal was rejected
              </p>
              <p className="mt-1 text-sm text-red-700 dark:text-red-200/90">
                {journal.rejectionReason}
              </p>
              <p className="mt-2 text-xs text-red-700/80 dark:text-red-300/80">
                Please submit a new journal addressing the feedback above.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => navigate("student.journal-new")}
              >
                Submit a new journal
              </Button>
            </div>
          </div>
        )}

        <SectionCard title="Journal entry">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Date
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {formatDate(journal.date)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Hours
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground tabular-nums">
                {journal.hours}h
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </dt>
              <dd className="mt-1">
                <JournalStatusBadge status={journal.status} />
              </dd>
            </div>
          </dl>

          <div className="mt-6 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Tasks performed
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {journal.tasks || (
                  <span className="italic text-muted-foreground">Not provided.</span>
                )}
              </p>
            </div>
            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold text-foreground">
                Learnings
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {journal.learnings || (
                  <span className="italic text-muted-foreground">Not provided.</span>
                )}
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Review meta */}
        {!isDraft && (
          <SectionCard title="Review">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Submitted
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatDate(journal.submittedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reviewed by
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {reviewer?.name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reviewed on
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatDate(journal.reviewedAt)}
                </dd>
              </div>
            </dl>
          </SectionCard>
        )}

        {/* Draft actions */}
        {isDraft && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate("student.journal-new", { journalId: journal.id })
              }
            >
              <Edit3 className="h-4 w-4" /> Edit journal
            </Button>
            <Button onClick={() => setSubmitOpen(true)}>
              <Send className="h-4 w-4" /> Submit for Approval
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit journal for approval?"
        description="Once submitted, you can't edit this journal until your supervisor reviews it."
        confirmLabel="Submit for approval"
        onConfirm={handleSubmitConfirm}
      />
    </>
  );
}

/**
 * Print-styled journal document — shared between the detail view PDF export
 * and (potentially) other consumers. Renders plain black-on-white content
 * suitable for `window.print()`.
 */
export interface JournalDocumentProps {
  studentName: string;
  studentNumber: string;
  course: string;
  companyName?: string;
  date: string;
  hours: number;
  tasks: string;
  learnings: string;
  status: string;
}

export function JournalDocument({
  studentName,
  studentNumber,
  course,
  companyName,
  date,
  hours,
  tasks,
  learnings,
  status,
}: JournalDocumentProps) {
  return (
    <div className="space-y-6 text-black">
      <div className="border-b border-slate-300 pb-4">
        <h1 className="text-xl font-bold">Weekly Practicum Journal</h1>
        <p className="text-xs text-slate-600">
          Practicum Evaluation Portal
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
            Week of
          </p>
          <p>{formatDate(date)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Hours
          </p>
          <p className="tabular-nums">{hours}h</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Status
          </p>
          <p className="capitalize">{status}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
          Tasks Performed
        </h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {tasks || "—"}
        </p>
      </div>

      <div>
        <h2 className="mb-2 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
          Learnings
        </h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {learnings || "—"}
        </p>
      </div>

      <div className="border-t border-slate-300 pt-4 text-[10px] text-slate-500">
        Generated on {formatDate(new Date().toISOString())} · Practicum
        Evaluation Portal
      </div>
    </div>
  );
}

export default JournalDetail;
