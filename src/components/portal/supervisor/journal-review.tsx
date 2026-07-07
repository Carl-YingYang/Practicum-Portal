"use client";

import { useState } from "react";
import {
  Check,
  X,
  Clock,
  CalendarDays,
  Hourglass,
  AlertTriangle,
  NotebookText,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import {
  getJournal,
  getStudent,
  getCompany,
  getSupervisor,
  formatDate,
  weekLabel,
  formatDateTime,
} from "@/lib/selectors";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { Avatar } from "@/components/portal/shared/avatar";
import { JournalStatusBadge } from "@/components/portal/shared/badges";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { ActionBar } from "@/components/portal/shared/action-bar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function JournalReview() {
  const viewParams = useAppStore((s) => s.viewParams);
  const journals = useAppStore((s) => s.journals);
  const students = useAppStore((s) => s.students);
  const companies = useAppStore((s) => s.companies);
  const supervisors = useAppStore((s) => s.supervisors);
  const navigate = useAppStore((s) => s.navigate);
  const back = useAppStore((s) => s.back);
  const approveJournal = useAppStore((s) => s.approveJournal);
  const rejectJournal = useAppStore((s) => s.rejectJournal);

  const journal = getJournal(journals, viewParams.journalId);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);

  if (!journal) {
    return (
      <div>
        <PageHeader showBack breadcrumb="Journal Approvals" title="Journal not found" />
        <EmptyState
          icon={NotebookText}
          title="Journal not found"
          description="This journal may have been removed."
          actionLabel="Back to approvals"
          onAction={() => navigate("supervisor.journals")}
        />
      </div>
    );
  }

  const student = getStudent(students, journal.studentId);
  const company = student ? getCompany(companies, student.companyId) : undefined;
  const reviewer = getSupervisor(supervisors, journal.reviewedBy ?? null);
  const isPending = journal.status === "pending";
  const isRejected = journal.status === "rejected";
  const isApproved = journal.status === "approved";

  const handleApprove = () => {
    approveJournal(journal.id);
    setApproveOpen(false);
    toast.success("Journal approved", {
      description: `${student?.name ?? "Intern"}'s hours have been logged.`,
    });
    navigate("supervisor.journals");
  };

  const handleReject = () => {
    if (!reason.trim()) return;
    rejectJournal(journal.id, reason.trim());
    setRejectOpen(false);
    toast.success("Journal rejected", {
      description: "The intern has been notified with your reason.",
    });
    navigate("supervisor.journals");
  };

  return (
    <div>
      <PageHeader
        showBack
        breadcrumb="Journal Approvals"
        title="Review Journal"
        description={weekLabel(journal.date)}
        actions={<JournalStatusBadge status={journal.status} />}
      />

      {/* Reviewed banner (if previously reviewed) */}
      {(isApproved || isRejected) && (
        <div
          className={cn(
            "mb-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
            isApproved
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          )}
        >
          {isApproved ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div>
            <p>
              {isApproved ? "Approved" : "Rejected"} on{" "}
              <strong>{formatDateTime(journal.reviewedAt)}</strong>
              {reviewer && <> by {reviewer.name}</>}.
            </p>
            {isRejected && journal.rejectionReason && (
              <p className="mt-1">
                <span className="font-medium">Reason:</span>{" "}
                {journal.rejectionReason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Journal content */}
      <SectionCard>
        {/* Student header */}
        <div className="flex items-start gap-3 border-b border-border pb-4">
          {student && <Avatar name={student.name} size="lg" />}
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-foreground">
              {student?.name ?? "—"}
            </p>
            {student && (
              <p className="font-mono text-xs text-muted-foreground">
                {student.studentNumber} · {student.course} · {company?.name}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(journal.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Hourglass className="h-3.5 w-3.5" />
                {journal.hours} hours
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Submitted {formatDateTime(journal.submittedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="border-b border-border py-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <NotebookText className="h-3.5 w-3.5" />
            Tasks Performed
          </p>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {journal.tasks}
          </p>
        </div>

        {/* Learnings */}
        <div className="py-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" />
            Learnings
          </p>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {journal.learnings}
          </p>
        </div>
      </SectionCard>

      {/* Action bar */}
      {isPending && (
        <ActionBar>
          <span className="hidden text-xs text-muted-foreground sm:mr-auto sm:block">
            Reviewing {student?.name ?? "intern"}'s journal for {weekLabel(journal.date)}.
          </span>
          <Button
            variant="outline"
            onClick={() => setRejectOpen(true)}
            className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/40"
          >
            <X className="h-4 w-4" />
            Reject…
          </Button>
          <Button
            onClick={() => setApproveOpen(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Check className="h-4 w-4" />
            Approve
          </Button>
        </ActionBar>
      )}

      {/* Approve confirmation */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve this journal?</DialogTitle>
            <DialogDescription>
              Approving will log{" "}
              <strong>
                {journal.hours} hour{journal.hours === 1 ? "" : "s"}
              </strong>{" "}
              toward {student?.name ?? "the intern"}'s required hours. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Check className="h-4 w-4" />
              Approve Journal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog with required reason */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject this journal?</DialogTitle>
            <DialogDescription>
              Please provide a reason. The intern will see this feedback and
              can revise and resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">
              Reason <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="e.g., The learnings section is too brief. Please elaborate on what you learned…"
              aria-describedby="reject-reason-help"
              autoFocus
            />
            <p
              id="reject-reason-help"
              className={cn(
                "text-xs",
                reason.trim() === ""
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-muted-foreground"
              )}
            >
              {reason.trim() === ""
                ? "A reason is required to reject a journal."
                : "Looks good — ready to submit."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={reason.trim() === ""}
            >
              <X className="h-4 w-4" />
              Reject Journal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Back button when not pending */}
      {!isPending && (
        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={() => (back ? back() : navigate("supervisor.journals"))}>
            Back to approvals
          </Button>
        </div>
      )}
    </div>
  );
}
