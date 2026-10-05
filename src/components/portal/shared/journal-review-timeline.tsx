import type { Journal } from "@/lib/types";
import { formatDateTime } from "@/lib/selectors";
/** Only known timestamps are displayed; a revision cycle retains its latest feedback. */
export function JournalReviewTimeline({ journal }: { journal: Journal }) {
  const entries = [
    { label: "Draft created", at: journal.createdAt },
    ...(journal.submittedAt
      ? [{ label: "Submitted for review", at: journal.submittedAt }]
      : []),
    ...(journal.reviewedAt
      ? [
          {
            label:
              journal.status === "approved" ? "Approved" : "Revision feedback",
            at: journal.reviewedAt,
          },
        ]
      : []),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <section
      aria-label="Journal review history"
      className="rounded-xl border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold">Review history</h2>
      <ol className="mt-3 grid gap-3 sm:grid-cols-3">
        {entries.map((entry) => (
          <li key={entry.label} className="border-l-2 border-primary/40 pl-3">
            <p className="text-xs font-medium">{entry.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(entry.at)}
            </p>
          </li>
        ))}
      </ol>
      {journal.rejectionReason && (
        <p className="mt-3 text-sm leading-6">
          <strong>Supervisor feedback:</strong> {journal.rejectionReason}
        </p>
      )}
    </section>
  );
}
