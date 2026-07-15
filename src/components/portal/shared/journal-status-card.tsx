"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText,
  ExternalLink,
  Check,
  RotateCcw,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  NotebookText,
  Lightbulb,
  Hourglass,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/use-app-store";
import { ExternalLink as ExternalLinkBtn } from "@/components/portal/shared/external-link";
import type { Journal, Role } from "@/lib/types";

interface JournalStatusCardProps {
  journal: Journal | null; // null = no journal created yet this week
  role: Role;
  studentName?: string; // for supervisor/coordinator context
  journalTemplateUrl?: string; // the cohort's template Doc (student: "copy this")
  compact?: boolean;
}

/**
 * JournalStatusCard — one weekly journal's status + role-aware action.
 *
 * Used on:
 *  - Student dashboard: shows THIS week's journal + "Open in Google Docs" +
 *    "Mark as submitted" (if draft).
 *  - Supervisor dashboard pending list: shows student name + "Open journal" +
 *    Approve / Return with comments (if pending).
 *  - Coordinator cohort overview: read-only status pill.
 */
export function JournalStatusCard({
  journal,
  role,
  studentName,
  journalTemplateUrl,
  compact,
}: JournalStatusCardProps) {
  const submitJournal = useAppStore((s) => s.submitJournal);
  const approveJournal = useAppStore((s) => s.approveJournal);
  const rejectJournal = useAppStore((s) => s.rejectJournal);

  const [returning, setReturning] = React.useState(false);
  const [reason, setReason] = React.useState("");
  // Read-only journal preview modal (supervisor can read before approving).
  const [reading, setReading] = React.useState(false);

  const status = journal?.status ?? "none";
  const docUrl = journal?.docUrl;

  const handleMarkSubmitted = () => {
    if (!journal) return;
    submitJournal(journal.id);
    toast.success("Journal submitted", {
      description: "Your supervisor will be notified to review it.",
    });
  };

  const handleApprove = () => {
    if (!journal) return;
    approveJournal(journal.id);
    toast.success("Journal approved", {
      description: studentName ? `${studentName}'s journal is now approved.` : "Journal approved.",
    });
  };

  const handleReturn = () => {
    if (!journal) return;
    if (!reason.trim()) {
      toast.error("Add a comment", { description: "Tell the student what to fix." });
      return;
    }
    rejectJournal(journal.id, reason.trim());
    toast.success("Journal returned", {
      description: "The student has been asked to revise and resubmit.",
    });
    setReturning(false);
    setReason("");
  };

  // ---- Status pill config ----
  const pill = STATUS_PILLS[status];

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card",
        compact ? "p-3" : "p-4",
      )}
    >
      {/* Header row: student (if supervisor) + status pill.
          For supervisors with a pending journal, the header is clickable to
          open the read-only preview modal so they can read the content
          before deciding. */}
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {studentName && (
            <p
              className={cn(
                "truncate text-sm font-semibold text-foreground",
                role === "supervisor" &&
                  journal?.status === "pending" &&
                  "cursor-pointer hover:text-primary hover:underline underline-offset-2",
              )}
              onClick={
                role === "supervisor" && journal?.status === "pending"
                  ? () => setReading(true)
                  : undefined
              }
            >
              {studentName}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {journal
              ? `Week of ${formatDate(journal.date)}`
              : "No journal this week yet"}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            pill.className,
          )}
        >
          <pill.icon className="h-3 w-3" />
          {pill.label}
        </span>
      </div>

      {/* Body: open-doc link + role-aware actions */}
      <div className="space-y-2">
        {/* External doc link */}
        {role === "student" && !docUrl && journalTemplateUrl ? (
          // Student hasn't created this week's Doc yet — show the template link
          <ExternalLinkBtn
            href={journalTemplateUrl}
            label="Open journal template"
            icon={FileText}
            variant="button"
          />
        ) : docUrl ? (
          <ExternalLinkBtn
            href={docUrl}
            label={role === "student" ? "Open your journal" : "Open journal"}
            icon={FileText}
            variant="button"
          />
        ) : (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 text-xs font-medium text-muted-foreground/60">
            <FileText className="h-3.5 w-3.5" />
            No Doc link yet
          </span>
        )}

        {/* Role-aware action */}
        {role === "student" && journal?.status === "draft" && (
          <Button
            onClick={handleMarkSubmitted}
            size="sm"
            className="h-9 w-full"
            type="button"
          >
            <Check className="h-3.5 w-3.5" />
            Mark as submitted
          </Button>
        )}

        {role === "supervisor" && journal?.status === "pending" && !returning && (
          <div className="space-y-2">
            {/* Read journal first — opens a preview modal with the content. */}
            <Button
              onClick={() => setReading(true)}
              variant="secondary"
              size="sm"
              className="h-9 w-full"
              type="button"
            >
              <Eye className="h-3.5 w-3.5" />
              Read journal
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                size="sm"
                className="h-9 flex-1"
                type="button"
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                onClick={() => setReturning(true)}
                variant="outline"
                size="sm"
                className="h-9 flex-1"
                type="button"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Return
              </Button>
            </div>
          </div>
        )}

        {/* Return-with-comments inline form */}
        {role === "supervisor" && journal?.status === "pending" && returning && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-2.5">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell the student what to revise…"
              className="min-h-[64px] text-xs"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                onClick={handleReturn}
                size="sm"
                variant="destructive"
                className="h-8 flex-1"
                type="button"
              >
                <RotateCcw className="h-3 w-3" />
                Return with comments
              </Button>
              <Button
                onClick={() => {
                  setReturning(false);
                  setReason("");
                }}
                variant="ghost"
                size="sm"
                className="h-8"
                type="button"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Rejection reason (student view) */}
        {role === "student" && journal?.status === "rejected" && journal.rejectionReason && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
            <p className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="leading-snug">{journal.rejectionReason}</span>
            </p>
          </div>
        )}

        {/* Approved info */}
        {journal?.status === "approved" && journal.reviewedAt && (
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Approved {formatDate(journal.reviewedAt)}
          </p>
        )}
      </div>

      {/* Read-only journal preview modal — lets the supervisor read the
          journal content (tasks, learnings, hours) before approving or
          returning. Responsive: full-width on mobile, centered on desktop. */}
      {role === "supervisor" && journal && (
        <Dialog open={reading} onOpenChange={setReading}>
          <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-lg">
            <DialogHeader className="border-b border-border/60 px-5 py-4">
              <DialogTitle className="flex items-center gap-2 text-base">
                <NotebookText className="h-4 w-4 text-primary" />
                Journal preview
              </DialogTitle>
              <DialogDescription className="sr-only">
                Read the journal content before approving or returning.
              </DialogDescription>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {studentName && (
                  <span className="font-medium text-foreground">{studentName}</span>
                )}
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Week of {formatDate(journal.date)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Hourglass className="h-3.5 w-3.5" />
                  {journal.hours} hour{journal.hours === 1 ? "" : "s"}
                </span>
              </div>
            </DialogHeader>

            <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
              {/* Tasks */}
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <NotebookText className="h-3.5 w-3.5" />
                  Tasks Performed
                </p>
                {journal.tasks?.trim() ? (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                    {journal.tasks}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    No tasks recorded.
                  </p>
                )}
              </div>

              {/* Learnings */}
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Learnings
                </p>
                {journal.learnings?.trim() ? (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                    {journal.learnings}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    No learnings recorded.
                  </p>
                )}
              </div>

              {/* External doc link if present */}
              {docUrl && (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Attached document
                  </p>
                  <ExternalLinkBtn
                    href={docUrl}
                    label="Open full journal Doc"
                    icon={ExternalLink}
                    variant="link"
                  />
                </div>
              )}
            </div>

            {/* Inline actions so the supervisor can decide without leaving
                the modal. */}
            {journal.status === "pending" && !returning && (
              <div className="flex gap-2 border-t border-border/60 px-5 py-3">
                <Button
                  onClick={() => {
                    handleApprove();
                    setReading(false);
                  }}
                  size="sm"
                  className="h-9 flex-1"
                  type="button"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    setReturning(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="h-9 flex-1"
                  type="button"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Return
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

const STATUS_PILLS: Record<
  string,
  { label: string; icon: typeof Clock; className: string }
> = {
  none: {
    label: "Not started",
    icon: Clock,
    className: "bg-muted text-muted-foreground",
  },
  draft: {
    label: "In progress",
    icon: Clock,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  pending: {
    label: "Submitted",
    icon: Loader2,
    className: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  rejected: {
    label: "Returned",
    icon: XCircle,
    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
