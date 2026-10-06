"use client";
import { useId, useState } from "react";
import dynamic from "next/dynamic";
import { ExternalLink, FileDown, Sparkles, Undo2 } from "lucide-react";
import type { WritingSelection } from "@/components/portal/student/writing-assistant-panel";
import type { JournalField } from "@/domain/writing-assistant";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
const WritingAssistantPanel = dynamic(
  () =>
    import("@/components/portal/student/writing-assistant-panel").then(
      (module) => module.WritingAssistantPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="p-3 text-sm">
        Loading Writing Assistant…
      </p>
    ),
  },
);
export interface JournalEditorProps {
  title: string;
  subtitle?: string;
  docUrl?: string;
  tasks: string;
  learnings: string;
  onChangeTasks: (value: string) => void;
  onChangeLearnings: (value: string) => void;
  readOnly?: boolean;
  disabled?: boolean;
  saveState?: "idle" | "unsaved" | "saving" | "saved" | "error";
  className?: string;
  onDownloadWord?: () => void | Promise<void>;
}
/** Compact, accessible plain-text journal. Every displayed control works. */
export function JournalEditor({
  title,
  subtitle,
  docUrl,
  tasks,
  learnings,
  onChangeTasks,
  onChangeLearnings,
  readOnly = false,
  disabled = false,
  saveState = "idle",
  className,
  onDownloadWord,
}: JournalEditorProps) {
  const id = useId(),
    [downloading, setDownloading] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [selection, setSelection] = useState<WritingSelection>();
  const [undo, setUndo] = useState<{
    field: JournalField;
    before: string;
    after: string;
  }>();
  function applySuggestion(field: JournalField, before: string, after: string) {
    (field === "tasks" ? onChangeTasks : onChangeLearnings)(after);
    setUndo({ field, before, after });
    setSelection(undefined);
  }
  function undoSuggestion() {
    if (!undo) return;
    if ((undo.field === "tasks" ? tasks : learnings) !== undo.after) {
      toast.error(
        "Your text changed after applying the suggestion. Undo would overwrite those edits.",
      );
      return;
    }
    (undo.field === "tasks" ? onChangeTasks : onChangeLearnings)(undo.before);
    setUndo(undefined);
  }
  const words = `${tasks} ${learnings}`
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  async function download() {
    if (!onDownloadWord) return;
    setDownloading(true);
    try {
      await onDownloadWord();
    } catch {
      toast.error("Could not generate your Word document.");
    } finally {
      setDownloading(false);
    }
  }
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-border bg-card",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className="min-h-11 border-[var(--brand-accent)]"
              onClick={() => setAssistantOpen(true)}
            >
              <Sparkles className="size-4" />
              Writing Assistant
            </Button>
          )}
          {!readOnly && undo && (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11"
              onClick={undoSuggestion}
            >
              <Undo2 className="size-4" />
              Undo suggestion
            </Button>
          )}
          {docUrl && /^https?:\/\//.test(docUrl) && (
            <a
              className="inline-flex min-h-10 items-center gap-1 text-xs underline"
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open reference <ExternalLink className="size-3" />
            </a>
          )}
          {onDownloadWord && (
            <Button
              variant="outline"
              size="sm"
              disabled={downloading}
              onClick={() => void download()}
              aria-label="Download as Word"
            >
              <FileDown className="size-4" />
              {downloading ? "Preparing…" : "Word"}
            </Button>
          )}
        </div>
      </header>
      <div className="grid gap-5 p-4 sm:p-5">
        {[
          {
            key: "tasks",
            label: "Tasks Performed",
            value: tasks,
            change: onChangeTasks,
            placeholder: "Describe what you completed during this period…",
          },
          {
            key: "learnings",
            label: "Learnings & Reflections",
            value: learnings,
            change: onChangeLearnings,
            placeholder: "What did you learn? What will you improve next?",
          },
        ].map((section) => (
          <section key={section.key}>
            <label
              htmlFor={`${id}-${section.key}`}
              className="mb-2 block text-sm font-medium"
            >
              {section.label}
            </label>
            {readOnly ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-7">
                {section.value || "No entry provided."}
              </p>
            ) : (
              <textarea
                id={`${id}-${section.key}`}
                aria-label={section.label}
                value={section.value}
                disabled={disabled}
                onChange={(event) => section.change(event.target.value)}
                onSelect={(event) => {
                  const target = event.currentTarget;
                  setSelection({
                    field: section.key as JournalField,
                    source: target.value,
                    start: target.selectionStart,
                    end: target.selectionEnd,
                  });
                }}
                placeholder={section.placeholder}
                rows={4}
                maxLength={30000}
                className="min-h-28 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-base leading-7 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 sm:text-sm"
              />
            )}
          </section>
        ))}
      </div>
      <footer
        className="flex flex-wrap justify-between gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <span>
          {readOnly ? "Read only" : "Plain text"} · {words} words
        </span>
        {!readOnly && (
          <span>
            {saveState === "unsaved"
              ? "Unsaved changes"
              : saveState === "saving"
              ? "Saving to server…"
              : saveState === "saved"
                ? "Saved to server"
                : saveState === "error"
                  ? "Not saved — please retry"
                  : "Start writing to save a draft"}
          </span>
        )}
      </footer>
      {!readOnly && assistantOpen && (
        <WritingAssistantPanel
          tasks={tasks}
          learnings={learnings}
          selection={selection}
          onApply={applySuggestion}
          onClose={() => setAssistantOpen(false)}
        />
      )}
    </div>
  );
}
