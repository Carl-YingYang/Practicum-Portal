"use client";
import * as React from "react";
import { PageHeader } from "@/components/portal/layout/page-header";
import { ActionBar } from "@/components/portal/shared/action-bar";
import { ConfirmDialog } from "@/components/portal/shared/confirm-dialog";
import { JournalEditor } from "@/components/portal/shared/journal-editor";
import { JournalStatusBadge } from "@/components/portal/shared/badges";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAppStore } from "@/store/use-app-store";
import { flushChanges } from "@/client/portal-client";
import {
  cadenceLabels,
  journalHours,
  nextJournalDate,
} from "@/domain/journal-period";
import {
  getJournal,
  getStudent,
  journalsForStudent,
  todayISODate,
  weekLabel,
  formatDate,
  getCompany,
  getSupervisor,
} from "@/lib/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertCircle, FilePlus2, List, Save, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Journal } from "@/lib/types";
/** Attendance-derived periods, real server saves, and a compact writing surface. */
export function JournalForm() {
  const state = useAppStore();
  const student = getStudent(state.students, state.currentUser?.studentId);
  const existing = getJournal(state.journals, state.viewParams.journalId);
  const cadence =
    existing?.cadence ?? state.schoolIdentity.journalCadence ?? "weekly";
  const today = todayISODate();
  const draftId = React.useRef(existing?.id);
  const [activeId, setActiveId] = React.useState(existing?.id);
  const [form, setForm] = React.useState(() => ({
    date:
      existing?.date ??
      nextJournalDate(
        state.timeLogs,
        state.journals,
        student?.id ?? "",
        today,
        cadence,
      ),
    tasks: existing?.tasks ?? "",
    learnings: existing?.learnings ?? "",
  }));
  const [confirm, setConfirm] = React.useState(false),
    [railOpen, setRailOpen] = React.useState(false),
    [busy, setBusy] = React.useState(false);
  const [edited, setEdited] = React.useState(false),
    [error, setError] = React.useState("");
  const context = journalHours(
    state.timeLogs,
    student?.id ?? "",
    form.date || today,
    cadence,
  );
  const payload = { ...form, hours: context.hours };
  const save = React.useCallback(async () => {
    if (!student || !form.date) return;
    if (draftId.current)
      state.updateJournalDraft(draftId.current, {
        ...form,
        hours: context.hours,
      });
    else {
      const id = state.createJournal({
        studentId: student.id,
        ...form,
        hours: context.hours,
        submit: false,
      });
      draftId.current = id;
      setActiveId(id);
    }
    await flushChanges();
  }, [
    student,
    form,
    context.hours,
    state.updateJournalDraft,
    state.createJournal,
  ]);
  React.useEffect(() => {
    if (!edited) return;
    const timer = setTimeout(() => {
      void save()
        .then(() => {
          setEdited(false);
          setError("");
        })
        .catch((error) =>
          setError(
            error instanceof Error
              ? error.message
              : "Draft could not be saved.",
          ),
        );
    }, 750);
    return () => clearTimeout(timer);
  }, [edited, save]);
  React.useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (edited) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [edited]);
  if (!student) return null;
  const myJournals = journalsForStudent(state.journals, student.id).sort(
    (a, b) => b.date.localeCompare(a.date),
  );
  const company = getCompany(state.companies, student.companyId),
    supervisor = getSupervisor(state.supervisors, student.supervisorId);
  function update(patch: Partial<typeof form>) {
    setForm((value) => ({ ...value, ...patch }));
    setEdited(true);
    setError("");
  }
  async function saveAndNotify() {
    setBusy(true);
    try {
      await save();
      setEdited(false);
      setError("");
      toast.success("Draft saved to server");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Please try saving again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    setBusy(true);
    setConfirm(false);
    try {
      await save();
      state.submitJournal(draftId.current!);
      await flushChanges();
      setEdited(false);
      toast.success("Journal submitted for review");
      state.navigate("student.journals");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  }
  async function select(journal: Journal) {
    if (edited) {
      try {
        await save();
      } catch {
        return;
      }
    }
    state.navigate(
      ["draft", "rejected"].includes(journal.status)
        ? "student.journal-new"
        : "student.journal-view",
      { journalId: journal.id },
    );
  }
  async function startNew() {
    if (edited) {
      try {
        await save();
      } catch {
        return;
      }
    }
    draftId.current = undefined;
    setActiveId(undefined);
    setForm({
      date: nextJournalDate(
        state.timeLogs,
        state.journals,
        student!.id,
        today,
        cadence,
      ),
      tasks: "",
      learnings: "",
    });
    setEdited(false);
    setRailOpen(false);
    if (state.viewParams.journalId) state.navigate("student.journal-new");
  }
  async function download() {
    const { exportJournalToDocx } = await import("@/lib/docx-export");
    await exportJournalToDocx({
      cadenceLabel: cadenceLabels[cadence],
      studentName: student!.name,
      studentNumber: student!.studentNumber,
      course: student!.course,
      companyName: company?.name ?? "",
      supervisorName: supervisor?.name ?? "",
      weekLabel: `${formatDate(context.start)} – ${formatDate(context.end)}`,
      dateLabel: formatDate(form.date),
      tasks: form.tasks,
      learnings: form.learnings,
      status: existing?.status,
      schoolName: state.schoolIdentity.name,
    });
  }
  const saveState =
    error || state.syncStatus === "error"
      ? "error"
      : edited || state.syncStatus === "saving"
        ? "saving"
        : activeId
          ? "saved"
          : "idle";
  return (
    <>
      <PageHeader
        breadcrumb="Journals"
        title={existing ? "Edit Journal" : "Drafting Room"}
        description="Write your entry. Attendance and account details are filled in for you."
        showBack
        actions={
          <Button
            variant="outline"
            className="lg:hidden"
            onClick={() => setRailOpen(true)}
          >
            <List className="size-4" />
            My Journals
          </Button>
        }
      />
      <div className="flex items-start gap-4">
        <aside className="hidden w-56 shrink-0 lg:block">
          <JournalListRail
            journals={myJournals}
            activeId={activeId}
            onSelect={(journal) => void select(journal)}
            onNew={() => void startNew()}
          />
        </aside>
        <div className="grid min-w-0 flex-1 gap-3">
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <div>
                <strong>{student.name}</strong>
                <p className="mt-1 text-xs text-muted-foreground">
                  {student.studentNumber} · {student.course}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {company?.name ?? "Company pending"}
                <p className="mt-1">
                  Supervisor: {supervisor?.name ?? "Unassigned"}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="jrnl-date">Period date</Label>
                <Input
                  className="mt-1.5 min-h-11"
                  id="jrnl-date"
                  type="date"
                  value={form.date}
                  max={today}
                  onChange={(event) => update({ date: event.target.value })}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {cadenceLabels[cadence]} · {formatDate(context.start)} –{" "}
                  {formatDate(context.end)}
                </p>
              </div>
              <div>
                <Label htmlFor="jrnl-hours">Rendered hours</Label>
                <Input
                  className="mt-1.5 min-h-11"
                  id="jrnl-hours"
                  readOnly
                  value={context.hours}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Completed attendance in this period
                </p>
              </div>
              <div className="col-span-2 rounded-lg bg-primary/5 p-3 sm:col-span-1">
                <p className="text-xs text-muted-foreground">
                  Cumulative through this period
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {context.cumulativeHours}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {student.requiredHours}h
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Running clocks count after clock-out.
                </p>
              </div>
            </div>
            {context.hours === 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                No completed attendance for this period yet. Save a draft or
                choose a period with attendance.
              </p>
            )}
            {existing?.status === "rejected" && (
              <p className="mt-3 text-sm text-destructive">
                Revision requested: {existing.rejectionReason}
              </p>
            )}
          </section>
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <JournalEditor
            title={`${cadenceLabels[cadence]} Journal`}
            subtitle={`${formatDate(context.start)} – ${formatDate(context.end)} · ${payload.hours}h rendered`}
            docUrl={
              existing?.docUrl ||
              state.toolsConfig.journalTemplateUrl ||
              undefined
            }
            tasks={form.tasks}
            learnings={form.learnings}
            onChangeTasks={(tasks) => update({ tasks })}
            onChangeLearnings={(learnings) => update({ learnings })}
            saveState={saveState}
            onDownloadWord={download}
          />
        </div>
      </div>
      <ActionBar className="static lg:sticky">
        <Button
          variant="ghost"
          disabled={busy}
          onClick={async () => {
            if (edited) {
              try {
                await save();
              } catch {
                return;
              }
            }
            state.navigate("student.journals");
          }}
        >
          Back to journals
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void saveAndNotify()}
        >
          <Save className="size-4" />
          Save Draft
        </Button>
        <Button
          disabled={busy || !form.date || context.hours <= 0}
          onClick={() => {
            if (!form.tasks.trim() || !form.learnings.trim()) {
              setError(
                "Complete Tasks Performed and Learnings & Reflections before submitting.",
              );
              return;
            }
            setConfirm(true);
          }}
        >
          <Send className="size-4" />
          Submit for Approval
        </Button>
      </ActionBar>
      <Sheet open={railOpen} onOpenChange={setRailOpen}>
        <SheetContent side="left" className="overflow-y-auto px-4">
          <SheetHeader>
            <SheetTitle>My Journals</SheetTitle>
          </SheetHeader>
          <JournalListRail
            journals={myJournals}
            activeId={activeId}
            onSelect={(journal) => void select(journal)}
            onNew={() => void startNew()}
          />
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Submit journal for approval?"
        description="Your supervisor will review this entry. Submitted journals are locked until a revision is requested."
        confirmLabel="Submit for approval"
        onConfirm={() => void submit()}
      />
    </>
  );
}
function JournalListRail({
  journals,
  activeId,
  onSelect,
  onNew,
}: {
  journals: Journal[];
  activeId?: string;
  onSelect: (j: Journal) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <Button onClick={onNew} className="h-10 w-full justify-start">
        <FilePlus2 className="h-4 w-4" /> New Journal
      </Button>
      <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        My Journals · {journals.length}
      </div>
      <div className="max-h-[65vh] flex-1 space-y-1.5 overflow-y-auto pr-1 scroll-area-custom">
        {journals.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No journals yet. Click “New Journal” to start.
          </p>
        ) : (
          journals.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => onSelect(j)}
              className={cn(
                "w-full rounded-lg border p-2.5 text-left transition-colors",
                activeId === j.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-border/80 hover:bg-muted/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {weekLabel(j.date)}
                </span>
                <JournalStatusBadge status={j.status} />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatDate(j.date)} · {j.hours}h
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground/80">
                {j.tasks || "Empty draft"}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
export default JournalForm;
