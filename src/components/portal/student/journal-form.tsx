"use client";

import * as React from "react";
import { PageHeader } from "@/components/portal/layout/page-header";
import { ActionBar } from "@/components/portal/shared/action-bar";
import { ConfirmDialog } from "@/components/portal/shared/confirm-dialog";
import { GoogleDocEditor } from "@/components/portal/shared/google-doc-editor";
import { JournalStatusBadge } from "@/components/portal/shared/badges";
import { useAppStore } from "@/store/use-app-store";
import {
  getJournal,
  getStudent,
  journalsForStudent,
  todayISODate,
  weekLabel,
  formatDate,
} from "@/lib/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AlertCircle,
  Clock,
  FilePlus2,
  List,
  Save,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Journal } from "@/lib/types";

interface FormState {
  date: string;
  hours: string;
  tasks: string;
  learnings: string;
}

interface FormErrors {
  date?: string;
  hours?: string;
  tasks?: string;
  learnings?: string;
}

/**
 * JournalForm — the "Drafting Room".
 *
 * Mirrors the law-office pattern the user referenced: a left rail listing the
 * student's journals (drafts + submitted) and a right pane that is an embedded
 * Google-Docs-style editor where the week's journal is written in place. The
 * portal owns the meta (date, hours, status) and delegates the writing surface
 * to the Docs-like editor, with an "Open original in Google Docs" link keeping
 * the delegation honest.
 */
export function JournalForm() {
  const currentUser = useAppStore((s) => s.currentUser);
  const students = useAppStore((s) => s.students);
  const journals = useAppStore((s) => s.journals);
  const toolsConfig = useAppStore((s) => s.toolsConfig);
  const viewParams = useAppStore((s) => s.viewParams);
  const navigate = useAppStore((s) => s.navigate);
  const back = useAppStore((s) => s.back);
  const canGoBack = useAppStore((s) => s.history.length > 0);
  const createJournal = useAppStore((s) => s.createJournal);
  const updateJournalDraft = useAppStore((s) => s.updateJournalDraft);
  const submitJournal = useAppStore((s) => s.submitJournal);

  const student = getStudent(students, currentUser?.studentId);
  const editingId = viewParams.journalId;
  const existingJournal = getJournal(journals, editingId);

  const [draftId, setDraftId] = React.useState<string | undefined>(editingId);
  const [form, setForm] = React.useState<FormState>({
    date: todayISODate(),
    hours: "40",
    tasks: "",
    learnings: "",
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [redirected, setRedirected] = React.useState(false);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved">("idle");
  const [railOpen, setRailOpen] = React.useState(false);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // If editing an existing journal, prefill from it (only drafts are editable).
  React.useEffect(() => {
    if (editingId && existingJournal) {
      if (existingJournal.status !== "draft") {
        if (!redirected) {
          setRedirected(true);
          navigate("student.journal-view", { journalId: editingId });
        }
        return;
      }
      setForm({
        date: existingJournal.date,
        hours: String(existingJournal.hours),
        tasks: existingJournal.tasks,
        learnings: existingJournal.learnings,
      });
    }
  }, [editingId, existingJournal, navigate, redirected]);

  // Debounced autosave indicator whenever the body changes (draft only).
  const flashSaving = () => {
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveState("saved"), 700);
  };

  React.useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  if (!student) {
    return null;
  }

  const today = todayISODate();
  const hoursNum = Number(form.hours) || 0;

  const myJournals = journalsForStudent(journals, student.id).sort(
    (a, b) => (a.date < b.date ? 1 : -1),
  );

  const update = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch) as (keyof FormState)[]) {
        delete next[k];
      }
      return next;
    });
    // Only flash autosave for body fields, not date/hours.
    if ("tasks" in patch || "learnings" in patch) {
      flashSaving();
    }
  };

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.date) e.date = "Date is required.";
    if (!form.hours || hoursNum <= 0)
      e.hours = "Hours must be greater than 0.";
    if (!form.tasks.trim()) e.tasks = "Please describe the tasks you performed.";
    if (!form.learnings.trim())
      e.learnings = "Please share what you learned this week.";
    return e;
  };

  const persistDraft = (opts: { silent?: boolean } = {}) => {
    const payload = {
      date: form.date || todayISODate(),
      hours: hoursNum,
      tasks: form.tasks,
      learnings: form.learnings,
    };
    if (draftId) {
      updateJournalDraft(draftId, payload);
    } else {
      const newId = createJournal({
        studentId: student.id,
        ...payload,
        submit: false,
      });
      setDraftId(newId);
    }
    if (!opts.silent) {
      setSaveState("saved");
    }
  };

  const handleSaveDraft = () => {
    persistDraft();
    toast.success("Draft saved", {
      description: "Synced to Google Drive.",
    });
  };

  const handleSubmitClick = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please complete all required fields before submitting.");
      return;
    }
    setSubmitOpen(true);
  };

  const handleSubmitConfirm = () => {
    setSubmitOpen(false);
    const payload = {
      date: form.date,
      hours: hoursNum,
      tasks: form.tasks.trim(),
      learnings: form.learnings.trim(),
    };
    if (draftId) {
      updateJournalDraft(draftId, payload);
      submitJournal(draftId);
    } else {
      createJournal({
        studentId: student.id,
        ...payload,
        submit: true,
      });
    }
    toast.success("Journal submitted for approval", {
      description: "Your supervisor will review it shortly.",
    });
    navigate("student.journals");
  };

  const handleCancel = () => {
    if (canGoBack) back();
    else navigate("student.journals");
  };

  const handleSelectJournal = (j: Journal) => {
    if (j.status === "draft") {
      navigate("student.journal-new", { journalId: j.id });
    } else {
      navigate("student.journal-view", { journalId: j.id });
    }
    setRailOpen(false);
  };

  const handleNewJournal = () => {
    navigate("student.journal-new");
    setRailOpen(false);
  };

  const weekStr = weekLabel(form.date);
  const docTitle = `Weekly Journal · ${weekStr}`;
  const docSubtitle = `${formatDate(form.date)} · ${hoursNum}h planned`;
  const connectedDocUrl =
    existingJournal?.docUrl || toolsConfig.journalTemplateUrl || undefined;

  return (
    <>
      <PageHeader
        breadcrumb="Journals"
        title={editingId ? "Edit Journal" : "Drafting Room"}
        description="Write your weekly journal in the embedded editor. Changes sync to Google Drive."
        showBack
        actions={
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setRailOpen(true)}
          >
            <List className="h-4 w-4" /> My Journals
          </Button>
        }
      />

      {/* Split layout: left rail + right editor */}
      <div className="flex gap-4">
        {/* LEFT RAIL — journal list (desktop) */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <JournalListRail
            journals={myJournals}
            activeId={draftId}
            onSelect={handleSelectJournal}
            onNew={handleNewJournal}
          />
        </aside>

        {/* RIGHT — meta bar + embedded editor */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Meta bar */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="jrnl-date" className="text-sm font-medium">
                  Week date
                </Label>
                <Input
                  id="jrnl-date"
                  type="date"
                  value={form.date}
                  max={today}
                  onChange={(e) => update({ date: e.target.value })}
                  className={cn("h-11", errors.date && "border-destructive")}
                  aria-invalid={!!errors.date}
                />
                {errors.date ? (
                  <p className="text-xs text-destructive">{errors.date}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{weekStr}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jrnl-hours" className="text-sm font-medium">
                  Hours
                </Label>
                <Input
                  id="jrnl-hours"
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.hours}
                  onChange={(e) => update({ hours: e.target.value })}
                  className={cn("h-11", errors.hours && "border-destructive")}
                  aria-invalid={!!errors.hours}
                />
                {errors.hours ? (
                  <p className="text-xs text-destructive">{errors.hours}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    <Clock className="mr-1 inline h-3 w-3" />
                    {hoursNum}h planned for this entry
                  </p>
                )}
              </div>
            </div>
            {(errors.tasks || errors.learnings) && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Please complete the {errors.tasks && "Tasks"}
                  {errors.tasks && errors.learnings && " and "}
                  {errors.learnings && "Learnings"} sections in the editor below.
                </span>
              </div>
            )}
          </div>

          {/* Embedded Google Docs editor */}
          <GoogleDocEditor
            title={docTitle}
            subtitle={docSubtitle}
            docUrl={connectedDocUrl}
            tasks={form.tasks}
            learnings={form.learnings}
            onChangeTasks={(v) => update({ tasks: v })}
            onChangeLearnings={(v) => update({ learnings: v })}
            saveState={saveState}
            className="min-h-[560px]"
          />
        </div>
      </div>

      <ActionBar>
        <Button variant="ghost" onClick={handleCancel} className="sm:mr-auto">
          Cancel
        </Button>
        <Button variant="outline" onClick={handleSaveDraft}>
          <Save className="h-4 w-4" /> Save Draft
        </Button>
        <Button onClick={handleSubmitClick}>
          <Send className="h-4 w-4" /> Submit for Approval
        </Button>
      </ActionBar>

      {/* Mobile journal-list drawer */}
      {railOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setRailOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-card p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">My Journals</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setRailOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <JournalListRail
              journals={myJournals}
              activeId={draftId}
              onSelect={handleSelectJournal}
              onNew={handleNewJournal}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        title="Submit journal for approval?"
        description={
          <div className="space-y-2">
            <p>
              Once submitted, you can&apos;t edit this journal until your
              supervisor reviews it.
            </p>
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Make sure your tasks and learnings are complete and accurate.
              </span>
            </div>
          </div>
        }
        confirmLabel="Submit for approval"
        onConfirm={handleSubmitConfirm}
      />
    </>
  );
}

// ── Journal list rail ────────────────────────────────────────────────────

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
      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
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
                  ? "border-teal-300 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/30"
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
