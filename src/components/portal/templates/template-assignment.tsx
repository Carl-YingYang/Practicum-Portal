"use client";
import { useState } from "react";
import { useAppStore } from "@/store/use-app-store";
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
}: {
  record: TemplateRecord;
  beforeAssign: () => Promise<void>;
  onUpdated: (next: TemplateRecord) => void;
}) {
  const state = useAppStore();
  const [version, setVersion] = useState(record.versions[0]?.id ?? ""),
    [selected, setSelected] = useState<string[]>([]),
    [search, setSearch] = useState(""),
    [group, setGroup] = useState("all"),
    [due, setDue] = useState(""),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [message, setMessage] = useState("");
  const eligible = state.students.filter(
    (s) =>
      s.status === "active" &&
      s.accountStatus !== "disabled" &&
      !s.mustChangePassword,
  );
  const cohort = (s: (typeof eligible)[number]) =>
    [s.course, s.section || "No section", s.schoolYear || "No batch"].join(
      " · ",
    );
  const visible = eligible.filter(
    (s) =>
      (group === "all" || cohort(s) === group) &&
      `${s.name} ${s.studentNumber}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const currentVersion =
    record.versions.find((v) => v.id === version) ??
    (!version ? record.versions[0] : undefined);
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
      <h2 className="font-semibold">Assign a published version</h2>
      <p className="text-sm text-muted-foreground">
        Publication makes the format available. Assignment creates an official
        report and sends its linked requirements to each recipient.
      </p>
      {!record.versions.length && (
        <p role="status" className="rounded-lg bg-muted p-3 text-sm">
          Complete the format checks and publish first. Student selection is
          available afterwards.
        </p>
      )}
      <fieldset
        disabled={busy || record.archived || !record.versions.length}
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
              setGroup(e.target.value);
              setSelected([]);
            }}
          >
            <option value="all">All eligible students in this school</option>
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
                ...new Set([...selected, ...visible.map((s) => s.id)]),
              ])
            }
          >
            Select all visible ({visible.length})
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
          disabled={!currentVersion || !selected.length}
          onClick={() => setConfirm(true)}
        >
          Review {selected.length || ""} recipients
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
        description={`${record.content.title} · v${currentVersion?.number ?? "?"} · ${selected.length} student(s) · ${due ? `Due ${due}` : "No due date"}. Existing assignments for this version are reopened without duplicates. Submitted answers are not replaced.`}
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
