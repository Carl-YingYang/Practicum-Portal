"use client";
import { useEffect, useState } from "react";
import { reportRequest } from "@/client/reports";
import type { TemplateRecord } from "@/domain/templates/model";
import { Button } from "@/components/ui/button";
import { WorkspaceLoader } from "@/components/portal/shared/workspace-loader";
import { TemplateEditor } from "./template-editor";
interface Summary {
  id: string;
  title: string;
  archived: boolean;
  latestVersion: number | null;
}
export function TemplateWorkspace() {
  const [templates, setTemplates] = useState<Summary[]>([]),
    [current, setCurrent] = useState<TemplateRecord | null>(null),
    [pending, setPending] = useState(true),
    [error, setError] = useState("");
  async function list() {
    setPending(true);
    setError("");
    try {
      setTemplates(
        (await reportRequest<{ templates: Summary[] }>("/api/templates"))
          .templates,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  useEffect(() => {
    let active = true;
    void reportRequest<{ templates: Summary[] }>("/api/templates")
      .then((result) => {
        if (active) setTemplates(result.templates);
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function open(id?: string) {
    setPending(true);
    setError("");
    try {
      setCurrent(
        await reportRequest<TemplateRecord>(
          id ? `/api/templates/${id}` : "/api/templates",
          id ? "GET" : "POST",
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  if (current)
    return (
      <TemplateEditor
        key={current.id}
        initial={current}
        onBack={() => {
          setCurrent(null);
          void list();
        }}
      />
    );
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Templates & Assignments</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your Word format, organized sections, clear respondents and
            versioned assignments.
          </p>
        </div>
        <Button disabled={pending} onClick={() => void open()}>
          New template from pilot
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border p-3 text-sm text-destructive"
        >
          {error}{" "}
          <Button variant="outline" onClick={() => void list()}>
            Retry
          </Button>
        </p>
      )}
      {pending ? (
        <WorkspaceLoader />
      ) : templates.length ? (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <button
              key={t.id}
              className="min-w-0 space-y-2 rounded-xl border bg-card p-4 text-left hover:border-primary"
              onClick={() => void open(t.id)}
            >
              <h2 className="break-words font-semibold">{t.title}</h2>
              <p className="text-sm text-muted-foreground">
                {t.archived
                  ? "Archived"
                  : t.latestVersion
                    ? `Published v${t.latestVersion} · editable draft`
                    : "Unpublished draft"}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          Start with the clean pilot, customize it, then assign it to your
          students.
        </p>
      )}
    </div>
  );
}
