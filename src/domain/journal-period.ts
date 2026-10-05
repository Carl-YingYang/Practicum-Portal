import type { Journal, TimeLog } from "@/lib/types";
export type JournalCadence = "daily" | "weekly" | "twice-weekly";
export const cadenceLabels: Record<JournalCadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  "twice-weekly": "Twice a week",
};
export function calendarDay(date: string, offset: number) {
  const day = new Date(date + "T12:00:00Z");
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}
export function journalPeriod(
  date: string,
  cadence: JournalCadence = "weekly",
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)))
    throw new Error("Choose a valid journal date.");
  const weekday = (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7;
  const monday = calendarDay(date, -weekday);
  const start =
    cadence === "daily"
      ? date
      : cadence === "twice-weekly" && weekday > 2
        ? calendarDay(monday, 3)
        : monday;
  const end =
    cadence === "daily"
      ? date
      : cadence === "twice-weekly" && weekday < 3
        ? calendarDay(monday, 2)
        : calendarDay(monday, 6);
  return {
    start,
    end,
    startMs: Date.parse(start + "T00:00:00+08:00"),
    endMs: Date.parse(calendarDay(end, 1) + "T00:00:00+08:00"),
  };
}
export function journalHours(
  logs: TimeLog[],
  studentId: string,
  date: string,
  cadence: JournalCadence = "weekly",
) {
  const period = journalPeriod(date, cadence);
  let periodMs = 0,
    cumulativeMs = 0;
  for (const log of logs) {
    if (log.userId !== studentId || log.role !== "student" || !log.clockOutAt)
      continue;
    const start = Date.parse(log.clockInAt),
      end = Date.parse(log.clockOutAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      continue;
    periodMs += Math.max(
      0,
      Math.min(end, period.endMs) - Math.max(start, period.startMs),
    );
    cumulativeMs += Math.max(0, Math.min(end, period.endMs) - start);
  }
  const hours = (ms: number) => Math.round(ms / 36000) / 100;
  return {
    ...period,
    hours: hours(periodMs),
    cumulativeHours: hours(cumulativeMs),
  };
}
export function nextJournalDate(
  logs: TimeLog[],
  journals: Journal[],
  studentId: string,
  today: string,
  cadence: JournalCadence = "weekly",
) {
  const occupied = journals
    .filter(
      (journal) =>
        journal.studentId === studentId &&
        ["pending", "approved"].includes(journal.status),
    )
    .map((journal) => journalPeriod(journal.date, journal.cadence ?? cadence));
  const dates = logs
    .filter(
      (log) =>
        log.userId === studentId && log.role === "student" && log.clockOutAt,
    )
    .flatMap((log) => {
      const start = new Date(log.clockInAt).toLocaleDateString("en-CA", {
        timeZone: "Asia/Manila",
      });
      const end = new Date(Date.parse(log.clockOutAt!) - 1).toLocaleDateString(
        "en-CA",
        { timeZone: "Asia/Manila" },
      );
      const days: string[] = [];
      for (
        let day = start;
        day <= end && day <= today && days.length < 366;
        day = calendarDay(day, 1)
      )
        days.push(day);
      return days;
    })
    .sort();
  return (
    dates.find((date) => {
      const period = journalPeriod(date, cadence);
      return !occupied.some(
        (previous) =>
          period.start <= previous.end && period.end >= previous.start,
      );
    }) ?? today
  );
}
