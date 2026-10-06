import type { ReportContent, ReportAssetInfo } from "./model";
import type { PortalData } from "@/domain/portal/snapshot";
import { accountUsers } from "@/lib/prototype";
import { journalPeriod } from "@/domain/journal-period";
export function reportChecks(
  content: ReportContent,
  data: PortalData,
  assets: Pick<ReportAssetInfo, "kind" | "sectionId" | "mime">[],
) {
  const issues: string[] = [];
  for (const s of content.sections.filter((s) => s.included)) {
    const prefix = s.studentId
      ? `${data.students.find((st) => st.id === s.studentId)?.name ?? "Student"} — `
      : "";
    if (s.kind === "narrative" && !s.body.trim())
      issues.push(`${prefix}${s.title}: add content.`);
    if (
      s.kind === "evidence" &&
      !assets.some((a) => a.kind === "evidence" && a.sectionId === s.id)
    )
      issues.push(`${prefix}${s.title}: upload evidence.`);
    if (s.status !== "reviewed")
      issues.push(
        `${prefix}${s.title}: ${s.status === "ready" ? "awaiting review" : "not reviewed"}.`,
      );
    if (s.kind === "journals") {
      const journals = data.journals.filter((j) => j.studentId === s.studentId);
      if (!journals.length)
        issues.push(`${prefix}${s.title}: no journal entries.`);
      const periods = new Set<string>();
      for (const j of journals) {
        const p = journalPeriod(j.date, j.cadence ?? "weekly");
        const key = p.start + "/" + p.end;
        if (periods.has(key))
          issues.push(`${prefix}Duplicate journal period ${key}.`);
        periods.add(key);
      }
      if (journals.some((j) => j.status !== "approved"))
        issues.push(`${prefix}Some journals are drafts or awaiting approval.`);
    }
    if (s.kind === "forms") {
      const user = accountUsers(data).find((u) => u.studentId === s.studentId);
      if (
        !data.formSubmissions.some(
          (f) =>
            f.status === "approved" &&
            (f.targetStudentId === s.studentId || f.userId === user?.id),
        ) &&
        !data.evaluations.some(
          (e) => e.studentId === s.studentId && e.status === "submitted",
        )
      )
        issues.push(
          `${prefix}${s.title}: no approved form response or submitted evaluation.`,
        );
    }
    if (
      s.kind === "attendance" &&
      data.timeLogs.some((t) => t.userId === s.studentId && !t.clockOutAt)
    )
      issues.push(
        `${prefix}Running attendance is excluded from completed hours.`,
      );
  }
  for (const s of content.sections.filter((s) => s.required && !s.included))
    issues.push(`${s.title}: required section excluded.`);

  return [...new Set(issues)];
}
/** Exact completed minutes; overlapping intervals count once. */
export function attendanceMinutes(
  data: PortalData,
  studentId: string,
  endMs = Infinity,
) {
  const ranges = data.timeLogs
    .filter(
      (t) => t.role === "student" && t.userId === studentId && t.clockOutAt,
    )
    .map((t) => [
      Date.parse(t.clockInAt),
      Math.min(Date.parse(t.clockOutAt!), endMs),
    ])
    .filter(([a, b]) => Number.isFinite(a) && b > a)
    .sort((a, b) => a[0] - b[0]);
  let total = 0,
    start = 0,
    end = 0;
  for (const [a, b] of ranges) {
    if (a <= end) {
      end = Math.max(end, b);
    } else {
      total += Math.max(0, end - start);
      start = a;
      end = b;
    }
  }
  return Math.floor((total + Math.max(0, end - start)) / 60000);
}
export function durationLabel(minutes: number) {
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
