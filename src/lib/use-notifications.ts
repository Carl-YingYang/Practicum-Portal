"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Timer,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import {
  allActiveTimeLogs,
  completedTimeLogsForUser,
  evaluationsForStudent,
  evaluationsForSupervisor,
  getStudent,
  getSupervisor,
  hoursPercent,
  pendingJournalsForSupervisor,
  relativeTime,
  studentsForSupervisor,
  studentsWithOverdueJournals,
  totalCompletedTimeMs,
  unevaluatedInterns,
} from "@/lib/selectors";
import type { Role, ViewKey, ViewParams } from "@/lib/types";

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
  const role = useAppStore((s) => s.currentUser?.role) as Role | undefined;
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const journals = useAppStore((s) => s.journals);
  const evaluations = useAppStore((s) => s.evaluations);
  const timeLogs = useAppStore((s) => s.timeLogs);
  const activity = useAppStore((s) => s.activity);

  return React.useMemo(() => {
    if (!role || !currentUser) return [];

    const items: NotificationItem[] = [];

    if (role === "coordinator") {
      // 1. Overdue journals (urgent)
      const overdue = studentsWithOverdueJournals(students, journals, 10);
      overdue.slice(0, 4).forEach(({ student, daysOverdue }) => {
        items.push({
          id: `overdue-${student.id}`,
          category: "urgent",
          icon: AlertTriangle,
          title: `${student.name} — journal overdue`,
          description:
            daysOverdue === Infinity
              ? "No journal submitted yet this term."
              : `${daysOverdue} days since last journal entry.`,
          timestamp: new Date(
            Date.now() - daysOverdue * 86400_000
          ).toISOString(),
          action: {
            label: "View student",
            view: "coordinator.student-detail",
            params: { studentId: student.id },
          },
        });
      });

      // 2. Pending journal approvals (approval)
      const pending = journals.filter((j) => j.status === "pending");
      if (pending.length > 0) {
        items.push({
          id: "pending-journals",
          category: "approval",
          icon: ClipboardList,
          title: `${pending.length} journal${pending.length === 1 ? "" : "s"} awaiting approval`,
          description: "Review and approve or reject submitted weekly journals.",
          timestamp: pending[0]?.submittedAt ?? new Date().toISOString(),
          action: { label: "Open journals", view: "coordinator.journals" },
        });
      }

      // 3. Students without supervisor (urgent)
      const unassigned = students.filter(
        (s) => !s.supervisorId && s.status === "active"
      );
      if (unassigned.length > 0) {
        items.push({
          id: "unassigned-students",
          category: "urgent",
          icon: UserPlus,
          title: `${unassigned.length} student${unassigned.length === 1 ? "" : "s"} without a supervisor`,
          description: "Assign a company supervisor to begin tracking.",
          timestamp: new Date().toISOString(),
          action: { label: "Open students", view: "coordinator.students" },
        });
      }

      // 4. Students currently on the clock (clock)
      const activeStudents = allActiveTimeLogs(timeLogs).filter(
        (t) => t.role === "student"
      );
      if (activeStudents.length > 0) {
        const st = getStudent(students, activeStudents[0].userId);
        items.push({
          id: "active-clockins",
          category: "clock",
          icon: Timer,
          title: `${activeStudents.length} student${activeStudents.length === 1 ? "" : "s"} currently on the clock`,
          description: st
            ? `${st.name} clocked in earliest.`
            : "Live clock-in monitoring.",
          timestamp: activeStudents[activeStudents.length - 1].clockInAt,
          action: { label: "Open time tracking", view: "coordinator.time-monitor" },
        });
      }

      // 5. Recent evaluations submitted (info)
      const recentEvals = evaluations
        .filter((e) => e.status === "submitted" && e.submittedAt)
        .sort((a, b) =>
          (a.submittedAt ?? "") < (b.submittedAt ?? "") ? 1 : -1
        )
        .slice(0, 1);
      recentEvals.forEach((e) => {
        const st = getStudent(students, e.studentId);
        const sup = getSupervisor(supervisors, e.supervisorId);
        items.push({
          id: `eval-${e.id}`,
          category: "info",
          icon: FileText,
          title: `New evaluation submitted`,
          description: `${sup?.name ?? "Supervisor"} evaluated ${st?.name ?? "a student"}.`,
          timestamp: e.submittedAt ?? new Date().toISOString(),
          action: {
            label: "View evaluation",
            view: "coordinator.evaluation-view",
            params: { evaluationId: e.id },
          },
        });
      });

      // 6. Recent activity feed (success) — top 2 recent entries
      activity.slice(0, 2).forEach((a) => {
        items.push({
          id: `activity-${a.id}`,
          category: "success",
          icon: CheckCircle2,
          title: a.message,
          description: relativeTime(a.timestamp),
          timestamp: a.timestamp,
        });
      });
    }

    if (role === "supervisor" && currentUser.supervisorId) {
      const supId = currentUser.supervisorId;
      const myInterns = studentsForSupervisor(students, supId);

      // 1. Pending journals for my interns (approval)
      const pending = pendingJournalsForSupervisor(journals, students, supId);
      if (pending.length > 0) {
        const firstSt = getStudent(students, pending[0].studentId);
        items.push({
          id: "sup-pending-journals",
          category: "approval",
          icon: ClipboardList,
          title: `${pending.length} journal${pending.length === 1 ? "" : "s"} to review`,
          description: firstSt
            ? `${firstSt.name} submitted a journal.`
            : "Review and approve submitted journals.",
          timestamp: pending[0].submittedAt ?? new Date().toISOString(),
          action: { label: "Open approval queue", view: "supervisor.journal-approval" },
        });
      }

      // 2. Unevaluated interns (urgent)
      const unevaluated = unevaluatedInterns(students, evaluations, supId);
      if (unevaluated.length > 0) {
        items.push({
          id: "sup-unevaluated",
          category: "urgent",
          icon: FileText,
          title: `${unevaluated.length} intern${unevaluated.length === 1 ? "" : "s"} without an evaluation`,
          description: "Submit their term evaluation to keep records current.",
          timestamp: new Date().toISOString(),
          action: { label: "Open evaluations", view: "supervisor.evaluations" },
        });
      }

      // 3. Interns on the clock (clock)
      const activeInterns = allActiveTimeLogs(timeLogs).filter((t) =>
        myInterns.some((s) => s.id === t.userId)
      );
      if (activeInterns.length > 0) {
        items.push({
          id: "sup-active-clockins",
          category: "clock",
          icon: Timer,
          title: `${activeInterns.length} intern${activeInterns.length === 1 ? "" : "s"} on the clock now`,
          description: "Live monitoring of your team's hours.",
          timestamp: activeInterns[activeInterns.length - 1].clockInAt,
          action: { label: "Open time tracking", view: "supervisor.time-monitor" },
        });
      }

      // 4. Low-hours interns (info)
      const lowHours = myInterns.filter(
        (s) => s.status === "active" && hoursPercent(s) < 25
      );
      if (lowHours.length > 0) {
        const st = lowHours[0];
        items.push({
          id: "sup-low-hours",
          category: "info",
          icon: Clock,
          title: `${st.name} is behind on hours`,
          description: `Only ${hoursPercent(st)}% of required ${st.requiredHours}h completed.`,
          timestamp: new Date().toISOString(),
          action: {
            label: "View intern",
            view: "supervisor.intern-detail",
            params: { studentId: st.id },
          },
        });
      }
    }

    if (role === "student" && currentUser.studentId) {
      const st = getStudent(students, currentUser.studentId);
      if (st) {
        // 1. Rejected journals (urgent)
        const rejected = journals.filter(
          (j) => j.studentId === st.id && j.status === "rejected"
        );
        if (rejected.length > 0) {
          const r = rejected[0];
          items.push({
            id: "stu-rejected",
            category: "urgent",
            icon: AlertTriangle,
            title: `Journal for ${r.date} was rejected`,
            description:
              r.rejectionReason ?? "Review feedback and resubmit.",
            timestamp: r.reviewedAt ?? r.submittedAt ?? new Date().toISOString(),
            action: {
              label: "View journal",
              view: "student.journal-view",
              params: { journalId: r.id },
            },
          });
        }

        // 2. Pending evaluation (info)
        const myEvals = evaluationsForStudent(evaluations, st.id);
        const submitted = myEvals.find((e) => e.status === "submitted");
        if (submitted) {
          items.push({
            id: "stu-eval-ready",
            category: "success",
            icon: CheckCircle2,
            title: "Your evaluation is ready to view",
            description: `Term ${submitted.term} evaluation has been submitted.`,
            timestamp: submitted.submittedAt ?? new Date().toISOString(),
            action: {
              label: "View evaluation",
              view: "student.evaluation-view",
              params: { evaluationId: submitted.id },
            },
          });
        } else {
          items.push({
            id: "stu-eval-pending",
            category: "info",
            icon: FileText,
            title: "Evaluation pending",
            description: "Your supervisor hasn't submitted an evaluation yet.",
            timestamp: new Date().toISOString(),
          });
        }

        // 3. Hours progress (info / urgent)
        const pct = hoursPercent(st);
        if (pct < 50) {
          items.push({
            id: "stu-hours",
            category: pct < 25 ? "urgent" : "info",
            icon: Clock,
            title: `${pct}% of required hours completed`,
            description: `${st.loggedHours}h of ${st.requiredHours}h — keep clocking in!`,
            timestamp: new Date().toISOString(),
            action: { label: "Open time clock", view: "student.time-clock" },
          });
        } else {
          // success: milestone
          items.push({
            id: "stu-hours-milestone",
            category: "success",
            icon: CheckCircle2,
            title: `${pct}% hours completed — great progress!`,
            description: `${st.loggedHours}h of ${st.requiredHours}h logged.`,
            timestamp: new Date().toISOString(),
          });
        }

        // 4. On the clock (clock)
        const completed = completedTimeLogsForUser(timeLogs, st.id);
        const totalMs = totalCompletedTimeMs(timeLogs, st.id);
        if (completed.length > 0) {
          items.push({
            id: "stu-sessions",
            category: "clock",
            icon: Timer,
            title: `${completed.length} sessions · ${Math.round(totalMs / 3600_000)}h tracked`,
            description: "View your weekly-grouped session history.",
            timestamp: completed[0].clockInAt,
            action: { label: "Open time clock", view: "student.time-clock" },
          });
        }
      }
    }

    // Sort newest first; stable for equal timestamps
    return items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [role, currentUser, students, supervisors, journals, evaluations, timeLogs, activity]);
}
