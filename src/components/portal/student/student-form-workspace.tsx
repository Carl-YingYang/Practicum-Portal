"use client";
import { FormExportActions } from "../shared/form-export-actions";
import { responseForm } from "@/domain/forms/response-form";
import { ConfirmDialog } from "@/components/portal/shared/confirm-dialog";
import { useFormDraft } from "@/hooks/use-form-draft";
import { assignmentAppliesTo } from "@/lib/selectors";
import { configuredTerm } from "@/lib/prototype";
import * as React from "react";
import { flushChanges } from "@/client/portal-client";
import { responseErrors } from "@/lib/prototype";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { downloadFormPdf } from "@/lib/form-export";
import { useAppStore } from "@/store/use-app-store";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { EmptyState } from "@/components/portal/shared/empty-state";
import { SubmissionStatusBadge } from "@/components/portal/shared/badges";
import { FormBlockRenderer } from "@/components/portal/shared/form-block-renderer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
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
  Clock,
  Eye,
} from "lucide-react";
import {
  type FormDocument,
  type FormSubmissionStatus,
  FORM_CATEGORY_LABELS,
} from "@/lib/types";
import { format } from "date-fns";
import {
  buildFormAutoFillContext,
  getCompany,
  getStudent,
  getSupervisor,
  submissionFor,
} from "@/lib/selectors";
type FieldValue = string | Record<string, string>;
/**
 * StudentFormWorkspace — focused form-filling for students.
 * Simpler than the supervisor version: no intern picker (students fill
 * self-reflective forms). Autosaves + submits to the store.
 */
export function StudentFormWorkspace({
  formId,
  assignmentId,
}: {
  formId?: string;
  assignmentId?: string;
}) {
  const { toast } = useToast();
  const { exporting, exportPdf } = usePdfExport();
  const navigate = useAppStore((s) => s.navigate);
  const back = useAppStore((s) => s.back);
  const canBack = useAppStore((s) => s.history.length > 0);
  const liveForm = useAppStore((s) =>
    s.formDocuments.find((d) => d.id === formId),
  );
  const currentUser = useAppStore((s) => s.currentUser);
  const submissions = useAppStore((s) => s.formSubmissions);
  const toolsConfig = useAppStore((s) => s.toolsConfig);
  const assignments = useAppStore((s) => s.formAssignments);
  const context = assignments.find((a) => a.id === assignmentId);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const companies = useAppStore((s) => s.companies);
  const startFormResponse = useAppStore((s) => s.startFormResponse);
  const saveSubmissionDraft = useAppStore((s) => s.saveSubmissionDraft);
  const submitFormResponse = useAppStore((s) => s.submitFormResponse);
  // Auto-fill context: resolve the current student + their company + their
  // supervisor. info-field blocks use this to auto-populate (Student Name /
  // Company / Supervisor / Term / Date…) so the student doesn't re-type
  // the header info on every form.
  const autoFill = React.useMemo(() => {
    const student = currentUser?.studentId
      ? getStudent(students, currentUser.studentId)
      : undefined;
    const company = student
      ? getCompany(companies, student.companyId)
      : undefined;
    const supervisor = student?.supervisorId
      ? getSupervisor(supervisors, student.supervisorId)
      : undefined;
    return buildFormAutoFillContext({
      studentName: student?.name,
      department: student?.department,
      position: student?.position,
      studentNumber: student?.studentNumber,
      course: student?.course,
      section: student?.section,
      schoolYear: student?.schoolYear,
      companyName: company?.name,
      supervisorName: supervisor?.name,
      supervisorTitle: supervisor?.title,
      term: context?.cycle || configuredTerm(toolsConfig),
    });
  }, [
    currentUser,
    students,
    companies,
    supervisors,
    toolsConfig,
    context?.cycle,
  ]);
  const currentSubmission = React.useMemo(() => {
    if (!formId || !currentUser) return undefined;
    return submissionFor(
      submissions,
      formId,
      currentUser.id,
      undefined,
      assignmentId,
    );
  }, [submissions, formId, currentUser, assignmentId]);
  const form = responseForm(liveForm, currentSubmission);
  const draft = useFormDraft(
    formId,
    currentUser?.id,
    undefined,
    currentSubmission,
    assignmentId,
  );
  const { values, valuesRef, saveState } = draft;
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  function handleValueChange(blockId: string, value: FieldValue) {
    draft.update(blockId, value);
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
            onAction={() => navigate("student.forms")}
          />
        </SectionCard>
      </div>
    );
  }
  const hasAssignment =
    currentUser &&
    assignments.some(
      (a) =>
        a.formId === formId &&
        (!assignmentId || a.id === assignmentId) &&
        assignmentAppliesTo(a, currentUser),
    );
  if (
    (!liveForm || liveForm.status !== "published" || !hasAssignment) &&
    !currentSubmission
  ) {
    return (
      <div className="space-y-4">
        <PageHeader title={form.title} showBack={canBack} />
        <SectionCard>
          <EmptyState
            icon={FileText}
            title="This form is no longer published"
            description="The coordinator reverted it to draft or archived it."
            actionLabel="Back to forms"
            onAction={() => navigate("student.forms")}
          />
        </SectionCard>
      </div>
    );
  }
  const publishedDate = form.publishedAt
    ? format(new Date(form.publishedAt), "MMM d, yyyy 'at' h:mm a")
    : "";
  const blockCount = form.blocks.length;
  const ratingTables = form.blocks.filter(
    (b) => b.type === "rating-table",
  ).length;
  const status: FormSubmissionStatus =
    currentSubmission?.status ?? "not_started";
  const isReadOnly =
    (!!form.origin && !hasAssignment) ||
    status === "submitted" ||
    status === "under_review" ||
    status === "approved";
  function handlePrint() {
    window.print();
  }
  function handleDownload() {
    if (form)
      void exportPdf(() =>
        downloadFormPdf(form, valuesRef.current, currentUser?.name),
      );
  }
  function handleReset() {
    setResetOpen(true);
  }
  async function handleSubmit() {
    await draft.save();
    const currentSubmission = useAppStore
      .getState()
      .formSubmissions.find(
        (s) =>
          s.formId === formId &&
          s.userId === currentUser?.id &&
          s.assignmentId === assignmentId &&
          (s.targetStudentId ?? undefined) === undefined,
      );
    if (!currentSubmission || !form)
      throw new Error("Add at least one response first.");
    const errors = responseErrors(form, valuesRef.current);
    if (errors.length) throw new Error(errors.join(" "));
    saveSubmissionDraft(currentSubmission.id, valuesRef.current);
    submitFormResponse(currentSubmission.id);
    await flushChanges();
    toast({
      title: "Form submitted",
      description:
        "Your responses have been sent to the coordinator for review.",
    });
  }
  return (
    <div className="space-y-3">
      <ConfirmDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit these responses?"
        description="Check your answers before submitting. The coordinator can review them and request revisions; submitted responses are locked."
        confirmLabel="Submit responses"
        onConfirm={handleSubmit}
      />
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Clear these responses?"
        description="This clears your current draft answers. Submitted responses are unchanged."
        confirmLabel="Clear draft"
        destructive
        onConfirm={async () => {
          await draft.reset();
          toast({ title: "Responses cleared" });
        }}
      />

      {/* Sticky action bar */}
      <div className="sticky top-16 z-20 -mx-4 border-b border-border/60 bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={back}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Back to forms
          </Button>
          <div className="hidden h-5 w-px bg-border/70 sm:block" />
          <div className="flex items-center gap-1.5">
            <SubmissionStatusBadge status={status} withIcon />
            <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-inset ring-border/60">
              {FORM_CATEGORY_LABELS[form.category]}
            </span>
            <span className="text-[11px] text-muted-foreground">
              v{form.version}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {status === "in_progress" && (
              <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:inline-flex">
                {saveState === "saving" ? (
                  <>
                    <Save className="h-3 w-3 animate-pulse" /> Saving…
                  </>
                ) : saveState === "saved" ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Saved
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3" /> Autosaved
                  </>
                )}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="More form actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleDownload} disabled={exporting}>
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

      {draft.error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
        >
          {draft.error}
          <Button
            variant="outline"
            onClick={() => void draft.save().catch(() => {})}
          >
            Retry save
          </Button>
        </div>
      )}
      {draft.recovery && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
          Previous local answers are available.
          <Button onClick={draft.restore}>Restore answers</Button>
          <Button variant="ghost" onClick={draft.discard}>
            Discard local answers
          </Button>
        </div>
      )}
      <PageHeader
        title={form.title}
        description={form.description || undefined}
        showBack={false}
      />
      {context?.reportId && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="break-words font-medium">
            {students.find((s) => s.id === context.studentId)?.name} ·{" "}
            {context.cycle || "Current practicum"}
          </p>
          <p className="mt-1 break-words text-xs font-medium">
            {context.reportTitle} · {context.sectionTitle} · format v
            {context.templateVersion}
          </p>
          <p className="text-xs text-muted-foreground">
            Assigned format · Rubric v{form.origin?.version ?? form.version} ·
            Answers belong to this report requirement.
          </p>
          <Button
            variant="link"
            className="h-auto px-0"
            onClick={() =>
              navigate("student.report-builder", { reportId: context.reportId })
            }
          >
            Back to assigned report
          </Button>
        </div>
      )}

      <FormExportActions
        form={form}
        values={values}
        submissionId={currentSubmission?.id}
        beforeExport={draft.save}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card px-3.5 py-2 text-[11.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Layers className="h-3 w-3" /> {blockCount}{" "}
          {blockCount === 1 ? "block" : "blocks"}
        </span>
        {ratingTables > 0 && (
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3 w-3" /> {ratingTables} rating{" "}
            {ratingTables === 1 ? "table" : "tables"}
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
            Submitted{" "}
            {format(
              new Date(currentSubmission.submittedAt),
              "MMM d 'at' h:mm a",
            )}
          </span>
        )}
      </div>

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

      {status === "approved" && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200/70 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <div className="text-[12.5px] text-emerald-800 dark:text-emerald-300">
            <span className="font-semibold">Approved.</span>
            {currentSubmission?.reviewNote && (
              <span className="text-emerald-700/80 dark:text-emerald-400/80">
                {" "}
                {currentSubmission.reviewNote}
              </span>
            )}
          </div>
        </div>
      )}

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
                autoFill={autoFill}
                onValueChange={(id, v) => handleValueChange(id, v)}
              />
            ))
          )}
        </div>
      </SectionCard>

      {isReadOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <Eye className="h-4 w-4" />
            {status === "submitted" &&
              "Submitted — waiting for the coordinator to review."}
            {status === "under_review" &&
              "Currently under review by the coordinator."}
            {status === "approved" && "Approved — responses are locked."}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("student.forms")}
              className="gap-1.5"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back to forms
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-border/60 bg-card p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1.5 text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Clear
          </Button>
          <Button
            size="sm"
            onClick={() => setSubmitOpen(true)}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {status === "needs_revision"
              ? "Resubmit responses"
              : "Submit responses"}
          </Button>
        </div>
      )}
    </div>
  );
}
