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
  "clockIn" | "clockOut" | "deleteTimeLog" | "addManualTimeLog"
> {
  const { logActivity, genTempPassword, buildDefaultBlock } =
    createHelpers(uuid);
  return {
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
