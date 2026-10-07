"use client";
import { useState } from "react";
import { reportRequest } from "@/client/reports";
import { flushChanges } from "@/client/portal-client";
import type { TemplateRecord } from "@/domain/templates/model";
import { useAppStore } from "@/store/use-app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function FormReportLink({ formId }: { formId: string }) {
  const state = useAppStore();
  const form = state.formDocuments.find((f) => f.id === formId);
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [templates, setTemplates] = useState<
      { id: string; title: string; archived: boolean }[]
    >([]),
    [record, setRecord] = useState<TemplateRecord | null>(null),
    [key, setKey] = useState(""),
    [title, setTitle] = useState(""),
    [respondent, setRespondent] = useState<"student" | "supervisor">(
      "supervisor",
    ),
    [required, setRequired] = useState(true);
  if (!form || form.origin) return null;
  async function start() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await flushChanges();
      setTemplates(
        (
          await reportRequest<{ templates: typeof templates }>("/api/templates")
        ).templates.filter((t) => !t.archived),
      );
      setTitle(form!.title);
      setOpen(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function choose(id: string) {
    setBusy(true);
    setError("");
    setRecord(null);
    setKey("");
    try {
      if (id) setRecord(await reportRequest(`/api/templates/${id}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function link() {
    if (!record) return;
    setBusy(true);
    setError("");
    try {
      const next = await reportRequest<TemplateRecord>(
        `/api/templates/${record.id}`,
        "POST",
        {
          action: "link",
          revision: record.revision,
          formId,
          title,
          respondent,
          required,
          ...(key ? { sectionKey: key } : {}),
        },
      );
      setRecord(next);
      setMessage(
        `${form!.title} is linked to ${next.content.title}. Inspect the Word format and publish a new version before assigning it. Existing assignments are unchanged.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const used = state.formDocuments.filter((f) => f.origin?.formId === formId);
  return (
    <section className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">
            Use this form in a practicum report
          </h2>
          <p className="text-xs text-muted-foreground">
            {used.length
              ? `Used in ${new Set(used.map((f) => f.origin!.templateVersionId)).size} published format version(s). Their saved rubrics remain unchanged.`
              : "Connect this form to its destination section; answers will appear there after approval."}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={busy || form.status !== "published"}
          onClick={() => void start()}
        >
          Add to practicum report
        </Button>
      </div>
      {form.status !== "published" && (
        <p className="text-xs text-muted-foreground">
          Publish this library form first.
        </p>
      )}
      {open && (
        <fieldset disabled={busy} className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Report format
            <select
              aria-label="Report format"
              className="mt-1 min-h-11 w-full min-w-0 rounded-md border bg-background p-2"
              value={record?.id ?? ""}
              onChange={(e) => void choose(e.target.value)}
            >
              <option value="">Choose a format</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Destination section
            <select
              aria-label="Destination section"
              className="mt-1 min-h-11 w-full min-w-0 rounded-md border bg-background p-2"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            >
              <option value="">Create a new form section</option>
              {record?.content.sections
                .filter((s) => s.kind === "forms")
                .map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.title}
                  </option>
                ))}
            </select>
          </label>
          {!key && (
            <label className="text-sm">
              New section title
              <Input
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          )}
          <label className="text-sm">
            Who answers?
            <select
              aria-label="Who answers?"
              className="mt-1 min-h-11 w-full rounded-md border bg-background p-2"
              value={respondent}
              onChange={(e) =>
                setRespondent(e.target.value as typeof respondent)
              }
            >
              <option value="supervisor">Assigned supervisor</option>
              <option value="student">Student</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
            />
            Required section
          </label>
          <Button
            disabled={busy || !record || !title.trim()}
            onClick={() => void link()}
          >
            {busy ? "Saving link…" : "Save link to format draft"}
          </Button>
          {!templates.length && (
            <Button
              variant="outline"
              onClick={() => state.navigate("coordinator.templates")}
            >
              Create a report format first
            </Button>
          )}
          {record && (
            <Button
              variant="ghost"
              onClick={() =>
                state.navigate("coordinator.templates", {
                  templateId: record.id,
                })
              }
            >
              Open format to publish
            </Button>
          )}
        </fieldset>
      )}
      {error && (
        <p role="alert" className="break-words text-sm text-destructive">
          {error} Reload the format and retry.
        </p>
      )}
      {message && (
        <p role="status" className="break-words text-sm text-primary">
          {message}
        </p>
      )}
    </section>
  );
}
