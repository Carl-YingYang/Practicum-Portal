"use client";
import { useState } from "react";
import { useAppStore } from "@/store/use-app-store";
import { assignedFormsForUser, submissionFor } from "@/lib/selectors";
import { formTaskPhase, formTaskTone } from "@/domain/forms/task-status";
import { PageHeader } from "../layout/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmissionStatusBadge } from "../shared/badges";
export function SupervisorFormsList() {
  const state = useAppStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "pending" | "review" | "completed"
  >("all");
  if (!state.currentUser) return null;
  const rows = assignedFormsForUser(
    state.formDocuments,
    state.formAssignments,
    state.currentUser,
  ).flatMap(({ form, assignment }) => {
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
    return targets.map((targetId) => {
      const assignmentId = assignment.reportId ? assignment.id : undefined;
      const sub = submissionFor(
        state.formSubmissions,
        form.id,
        state.currentUser!.id,
        targetId,
        assignmentId,
      );
      return {
        form,
        assignment,
        targetId,
        assignmentId,
        student: state.students.find((s) => s.id === targetId),
        status: sub?.status ?? ("not_started" as const),
      };
    });
  });
  const counts = {
    all: rows.length,
    pending: rows.filter((r) => formTaskPhase(r.status) === "pending").length,
    review: rows.filter((r) => formTaskPhase(r.status) === "review").length,
    completed: rows.filter((r) => formTaskPhase(r.status) === "completed")
      .length,
  };
  const internsPending = new Set(
    rows
      .filter((r) => r.targetId && formTaskPhase(r.status) === "pending")
      .map((r) => r.targetId),
  ).size;
  const visible = rows.filter(
    (r) =>
      (filter === "all" || formTaskPhase(r.status) === filter) &&
      `${r.form.title} ${r.assignment.cycle ?? ""} ${r.assignment.sectionTitle ?? ""} ${r.student?.name ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const groups = [...new Set(visible.map((r) => r.targetId))].map((id) => ({
    id,
    tasks: visible.filter((r) => r.targetId === id),
    all: rows.filter((r) => r.targetId === id),
  }));
  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title="Forms"
        description="One checklist per intern. Submit each requirement; approved responses join that intern’s assigned report."
      />
      <div className="rounded-xl border border-amber-200/70 bg-amber-50/30 p-4 dark:border-amber-900/60 dark:bg-amber-950/15">
        <p className="font-semibold">
          {internsPending} intern{internsPending === 1 ? "" : "s"} still need
          your responses
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {counts.pending} to do · {counts.review} awaiting coordinator review ·{" "}
          {counts.completed} approved
        </p>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Form status filters">
        {(
          [
            ["all", "All"],
            ["pending", "To do"],
            ["review", "Awaiting review"],
            ["completed", "Approved"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "default" : "outline"}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {label} ({counts[key]})
          </Button>
        ))}
      </div>
      <Input
        aria-label="Search assigned forms"
        placeholder="Find an intern, form or batch…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {!visible.length && (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          {rows.length
            ? "No requirements match this filter."
            : "No forms assigned. Ask the coordinator to link published forms to a report format and assign it."}
        </p>
      )}
      {groups.map((group) => (
        <section
          key={group.id ?? "self"}
          className="min-w-0 overflow-hidden rounded-xl border bg-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 p-4">
            <h2 className="break-words font-semibold">
              {group.tasks[0]?.student?.name ?? "Your responses"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {
                group.all.filter((r) => formTaskPhase(r.status) === "pending")
                  .length
              }{" "}
              to do · {group.all.filter((r) => r.status === "approved").length}/
              {group.all.length} approved
            </p>
          </div>
          <div className="grid min-w-0 gap-2 p-3 sm:grid-cols-2">
            {group.tasks.map((r) => (
              <button
                key={`${r.assignment.id}:${r.targetId ?? "self"}`}
                className={`flex min-h-24 min-w-0 flex-col items-start justify-between gap-2 rounded-lg border p-3 text-left hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${formTaskTone(r.status)}`}
                onClick={() =>
                  state.navigate("supervisor.form-view", {
                    formId: r.form.id,
                    assignmentId: r.assignmentId,
                    studentId: r.targetId,
                  })
                }
              >
                <span className="min-w-0 break-words">
                  <strong className="block text-sm">{r.form.title}</strong>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {r.assignment.cycle ?? "Shared form"} ·{" "}
                    {r.assignment.sectionTitle ?? "Standalone response"}
                    {r.assignment.dueDate
                      ? ` · Due ${r.assignment.dueDate}`
                      : ""}
                  </span>
                </span>
                <SubmissionStatusBadge status={r.status} />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
