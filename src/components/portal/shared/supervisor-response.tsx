"use client";
import { useAppStore } from "@/store/use-app-store";
import { responseForm } from "@/domain/forms/response-form";
import { FormBlockRenderer } from "./form-block-renderer";
import { FormExportActions } from "./form-export-actions";
import { SubmissionStatusBadge } from "./badges";

/** Readonly handoff: drafts never enter the student's portal projection. */
export function SupervisorResponse({
  formId,
  assignmentId,
}: {
  formId: string;
  assignmentId?: string;
}) {
  const state = useAppStore();
  const sub = state.formSubmissions.find(
    (s) =>
      s.formId === formId &&
      s.targetStudentId === state.currentUser?.studentId &&
      s.userId !== state.currentUser?.id &&
      s.assignmentId === assignmentId &&
      ["submitted", "under_review", "approved"].includes(s.status),
  );
  const form = responseForm(
    state.formDocuments.find((f) => f.id === formId),
    sub,
  );
  const assignment = state.formAssignments.find((a) => a.id === assignmentId);
  return (
    <details className="min-w-0 rounded-xl border border-sky-200/70 bg-sky-50/30 p-4 dark:border-sky-900/60 dark:bg-sky-950/15">
      <summary className="cursor-pointer break-words text-sm font-medium">
        {form?.title ?? "Supervisor form"}{" "}
        <span className="ml-2 inline-block">
          <SubmissionStatusBadge status={sub?.status ?? "not_started"} />
        </span>
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          {assignment?.sectionTitle ?? "Shared supervisor response"} ·{" "}
          {assignment?.cycle ?? "Current practicum"} · Read only
        </span>
      </summary>
      <div className="mt-3 min-w-0 space-y-3 border-t pt-3">
        <p className="text-sm text-muted-foreground">
          {!sub
            ? "Waiting for your supervisor. Their draft stays private until submitted."
            : sub.status === "approved"
              ? assignment?.reportId
                ? "Approved. This response is automatically included in its assigned report section."
                : "Approved shared response. Your coordinator must link this form to a report requirement to collect a response for that report."
              : "Submitted by your supervisor. You can view and download it; coordinator approval is still required for the final report."}
        </p>
        {sub && form && (
          <>
            <FormExportActions
              form={form}
              values={sub.values}
              submissionId={sub.id}
            />
            {form.blocks.map((block) => (
              <FormBlockRenderer
                key={block.id}
                block={block}
                values={sub.values}
              />
            ))}
          </>
        )}
      </div>
    </details>
  );
}
