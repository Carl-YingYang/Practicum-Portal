"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { PageHeader } from "@/components/portal/layout/page-header";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { SubmissionStatusBadge } from "@/components/portal/shared/badges";
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
  CheckCircle2,
  RotateCcw,
  Eye,
  PlayCircle,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import {
  type FormDocument,
  type FormSubmissionStatus,
  FORM_CATEGORY_LABELS,
} from "@/lib/types";
import {
  assignedFormsForUser,
  submissionsForUser,
  submissionFor,
} from "@/lib/selectors";
import { format, differenceInDays, isPast } from "date-fns";

export function StudentForms() {
  const navigate = useAppStore((s) => s.navigate);
  const currentUser = useAppStore((s) => s.currentUser)!;
  const forms = useAppStore((s) => s.formDocuments);
  const assignments = useAppStore((s) => s.formAssignments);
  const submissions = useAppStore((s) => s.formSubmissions);

  const [search, setSearch] = React.useState("");

  const assigned = React.useMemo(
    () => assignedFormsForUser(forms, assignments, currentUser),
    [forms, assignments, currentUser]
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mySubs = React.useMemo(
    () => submissionsForUser(submissions, currentUser.id),
    [submissions, currentUser.id]
  );

  type Row = {
    form: FormDocument;
    status: FormSubmissionStatus;
    dueDate?: string;
    reviewNote?: string;
    updatedAt?: string;
  };

  const rows: Row[] = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return assigned
      .map(({ form, assignment }) => {
        const sub = submissionFor(submissions, form.id, currentUser.id);
        return {
          form,
          status: sub?.status ?? "not_started",
          dueDate: assignment.dueDate,
          reviewNote: sub?.reviewNote,
          updatedAt: sub?.updatedAt,
        };
      })
      .filter((r) => (q ? r.form.title.toLowerCase().includes(q) || r.form.description.toLowerCase().includes(q) : true));
  }, [assigned, submissions, currentUser.id, search]);

  const buckets = React.useMemo(() => {
    const actionNeeded = rows.filter((r) => r.status === "not_started" || r.status === "needs_revision");
    const inProgress = rows.filter((r) => r.status === "in_progress");
    const submitted = rows.filter((r) => r.status === "submitted" || r.status === "under_review");
    const completed = rows.filter((r) => r.status === "approved");
    return { actionNeeded, inProgress, submitted, completed };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Forms"
        breadcrumb="Forms"
        description="Forms assigned to you — weekly journals, program evaluation, and more."
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Assigned" value={rows.length} icon={FileText} tone="slate" />
        <KpiTile label="Action needed" value={buckets.actionNeeded.length} icon={AlertCircle} tone={buckets.actionNeeded.length > 0 ? "amber" : "slate"} />
        <KpiTile label="In progress" value={buckets.inProgress.length} icon={Clock} tone="teal" />
        <KpiTile label="Completed" value={buckets.completed.length} icon={CheckCircle2} tone="emerald" />
      </div>

      {/* Streamlined Search Bar */}
      <div className="relative max-w-2xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assigned forms..."
          className="h-10 pl-9 rounded-xl border-border/60 bg-card shadow-sm"
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <EmptyState
            icon={FileText}
            title="No forms assigned to you yet"
            description="When the coordinator publishes a form for students, it will appear here."
            tone="slate"
          />
        </div>
      ) : (
        <div className="space-y-8">
          {buckets.actionNeeded.length > 0 && (
            <FormGroup title="Action needed" tone="amber" rows={buckets.actionNeeded} onOpen={(formId) => navigate("student.form-view", { formId })} />
          )}
          {buckets.inProgress.length > 0 && (
            <FormGroup title="In progress" tone="teal" rows={buckets.inProgress} onOpen={(formId) => navigate("student.form-view", { formId })} />
          )}
          {buckets.submitted.length > 0 && (
            <FormGroup title="Submitted — awaiting review" tone="slate" rows={buckets.submitted} onOpen={(formId) => navigate("student.form-view", { formId })} />
          )}
          {buckets.completed.length > 0 && (
            <FormGroup title="Completed" tone="emerald" rows={buckets.completed} onOpen={(formId) => navigate("student.form-view", { formId })} />
          )}
        </div>
      )}
    </div>
  );
}

function FormGroup({
  title,
  tone,
  rows,
  onOpen,
}: {
  title: string;
  tone: "amber" | "teal" | "slate" | "emerald";
  rows: Array<{
    form: FormDocument;
    status: FormSubmissionStatus;
    dueDate?: string;
    reviewNote?: string;
    updatedAt?: string;
  }>;
  onOpen: (formId: string) => void;
}) {
  const dotCls =
    tone === "amber" ? "bg-amber-500" :
      tone === "teal" ? "bg-teal-500" :
        tone === "emerald" ? "bg-emerald-500" :
          "bg-slate-400";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <span className={cn("h-2.5 w-2.5 rounded-full shadow-sm", dotCls)} />
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          {title} <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-foreground">{rows.length}</span>
        </h2>
      </div>
      {/* 
        Single column stack for the List View approach. 
        The responsive layout happens inside the StudentFormCard itself.
      */}
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <StudentFormCard key={r.form.id} {...r} onOpen={() => onOpen(r.form.id)} />
        ))}
      </div>
    </div>
  );
}

function StudentFormCard({
  form,
  status,
  dueDate,
  reviewNote,
  onOpen,
}: {
  form: FormDocument;
  status: FormSubmissionStatus;
  dueDate?: string;
  reviewNote?: string;
  updatedAt?: string;
  onOpen: () => void;
}) {
  const blockCount = form.blocks.length;
  const ratingTables = form.blocks.filter((b) => b.type === "rating-table").length;
  const published = form.publishedAt ? format(new Date(form.publishedAt), "MMM d, yyyy") : "";
  const dueInDays = dueDate ? differenceInDays(new Date(dueDate), new Date()) : null;
  const overdue = dueDate && isPast(new Date(dueDate)) && status !== "approved";

  const cta = (() => {
    if (status === "not_started") return { label: "Start Form", icon: PlayCircle };
    if (status === "in_progress") return { label: "Continue", icon: PlayCircle };
    if (status === "needs_revision") return { label: "Revise & Resubmit", icon: RotateCcw };
    if (status === "submitted" || status === "under_review") return { label: "View Submission", icon: Eye };
    if (status === "approved") return { label: "View Details", icon: CheckCircle2 };
    return { label: "Open", icon: Eye };
  })();

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all hover:shadow-md hover:border-border">

      {/* 
        Responsive Inner Layout
        Mobile: flex-col (stacked like a card)
        Desktop: flex-row (horizontal list row)
      */}
      <div className="flex flex-col md:flex-row md:items-center p-4 sm:p-5 gap-4 md:gap-6">

        {/* Left Side: Information */}
        <div className="flex flex-1 flex-col min-w-0">

          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <SubmissionStatusBadge status={status} withIcon />
            <span className="rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border/50">
              {FORM_CATEGORY_LABELS[form.category]}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded">
              v{form.version}
            </span>
          </div>

          <h3 className="text-[15px] font-semibold leading-tight text-foreground truncate md:whitespace-normal md:line-clamp-1">
            {form.title}
          </h3>
          {form.description && (
            <p className="mt-1 line-clamp-2 md:line-clamp-1 text-[13px] text-muted-foreground">
              {form.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11.5px] font-medium text-muted-foreground/80">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              {blockCount} {blockCount === 1 ? "block" : "blocks"}
            </span>
            {ratingTables > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                {ratingTables} {ratingTables === 1 ? "table" : "tables"}
              </span>
            )}
            {dueDate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 ring-1 ring-inset",
                      overdue
                        ? "bg-red-50 text-red-700 ring-red-200/70 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50"
                        : dueInDays !== null && dueInDays <= 7
                          ? "bg-amber-50 text-amber-800 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50"
                          : "bg-muted/50 text-muted-foreground ring-border/60"
                    )}>
                      <CalendarClock className="h-3.5 w-3.5" />
                      {overdue ? "Overdue" : dueInDays === 0 ? "Due today" : `Due ${format(new Date(dueDate), "MMM d")}`}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Due {format(new Date(dueDate), "MMM d, yyyy")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {!dueDate && published && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {published}
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Action Button */}
        <div className="mt-2 flex shrink-0 items-center border-t border-border/50 pt-4 md:mt-0 md:border-t-0 md:pt-0">
          <Button
            size="sm"
            variant={status === "not_started" || status === "needs_revision" ? "default" : "secondary"}
            className="w-full h-9 gap-2 font-medium md:w-auto"
            onClick={onOpen}
          >
            <cta.icon className="h-4 w-4" /> {cta.label}
          </Button>
        </div>

      </div>

      {/* Feedback Alert: Appears full-width at the bottom if revision is needed */}
      {status === "needs_revision" && reviewNote && (
        <div className="bg-red-50/80 px-4 sm:px-5 py-3 text-[12.5px] text-red-800 border-t border-red-100 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/40">
          <div className="flex items-center gap-1.5 font-semibold mb-1">
            <AlertCircle className="h-3.5 w-3.5" /> Coordinator Feedback
          </div>
          <div className="opacity-90">{reviewNote}</div>
        </div>
      )}
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
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", toneCls)}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xl font-bold tabular-nums leading-tight text-foreground">{value}</div>
      </div>
    </div>
  );
}