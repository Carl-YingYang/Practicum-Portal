import { journalPeriod, type JournalCadence } from "./journal-period";
import type { Journal, TimeLog } from "@/lib/types";
type Interval = [number, number];
function merge(intervals: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const [start, end] of intervals.sort((a, b) => a[0] - b[0])) {
    const previous = result.at(-1);
    if (previous && start <= previous[1])
      previous[1] = Math.max(previous[1], end);
    else result.push([start, end]);
  }
  return result;
}
/** Journal statuses describe coverage of completed attendance, never extra earned hours. */
export function journalProgress(
  logs: TimeLog[],
  journals: Journal[],
  studentId: string,
  required: number,
  cadence: JournalCadence = "weekly",
) {
  const attendance = merge(
    logs
      .filter(
        (log) =>
          log.userId === studentId && log.role === "student" && log.clockOutAt,
      )
      .map((log): Interval => [
        Date.parse(log.clockInAt),
        Date.parse(log.clockOutAt!),
      ])
      .filter(
        ([start, end]) =>
          Number.isFinite(start) && Number.isFinite(end) && end > start,
      ),
  );
  const periods = (status: Journal["status"]) =>
    merge(
      journals
        .filter(
          (journal) =>
            journal.studentId === studentId && journal.status === status,
        )
        .map((journal): Interval => {
          const period = journalPeriod(
            journal.date,
            journal.cadence ?? cadence,
          );
          return [period.startMs, period.endMs];
        }),
    );
  const approved = periods("approved"),
    pending = periods("pending"),
    revisions = periods("rejected");
  let recordedMs = 0,
    approvedMs = 0,
    pendingMs = 0,
    revisionMs = 0;
  for (const [start, end] of attendance) {
    recordedMs += end - start;
    const cuts = [
      ...new Set([
        start,
        end,
        ...[...approved, ...pending, ...revisions].flatMap((period) =>
          period.filter((point) => point > start && point < end),
        ),
      ]),
    ].sort((a, b) => a - b);
    for (let index = 1; index < cuts.length; index++) {
      const a = cuts[index - 1],
        b = cuts[index];
      const includes = (periods: Interval[]) =>
        periods.some(([s, e]) => a >= s && b <= e);
      if (includes(approved)) approvedMs += b - a;
      else if (includes(pending)) pendingMs += b - a;
      else if (includes(revisions)) revisionMs += b - a;
    }
  }
  const hours = (value: number) => Math.round(value / 36000) / 100;
  return {
    recorded: hours(recordedMs),
    approved: hours(approvedMs),
    pending: hours(pendingMs),
    revision: hours(revisionMs),
    unreported: hours(recordedMs - approvedMs - pendingMs - revisionMs),
    remaining: Math.max(
      0,
      Math.round((required - hours(recordedMs)) * 100) / 100,
    ),
  };
}
