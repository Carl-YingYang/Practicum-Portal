"use client";
import { journalProgress } from "@/domain/journal-progress";
import { useAppStore } from "@/store/use-app-store";
export function JournalHoursSummary() {
  const state = useAppStore();
  const student = state.students.find(
    (s) => s.id === state.currentUser?.studentId,
  );
  if (!student) return null;
  const summary = journalProgress(
    state.timeLogs,
    state.journals,
    student.id,
    student.requiredHours,
    state.schoolIdentity.journalCadence,
  );
  return (
    <section
      aria-label="Hours breakdown"
      className="mb-4 rounded-xl border border-border bg-card p-4"
    >
      <dl className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Recorded attendance", summary.recorded],
          ["Approved coverage", summary.approved],
          ["Pending review", summary.pending],
          ["Needs revision", summary.revision],
          ["Without submitted journal", summary.unreported],
          ["Remaining attendance", summary.remaining],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs leading-5 text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {value}h
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Progress uses completed attendance. Journal review tracks coverage of
        those hours; approval never adds them again.
      </p>
    </section>
  );
}
