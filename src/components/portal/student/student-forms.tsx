"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
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
  ChevronRight,
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

/**
 * StudentForms — the student's "Forms" inbox. Shows forms assigned to the
 * current student (typically weekly journals + program evaluation), grouped
 * by what needs their attention.
 */
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
    <div className="space-y-4">
      <PageHeader
        title="My Forms"
        breadcrumb="Forms"
        description="Forms assigned to you — weekly journals, program evaluation, and more."
      />

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
            description="When the coordinator publishes a form for students, it will appear here."
            tone="slate"
          />
        </SectionCard>
      ) : (
        <div className="space-y-5">
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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", dotCls)} />
        <h2 className="text-[12.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          {title} ({rows.length})
        </h2>
      </div>
      <div className="grid gap-2.5 lg:grid-cols-2">
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
