"use client";
import { useEffect, useRef, useState } from "react";
import type { TemplateRecipients } from "@/domain/templates/recipients";
import { refreshPortal } from "@/client/portal-client";
import { reportRequest } from "@/client/reports";
import type { TemplateRecord } from "@/domain/templates/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "../shared/confirm-dialog";
export function TemplateAssignment({
  record,
  beforeAssign,
  onUpdated,
  onPublish,
}: {
  record: TemplateRecord;
  beforeAssign: () => Promise<void>;
  onUpdated: (next: TemplateRecord) => void;
  onPublish: () => void;
}) {
  const selectionScope = useRef<string | null>(null);
  const cohortScope = useRef("all");
  const [roster, setRoster] = useState<TemplateRecipients | null>(null);
  const [rosterError, setRosterError] = useState("");
  const [rosterRefresh, setRosterRefresh] = useState(0);
  const [resolvedQuery, setResolvedQuery] = useState("");
  const [version, setVersion] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [search, setSearch] = useState(""),
    [group, setGroup] = useState("all"),
    [due, setDue] = useState(""),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [message, setMessage] = useState("");
  const currentVersion =
    record.versions.find((v) => v.id === version) ??
    (!version ? record.versions[0] : undefined);
  const versionId = currentVersion?.id;
  const query = `${record.id}:${record.revision}:${versionId ?? "draft"}:${rosterRefresh}`;
  const rosterLoading = !record.archived && resolvedQuery !== query;
  useEffect(() => {
    let alive = true;
    if (record.archived) return;
    reportRequest<TemplateRecipients>(
      `/api/templates/${record.id}?recipients=true${versionId ? `&version=${encodeURIComponent(versionId)}` : ""}`,
    )
      .then((next) => {
        if (!alive) return;
        setRosterError("");
        setRoster(next);
        const scope = `${record.id}:${versionId ?? "draft"}`;
        const sameScope = selectionScope.current === scope;
        setSelected((previous) =>
          sameScope
            ? previous.filter((id) =>
                next.students.some(
                  (s) =>
                    s.id === id &&
                    s.ready &&
                    !s.reportId &&
                    (cohortScope.current === "all" ||
                      s.cohort === cohortScope.current),
                ),
              )
            : next.students
                .filter(
                  (s) =>
                    s.ready &&
                    !s.reportId &&
                    (cohortScope.current === "all" ||
                      s.cohort === cohortScope.current),
                )
                .map((s) => s.id),
        );
        selectionScope.current = scope;
      })
      .catch((e) => {
        if (alive) {
          setRosterError((e as Error).message);
          setRoster(null);
          setSelected([]);
        }
      })
      .finally(() => {
        if (alive) setResolvedQuery(query);
      });
    return () => {
      alive = false;
    };
  }, [record.id, record.revision, record.archived, versionId, query]);
  const activeRoster = rosterLoading ? null : roster;
  const eligible = activeRoster?.students.filter((s) => s.ready) ?? [];
  const cohort = (s: TemplateRecipients["students"][number]) => s.cohort;
  const visible = (activeRoster?.students ?? []).filter(
    (s) =>
      (group === "all" || cohort(s) === group) &&
      `${s.name} ${s.studentNumber}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  async function assign() {
    if (!currentVersion)
      throw Error("Publish a checked format before assigning.");
    const recipients = selected.filter((id) =>
      eligible.some((s) => s.id === id),
    );
    if (recipients.length !== selected.length)
      throw Error(
        "A selected student's account changed. Reload and review recipients.",
      );
    setBusy(true);
    setProgress(0);
    setMessage("");
    try {
      await beforeAssign();
      const live = await reportRequest<TemplateRecipients>(
        `/api/templates/${record.id}?recipients=true&version=${encodeURIComponent(currentVersion.id)}`,
      );
      const blocked = recipients.filter(
        (id) => !live.students.some((s) => s.id === id && s.ready),
      );
      if (blocked.length)
        throw Error(
          "Some recipients are no longer ready. Refresh the roster and review them before assigning.",
        );
      for (let offset = 0; offset < recipients.length; offset += 25) {
        await reportRequest(`/api/templates/${record.id}`, "POST", {
          action: "assign",
          versionId: currentVersion.id,
          studentIds: recipients.slice(offset, offset + 25),
          dueDate: due || null,
        });
        setProgress(Math.min(recipients.length, offset + 25));
      }
      await refreshPortal();
      setRoster(
        await reportRequest<TemplateRecipients>(
          `/api/templates/${record.id}?recipients=true&version=${encodeURIComponent(currentVersion.id)}`,
        ),
      );
      onUpdated(await reportRequest(`/api/templates/${record.id}`));
      setMessage(
        `${recipients.length} official report(s) ready. Each student's linked forms also go to the assigned supervisor. Open Review & export to inspect them.`,
      );
      setSelected([]);
    } catch (e) {
      setMessage(
        "Assignment stopped. Saved batches are retained; retry safely to resume without duplicate reports.",
      );
      throw e;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      id="assign-students"
      className="min-w-0 space-y-3 rounded-xl border bg-card p-4"
    >
      <h2 className="font-semibold">Assign to active students</h2>
      <p className="text-sm text-muted-foreground">
        Active students ready to receive this format are selected by default.
        Review the list, then confirm. Student and supervisor requirements go to
        the correct accounts together.
      </p>
      {!record.versions.length && (
        <p role="status" className="rounded-lg bg-muted p-3 text-sm">
          You can review recipients now. Publish the checked draft to send these
          reports.
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={busy || record.archived || rosterLoading}
        onClick={() => setRosterRefresh((n) => n + 1)}
      >
        Refresh recipients
      </Button>
      {rosterLoading && (
        <p role="status" className="text-sm">
          Checking active accounts and report assignments…
        </p>
      )}
      {rosterError && (
        <p role="alert" className="text-sm text-destructive">
          {rosterError}
        </p>
      )}
      {activeRoster && (
        <p role="status" className="text-sm">
          {activeRoster.students.length} active ·{" "}
          {eligible.filter((s) => !s.reportId).length} ready to assign ·{" "}
          {activeRoster.students.filter((s) => !s.ready).length} need attention
          · {eligible.filter((s) => s.reportId).length} already assigned
        </p>
      )}
      <fieldset
        disabled={busy || record.archived || rosterLoading}
        className="grid min-w-0 gap-3 sm:grid-cols-2"
      >
        <label className="text-sm">
          Published version
          <select
            aria-label="Published version"
            className="mt-1 min-h-11 w-full min-w-0 rounded-md border bg-background p-2"
            value={currentVersion?.id ?? ""}
            onChange={(e) => setVersion(e.target.value)}
          >
            <option value="">Choose a version</option>
            {record.versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.number} · {v.title} · {v.assignments} assigned
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Due date (optional)
          <Input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Class / batch
          <select
            aria-label="Class / batch"
            className="mt-1 min-h-11 w-full min-w-0 rounded-md border bg-background p-2"
            value={group}
            onChange={(e) => {
              cohortScope.current = e.target.value;
              setGroup(e.target.value);
              setSelected(
                eligible
                  .filter(
                    (s) =>
                      e.target.value === "all" || cohort(s) === e.target.value,
                  )
                  .filter((s) => !s.reportId)
                  .map((s) => s.id),
              );
            }}
          >
            <option value="all">All active students in this school</option>
            {[...new Set(eligible.map(cohort))].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Find students
          <Input
            aria-label="Find students"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or student number"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <Button
            variant="outline"
            onClick={() =>
              setSelected([
                ...new Set([
                  ...selected,
                  ...visible
                    .filter((s) => s.ready && !s.reportId)
                    .map((s) => s.id),
                ]),
              ])
            }
          >
            Select ready visible (
            {visible.filter((s) => s.ready && !s.reportId).length})
          </Button>
          <Button variant="ghost" onClick={() => setSelected([])}>
            Clear selection
          </Button>
          <span className="text-sm" role="status">
            {selected.length} selected · {eligible.length} eligible
          </span>
        </div>
        <fieldset className="max-h-72 space-y-2 overflow-y-auto sm:col-span-2">
          <legend className="mb-2 text-sm">Students</legend>
          {visible.map((s) => (
            <label
              key={s.id}
              className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${selected.includes(s.id) ? "border-primary bg-primary/5" : ""}`}
            >
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0"
                disabled={!s.ready || !!s.reportId}
                checked={selected.includes(s.id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, s.id]
                      : selected.filter((id) => id !== s.id),
                  )
                }
              />
              <span className="min-w-0 break-words">
                {s.name} · {s.studentNumber}
                <small className="block text-muted-foreground">
                  {cohort(s)}
                  <span className="block">
                    {s.reason ??
                      (s.reportId
                        ? "Already assigned · existing answers retained"
                        : "Ready to receive")}
                  </span>
                </small>
              </span>
            </label>
          ))}
          {!visible.length && (
            <p className="text-sm">
              No eligible students match. Activate accounts and assign
              supervisors before sending supervisor requirements.
            </p>
          )}
        </fieldset>
        <Button
          disabled={!selected.length || !!rosterError}
          onClick={() => (currentVersion ? setConfirm(true) : onPublish())}
        >
          {currentVersion
            ? `Review ${selected.length} recipients`
            : "Check & publish first"}
        </Button>
      </fieldset>
      {busy && (
        <p role="status" className="text-sm">
          Assigning reports… {progress}/{selected.length}. Keep this page open.
          Saved batches can be resumed.
        </p>
      )}
      {message && (
        <p role="status" className="break-words text-sm">
          {message}
        </p>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Assign these official reports?"
        description={`${currentVersion?.title ?? record.content.title} · v${currentVersion?.number ?? "?"} · ${selected.length} student(s) · ${due ? `Due ${due}` : "No due date"}. Existing assignments for this version are reopened without duplicates. Submitted answers are not replaced.`}
        confirmLabel="Assign reports"
        onConfirm={assign}
      >
        <div className="max-h-48 overflow-y-auto text-sm">
          {eligible
            .filter((s) => selected.includes(s.id))
            .map((s) => (
              <p key={s.id}>
                {s.name} · {s.studentNumber}
              </p>
            ))}
        </div>
      </ConfirmDialog>
    </section>
  );
}
