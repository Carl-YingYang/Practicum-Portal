"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { FormStatusBadge, SubmissionStatusBadge } from "@/components/portal/shared/badges";
import { FormBlockRenderer } from "@/components/portal/shared/form-block-renderer";
import { Avatar } from "@/components/portal/shared/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  Printer,
  RotateCcw,
  CheckCircle2,
  FileText,
  Calendar,
  Layers,
  MoreHorizontal,
  Download,
  Save,
  Send,
  AlertCircle,
  GraduationCap,
  Clock,
  Eye,
} from "lucide-react";
import {
  type FormDocument,
  type FormSubmission,
  type FormSubmissionStatus,
  FORM_CATEGORY_LABELS,
} from "@/lib/types";
import { format } from "date-fns";
import { submissionFor } from "@/lib/selectors";

type FieldValue = string | Record<string, string>;

/**
 * SupervisorFormWorkspace — the focused form-filling experience.
 * Replaces the old in-memory-only viewer. Now:
 *   - Persists responses to the store (autosave on change).
 *   - For evaluation/ojt forms, shows an intern picker so the supervisor
 *     can fill one submission per intern.
 *   - Shows review status (submitted / under review / approved / needs revision)
 *     and the coordinator's review note when needs_revision.
 *   - Allows re-submitting after a revision request.
 */
export function SupervisorFormWorkspace({ formId }: { formId?: string }) {
  const { toast } = useToast();
  const navigate = useAppStore((s) => s.navigate);
  const back = useAppStore((s) => s.back);
  const canBack = useAppStore((s) => s.history.length > 0);
  const form = useAppStore((s) => s.formDocuments.find((d) => d.id === formId));
  const currentUser = useAppStore((s) => s.currentUser);
  const submissions = useAppStore((s) => s.formSubmissions);
  const students = useAppStore((s) => s.students);
  const startFormResponse = useAppStore((s) => s.startFormResponse);
  const saveSubmissionDraft = useAppStore((s) => s.saveSubmissionDraft);
  const submitFormResponse = useAppStore((s) => s.submitFormResponse);

  // For evaluation/ojt forms: which intern is the supervisor currently evaluating?
  const myInterns = React.useMemo(() => {
    if (!currentUser?.supervisorId) return [];
    return students
      .filter((s) => s.supervisorId === currentUser.supervisorId && s.status === "active")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, currentUser]);

  const isStudentTargeted = form?.category === "evaluation" || form?.category === "ojt";
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | undefined>(
    isStudentTargeted && myInterns.length > 0 ? myInterns[0].id : undefined
  );

  // current submission for this form (+ selected student)
  const currentSubmission = React.useMemo(() => {
    if (!formId || !currentUser) return undefined;
    return submissionFor(submissions, formId, currentUser.id, selectedStudentId);
  }, [submissions, formId, currentUser, selectedStudentId]);

  // local values mirror the submission's values (so typing feels instant)
  const [values, setValues] = React.useState<Record<string, FieldValue>>({});
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // sync local values when the submission changes
  React.useEffect(() => {
    setValues(currentSubmission?.values ?? {});
    setSaveState("idle");
  }, [currentSubmission?.id]);

  // autosave (debounced) — only if the user has actually started a submission
  function handleValueChange(blockId: string, value: FieldValue) {
    const next = { ...values, [blockId]: value };
    setValues(next);
    if (!formId || !currentUser) return;
    // ensure a submission exists
    const subId = currentSubmission?.id ?? startFormResponse({ formId, targetStudentId: selectedStudentId });
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveSubmissionDraft(subId, next);
      setSaveState("saved");
    }, 600);
  }

  if (!form) {
    return (
      <div className="space-y-4">
        <PageHeader title="Form not found" showBack={canBack} />
        <SectionCard>
          <EmptyState
            icon={FileText}
            title="This form doesn't exist"
            description="It may have been unpublished by the coordinator."
            actionLabel="Back to forms"
            onAction={() => navigate("supervisor.forms")}
          />
        </SectionCard>
      </div>
    );
  }

  if (form.status !== "published") {
    return (
      <div className="space-y-4">
        <PageHeader title={form.title} showBack={canBack} />
        <SectionCard>
          <EmptyState
            icon={FileText}
            title="This form is no longer published"
            description="The coordinator reverted it to draft or archived it."
            actionLabel="Back to forms"
            onAction={() => navigate("supervisor.forms")}
          />
        </SectionCard>
      </div>
    );
  }

  const publishedDate = form.publishedAt ? format(new Date(form.publishedAt), "MMM d, yyyy 'at' h:mm a") : "";
  const blockCount = form.blocks.length;
  const ratingTables = form.blocks.filter((b) => b.type === "rating-table").length;
  const status = currentSubmission?.status ?? "not_started";

  const isReadOnly =
    status === "submitted" ||
    status === "under_review" ||
    status === "approved";

  function handlePrint() {
    toast({ title: "Print preview", description: "In production this would open a print-friendly view." });
  }
  function handleDownload() {
    toast({ title: "Export queued", description: "A PDF export would be generated in production." });
  }
  function handleReset() {
    if (!currentSubmission) return;
    setValues({});
    saveSubmissionDraft(currentSubmission.id, {});
    toast({ title: "Responses cleared" });
  }
  function handleSubmit() {
    if (!currentSubmission) {
      toast({ title: "Nothing to submit", description: "Add at least one response first.", variant: "destructive" });
      return;
    }
    // save latest values first
    saveSubmissionDraft(currentSubmission.id, values);
    submitFormResponse(currentSubmission.id);
    toast({
      title: "Form submitted",
      description: "Your responses have been sent to the coordinator for review.",
    });
  }

  return (
    <div className="space-y-3">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-20 -mx-5 border-b border-border/60 bg-background/95 px-5 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={back} className="gap-1 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Back to forms
          </Button>
          <div className="hidden h-5 w-px bg-border/70 sm:block" />
          <div className="flex items-center gap-1.5">
            <SubmissionStatusBadge status={status} withIcon />
            <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border/60">
              {FORM_CATEGORY_LABELS[form.category]}
            </span>
            <span className="text-[11px] text-muted-foreground">v{form.version}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {/* autosave indicator */}
            {status === "in_progress" && (
              <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:inline-flex">
                {saveState === "saving" ? (
                  <><Save className="h-3 w-3 animate-pulse" /> Saving…</>
                ) : saveState === "saved" ? (
                  <><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Saved</>
                ) : (
                  <><Clock className="h-3 w-3" /> Autosaved</>
                )}
              </span>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
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
                {!isReadOnly && (
                  <DropdownMenuItem onClick={handleReset}>
                    <RotateCcw className="mr-2 h-3.5 w-3.5" /> Clear responses
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <PageHeader
        title={form.title}
        description={form.description || undefined}
        showBack={false}
      />

      {/* Meta strip */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card px-3.5 py-2 text-[11.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Layers className="h-3 w-3" /> {blockCount} {blockCount === 1 ? "block" : "blocks"}
        </span>
        {ratingTables > 0 && (
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3 w-3" /> {ratingTables} rating {ratingTables === 1 ? "table" : "tables"}
          </span>
        )}
        {publishedDate && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Published {publishedDate}
          </span>
        )}
        {currentSubmission?.submittedAt && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Submitted {format(new Date(currentSubmission.submittedAt), "MMM d 'at' h:mm a")}
          </span>
        )}
      </div>

      {/* Intern picker (for evaluation/ojt forms) */}
      {isStudentTargeted && myInterns.length > 0 && (
        <SectionCard title="Select intern to evaluate" description="You can fill one form per assigned intern. Switch any time — your drafts are saved.">
          <div className="flex flex-wrap gap-1.5">
            {myInterns.map((stu) => {
              const sub = submissionFor(submissions, form.id, currentUser!.id, stu.id);
              const isSelected = selectedStudentId === stu.id;
              return (
                <button
                  key={stu.id}
                  onClick={() => setSelectedStudentId(stu.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-inset ring-primary/30"
                      : "border-border/60 hover:bg-muted/40"
                  )}
                >
                  <Avatar name={stu.name} size="sm" color="#64748b" />
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-foreground">{stu.name}</div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {stu.studentNumber}
                      {sub && (
                        <span className={cn(
                          "rounded-full px-1 text-[9px] font-medium",
                          sub.status === "approved" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
                          sub.status === "submitted" && "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
                          sub.status === "under_review" && "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
                          sub.status === "needs_revision" && "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
                          sub.status === "in_progress" && "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300",
                        )}>
                          {sub.status.replace("_", " ")}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Needs-revision banner */}
      {status === "needs_revision" && currentSubmission?.reviewNote && (
        <div className="rounded-lg border border-red-200/70 bg-red-50/60 p-3 dark:border-red-900/50 dark:bg-red-950/30">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold text-red-800 dark:text-red-300">
                Coordinator requested revisions
              </div>
              <div className="mt-0.5 text-[12px] text-red-700/90 dark:text-red-400/90">
                {currentSubmission.reviewNote}
              </div>
              <div className="mt-1 text-[10.5px] text-red-600/70 dark:text-red-400/70">
                Please update your responses and resubmit.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approved banner */}
      {status === "approved" && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200/70 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <div className="text-[12.5px] text-emerald-800 dark:text-emerald-300">
            <span className="font-semibold">Approved.</span>
            {currentSubmission?.reviewNote && (
              <span className="text-emerald-700/80 dark:text-emerald-400/80"> {currentSubmission.reviewNote}</span>
            )}
          </div>
        </div>
      )}

      {/* The form itself */}
      <SectionCard>
        <div className="space-y-3.5">
          {form.blocks.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="This form is empty"
              description="The coordinator hasn't added any blocks yet."
            />
          ) : (
            form.blocks.map((b) => (
              <FormBlockRenderer
                key={b.id}
                block={b}
                interactive={!isReadOnly}
                values={values}
                onValueChange={(id, v) => handleValueChange(id, v)}
              />
            ))
          )}
        </div>
      </SectionCard>

      {/* Submit / footer */}
      {isReadOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <Eye className="h-4 w-4" />
            {status === "submitted" && "Submitted — waiting for the coordinator to review."}
            {status === "under_review" && "Currently under review by the coordinator."}
            {status === "approved" && "Approved — responses are locked."}
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("supervisor.forms")} className="gap-1.5">
              <ChevronLeft className="h-3.5 w-3.5" /> Back to forms
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-border/60 bg-card p-3">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Clear
          </Button>
          <Button size="sm" onClick={handleSubmit} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            {status === "needs_revision" ? "Resubmit responses" : "Submit responses"}
          </Button>
        </div>
      )}
    </div>
  );
}
