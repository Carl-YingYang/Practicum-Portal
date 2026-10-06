"use client";
import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { flushChanges } from "@/client/portal-client";
import { formatDate, formatTime } from "@/lib/selectors";
import { SectionCard } from "./section-card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function localDateTime(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 19);
}

/** Students propose a clock-out; only their assigned supervisor can apply it. */
export function AttendanceCorrections({
  userId,
  review = false,
}: {
  userId: string;
  review?: boolean;
}) {
  const allLogs = useAppStore((s) => s.timeLogs);
  const requestCorrection = useAppStore((s) => s.requestTimeCorrection);
  const reviewCorrection = useAppStore((s) => s.reviewTimeCorrection);
  const logs = React.useMemo(
    () =>
      allLogs
        .filter((t) => t.userId === userId && t.role === "student")
        .sort((a, b) => b.clockInAt.localeCompare(a.clockInAt)),
    [allLogs, userId],
  );
  const [logId, setLogId] = React.useState("");
  const selected = logs.find((t) => t.id === logId) ?? logs[0];
  const [endDraft, setEndDraft] = React.useState({ logId: "", value: "" });
  const end =
    endDraft.logId === selected?.id
      ? endDraft.value
      : selected
        ? localDateTime(selected.clockOutAt ?? new Date().toISOString())
        : "";
  const [reason, setReason] = React.useState("");
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const locked = React.useRef(false);
  const id = React.useId();
  const requests = logs
    .flatMap((log) =>
      (log.corrections ?? []).map((correction) => ({ log, correction })),
    )
    .sort(
      (a, b) =>
        Number(b.correction.status === "pending") -
          Number(a.correction.status === "pending") ||
        b.correction.requestedAt.localeCompare(a.correction.requestedAt),
    );
  async function save(action: () => void, message: string) {
    if (locked.current) return;
    locked.current = true;
    setSaving(true);
    setError("");
    try {
      action();
      await flushChanges();
      toast.success(message);
      setReason("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The request could not be saved.",
      );
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  if (!logs.length || (review && !requests.length)) return null;
  return (
    <SectionCard
      className="mb-4 mt-4"
      title={review ? "Clock-out correction review" : "Clock-out corrections"}
      description={
        review
          ? "Check the requested time and reason before approving. The original record remains in the request history."
          : "Forgot to clock out? Propose the actual end time for your supervisor to review. A pending request does not stop the timer or change credited hours."
      }
    >
      {!review && selected && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (selected && end)
              void save(
                () =>
                  requestCorrection(
                    selected.id,
                    new Date(end).toISOString(),
                    reason,
                  ),
                "Correction request saved",
              );
          }}
          className="space-y-3"
        >
          <fieldset disabled={saving} className="min-w-0 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-session`}>Session</Label>
              <select
                id={`${id}-session`}
                value={selected.id}
                onChange={(event) => setLogId(event.target.value)}
                className="h-11 w-full min-w-0 max-w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {logs.map((log) => (
                  <option key={log.id} value={log.id}>
                    {formatDate(log.clockInAt)} · {formatTime(log.clockInAt)}
                    {log.clockOutAt ? "" : " · Active"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-end`}>Actual clock-out time</Label>
              <Input
                id={`${id}-end`}
                type="datetime-local"
                step="1"
                value={end}
                onChange={(event) =>
                  setEndDraft({ logId: selected.id, value: event.target.value })
                }
                required
                className="min-w-0 w-full"
              />
              <p className="text-xs text-muted-foreground">
                Enter the time in your device's local timezone.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-reason`}>Reason for correction</Label>
              <Textarea
                id={`${id}-reason`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={5}
                maxLength={1000}
                required
                placeholder="Explain when your work ended and why the recorded time needs correction."
              />
            </div>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={selected.corrections?.some(
                (c) => c.status === "pending",
              )}
            >
              {saving
                ? "Saving request…"
                : selected.corrections?.some((c) => c.status === "pending")
                  ? "Awaiting supervisor review"
                  : "Request correction"}
            </Button>
          </fieldset>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 break-words text-sm text-destructive">
          {error}
        </p>
      )}
      {requests.length > 0 && (
        <ul className="mt-4 space-y-3">
          {requests.map(({ log, correction }) => (
            <li
              key={correction.id}
              className="min-w-0 rounded-lg border border-border p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {formatDate(log.clockInAt)} · {formatTime(log.clockInAt)}
                </p>
                <span className="rounded-md bg-muted px-2 py-1 text-xs capitalize">
                  {correction.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Original end:{" "}
                {correction.originalClockOutAt
                  ? `${formatDate(correction.originalClockOutAt)} ${formatTime(correction.originalClockOutAt)}`
                  : "Still running at request time"}
              </p>
              <p className="mt-1 text-sm">
                Requested end: {formatDate(correction.requestedClockOutAt)} ·{" "}
                {formatTime(correction.requestedClockOutAt)}
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                {correction.reason}
              </p>
              {correction.reviewNote && (
                <p className="mt-2 break-words text-sm">
                  Review note: {correction.reviewNote}
                </p>
              )}
              {review && correction.status === "pending" && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor={`${id}-${correction.id}`}>
                    Review note (required when rejecting)
                  </Label>
                  <Textarea
                    id={`${id}-${correction.id}`}
                    value={notes[correction.id] ?? ""}
                    maxLength={1000}
                    disabled={saving}
                    onChange={(event) =>
                      setNotes({
                        ...notes,
                        [correction.id]: event.target.value,
                      })
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={saving}
                      onClick={() =>
                        void save(
                          () =>
                            reviewCorrection(
                              log.id,
                              correction.id,
                              "approved",
                              notes[correction.id] ?? "",
                            ),
                          "Correction approved",
                        )
                      }
                    >
                      Approve correction
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving || !notes[correction.id]?.trim()}
                      onClick={() =>
                        void save(
                          () =>
                            reviewCorrection(
                              log.id,
                              correction.id,
                              "rejected",
                              notes[correction.id],
                            ),
                          "Correction rejected",
                        )
                      }
                    >
                      Reject correction
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
