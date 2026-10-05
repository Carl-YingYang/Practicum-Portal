"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Clock, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/use-app-store";
import {
  activeTimeLog,
  elapsedMs,
  formatTimer,
  assignedFormsForUser,
  submissionFor,
} from "@/lib/selectors";
import { ROLE_LABELS, type Role, type ViewKey } from "@/lib/types";
import { SchoolIdentityModal } from "./school-identity-modal";

export function EditorialDashboard({ role }: { role: Role }) {
  const state = useAppStore();
  const {
    currentUser: user,
    students,
    journals,
    evaluations,
    timeLogs,
    formDocuments,
    formAssignments,
    formSubmissions,
    schoolIdentity,
    toolsConfig,
    navigate,
  } = state;
  const [now, setNow] = useState(() => Date.now());
  const [schoolOpen, setSchoolOpen] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!user) return null;
  const student = students.find((s) => s.id === user.studentId);
  const cohort = students.filter((s) =>
    role === "student"
      ? s.id === user.studentId
      : role === "supervisor"
        ? s.supervisorId === user.supervisorId
        : true,
  );
  const ids = new Set(cohort.map((s) => s.id));
  const myJournals = journals.filter((j) => ids.has(j.studentId));
  const pending = myJournals.filter((j) => j.status === "pending");
  const revisions = myJournals.filter((j) => j.status === "rejected");
  const approved = myJournals.filter((j) => j.status === "approved");
  const myEvals = evaluations.filter(
    (e) => ids.has(e.studentId) && e.status === "submitted",
  );
  const assigned = assignedFormsForUser(formDocuments, formAssignments, user);
  const outstandingForms = assigned.filter(
    ({ form }) =>
      !["approved", "submitted", "under_review"].includes(
        submissionFor(formSubmissions, form.id, user.id)?.status ??
          "not_started",
      ),
  );
  const totalHours = cohort.reduce((sum, s) => sum + s.loggedHours, 0);
  const required = cohort.reduce((sum, s) => sum + s.requiredHours, 0);
  const pct = required
    ? Math.min(100, Math.round((totalHours / required) * 100))
    : 0;
  const session = student ? activeTimeLog(timeLogs, student.id) : undefined;
  const visible = schoolIdentity.visibleCards;
  const stats =
    role === "student"
      ? [
          {
            label: "Attendance hours",
            value: `${totalHours.toFixed(1)}`,
            detail: `of ${required} required`,
          },
          {
            label: "Approved journals",
            value: `${approved.length}`,
            detail: "reviewed by your supervisor",
          },
          {
            label: "Forms to complete",
            value: `${outstandingForms.length}`,
            detail: "assigned to your account",
          },
        ]
      : [
          {
            label:
              role === "supervisor" ? "Assigned interns" : "Active students",
            value: `${cohort.filter((s) => s.status === "active").length}`,
            detail: "in your workspace",
          },
          {
            label: "Pending journals",
            value: `${pending.length}`,
            detail: "awaiting supervisor review",
          },
          {
            label: "Cohort hours",
            value: `${totalHours.toFixed(1)}`,
            detail: "from completed attendance",
          },
        ];
  const actionView: ViewKey =
    role === "student"
      ? "student.journal-new"
      : role === "supervisor"
        ? "supervisor.journals"
        : "coordinator.students";
  const actionText =
    role === "student"
      ? "Write a journal"
      : role === "supervisor"
        ? "Review journals"
        : "Manage students";
  const queues: {
    label: string;
    detail: string;
    view: ViewKey;
    params?: { journalId?: string; formId?: string };
  }[] =
    role === "student"
      ? [
          ...revisions.map((j) => ({
            label: "Revise your journal",
            detail: j.rejectionReason || j.date,
            view: "student.journal-new" as ViewKey,
            params: { journalId: j.id },
          })),
          ...outstandingForms.map(({ form, assignment }) => ({
            label: form.title,
            detail: assignment.dueDate
              ? `${Date.parse(assignment.dueDate) < now ? "Overdue" : "Due"} ${assignment.dueDate.slice(0, 10)}`
              : "Ready to complete",
            view: "student.form-view" as ViewKey,
            params: { formId: form.id },
          })),
        ]
      : role === "supervisor"
        ? [
            {
              label: `${pending.length} journals await review`,
              detail: "Feedback helps your interns move forward.",
              view: "supervisor.journals",
            },
            {
              label: `${cohort.filter((s) => !myEvals.some((e) => e.studentId === s.id)).length} interns need an evaluation`,
              detail: "Review performance and recommendations.",
              view: "supervisor.evaluations",
            },
            {
              label: `${outstandingForms.length} shared forms to complete`,
              detail: "Open your assigned forms.",
              view: "supervisor.forms",
            },
          ]
        : [
            {
              label: `${students.filter((s) => !s.supervisorId).length} students need deployment`,
              detail: "Assign a company and supervisor.",
              view: "coordinator.students",
            },
            {
              label: `${formSubmissions.filter((s) => s.status === "submitted" || s.status === "under_review").length} form responses await review`,
              detail: "Check the submissions inbox.",
              view: "coordinator.forms",
            },
            {
              label: "Accounts & invitations",
              detail: "Provision access and reset temporary credentials.",
              view: "coordinator.user-management",
            },
          ];

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="editorial-eyebrow">{ROLE_LABELS[role]} / Overview</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-.05em] md:text-5xl">
            Hello,{" "}
            {
              user.name
                .replace(/^(Prof\.|Dr\.|Engr\.|Mr\.|Ms\.|Mrs\.)\s*/i, "")
                .split(" ")[0]
            }
            <span className="text-[var(--brand-accent)]">.</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {role === "student"
              ? "Small steps today. A stronger career tomorrow."
              : "A clear view of the work, and what comes next."}
          </p>
        </div>
        <Button
          onClick={() => navigate(actionView)}
          className="shrink-0 self-start sm:self-auto"
        >
          {actionText}
          <ArrowUpRight className="size-4" />
        </Button>
      </section>
      <div className="grid border-y border-border sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="border-b border-border py-5 sm:border-b-0 sm:border-r sm:px-5 first:sm:pl-0 last:border-0"
          >
            <p className="editorial-eyebrow">{s.label}</p>
            <p className="mt-2 text-4xl font-medium tracking-[-.04em] tabular-nums">
              {s.value}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{s.detail}</p>
          </div>
        ))}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          {(role !== "student" || visible?.draftingRoom !== false) && (
            <section className="editorial-sheet">
              <div className="editorial-section-heading">
                <h2>Next in your workspace</h2>
                <span>01 / Action list</span>
              </div>
              {queues.length ? (
                queues.slice(0, 5).map((q, i) => (
                  <button
                    key={`${q.label}-${i}`}
                    className="editorial-item"
                    onClick={() => navigate(q.view, q.params)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{q.label}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {q.detail}
                      </p>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0" />
                  </button>
                ))
              ) : (
                <div className="p-6">
                  <p className="text-sm font-medium">You’re all caught up.</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Your next assignment will appear here.
                  </p>
                </div>
              )}
            </section>
          )}
          {(role !== "student" || visible?.timesheet !== false) && (
            <section className="editorial-sheet">
              <div className="editorial-section-heading">
                <h2>
                  {role === "student" ? "Your progress" : "Intern progress"}
                </h2>
                <button
                  onClick={() =>
                    navigate(
                      role === "student"
                        ? "student.time-clock"
                        : role === "supervisor"
                          ? "supervisor.interns"
                          : "coordinator.timesheets",
                    )
                  }
                  className="inline-flex items-center gap-1"
                >
                  View all <ArrowUpRight className="size-3" />
                </button>
              </div>
              <div className="p-5">
                <div className="flex items-end justify-between">
                  <p className="text-sm">Completed attendance</p>
                  <p className="text-3xl font-medium tracking-tight tabular-nums">
                    {pct}%
                  </p>
                </div>
                <div
                  role="progressbar"
                  aria-label="Attendance progress"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-4 h-2 bg-muted"
                >
                  <div
                    className="h-full bg-[var(--brand-accent)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {Math.max(0, required - totalHours).toFixed(1)} hours
                  remaining. Journal approval records feedback; hours come from
                  attendance.
                </p>
              </div>
              {role !== "student" &&
                cohort.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    className="editorial-item"
                    onClick={() =>
                      navigate(
                        role === "supervisor"
                          ? "supervisor.intern-view"
                          : "coordinator.student-view",
                        { studentId: s.id },
                      )
                    }
                  >
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {s.course} ·{" "}
                        {s.supervisorId ? "Assigned" : "Awaiting deployment"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums">
                      {s.loggedHours.toFixed(1)} / {s.requiredHours} h
                    </span>
                  </button>
                ))}
            </section>
          )}
          {(role !== "student" || visible?.evaluations !== false) && (
            <section className="flex items-center justify-between gap-4 border-y border-border py-5">
              <div>
                <p className="editorial-eyebrow">Performance / Feedback</p>
                <p className="mt-2 text-sm">
                  {myEvals.length} submitted{" "}
                  {myEvals.length === 1 ? "evaluation" : "evaluations"}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate(`${role}.evaluations` as ViewKey)}
              >
                Open evaluations <ArrowUpRight className="size-4" />
              </Button>
            </section>
          )}
        </div>
        <aside className="space-y-6">
          <section className="editorial-sheet">
            {schoolIdentity.heroImage && (
              <img
                src={schoolIdentity.heroImage}
                alt=""
                className="h-36 w-full object-cover"
              />
            )}
            <div className="p-5">
              <p className="editorial-eyebrow">Your institution</p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight">
                {schoolIdentity.name}
              </h2>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {schoolIdentity.address ||
                  "A shared space for your practicum community."}
              </p>
              <button
                onClick={() => setSchoolOpen(true)}
                className="mt-4 inline-flex items-center gap-2 text-xs font-medium"
              >
                School details <ArrowUpRight className="size-3" />
              </button>
            </div>
          </section>
          {student && visible?.timeClock !== false && (
            <section className="editorial-sheet">
              <div className="editorial-section-heading">
                <h2>Time clock</h2>
                <Clock className="size-3" />
              </div>
              <div className="p-5">
                <p className="editorial-eyebrow">
                  {session ? "Session in progress" : "Ready when you are"}
                </p>
                <p className="mt-3 font-mono text-3xl tabular-nums">
                  {session ? formatTimer(elapsedMs(session, now)) : "00:00:00"}
                </p>
                <Button
                  className="mt-5 w-full"
                  onClick={() => {
                    if (session) {
                      state.clockOut(student.id);
                      toast.success("Clocked out. Attendance saved.");
                    } else {
                      state.clockIn(student.id, "student");
                      toast.success("Clocked in.");
                    }
                  }}
                >
                  {session ? (
                    <Square className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {session ? "Clock out" : "Clock in"}
                </Button>
              </div>
            </section>
          )}
          <div className="border-t border-border pt-5">
            <p className="editorial-eyebrow">Cohort dates</p>
            <p className="mt-3 text-xs leading-6">
              {toolsConfig.termStart} — {toolsConfig.termEnd}
            </p>
            <p className="mt-4 text-xs leading-6 text-muted-foreground">
              Local prototype. Changes are saved in this browser. Use the
              profile menu to explore another demo role.
            </p>
          </div>
        </aside>
      </div>
      <SchoolIdentityModal open={schoolOpen} onOpenChange={setSchoolOpen} />
    </div>
  );
}
