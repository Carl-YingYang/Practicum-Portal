"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import {
  FormStatusBadge,
  SubmissionStatusBadge,
} from "@/components/portal/shared/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Search,
  FileText,
  Calendar,
  Layers,
  Clock,
  Send,
  CheckCircle2,
  RotateCcw,
  Eye,
  PlayCircle,
  AlertCircle,
  ChevronRight,
  CalendarClock,
} from "lucide-react";
import {
  type FormCategory,
  type FormDocument,
  type FormSubmission,
  type FormSubmissionStatus,
  FORM_CATEGORY_LABELS,
} from "@/lib/types";
import {
  assignedFormsForUser,
  submissionsForUser,
  submissionFor,
} from "@/lib/selectors";
import { format, formatDistanceToNow, differenceInDays, isPast } from "date-fns";

/**
 * SupervisorForms — the "My Forms" inbox. Shows forms assigned to the
 * current supervisor, grouped by what needs their attention:
 *   - Action needed (not started, or needs revision)
 *   - In progress (started but not submitted)
 *   - Submitted (waiting for coordinator review)
 *   - Completed (approved)
 *
 * Clicking a card opens the focused form-filling workspace.
 */
export function SupervisorForms() {
  const navigate = useAppStore((s) => s.navigate);
  const currentUser = useAppStore((s) => s.currentUser)!;
  const forms = useAppStore((s) => s.formDocuments);
  const assignments = useAppStore((s) => s.formAssignments);
  const submissions = useAppStore((s) => s.formSubmissions);
  const students = useAppStore((s) => s.students);

  const [search, setSearch] = React.useState("");

  const assigned = React.useMemo(
    () => assignedFormsForUser(forms, assignments, currentUser),
    [forms, assignments, currentUser]
  );
  const mySubs = React.useMemo(
    () => submissionsForUser(submissions, currentUser.id),
    [submissions, currentUser.id]
  );

  // Build a row per assigned form, with the supervisor's "best" submission status.
  // For evaluation/ojt forms (which target a student), we roll up across all
  // the supervisor's submissions for that form into a single status.
  type Row = {
    form: FormDocument;
    assignment: (typeof assigned)[number]["assignment"];
    status: FormSubmissionStatus;
    submissionCount: number;
    submittedCount: number;
    approvedCount: number;
    needsRevisionCount: number;
    dueDate?: string;
    reviewNote?: string;
  };

  const rows: Row[] = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return assigned
      .map(({ form, assignment }) => {
        const formSubs = mySubs.filter((s) => s.formId === form.id);
        const isStudentTargeted = form.category === "evaluation" || form.category === "ojt";
        // pick the "most actionable" status across this form's submissions
        let status: FormSubmissionStatus;
        let reviewNote: string | undefined;
        if (formSubs.length === 0) {
          status = "not_started";
        } else {
          const ranks: Record<FormSubmissionStatus, number> = {
            needs_revision: 0, in_progress: 1, not_started: 2, submitted: 3, under_review: 4, approved: 5,
          };
          // most actionable = lowest rank
          const sorted = [...formSubs].sort((a, b) => ranks[a.status] - ranks[b.status]);
          status = sorted[0].status;
          const revisionSub = formSubs.find((s) => s.status === "needs_revision");
          reviewNote = revisionSub?.reviewNote;
        }
        return {
          form,
          assignment,
          status,
          submissionCount: formSubs.length,
          submittedCount: formSubs.filter((s) => ["submitted", "under_review", "approved", "needs_revision"].includes(s.status)).length,
          approvedCount: formSubs.filter((s) => s.status === "approved").length,
          needsRevisionCount: formSubs.filter((s) => s.status === "needs_revision").length,
          dueDate: assignment.dueDate,
          reviewNote,
        };
      })
      .filter((r) => (q ? r.form.title.toLowerCase().includes(q) || r.form.description.toLowerCase().includes(q) : true));
  }, [assigned, mySubs, search]);

  // group rows by status bucket
  const buckets = React.useMemo(() => {
    const actionNeeded = rows.filter((r) => r.status === "not_started" || r.status === "needs_revision");
    const inProgress = rows.filter((r) => r.status === "in_progress");
    const submitted = rows.filter((r) => r.status === "submitted" || r.status === "under_review");
    const completed = rows.filter((r) => r.status === "approved");
    return { actionNeeded, inProgress, submitted, completed };
  }, [rows]);

  const internsCount = students.filter((s) => s.supervisorId === currentUser.supervisorId).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Forms"
        breadcrumb="Forms"
        description="Forms assigned to you by the practicum coordinator. Start, continue, or review your responses."
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiTile label="Assigned" value={rows.length} icon={FileText} tone="slate" />
        <KpiTile label="Action needed" value={buckets.actionNeeded.length} icon={AlertCircle} tone={buckets.actionNeeded.length > 0 ? "amber" : "slate"} />
        <KpiTile label="In progress" value={buckets.inProgress.length} icon={Clock} tone="teal" />
        <KpiTile label="Completed" value={buckets.completed.length} icon={CheckCircle2} tone="emerald" />
      </div>

      <SectionCard>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assigned forms..."
            className="h-9 pl-8"
          />
        </div>
      </SectionCard>

      {rows.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={FileText}
            title="No forms assigned to you yet"
            description="When the coordinator publishes and assigns a form, it will appear here for you to fill out."
            tone="slate"
          />
        </SectionCard>
      ) : (
        <div className="space-y-5">
          {buckets.actionNeeded.length > 0 && (
            <FormGroup
              title="Action needed"
              tone="amber"
              count={buckets.actionNeeded.length}
              rows={buckets.actionNeeded}
              internsCount={internsCount}
              onOpen={(formId) => navigate("supervisor.form-view", { formId })}
            />
          )}
          {buckets.inProgress.length > 0 && (
            <FormGroup
              title="In progress"
              tone="teal"
              count={buckets.inProgress.length}
              rows={buckets.inProgress}
              internsCount={internsCount}
              onOpen={(formId) => navigate("supervisor.form-view", { formId })}
            />
          )}
          {buckets.submitted.length > 0 && (
            <FormGroup
              title="Submitted — awaiting review"
              tone="slate"
              count={buckets.submitted.length}
              rows={buckets.submitted}
              internsCount={internsCount}
              onOpen={(formId) => navigate("supervisor.form-view", { formId })}
            />
          )}
          {buckets.completed.length > 0 && (
            <FormGroup
              title="Completed"
              tone="emerald"
              count={buckets.completed.length}
              rows={buckets.completed}
              internsCount={internsCount}
              onOpen={(formId) => navigate("supervisor.form-view", { formId })}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FormGroup({
  title,
  tone,
  count,
  rows,
  internsCount,
  onOpen,
}: {
  title: string;
  tone: "amber" | "teal" | "slate" | "emerald";
  count: number;
  rows: Array<{
    form: FormDocument;
    status: FormSubmissionStatus;
    submissionCount: number;
    submittedCount: number;
    approvedCount: number;
    needsRevisionCount: number;
    dueDate?: string;
    reviewNote?: string;
  }>;
  internsCount: number;
  onOpen: (formId: string) => void;
}) {
  const dotCls =
    tone === "amber" ? "bg-amber-500" :
    tone === "teal" ? "bg-teal-500" :
    tone === "emerald" ? "bg-emerald-500" :
    "bg-slate-400";
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", dotCls)} />
        <h2 className="text-[12.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          {title} ({count})
        </h2>
      </div>
      <div className="grid gap-2.5 lg:grid-cols-2">
        {rows.map((r) => (
          <SupervisorFormCard
            key={r.form.id}
            form={r.form}
            status={r.status}
            submissionCount={r.submissionCount}
            submittedCount={r.submittedCount}
            approvedCount={r.approvedCount}
            needsRevisionCount={r.needsRevisionCount}
            dueDate={r.dueDate}
            reviewNote={r.reviewNote}
            internsCount={internsCount}
            onOpen={() => onOpen(r.form.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SupervisorFormCard({
  form,
  status,
  submissionCount,
  submittedCount,
  approvedCount,
  needsRevisionCount,
  dueDate,
  reviewNote,
  internsCount,
  onOpen,
}: {
  form: FormDocument;
  status: FormSubmissionStatus;
  submissionCount: number;
  submittedCount: number;
  approvedCount: number;
  needsRevisionCount: number;
  dueDate?: string;
  reviewNote?: string;
  internsCount: number;
  onOpen: () => void;
}) {
  const blockCount = form.blocks.length;
  const ratingTables = form.blocks.filter((b) => b.type === "rating-table").length;
  const isStudentTargeted = form.category === "evaluation" || form.category === "ojt";
  const published = form.publishedAt ? format(new Date(form.publishedAt), "MMM d, yyyy") : "";

  const dueInDays = dueDate ? differenceInDays(new Date(dueDate), new Date()) : null;
  const overdue = dueDate && isPast(new Date(dueDate)) && status !== "approved";

  // CTA label based on status
  const cta = (() => {
    if (status === "not_started") return { label: "Start", icon: PlayCircle };
    if (status === "in_progress") return { label: "Continue", icon: PlayCircle };
    if (status === "needs_revision") return { label: "Revise & resubmit", icon: RotateCcw };
    if (status === "submitted" || status === "under_review") return { label: "View submission", icon: Eye };
    if (status === "approved") return { label: "View", icon: CheckCircle2 };
    return { label: "Open", icon: Eye };
  })();

  return (
    <div className="group flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <SubmissionStatusBadge status={status} withIcon />
            <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border/60">
              {FORM_CATEGORY_LABELS[form.category]}
            </span>
            <span className="text-[11px] text-muted-foreground">v{form.version}</span>
          </div>
          <h3 className="mt-1.5 truncate text-[14.5px] font-semibold text-foreground">
            {form.title}
          </h3>
          {form.description && (
            <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
              {form.description}
            </p>
          )}
        </div>
      </div>

      {/* Per-intern progress (for evaluation/ojt forms) */}
      {isStudentTargeted && internsCount > 0 && (
        <div className="rounded-md bg-muted/30 px-2.5 py-1.5 text-[11.5px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {internsCount} intern{internsCount === 1 ? "" : "s"} to evaluate
            </span>
            <span className="font-medium text-foreground">
              {submittedCount} submitted · {approvedCount} approved
              {needsRevisionCount > 0 && <> · <span className="text-red-600 dark:text-red-400">{needsRevisionCount} to revise</span></>}
            </span>
          </div>
        </div>
      )}

      {/* Needs-revision note */}
      {status === "needs_revision" && reviewNote && (
        <div className="rounded-md bg-red-50 px-2.5 py-1.5 text-[11px] text-red-800 ring-1 ring-inset ring-red-200/70 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50">
          <div className="flex items-center gap-1 font-medium">
            <AlertCircle className="h-3 w-3" /> Coordinator feedback
          </div>
          <div className="mt-0.5 line-clamp-2">{reviewNote}</div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-0.5 text-[11.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Layers className="h-3 w-3" />
          {blockCount} {blockCount === 1 ? "block" : "blocks"}
        </span>
        {ratingTables > 0 && (
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {ratingTables} {ratingTables === 1 ? "table" : "tables"}
          </span>
        )}
        {dueDate && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(
                  "ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-medium ring-1 ring-inset",
                  overdue
                    ? "bg-red-50 text-red-700 ring-red-200/70 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50"
                    : dueInDays !== null && dueInDays <= 7
                      ? "bg-amber-50 text-amber-800 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50"
                      : "bg-muted/60 text-muted-foreground ring-border/60"
                )}>
                  <CalendarClock className="h-3 w-3" />
                  {overdue ? "Overdue" : dueInDays === 0 ? "Due today" : `Due ${format(new Date(dueDate), "MMM d")}`}
                </span>
              </TooltipTrigger>
              <TooltipContent>Due {format(new Date(dueDate), "MMM d, yyyy")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {!dueDate && published && (
          <span className="ml-auto inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {published}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 pt-1">
        <Button size="sm" className="h-7 gap-1.5" onClick={onOpen}>
          <cta.icon className="h-3.5 w-3.5" /> {cta.label}
        </Button>
        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "slate" | "emerald" | "amber" | "teal";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-600 bg-emerald-50 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50"
      : tone === "amber"
        ? "text-amber-600 bg-amber-50 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50"
        : tone === "teal"
          ? "text-teal-600 bg-teal-50 ring-teal-200/70 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900/50"
          : "text-slate-600 bg-slate-100/70 ring-slate-200/70 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700/60";
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card px-3.5 py-2.5">
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-md ring-1 ring-inset", toneCls)}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold tabular-nums leading-tight">{value}</div>
      </div>
    </div>
  );
}
