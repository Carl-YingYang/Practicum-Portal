import type { FormSubmissionStatus } from "@/lib/types";
export function formTaskPhase(status: FormSubmissionStatus) {
  if (status === "approved") return "completed";
  if (status === "submitted" || status === "under_review") return "review";
  return "pending";
}
export function formTaskTone(status: FormSubmissionStatus) {
  const phase = formTaskPhase(status);
  return phase === "completed"
    ? "border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/15"
    : phase === "review"
      ? "border-sky-200/70 bg-sky-50/40 dark:border-sky-900/60 dark:bg-sky-950/15"
      : "border-amber-200/70 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/15";
}
