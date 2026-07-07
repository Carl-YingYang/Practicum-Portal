"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
      {/* Header row: student (if supervisor) + status pill */}
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {studentName && (
            <p className="truncate text-sm font-semibold text-foreground">{studentName}</p>
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
