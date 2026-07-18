import type {
  Company,
  Evaluation,
  FormAssignment,
  FormDocument,
  FormSubmission,
  Journal,
  Role,
  Student,
  Subscription,
  SubscriptionMetrics,
  Supervisor,
  TimeLog,
  ToolsConfig,
  User,
} from "./types";
import { SUBSCRIPTION_PLANS } from "./mock-data";

// ============================================================
// Pure selectors & formatting helpers.
// Components pass the relevant arrays from the store.
// ============================================================

export function getCompany(companies: Company[], id: string): Company | undefined {
  return companies.find((c) => c.id === id);
}

export function getStudent(students: Student[], id: string | undefined): Student | undefined {
  if (!id) return undefined;
  return students.find((s) => s.id === id);
}

export function getSupervisor(supervisors: Supervisor[], id: string | null | undefined): Supervisor | undefined {
  if (!id) return undefined;
  return supervisors.find((s) => s.id === id);
}

export function getEvaluation(evals: Evaluation[], id: string | undefined): Evaluation | undefined {
  if (!id) return undefined;
  return evals.find((e) => e.id === id);
}

export function getJournal(journals: Journal[], id: string | undefined): Journal | undefined {
  if (!id) return undefined;
  return journals.find((j) => j.id === id);
}

export function studentsForSupervisor(students: Student[], supervisorId: string): Student[] {
  return students.filter((s) => s.supervisorId === supervisorId);
}

/** Number of active students currently assigned to a supervisor. */
export function supervisorLoad(students: Student[], supervisorId: string): number {
  return students.filter(
    (s) => s.supervisorId === supervisorId && s.status === "active"
  ).length;
}

/** Load ratio as a percentage (0-100). Returns 0 if capacity is 0. */
export function supervisorLoadPct(students: Student[], supervisor: Supervisor): number {
  if (!supervisor.capacity || supervisor.capacity <= 0) return 0;
  return Math.min(
    100,
    Math.round((supervisorLoad(students, supervisor.id) / supervisor.capacity) * 100)
  );
}

export type CapacityStatus = "available" | "near-limit" | "full";

/** Capacity bucket — used by the SupervisorPicker for color coding. */
export function capacityStatus(
  students: Student[],
  supervisor: Supervisor
): CapacityStatus {
  if (supervisor.status !== "active") return "full";
  const load = supervisorLoad(students, supervisor.id);
  if (load >= supervisor.capacity) return "full";
  if (load / supervisor.capacity >= 0.8) return "near-limit";
  return "available";
}

export function journalsForStudent(journals: Journal[], studentId: string): Journal[] {
  return journals
    .filter((j) => j.studentId === studentId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function evaluationsForStudent(evals: Evaluation[], studentId: string): Evaluation[] {
  return evals
    .filter((e) => e.studentId === studentId)
    .sort((a, b) => ((a.submittedAt ?? a.createdAt) < (b.submittedAt ?? b.createdAt) ? 1 : -1));
}

export function evaluationsForSupervisor(evals: Evaluation[], supervisorId: string): Evaluation[] {
  return evals
    .filter((e) => e.supervisorId === supervisorId)
    .sort((a, b) => ((a.submittedAt ?? a.createdAt) < (b.submittedAt ?? b.createdAt) ? 1 : -1));
}

/** Journals pending approval for a given supervisor (across their interns). */
export function pendingJournalsForSupervisor(
  journals: Journal[],
  students: Student[],
  supervisorId: string
): Journal[] {
  const internIds = new Set(
    studentsForSupervisor(students, supervisorId).map((s) => s.id)
  );
  return journals
    .filter((j) => j.status === "pending" && internIds.has(j.studentId))
    .sort((a, b) => (a.submittedAt ?? a.createdAt) < (b.submittedAt ?? b.createdAt) ? 1 : -1);
}

/** Interns of a supervisor that have no submitted evaluation for the current term. */
export function unevaluatedInterns(
  students: Student[],
  evals: Evaluation[],
  supervisorId: string,
  term = "2024-2025"
): Student[] {
  const interns = studentsForSupervisor(students, supervisorId);
  return interns.filter(
    (s) =>
      !evals.some(
        (e) =>
          e.studentId === s.id &&
          e.supervisorId === supervisorId &&
          e.status === "submitted" &&
          e.term === term
      )
  );
}

/**
 * Days since a student's most recent journal (draft/pending/approved/rejected).
 * Returns Infinity if the student has no journals at all.
 */
export function daysSinceLastJournal(journals: Journal[], studentId: string): number {
  const stu = journals
    .filter((j) => j.studentId === studentId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  if (stu.length === 0) return Infinity;
  const last = new Date(stu[0].date);
  if (Number.isNaN(last.getTime())) return Infinity;
  return Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Active students whose most recent journal is older than `thresholdDays`
 * (default 10). Excludes students who have already completed their required
 * hours (they're done) and unassigned students (no supervisor to chase).
 * Used by the coordinator "overdue journals" attention list.
 */
export function studentsWithOverdueJournals(
  students: Student[],
  journals: Journal[],
  thresholdDays = 10
): Array<{ student: Student; daysOverdue: number }> {
  return students
    .filter((s) => s.status === "active" && s.supervisorId && hoursPercent(s) < 100)
    .map((s) => ({ student: s, daysOverdue: daysSinceLastJournal(journals, s.id) }))
    .filter((x) => x.daysOverdue > thresholdDays || x.daysOverdue === Infinity)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export function averageScore(e: Evaluation): number {
  if (e.status === "draft" || (e.qualityOfWork + e.jobKnowledge + e.dependability) === 0) return 0;
  return (e.qualityOfWork + e.jobKnowledge + e.dependability) / 3;
}

export function hoursPercent(s: Student): number {
  if (s.requiredHours === 0) return 0;
  return Math.min(100, Math.round((s.loggedHours / s.requiredHours) * 100));
}

// ============================================================
// Subscription & billing metrics (pay-per-hour)
// ============================================================

/**
 * Compute billing metrics from the subscription + active students.
 *
 * Pay-per-hour model: the school is billed `hourlyRatePhp` for every intern-hour.
 * - `totalAssignedHours` = Σ student.requiredHours (committed hour load).
 * - `totalUsedHours` = Σ student.loggedHours (actual hours clocked).
 * - `committedCostPhp` = totalAssignedHours × hourlyRatePhp (full term bill).
 * - `accruedCostPhp` = totalUsedHours × hourlyRatePhp (earned so far).
 * - `outstandingCostPhp` = committedCostPhp − accruedCostPhp.
 * - `utilizationPct` = logged ÷ assigned (progress), 0–100.
 *
 * Canonical example at the default ₱0.0667/hr rate: 15 hours = ₱1.00.
 */
export function computeSubscriptionMetrics(
  subscription: Subscription,
  students: Student[]
): SubscriptionMetrics {
  const active = students.filter((s) => s.status === "active");
  const totalAssignedHours = active.reduce(
    (sum, s) => sum + (s.requiredHours || 0),
    0
  );
  const totalUsedHours = active.reduce(
    (sum, s) => sum + (s.loggedHours || 0),
    0
  );
  // Fall back to the current tier's rate if the stored rate is missing/invalid
  // (e.g. hydrating an old localStorage payload from the pool model).
  const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === subscription.planTier);
  const hourlyRatePhp =
    Number.isFinite(subscription.hourlyRatePhp) && subscription.hourlyRatePhp > 0
      ? subscription.hourlyRatePhp
      : plan?.hourlyRatePhp ?? 0.0667;
  const committedCostPhp = totalAssignedHours * hourlyRatePhp;
  const accruedCostPhp = totalUsedHours * hourlyRatePhp;
  const outstandingCostPhp = Math.max(0, committedCostPhp - accruedCostPhp);
  const utilizationPct =
    totalAssignedHours === 0
      ? 0
      : Math.min(100, Math.round((totalUsedHours / totalAssignedHours) * 100));
  return {
    totalAssignedHours,
    totalUsedHours,
    hourlyRatePhp,
    committedCostPhp,
    accruedCostPhp,
    outstandingCostPhp,
    utilizationPct,
    activeStudents: active.length,
  };
}

/** Color band by score (1-2 red, 3 amber, 4-5 emerald). */
export function scoreBand(score: number): "danger" | "warning" | "success" {
  if (score === 0) return "warning";
  if (score <= 2) return "danger";
  if (score <= 3) return "warning";
  return "success";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ============================================================
// Date / time formatting
// ============================================================

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 60) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return formatDate(iso);
}

export function weekLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const monday = new Date(d);
  const day = d.getDay(); // 0 sun .. 6 sat
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(d.getDate() + diff);
  return `Week of ${monday.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

export function todayISODate(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// ============================================================
// Avatar color
// ============================================================
const AVATAR_COLORS = [
  "#0f766e",
  "#d97706",
  "#475569",
  "#059669",
  "#dc2626",
  "#0891b2",
  "#c2410c",
  "#7c3aed",
];

export function avatarColorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function userInitials(u: User): string {
  return initials(u.name);
}

// ============================================================
// Time clock (clock-in / clock-out) selectors & helpers
// ============================================================

/** The active (open) time log for a user, or undefined if clocked out. */
export function activeTimeLog(timeLogs: TimeLog[], userId: string): TimeLog | undefined {
  return timeLogs.find((t) => t.userId === userId && t.clockOutAt === null);
}

/** All currently-active (open) time logs across the system, newest clock-in first. */
export function allActiveTimeLogs(timeLogs: TimeLog[]): TimeLog[] {
  return timeLogs
    .filter((t) => t.clockOutAt === null)
    .sort((a, b) => (a.clockInAt < b.clockInAt ? 1 : -1));
}

/** All currently-active time logs for a given role. */
export function activeTimeLogsForRole(timeLogs: TimeLog[], role: Role): TimeLog[] {
  return allActiveTimeLogs(timeLogs).filter((t) => t.role === role);
}

/** Sum of completed session durations for ALL students in the last 7 days (ms), plus live active sessions. */
export function cohortWeeklyTimeMs(timeLogs: TimeLog[], now = Date.now()): number {
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return timeLogs
    .filter((t) => t.role === "student" && new Date(t.clockInAt).getTime() >= weekAgo)
    .reduce((sum, t) => {
      if (t.clockOutAt && t.durationMs) return sum + t.durationMs;
      return sum + Math.max(0, now - new Date(t.clockInAt).getTime());
    }, 0);
}

/** Total completed hours across ALL students (for cohort KPIs). */
export function cohortTotalHours(timeLogs: TimeLog[]): number {
  return timeLogs
    .filter((t) => t.role === "student" && t.clockOutAt && t.durationMs)
    .reduce((sum, t) => sum + (t.durationMs ?? 0), 0) / 3600_000;
}

/** All time logs for a user, newest first. */
export function timeLogsForUser(timeLogs: TimeLog[], userId: string): TimeLog[] {
  return timeLogs
    .filter((t) => t.userId === userId)
    .sort((a, b) => (a.clockInAt < b.clockInAt ? 1 : -1));
}

/** Whether a user is currently on the clock. */
export function isClockedIn(timeLogs: TimeLog[], userId: string): boolean {
  return activeTimeLog(timeLogs, userId) !== undefined;
}

/** Completed (closed) time logs for a user. */
export function completedTimeLogsForUser(timeLogs: TimeLog[], userId: string): TimeLog[] {
  return timeLogsForUser(timeLogs, userId).filter((t) => t.clockOutAt !== null);
}

/** @deprecated alias kept for student-monitoring views. Use timeLogsForUser. */
export const timeLogsForStudent = timeLogsForUser;
/** @deprecated alias kept for student-monitoring views. Use completedTimeLogsForUser. */
export const completedTimeLogsForStudent = completedTimeLogsForUser;

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Sessions that started today (includes an active one if present). */
export function todaysTimeLogs(timeLogs: TimeLog[], userId: string): TimeLog[] {
  const now = new Date();
  return timeLogsForUser(timeLogs, userId).filter((t) =>
    isSameDay(new Date(t.clockInAt), now)
  );
}

/** Sum of completed session durations in the last 7 days (ms), plus the live active session if open. */
export function weeklyTimeMs(timeLogs: TimeLog[], userId: string, now = Date.now()): number {
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return timeLogsForUser(timeLogs, userId)
    .filter((t) => new Date(t.clockInAt).getTime() >= weekAgo)
    .reduce((sum, t) => {
      if (t.clockOutAt && t.durationMs) return sum + t.durationMs;
      // include the active session up to "now"
      return sum + Math.max(0, now - new Date(t.clockInAt).getTime());
    }, 0);
}

/** Sum of completed session durations for a user (ms). */
export function totalCompletedTimeMs(timeLogs: TimeLog[], userId: string): number {
  return completedTimeLogsForUser(timeLogs, userId).reduce(
    (sum, t) => sum + (t.durationMs ?? 0),
    0
  );
}

/** Elapsed ms for a single time log (finalised duration, or live elapsed if active). */
export function elapsedMs(t: TimeLog, now = Date.now()): number {
  if (t.clockOutAt && t.durationMs) return t.durationMs;
  return Math.max(0, now - new Date(t.clockInAt).getTime());
}

/** Format a duration in ms as `Hh Mm` (e.g. 7h 30m) or `Mm` when under an hour. */
export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/** Format ms as a decimal hours string, e.g. "7.50h". */
export function formatHoursDecimal(ms: number): string {
  return `${(ms / 3600_000).toFixed(2)}h`;
}

/** Format an ISO timestamp as a short time, e.g. "9:05 AM". */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Format ms as `HH:MM:SS` for a live timer display. */
export function formatTimer(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ============================================================
// v5 — Free-first tool integration selectors (Phase 1)
// ============================================================

/** Which of the 4 external tools have a non-empty URL in the config. */
export function connectedTools(config: ToolsConfig): {
  drive: boolean;
  journalTemplate: boolean;
  form: boolean;
  jibble: boolean;
  count: number;
} {
  const drive = config.driveFolderUrl.trim() !== "";
  const journalTemplate = config.journalTemplateUrl.trim() !== "";
  const form = config.formUrl.trim() !== "";
  const jibble = config.jibbleInviteUrl.trim() !== "";
  return {
    drive,
    journalTemplate,
    form,
    jibble,
    count: [drive, journalTemplate, form, jibble].filter(Boolean).length,
  };
}

/** Validate a tool URL against its expected host. Returns "" if valid, error message if not. */
export function validateToolUrl(
  field: "drive" | "journalTemplate" | "form" | "formCsv" | "jibble",
  url: string
): string {
  const v = url.trim();
  if (!v) return ""; // empty is valid (skip for now)
  try {
    const u = new URL(v);
    const host = u.hostname.toLowerCase();
    switch (field) {
      case "drive":
        return host.includes("drive.google.com") ? "" : "Use a Google Drive folder URL (drive.google.com).";
      case "journalTemplate":
        return host.includes("docs.google.com") ? "" : "Use a Google Docs URL (docs.google.com).";
      case "form":
        return host.includes("forms.gle") || host.includes("docs.google.com")
          ? ""
          : "Use a Google Forms URL (forms.gle or docs.google.com/forms).";
      case "formCsv":
        return host.includes("docs.google.com") || v.toLowerCase().endsWith("csv")
          ? ""
          : "Use a published Google Sheets CSV URL.";
      case "jibble":
        return host.includes("jibble.io") ? "" : "Use a Jibble URL (jibble.io).";
      default:
        return "";
    }
  } catch {
    return "Enter a valid URL (include https://).";
  }
}

// ============================================================
// Custom forms — assignments & submissions selectors
// ============================================================

/**
 * Does a given assignment apply to `user`?
 *  - all_supervisors → any user with role "supervisor"
 *  - all_students    → any user with role "student"
 *  - specific_users  → user.id is in targetUserIds
 * Coordinators never receive form assignments.
 */
export function assignmentAppliesTo(
  assignment: FormAssignment,
  user: User
): boolean {
  if (user.role === "coordinator") return false;
  if (assignment.target === "all_supervisors") return user.role === "supervisor";
  if (assignment.target === "all_students") return user.role === "student";
  return assignment.targetUserIds.includes(user.id);
}

/**
 * Published forms assigned to `user`, with the (first) matching assignment.
 * De-duplicated by form id (picks the assignment with the earliest due date).
 */
export function assignedFormsForUser(
  forms: FormDocument[],
  assignments: FormAssignment[],
  user: User
): { form: FormDocument; assignment: FormAssignment }[] {
  const matching = forms
    .filter((f) => f.status === "published")
    .map((form) => {
      const formAssignments = assignments
        .filter((a) => a.formId === form.id && assignmentAppliesTo(a, user))
        .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
      return formAssignments.length > 0
        ? { form, assignment: formAssignments[0] }
        : null;
    })
    .filter((x): x is { form: FormDocument; assignment: FormAssignment } => x !== null);
  return matching;
}

/** All submissions belonging to a user, newest first. */
export function submissionsForUser(
  submissions: FormSubmission[],
  userId: string
): FormSubmission[] {
  return submissions
    .filter((s) => s.userId === userId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/** All submissions for a form, newest first. */
export function submissionsForForm(
  submissions: FormSubmission[],
  formId: string
): FormSubmission[] {
  return submissions
    .filter((s) => s.formId === formId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/**
 * The submission for (formId, userId, targetStudentId?).
 * For self-reflective forms (no targetStudentId), match on userId only.
 * For evaluation/ojt forms, match on userId + targetStudentId.
 */
export function submissionFor(
  submissions: FormSubmission[],
  formId: string,
  userId: string,
  targetStudentId?: string
): FormSubmission | undefined {
  return submissions.find(
    (s) =>
      s.formId === formId &&
      s.userId === userId &&
      (targetStudentId ? s.targetStudentId === targetStudentId : !s.targetStudentId)
  );
}

/** All assignments targeting a given form. */
export function assignmentsForForm(
  assignments: FormAssignment[],
  formId: string
): FormAssignment[] {
  return assignments.filter((a) => a.formId === formId);
}

/** Submissions awaiting coordinator review (submitted or under_review). */
export function pendingSubmissionsForCoordinator(
  submissions: FormSubmission[]
): FormSubmission[] {
  return submissions
    .filter((s) => s.status === "submitted" || s.status === "under_review")
    .sort((a, b) => (a.submittedAt ?? a.updatedAt) < (b.submittedAt ?? b.updatedAt) ? 1 : -1);
}

/**
 * Response stats for a single form: how many responses are expected vs
 * received / approved / sent back. Used by the coordinator Forms hub cards.
 *
 * Expected (`assigned`) is derived from the assignments + the live cohort:
 *  - all_students   → active students count
 *  - all_supervisors → for evaluation/ojt forms (supervisor fills one per
 *    intern), the count of active students with a supervisor; otherwise the
 *    active supervisors count
 *  - specific_users → targetUserIds length
 */
export function formResponseStats(
  form: FormDocument,
  assignments: FormAssignment[],
  submissions: FormSubmission[],
  supervisors: Supervisor[],
  students: Student[]
): { assigned: number; submitted: number; approved: number; needsRevision: number } {
  const formAssignments = assignmentsForForm(assignments, form.id);
  const activeStudents = students.filter((s) => s.status === "active");
  const activeSupervisors = supervisors.filter((s) => s.status === "active");
  const isPerIntern = form.category === "evaluation" || form.category === "ojt";

  let assigned = 0;
  if (formAssignments.length === 0) {
    assigned = 0;
  } else {
    const counts = formAssignments.map((a) => {
      if (a.target === "all_students") return activeStudents.length;
      if (a.target === "all_supervisors") {
        return isPerIntern
          ? activeStudents.filter((s) => s.supervisorId).length
          : activeSupervisors.length;
      }
      // specific_users
      return a.targetUserIds.length;
    });
    assigned = counts.reduce((sum, n) => sum + n, 0);
  }

  const formSubs = submissionsForForm(submissions, form.id);
  const submitted = formSubs.filter(
    (s) =>
      s.status === "submitted" ||
      s.status === "under_review" ||
      s.status === "approved" ||
      s.status === "needs_revision"
  ).length;
  const approved = formSubs.filter((s) => s.status === "approved").length;
  const needsRevision = formSubs.filter((s) => s.status === "needs_revision").length;

  return { assigned, submitted, approved, needsRevision };
}
