"use client";
import { useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { requestWritingDemo } from "@/client/writing-assistant";
import {
  defaultWritingPreferences,
  type JournalField,
  type WritingAction,
  type WritingPreferences,
  type WritingSuggestion,
} from "@/domain/writing-assistant";
import { useAppStore } from "@/store/use-app-store";
import { toast } from "sonner";

export interface WritingSelection {
  field: JournalField;
  start: number;
  end: number;
  source: string;
}
interface Preview {
  suggestion: WritingSuggestion;
  field: JournalField;
  source: string;
  selection?: WritingSelection;
}
interface Props {
  tasks: string;
  learnings: string;
  selection?: WritingSelection;
  onApply: (field: JournalField, before: string, after: string) => void;
  onClose: () => void;
}
export function WritingAssistantPanel({
  tasks,
  learnings,
  selection,
  onApply,
  onClose,
}: Props) {
  const testMode = useAppStore((s) => s.testMode);
  const [field, setField] = useState<JournalField>(selection?.field ?? "tasks");
  const [preferences, setPreferences] = useState<WritingPreferences>(
    defaultWritingPreferences,
  );
  const [preferencesStatus, setPreferencesStatus] = useState(
    "Loading preferences…",
  );
  const [preferencesError, setPreferencesError] = useState("");
  const [preview, setPreview] = useState<Preview>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastAction, setLastAction] = useState<WritingAction>("grammar");
  const [simulateError, setSimulateError] = useState(false);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const current = field === "tasks" ? tasks : learnings;
  const validSelection =
    selection?.field === field &&
    selection.source === current &&
    selection.end > selection.start
      ? selection
      : undefined;

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void fetch("/api/preferences/writing", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!controller.signal.aborted) {
          setPreferences(result.preferences);
          setPreferencesStatus("Preferences saved to your account");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setPreferencesError(error.message ?? "Could not load preferences.");
          setPreferencesStatus("Using default preferences");
        }
      });
    return () => {
      mounted.current = false;
      controller.abort();
      request.current?.abort();
    };
  }, []);

  async function savePreferences() {
    setPreferencesStatus("Saving preferences…");
    setPreferencesError("");
    try {
      const response = await fetch("/api/preferences/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (mounted.current)
        setPreferencesStatus("Preferences saved to your account");
    } catch (error) {
      if (mounted.current) {
        setPreferencesStatus("Preferences not saved");
        setPreferencesError(
          error instanceof Error ? error.message : "Please retry.",
        );
      }
    }
  }
  async function generate(action: WritingAction, retry = false) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setPreview(undefined);
    setLastAction(action);
    const text = validSelection
      ? current.slice(validSelection.start, validSelection.end)
      : current || (action === "reflection" ? tasks : "");
    try {
      const suggestion = await requestWritingDemo(
        { action, text, preferences },
        controller.signal,
        simulateError && !retry,
      );
      if (!controller.signal.aborted)
        setPreview({
          suggestion,
          field,
          source: current,
          selection: validSelection,
        });
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error ? error.message : "Could not load a sample.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function apply(mode: "insert" | "replace" | "selection") {
    if (!preview) return;
    const value = preview.field === "tasks" ? tasks : learnings;
    if (value !== preview.source) {
      setError(
        "This section changed after previewing. Generate a fresh suggestion first.",
      );
      return;
    }
    const next =
      mode === "insert"
        ? [value, preview.suggestion.text].filter(Boolean).join("\n\n")
        : mode === "selection" && preview.selection
          ? value.slice(0, preview.selection.start) +
            preview.suggestion.text +
            value.slice(preview.selection.end)
          : preview.suggestion.text;
    if (next.length > 30000) {
      setError(
        "This would exceed the journal section limit. Choose a shorter passage.",
      );
      return;
    }
    onApply(preview.field, value, next);
    setPreview(undefined);
    setError("");
    toast.success("Sample applied — review your journal before submitting");
  }
  const selectClass =
    "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm";
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        className="w-full gap-0 overflow-y-auto sm:max-w-[480px] motion-reduce:animate-none"
        aria-describedby="writing-demo-description"
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle>Writing Assistant</SheetTitle>
          <SheetDescription id="writing-demo-description">
            Demo · Sample response. No AI provider is connected.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 p-4 sm:p-5">
          <p className="rounded-lg border border-border bg-primary/5 p-3 text-xs leading-5">
            Only the chosen section or selected passage is used. Hours and
            attendance stay unchanged. Reflection prompts need your own answers.
          </p>
          <div className="space-y-2">
            <Label htmlFor="assistant-section">Journal section</Label>
            <select
              id="assistant-section"
              className={selectClass}
              value={field}
              disabled={busy}
              onChange={(event) => {
                setField(event.target.value as JournalField);
                setPreview(undefined);
                setError("");
              }}
            >
              <option value="tasks">Tasks Performed</option>
              <option value="learnings">Learnings & Reflections</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {validSelection
                ? `${validSelection.end - validSelection.start} selected characters`
                : "Using the whole section"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="assistant-language">Writing language</Label>
              <select
                id="assistant-language"
                disabled={
                  busy ||
                  preferencesStatus.startsWith("Loading") ||
                  preferencesStatus.startsWith("Saving")
                }
                className={selectClass}
                value={preferences.language}
                onChange={(e) => {
                  setPreferences({
                    ...preferences,
                    language: e.target.value as WritingPreferences["language"],
                  });
                  setPreferencesStatus("Unsaved preferences");
                }}
              >
                <option value="english">English</option>
                <option value="filipino">Filipino</option>
                <option value="taglish">Taglish</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assistant-detail">Response detail</Label>
              <select
                id="assistant-detail"
                disabled={
                  busy ||
                  preferencesStatus.startsWith("Loading") ||
                  preferencesStatus.startsWith("Saving")
                }
                className={selectClass}
                value={preferences.detail}
                onChange={(e) => {
                  setPreferences({
                    ...preferences,
                    detail: e.target.value as WritingPreferences["detail"],
                  });
                  setPreferencesStatus("Unsaved preferences");
                }}
              >
                <option value="concise">Concise</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-xs text-muted-foreground">
              {preferencesStatus}
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={
                preferencesStatus.startsWith("Saving") ||
                preferencesStatus.startsWith("Loading")
              }
              onClick={() => void savePreferences()}
            >
              Save preferences
            </Button>
          </div>
          {preferencesError && (
            <p role="alert" className="text-xs text-destructive">
              {preferencesError} Use Save preferences to retry.
            </p>
          )}
          <div className="grid gap-2" aria-busy={busy}>
            <Button
              variant="outline"
              className="min-h-11 justify-start"
              disabled={busy}
              onClick={() => void generate("grammar")}
            >
              Fix grammar
            </Button>
            <Button
              variant="outline"
              className="min-h-11 justify-start"
              disabled={busy}
              onClick={() => void generate("formal")}
            >
              Make it formal
            </Button>
            <Button
              variant="outline"
              className="min-h-11 justify-start"
              disabled={busy}
              onClick={() => void generate("reflection")}
            >
              Help with reflection
            </Button>
          </div>
          {testMode && (
            <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={simulateError}
                onChange={(e) => setSimulateError(e.target.checked)}
              />
              Simulate demo error
            </label>
          )}
          {busy && (
            <div
              role="status"
              className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground"
            >
              Preparing a sample…
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="space-y-2 rounded-lg border border-destructive/40 p-3 text-sm text-destructive"
            >
              <p>{error}</p>
              <Button
                variant="outline"
                onClick={() => void generate(lastAction, true)}
              >
                Retry sample
              </Button>
            </div>
          )}
          {preview && (
            <section
              aria-label="Suggestion preview"
              className="space-y-3 rounded-xl border border-border p-4"
            >
              <h3 className="text-sm font-semibold">Suggestion preview</h3>
              <p className="text-xs text-muted-foreground">
                Demo · Sample response
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-6">
                {preview.suggestion.text}
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                {preview.suggestion.note}
              </p>
              <div className="grid gap-2">
                <Button onClick={() => apply("insert")}>
                  Insert suggestion
                </Button>
                {preview.selection ? (
                  <Button variant="outline" onClick={() => apply("selection")}>
                    Replace selected text
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => apply("replace")}>
                    Replace section
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPreview(undefined);
                    setError("");
                  }}
                >
                  Dismiss suggestion
                </Button>
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
