import { recalculateHours, validateTimeEntry } from "@/lib/prototype";
import { type TimeLog } from "@/lib/types";
import type { StoreApi } from "zustand/vanilla";
import { createHelpers } from "../helpers";
import type { AppState } from "../types";
export function createAttendanceActions(
  set: StoreApi<AppState>["setState"],
  get: StoreApi<AppState>["getState"],
  uuid: () => string,
): Pick<
  AppState,
  | "clockIn"
  | "clockOut"
  | "deleteTimeLog"
  | "addManualTimeLog"
  | "requestTimeCorrection"
  | "reviewTimeCorrection"
> {
  const { logActivity } = createHelpers(uuid);
  return {
    requestTimeCorrection: (logId, clockOutAt, reason) => {
      const state = get();
      const log = state.timeLogs.find((t) => t.id === logId);
      if (!log || log.role !== "student")
        throw new Error("Student session not found.");
      if (log.corrections?.some((c) => c.status === "pending"))
        throw new Error("A correction is already awaiting review.");
      if (reason.trim().length < 5)
        throw new Error("Explain the correction in at least 5 characters.");
      const invalid = validateTimeEntry(
        state.timeLogs.filter((t) => t.id !== logId),
        log.userId,
        log.clockInAt,
        clockOutAt,
      );
      if (invalid) throw new Error(invalid);
      const id = uuid();
      const correction = {
        id,
        requestedClockOutAt: clockOutAt,
        originalClockOutAt: log.clockOutAt,
        reason: reason.trim(),
        requestedAt: new Date().toISOString(),
        requestedBy: state.currentUser?.id ?? "",
        status: "pending" as const,
      };
      set((s) => ({
        timeLogs: s.timeLogs.map((t) =>
          t.id === logId
            ? { ...t, corrections: [...(t.corrections ?? []), correction] }
            : t,
        ),
        activity: logActivity(
          s.activity,
          "time_correction_requested",
          `${state.students.find((s) => s.id === log.userId)?.name ?? "Student"}: clock-out correction requested`,
          s.currentUser?.id ?? "",
        ),
      }));
      return id;
    },
    reviewTimeCorrection: (logId, correctionId, decision, note) => {
      const state = get();
      const log = state.timeLogs.find((t) => t.id === logId);
      const correction = log?.corrections?.find((c) => c.id === correctionId);
      if (!log || !correction || correction.status !== "pending")
        throw new Error("This request is no longer pending.");
      if (decision === "rejected" && !note?.trim())
        throw new Error("Explain why this correction was rejected.");
      if (decision === "approved") {
        const invalid = validateTimeEntry(
          state.timeLogs.filter((t) => t.id !== logId),
          log.userId,
          log.clockInAt,
          correction.requestedClockOutAt,
        );
        if (invalid) throw new Error(invalid);
      }
      const timeLogs = state.timeLogs.map((t) =>
        t.id !== logId
          ? t
          : {
              ...t,
              ...(decision === "approved"
                ? {
                    clockOutAt: correction.requestedClockOutAt,
                    durationMs:
                      Date.parse(correction.requestedClockOutAt) -
                      Date.parse(t.clockInAt),
                  }
                : {}),
              corrections: t.corrections?.map((c) =>
                c.id !== correctionId
                  ? c
                  : {
                      ...c,
                      status: decision,
                      reviewedAt: new Date().toISOString(),
                      reviewedBy: state.currentUser?.id,
                      reviewNote: note?.trim(),
                    },
              ),
            },
      );
      set((s) => ({
        timeLogs,
        students: recalculateHours(s.students, timeLogs),
        activity: logActivity(
          s.activity,
          "time_correction_reviewed",
          `${state.students.find((s) => s.id === log.userId)?.name ?? "Student"}: clock-out correction ${decision}`,
          s.currentUser?.id ?? "",
        ),
      }));
    },
    clockIn: (userId, role, note) => {
      const active = get().timeLogs.find(
        (t) => t.userId === userId && t.clockOutAt === null,
      );
      if (active) return active.id;
      const id = uuid();
      const now = new Date().toISOString();
      const log: TimeLog = {
        id,
        userId,
        role,
        clockInAt: now,
        clockOutAt: null,
        durationMs: null,
        note,
        createdAt: now,
      };
      const actorName =
        role === "student"
          ? get().students.find((x) => x.id === userId)?.name
          : role === "supervisor"
            ? get().supervisors.find((x) => x.id === userId)?.name
            : get().currentUser?.name;
      set((s) => ({
        timeLogs: [log, ...s.timeLogs],
        activity: logActivity(
          s.activity,
          "time_clock_in",
          `${actorName ?? "Someone"} clocked in`,
          s.currentUser?.id ?? "",
        ),
      }));
      return id;
    },
    clockOut: (userId, note) =>
      set((s) => {
        const active = s.timeLogs.find(
          (t) => t.userId === userId && t.clockOutAt === null,
        );
        if (!active) return s;
        const now = new Date();
        const inD = new Date(active.clockInAt);
        const durationMs = Math.max(0, now.getTime() - inD.getTime());
        const hours = durationMs / 3600000;
        // Only students accumulate practicum hours toward their requirement.
        const st =
          active.role === "student"
            ? s.students.find((x) => x.id === userId)
            : undefined;
        const actorName = st
          ? st.name
          : active.role === "supervisor"
            ? s.supervisors.find((x) => x.id === userId)?.name
            : s.currentUser?.name;
        return {
          timeLogs: s.timeLogs.map((t) =>
            t.id === active.id
              ? {
                  ...t,
                  clockOutAt: now.toISOString(),
                  durationMs,
                  note: note ?? t.note,
                }
              : t,
          ),
          students: recalculateHours(
            s.students,
            s.timeLogs.map((t) =>
              t.id === active.id
                ? { ...t, clockOutAt: now.toISOString(), durationMs }
                : t,
            ),
          ),
          activity: logActivity(
            s.activity,
            "time_clock_out",
            `${actorName ?? "Someone"} clocked out (${hours.toFixed(1)}h session)`,
            s.currentUser?.id ?? "",
          ),
        };
      }),
    deleteTimeLog: (id) =>
      set((s) => {
        const timeLogs = s.timeLogs.filter((t) => t.id !== id);
        return { timeLogs, students: recalculateHours(s.students, timeLogs) };
      }),
    addManualTimeLog: ({ userId, role, clockInAt, clockOutAt, note }) => {
      const error = validateTimeEntry(
        get().timeLogs,
        userId,
        clockInAt,
        clockOutAt,
      );
      if (error) throw new Error(error);
      const id = uuid();
      const inD = new Date(clockInAt);
      const outD = new Date(clockOutAt);
      const durationMs = Math.max(0, outD.getTime() - inD.getTime());
      const hours = durationMs / 3600000;
      const log: TimeLog = {
        id,
        userId,
        role,
        clockInAt: inD.toISOString(),
        clockOutAt: outD.toISOString(),
        durationMs,
        note,
        createdAt: new Date().toISOString(),
      };
      set((s) => {
        // Accumulate hours for students only (mirrors clockOut logic).
        const isStudent = role === "student";
        const actorName = isStudent
          ? s.students.find((x) => x.id === userId)?.name
          : role === "supervisor"
            ? s.supervisors.find((x) => x.id === userId)?.name
            : s.currentUser?.name;
        return {
          timeLogs: [log, ...s.timeLogs],
          students: recalculateHours(s.students, [log, ...s.timeLogs]),
          activity: logActivity(
            s.activity,
            "time_clock_out",
            `${actorName ?? "Someone"} added a manual ${hours.toFixed(1)}h entry`,
            s.currentUser?.id ?? "",
          ),
        };
      });
      return id;
    },
  };
}
