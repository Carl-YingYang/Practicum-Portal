"use client";
import { useState } from "react";
import { useAppStore } from "@/store/use-app-store";
import { assignedFormsForUser, submissionFor } from "@/lib/selectors";
import { PageHeader } from "../layout/page-header";
import { Input } from "@/components/ui/input";
import { SubmissionStatusBadge } from "../shared/badges";
export function SupervisorFormsList() {
  const state = useAppStore();
  const [search, setSearch] = useState("");
  if (!state.currentUser) return null;
  const rows = assignedFormsForUser(
    state.formDocuments,
    state.formAssignments,
    state.currentUser,
  )
    .flatMap(({ form, assignment }) => {
      const targets = assignment.reportId
        ? [assignment.studentId]
        : ["evaluation", "ojt"].includes(form.category)
          ? state.students
              .filter(
                (s) =>
                  s.supervisorId === state.currentUser!.supervisorId &&
                  s.status === "active",
              )
              .map((s) => s.id)
          : [undefined];
      return targets.map((targetId) => ({ form, assignment, targetId }));
    })
    .filter(({ form, assignment, targetId }) =>
      `${form.title} ${assignment.cycle ?? ""} ${assignment.sectionTitle ?? ""} ${state.students.find((s) => s.id === targetId)?.name ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title="Forms"
        description="Open a requirement for its assigned intern. Answers stay with that practicum report."
      />
      <Input
        aria-label="Search assigned forms"
        placeholder="Search assigned forms…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {!rows.length && (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          No forms assigned. Check My Interns for reports, or ask the
          coordinator to assign the published format.
        </p>
      )}
      {rows.map(({ form, assignment, targetId }) => {
        const assignmentId = assignment.reportId ? assignment.id : undefined;
        const sub = submissionFor(
          state.formSubmissions,
          form.id,
          state.currentUser!.id,
          targetId,
          assignmentId,
        );
        const student = state.students.find((s) => s.id === targetId);
        return (
          <button
            key={`${assignment.id}:${targetId ?? "self"}`}
            className="flex min-h-20 w-full min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left hover:border-primary"
            onClick={() =>
              state.navigate("supervisor.form-view", {
                formId: form.id,
                assignmentId,
                studentId: targetId,
              })
            }
          >
            <span className="min-w-0 break-words">
              <strong className="block">{form.title}</strong>
              <span className="text-sm text-muted-foreground">
                {student?.name ?? "Your response"} ·{" "}
                {assignment.cycle ?? "Shared form"} ·{" "}
                {assignment.sectionTitle ?? "Form response"} · v{form.version}
                {assignment.dueDate ? ` · Due ${assignment.dueDate}` : ""}
              </span>
            </span>
            <SubmissionStatusBadge status={sub?.status ?? "not_started"} />
          </button>
        );
      })}
    </div>
  );
}
