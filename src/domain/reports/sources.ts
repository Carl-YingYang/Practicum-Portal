import type { PortalData } from "@/domain/portal/snapshot";
import type { TemplateBinding } from "@/domain/templates/model";
import type { ReportContent } from "./model";
import { journalPeriod } from "@/domain/journal-period";

/** Legacy independent drafts retain their original scope. New official reports
 * read only their assigned responses and placement window. No records mutate. */
export function reportSources(
  content: ReportContent,
  data: PortalData,
  binding?: TemplateBinding,
  sectionKey?: string,
): PortalData {
  if (!binding?.contextual) return data;
  const start = content.settings.start
    ? Date.parse(content.settings.start + "T00:00:00+08:00")
    : -Infinity;
  const end = content.settings.end
    ? Date.parse(content.settings.end + "T00:00:00+08:00") + 86400000
    : Infinity;
  const assignmentIds = new Set(
    Object.entries(binding.assignments ?? {})
      .filter(([key]) => !sectionKey || key === sectionKey)
      .flatMap(([, map]) => Object.values(map)),
  );
  return {
    ...data,
    formSubmissions: data.formSubmissions.filter(
      (s) => !!s.assignmentId && assignmentIds.has(s.assignmentId),
    ),
    // Native evaluations have no report assignment ID; explicit linked forms
    // are the official evaluation source for a contextual format.
    evaluations: [],
    journals: data.journals.filter((j) => {
      const p = journalPeriod(j.date, j.cadence ?? "weekly");
      return (
        Date.parse(p.start + "T00:00:00+08:00") < end &&
        Date.parse(p.end + "T00:00:00+08:00") + 86400000 > start
      );
    }),
    timeLogs: data.timeLogs
      .filter(
        (t) =>
          Date.parse(t.clockInAt) < end &&
          (!t.clockOutAt || Date.parse(t.clockOutAt) > start),
      )
      .map((t) => ({
        ...t,
        clockInAt: new Date(
          Math.max(Date.parse(t.clockInAt), start),
        ).toISOString(),
        clockOutAt: t.clockOutAt
          ? new Date(Math.min(Date.parse(t.clockOutAt), end)).toISOString()
          : t.clockOutAt,
      })),
  };
}
