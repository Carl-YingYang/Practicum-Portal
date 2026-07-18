"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  studentsForSupervisor,
  getStudent,
} from "@/lib/selectors";
import type { ActivityLog, User } from "@/lib/types";
import {
  Send,
  FileEdit,
  NotebookText,
  CheckCircle2,
  XCircle,
  UserPlus,
  UserSquare2,
  Timer,
  LogOut,
  type LucideIcon,
} from "lucide-react";

export interface RoleActivityItem {
  id: string;
  icon: LucideIcon;
  tone: string;
  message: string;
  timestamp: string;
}

/** Map activity type to icon + tone (same pattern as coordinator dashboard). */
function activityIcon(type: ActivityLog["type"]): { icon: LucideIcon; tone: string } {
  switch (type) {
    case "evaluation_submitted":
      return { icon: Send, tone: "text-teal-600 bg-teal-50 dark:bg-teal-950/50" };
    case "evaluation_saved_draft":
      return { icon: FileEdit, tone: "text-slate-600 bg-slate-100 dark:bg-slate-800" };
    case "journal_submitted":
      return { icon: NotebookText, tone: "text-amber-700 bg-amber-50 dark:bg-amber-950/50" };
    case "journal_approved":
      return { icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50" };
    case "journal_rejected":
      return { icon: XCircle, tone: "text-red-700 bg-red-50 dark:bg-red-950/50" };
    case "student_created":
      return { icon: UserPlus, tone: "text-teal-700 bg-teal-50 dark:bg-teal-950/50" };
    case "supervisor_created":
      return { icon: UserSquare2, tone: "text-teal-700 bg-teal-50 dark:bg-teal-950/50" };
    case "time_clock_in":
      return { icon: Timer, tone: "text-teal-700 bg-teal-50 dark:bg-teal-950/50" };
    case "time_clock_out":
      return { icon: LogOut, tone: "text-slate-600 bg-slate-100 dark:bg-slate-800" };
  }
}

/**
 * Derives role-specific activity items from the store's activity log.
 *
 * - **Student**: Only show items related to this student (journals, evaluations,
 *   time clock events where the student is the actor or subject).
 * - **Supervisor**: Only show items related to interns under this supervisor
 *   (journal approvals, evaluation submissions, time clock events for their interns).
 * - **Coordinator**: Show all activity (not filtered).
 */
export function useRoleActivity(user: User | null): RoleActivityItem[] {
  const activity = useAppStore((s) => s.activity);
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);

  return useMemo(() => {
    if (!user) return [];

    if (user.role === "student") {
      // Student activity: filter to items where the actor is this student,
      // or messages mention this student's name.
      const student = getStudent(students, user.studentId);
      const studentName = student?.name ?? "";
      const studentId = user.studentId ?? user.id;

      const filtered = activity.filter((a) => {
        // Direct actor match
        if (a.actorId === studentId || a.actorId === user.id) return true;
        // Message mentions the student name
        if (studentName && a.message.includes(studentName)) return true;
        // Clock in/out events for this student
        if ((a.type === "time_clock_in" || a.type === "time_clock_out") && a.actorId === studentId) return true;
        return false;
      });

      return filtered.map((a) => {
        const cfg = activityIcon(a.type);
        return {
          id: a.id,
          icon: cfg.icon,
          tone: cfg.tone,
          message: a.message,
          timestamp: a.timestamp,
        };
      });
    }

    if (user.role === "supervisor") {
      // Supervisor: show items related to their interns
      const supervisorId = user.supervisorId ?? "";
      const internIds = new Set(
        studentsForSupervisor(students, supervisorId).map((s) => s.id)
      );
      const internNames = new Set(
        studentsForSupervisor(students, supervisorId).map((s) => s.name)
      );

      const filtered = activity.filter((a) => {
        // Items where the supervisor is the actor
        if (a.actorId === supervisorId || a.actorId === user.id) return true;
        // Items that mention any intern's name
        for (const name of internNames) {
          if (a.message.includes(name)) return true;
        }
        // Clock in/out for their interns
        if (
          (a.type === "time_clock_in" || a.type === "time_clock_out") &&
          internIds.has(a.actorId)
        ) {
          return true;
        }
        return false;
      });

      return filtered.map((a) => {
        const cfg = activityIcon(a.type);
        return {
          id: a.id,
          icon: cfg.icon,
          tone: cfg.tone,
          message: a.message,
          timestamp: a.timestamp,
        };
      });
    }

    // Coordinator: show all activity
    return activity.map((a) => {
      const cfg = activityIcon(a.type);
      return {
        id: a.id,
        icon: cfg.icon,
        tone: cfg.tone,
        message: a.message,
        timestamp: a.timestamp,
      };
    });
  }, [activity, students, supervisors, user]);
}
