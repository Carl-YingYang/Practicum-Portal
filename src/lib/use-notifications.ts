"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { assignmentAppliesTo } from "@/lib/selectors";
import type { ViewKey, ViewParams } from "@/lib/types";

export type NotificationCategory =
  | "urgent" // red — needs immediate attention (overdue, rejected)
  | "approval" // amber — pending your action
  | "info" // teal — informational (new submissions, assignments)
  | "success" // emerald — positive (approved, completed)
  | "clock"; // slate — time-clock related

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  icon: LucideIcon;
  title: string;
  description: string;
  /** ISO timestamp for grouping/sorting. */
  timestamp: string;
  action?: { label: string; view: ViewKey; params?: ViewParams };
}

const CATEGORY_META: Record<
  NotificationCategory,
  { dot: string; iconBg: string; iconFg: string; label: string }
> = {
  urgent: {
    dot: "bg-red-500",
    iconBg: "bg-red-50 dark:bg-red-950/50",
    iconFg: "text-red-600 dark:text-red-400",
    label: "Urgent",
  },
  approval: {
    dot: "bg-amber-500",
    iconBg: "bg-amber-50 dark:bg-amber-950/50",
    iconFg: "text-amber-600 dark:text-amber-400",
    label: "Needs action",
  },
  info: {
    dot: "bg-teal-500",
    iconBg: "bg-teal-50 dark:bg-teal-950/50",
    iconFg: "text-teal-600 dark:text-teal-400",
    label: "Info",
  },
  success: {
    dot: "bg-emerald-500",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/50",
    iconFg: "text-emerald-600 dark:text-emerald-400",
    label: "Update",
  },
  clock: {
    dot: "bg-slate-400",
    iconBg: "bg-slate-100 dark:bg-slate-800/60",
    iconFg: "text-slate-600 dark:text-slate-300",
    label: "Time clock",
  },
};

export function getCategoryMeta(c: NotificationCategory) {
  return CATEGORY_META[c];
}

/**
 * Derives a role-aware list of notifications from the store.
 * Returns items sorted newest-first. Each role sees a different
 * mix:
 *  - coordinator: cohort-wide (overdue journals, pending approvals,
 *    students without supervisor, active clock-ins, recent activity)
 *  - supervisor: team-scoped (pending journals, unevaluated interns,
 *    interns on the clock)
 *  - student: personal (rejected journals, pending evaluation,
 *    low hours progress, active session)
 */
export function useNotifications(): NotificationItem[] {
  const state = useAppStore();
  return React.useMemo(() => {
    const actor = state.currentUser;
    if (!actor) return [];
    const items: NotificationItem[] = [];
    const students = state.students.filter(
      (s) =>
        actor.role === "coordinator" ||
        (actor.role === "student"
          ? s.id === actor.studentId
          : s.supervisorId === actor.supervisorId),
    );
    const ids = new Set(students.map((s) => s.id));
    for (const j of state.journals.filter((j) => ids.has(j.studentId))) {
      if (actor.role !== "student" && j.status === "pending" && j.submittedAt)
        items.push({
          id: `journal:${j.id}:submitted:${j.submittedAt}`,
          category: "approval",
          icon: ClipboardList,
          title: "Journal ready for review",
          description: `${students.find((s) => s.id === j.studentId)?.name} · ${j.date}`,
          timestamp: j.submittedAt,
          action: {
            label: "Review journal",
            view:
              actor.role === "supervisor"
                ? "supervisor.journal-review"
                : "coordinator.journal-view",
            params: { journalId: j.id },
          },
        });
      if (
        actor.role === "student" &&
        j.reviewedAt &&
        ["approved", "rejected"].includes(j.status)
      )
        items.push({
          id: `journal:${j.id}:${j.status}:${j.reviewedAt}`,
          category: j.status === "approved" ? "success" : "urgent",
          icon: j.status === "approved" ? CheckCircle2 : AlertTriangle,
          title:
            j.status === "approved"
              ? "Journal approved"
              : "Journal needs revision",
          description: j.rejectionReason || `Journal dated ${j.date}`,
          timestamp: j.reviewedAt,
          action: {
            label: "View journal",
            view: "student.journal-view",
            params: { journalId: j.id },
          },
        });
    }
    for (const a of state.formAssignments.filter((a) =>
      assignmentAppliesTo(a, actor),
    )) {
      const form = state.formDocuments.find((f) => f.id === a.formId);
      if (form?.status === "published")
        items.push({
          id: `assignment:${a.id}`,
          category: "info",
          icon: FileText,
          title: "New form assignment",
          description: `${form.title}${a.dueDate ? ` · Due ${a.dueDate}` : ""}`,
          timestamp: a.createdAt,
          action: {
            label: "Open form",
            view:
              actor.role === "student"
                ? "student.form-view"
                : "supervisor.form-view",
            params: { formId: a.formId },
          },
        });
    }
    for (const sub of state.formSubmissions) {
      if (
        actor.role === "coordinator" &&
        ["submitted", "under_review"].includes(sub.status) &&
        sub.submittedAt
      )
        items.push({
          id: `form:${sub.id}:submitted:${sub.submittedAt}`,
          category: "approval",
          icon: FileText,
          title: "Form response ready for review",
          description: sub.formSnapshot?.title ?? "Assigned form",
          timestamp: sub.submittedAt,
          action: {
            label: "Review responses",
            view: "coordinator.forms",
            params: { tab: "submissions" },
          },
        });
      if (
        sub.userId === actor.id &&
        sub.reviewedAt &&
        ["approved", "needs_revision"].includes(sub.status)
      )
        items.push({
          id: `form:${sub.id}:${sub.status}:${sub.reviewedAt}`,
          category: sub.status === "approved" ? "success" : "urgent",
          icon: ClipboardList,
          title:
            sub.status === "approved"
              ? "Form response approved"
              : "Form response needs revision",
          description:
            sub.reviewNote ?? sub.formSnapshot?.title ?? "Review your response",
          timestamp: sub.reviewedAt,
          action: {
            label: "Open form",
            view:
              actor.role === "student"
                ? "student.form-view"
                : "supervisor.form-view",
            params: { formId: sub.formId },
          },
        });
    }
    if (actor.role === "student")
      for (const e of state.evaluations.filter(
        (e) =>
          e.studentId === actor.studentId &&
          e.status === "submitted" &&
          e.submittedAt,
      ))
        items.push({
          id: `evaluation:${e.id}:${e.submittedAt}`,
          category: "success",
          icon: CheckCircle2,
          title: "Your evaluation is ready",
          description: `${e.term} evaluation`,
          timestamp: e.submittedAt!,
          action: {
            label: "View evaluation",
            view: "student.evaluation-view",
            params: { evaluationId: e.id },
          },
        });
    for (const t of state.timeLogs.filter((t) => ids.has(t.userId)))
      for (const c of t.corrections ?? []) {
        if (actor.role === "supervisor" && c.status === "pending")
          items.push({
            id: `correction:${c.id}:pending`,
            category: "approval",
            icon: Clock,
            title: "Attendance correction requested",
            description: c.reason,
            timestamp: c.requestedAt,
            action: {
              label: "Review correction",
              view: "supervisor.intern-view",
              params: { studentId: t.userId },
            },
          });
        if (actor.role === "student" && c.status !== "pending" && c.reviewedAt)
          items.push({
            id: `correction:${c.id}:${c.status}`,
            category: c.status === "approved" ? "success" : "info",
            icon: Clock,
            title: `Attendance correction ${c.status}`,
            description: c.reviewNote || c.reason,
            timestamp: c.reviewedAt,
            action: { label: "Open attendance", view: "student.time-clock" },
          });
      }
    return items
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 150);
  }, [
    state.currentUser,
    state.students,
    state.journals,
    state.formAssignments,
    state.formDocuments,
    state.formSubmissions,
    state.evaluations,
    state.timeLogs,
  ]);
}
