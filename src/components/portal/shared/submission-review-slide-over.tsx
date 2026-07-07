"use client";

import * as React from "react";
import { SlideOver } from "@/components/portal/shared/slide-over";
import { FormBlockRenderer } from "@/components/portal/shared/form-block-renderer";
import { SubmissionStatusBadge } from "@/components/portal/shared/badges";
import { Avatar } from "@/components/portal/shared/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/store/use-app-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  RotateCcw,
  MoreHorizontal,
  Printer,
  Download,
  Calendar,
  Clock,
  User as UserIcon,
  GraduationCap,
  FileText,
  MessageSquare,
} from "lucide-react";
import { portalUsers } from "@/lib/mock-data";
import { type FormSubmission, FORM_CATEGORY_LABELS, type FormSubmissionStatus } from "@/lib/types";
import { format, formatDistanceToNow } from "date-fns";

/**
 * SubmissionReviewSlideOver — the coordinator's focused review workspace.
 * Shows the submitter's identity, the form's filled-in responses (read-only),
 * the review timeline, and the approve / request-revision actions.
 *
 * Opened from the coordinator's Submissions queue. Stays on the same page —
 * no navigation — so the coordinator can move through submissions quickly.
 */
export function SubmissionReviewSlideOver({
  open,
  onOpenChange,
  submissionId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  submissionId?: string;
}) {
  const { toast } = useToast();
  const submission = useAppStore((s) =>
    s.formSubmissions.find((x) => x.id === submissionId)
  );
  const form = useAppStore((s) =>
    s.formDocuments.find((d) => d.id === submission?.formId)
  );
  const students = useAppStore((s) => s.students);
  const reviewSubmission = useAppStore((s) => s.reviewSubmission);

  const [reviewNote, setReviewNote] = React.useState("");
  const [decision, setDecision] = React.useState<"approve" | "request_revision" | null>(null);

  React.useEffect(() => {
    if (open) {
      setReviewNote(submission?.reviewNote ?? "");
      setDecision(null);
    }
  }, [open, submission?.id]);

  if (!submission || !form) {
    return (
      <SlideOver
        open={open}
        onOpenChange={onOpenChange}
        title="Submission not found"
        description="It may have been removed."
      >
        <div className="text-[12px] text-muted-foreground">Close this panel and pick another submission from the queue.</div>
      </SlideOver>
    );
  }

  const submitter = portalUsers.find((u) => u.id === submission.userId);
  const targetStudent = submission.targetStudentId
    ? students.find((s) => s.id === submission.targetStudentId)
    : undefined;

  const submittedDate = submission.submittedAt
    ? format(new Date(submission.submittedAt), "MMM d, yyyy 'at' h:mm a")
    : null;
  const reviewedDate = submission.reviewedAt
    ? format(new Date(submission.reviewedAt), "MMM d, yyyy 'at' h:mm a")
    : null;
  const updatedRel = formatDistanceToNow(new Date(submission.updatedAt), { addSuffix: true });

  const isPendingReview =
    submission.status === "submitted" || submission.status === "under_review";
  const isReviewed = submission.status === "approved" || submission.status === "needs_revision";

  function handleConfirm() {
    if (!decision || !submission) return;
    reviewSubmission(submission.id, decision, reviewNote.trim() || undefined);
    const label = decision === "approve" ? "approved" : "sent back for revision";
    toast({
      title: `Submission ${label}`,
      description: decision === "approve"
        ? `${submitter?.name ?? "Submitter"} has been notified.`
        : `${submitter?.name ?? "Submitter"} will see your note in their Forms inbox.`,
    });
    onOpenChange(false);
  }

  function handlePrint() {
    toast({ title: "Print preview", description: "In production this would open a print-friendly view." });
  }
  function handleDownload() {
    toast({ title: "Export queued", description: "A PDF export would be generated in production." });
  }

  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      width="wide"
      eyebrow={`${FORM_CATEGORY_LABELS[form.category]} · v${form.version}`}
      title={form.title}
      description={form.description || undefined}
      headerActions={
        <>
          <Button variant="outline" size="sm" onClick={handlePrint} className="hidden sm:inline-flex gap-1.5">
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="mr-2 h-3.5 w-3.5" /> Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint}>
                <Printer className="mr-2 h-3.5 w-3.5" /> Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
      footer={
        isPendingReview ? (
          <div className="space-y-2.5">
            {decision && (
              <div className="space-y-1.5">
                <Label htmlFor="sr-note" className="text-[12px]">
                  {decision === "approve" ? "Approval note (optional)" : "Revision note"}
                </Label>
                <Textarea
                  id="sr-note"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={
                    decision === "approve"
                      ? "Add a brief note for the submitter (optional)."
                      : "Explain what needs to be revised. The submitter will see this note."
                  }
                  rows={2}
                  className="text-[13px]"
                />
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              {decision ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setDecision(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirm}
                    className={cn(
                      "gap-1.5",
                      decision === "approve"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-amber-600 hover:bg-amber-700"
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirm {decision === "approve" ? "approval" : "revision request"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDecision("request_revision")}
                    className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-900/60 dark:text-amber-400 dark:hover:bg-amber-950/40"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Request revision
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setDecision("approve")}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : isReviewed ? (
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="text-muted-foreground">
              {submission.status === "approved" ? "Approved" : "Sent back for revision"} · {updatedRel}
            </span>
            {isReviewed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDecision(submission.status === "approved" ? "request_revision" : "approve")}
                className="gap-1.5 text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reopen review
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {submission.status === "in_progress"
              ? "This response is still being drafted by the submitter — not ready for review."
              : "Awaiting the submitter to start."}
          </div>
        )
      }
    >
      <div className="space-y-4">
        {/* Submitter + target context card */}
        <div className="rounded-lg border border-border/60 bg-card p-3.5">
          <div className="flex items-start gap-3">
            <Avatar
              name={submitter?.name ?? "?"}
              size="md"
              color={submitter?.avatarColor ?? "#64748b"}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[13px] font-semibold text-foreground">{submitter?.name ?? "Unknown"}</span>
                <SubmissionStatusBadge status={submission.status} withIcon />
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {submitter?.email}
              </div>
              {targetStudent && (
                <div className="mt-2 flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                  <GraduationCap className="h-3 w-3" />
                  Evaluating: <span className="font-medium text-foreground">{targetStudent.name}</span>
                  <span className="text-muted-foreground/70">· {targetStudent.studentNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-3 grid grid-cols-1 gap-1.5 border-t border-border/50 pt-3 text-[11px] sm:grid-cols-2">
            <TimelineItem
              icon={Calendar}
              label="Started"
              value={submission.startedAt ? format(new Date(submission.startedAt), "MMM d, h:mm a") : "—"}
            />
            <TimelineItem
              icon={FileText}
              label="Submitted"
              value={submittedDate ?? "Not submitted"}
            />
            {reviewedDate && (
              <TimelineItem
                icon={CheckCircle2}
                label="Reviewed"
                value={reviewedDate}
              />
            )}
            {submission.reviewNote && (
              <div className="sm:col-span-2 mt-1 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900 ring-1 ring-inset ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50">
                <div className="flex items-center gap-1 font-medium">
                  <MessageSquare className="h-3 w-3" /> Reviewer note
                </div>
                <div className="mt-0.5">{submission.reviewNote}</div>
              </div>
            )}
          </div>
        </div>

        {/* Filled-in form responses */}
        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Responses
          </h3>
          {form.blocks.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/70 px-4 py-6 text-center text-[12px] text-muted-foreground">
              This form has no blocks.
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4">
              {form.blocks.map((b) => (
                <FormBlockRenderer
                  key={b.id}
                  block={b}
                  interactive={false}
                  values={submission.values}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </SlideOver>
  );
}

function TimelineItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
