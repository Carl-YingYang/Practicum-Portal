import type {
  Coordinator,
  Student,
  Supervisor,
  TimeLog,
  User,
  FormDocument,
  FormFieldValue,
  ToolsConfig,
} from "./types";
import { mockUsers } from "./mock-data";

export { DEFAULT_SCHOOL_ID } from "./types";
export const PORTAL_TIME_ZONE = "Asia/Manila";

import { currentAcademicTerm } from "./academic-term";
export { currentAcademicTerm, configuredTerm } from "./academic-term";

export function termBounds(term = currentAcademicTerm()): [number, number] {
  const year =
    Number(term.match(/^\d{4}/)?.[0]) ||
    Number(currentAcademicTerm().slice(0, 4));
  return [
    Date.parse(`${year}-08-01T00:00:00+08:00`),
    Date.parse(`${year + 1}-08-01T00:00:00+08:00`),
  ];
}

/** Stable user identities derived from current records, including demo seeds. */
export function accountUsers(state: {
  students: Student[];
  supervisors: Supervisor[];
  coordinators: Coordinator[];
}): User[] {
  return [
    ...state.students.map((r) => ({
      record: r,
      role: "student" as const,
      link: { studentId: r.id },
      idNumber: r.studentNumber,
      prefix: "u-stu-",
    })),
    ...state.supervisors.map((r) => ({
      record: r,
      role: "supervisor" as const,
      link: { supervisorId: r.id },
      idNumber: r.idNumber ?? `EMP-${r.id.slice(-4).toUpperCase()}`,
      prefix: "u-sup-",
    })),
    ...state.coordinators.map((r) => ({
      record: r,
      role: "coordinator" as const,
      link: { coordinatorId: r.id },
      idNumber: r.idNumber ?? `COORD-${r.id.slice(-4).toUpperCase()}`,
      prefix: "u-coord-",
    })),
  ].map(({ record, role, link, idNumber, prefix }) => {
    const demo = mockUsers.find(
      (u) =>
        u.role === role &&
        (u.studentId ?? u.supervisorId ?? u.coordinatorId) === record.id,
    );
    return {
      id: demo?.id ?? `${prefix}${record.id}`,
      name: record.name,
      email: record.email,
      role,
      ...link,
      idNumber:
        record.password === undefined ? (demo?.idNumber ?? idNumber) : idNumber,
      avatarColor:
        "avatarColor" in record
          ? record.avatarColor
          : (demo?.avatarColor ?? "#475569"),
      accountStatus:
        record.status === "inactive"
          ? "disabled"
          : (record.accountStatus ?? "active"),
      mustChangePassword: record.mustChangePassword ?? false,
    };
  });
}

/** Attendance is the only credited-hours source; avoid incremental rounding drift. */
export function recalculateHours(
  students: Student[],
  logs: TimeLog[],
): Student[] {
  const totals = new Map<string, number>();
  for (const t of logs)
    if (
      t.role === "student" &&
      t.clockOutAt !== null &&
      Number.isFinite(t.durationMs) &&
      (t.durationMs ?? 0) >= 0
    ) {
      totals.set(t.userId, (totals.get(t.userId) ?? 0) + (t.durationMs ?? 0));
    }
  return students.map((s) => ({
    ...s,
    loggedHours: Math.round(((totals.get(s.id) ?? 0) / 3600000) * 100) / 100,
  }));
}

export function validateTimeEntry(
  logs: TimeLog[],
  userId: string,
  start: string,
  end: string,
  now = Date.now(),
): string | null {
  const a = Date.parse(start),
    b = Date.parse(end);
  if (!Number.isFinite(a) || !Number.isFinite(b))
    return "Enter valid start and end dates.";
  if (b <= a) return "Clock-out must be after clock-in.";
  if (b > now) return "Completed entries cannot be in the future.";
  if (b - a > 24 * 3600000)
    return "A session cannot exceed 24 hours. Split it into daily entries.";
  if (
    logs.some(
      (t) =>
        t.userId === userId &&
        a < (t.clockOutAt ? Date.parse(t.clockOutAt) : Infinity) &&
        b > Date.parse(t.clockInAt),
    )
  )
    return "This entry overlaps an existing session.";
  return null;
}

export function responseErrors(
  form: FormDocument,
  values: Record<string, FormFieldValue>,
): string[] {
  return form.blocks.flatMap((b) => {
    const value = values[b.id];
    if (
      ["fill-in", "signature"].includes(b.type) &&
      (b.required ?? b.type === "fill-in") &&
      !(typeof value === "string" && value.trim())
    )
      return [`Complete ${b.label ?? b.caption ?? "the required field"}.`];
    if (
      b.type === "rating-table" &&
      b.criteria?.some((c) => !(typeof value === "object" && value[c.id]))
    )
      return ["Rate every criterion before submitting."];
    return [];
  });
}
