"use client";
import { useEffect, useState } from "react";
import { reportRequest } from "@/client/reports";
import { refreshPortal } from "@/client/portal-client";
import { useAppStore } from "@/store/use-app-store";
import { Button } from "@/components/ui/button";
import { PageHeader } from "../layout/page-header";
type Usage = {
  usedBytes: number;
  templateBytes: number;
  reportBytes: number;
  limitBytes: number;
  reportLimitBytes: number;
};
const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);
export function PracticumWorkspace() {
  const state = useAppStore();
  const [summary, setSummary] = useState<{
    templates: {
      id: string;
      latestVersion: number | null;
      archived: boolean;
    }[];
    reports: { id: string; templateVersion: number | null; ready: number }[];
    usage: Usage;
  } | null>(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [demo, setDemo] = useState<{
      reportId: string;
      student: string;
      supervisor: string;
    } | null>(null);
  async function getSummary() {
    const [t, r, usage] = await Promise.all([
      reportRequest<{ templates: NonNullable<typeof summary>["templates"] }>(
        "/api/templates",
      ),
      reportRequest<{ reports: NonNullable<typeof summary>["reports"] }>(
        "/api/reports",
      ),
      reportRequest<Usage>("/api/storage"),
    ]);
    return { templates: t.templates, reports: r.reports, usage };
  }
  async function load() {
    try {
      setSummary(await getSummary());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    let active = true;
    void getSummary()
      .then((result) => {
        if (active) setSummary(result);
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      });
    return () => {
      active = false;
    };
  }, []);
  const published =
    summary?.templates.filter((t) => !t.archived && t.latestVersion).length ??
    0;
  const official = summary?.reports.filter((r) => r.templateVersion) ?? [];
  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Practicum"
        description="Set up requirements, assign students and review the assembled output in one workflow."
      />
      {error && (
        <p
          role="alert"
          className="rounded-lg border p-3 text-sm text-destructive"
        >
          {error}{" "}
          <Button variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </p>
      )}
      <ol className="grid min-w-0 gap-3 md:grid-cols-3">
        {[
          {
            title: "1. Set up format",
            status: published
              ? `${published} published format(s)`
              : "Start here",
            text: "Define sections, link published forms and choose who answers. Inspect the Word layout before publishing.",
            target: "coordinator.templates" as const,
          },
          {
            title: "2. Assign students",
            status: `${official.length} official report(s)`,
            text: "Open a published format and select students. The linked requirements go to their correct respondents.",
            target: "coordinator.templates" as const,
          },
          {
            title: "3. Review & export",
            status: `${official.reduce((n, r) => n + r.ready, 0)} section(s) ready`,
            text: "Approve form responses first, review report sections, then export the checked Word report.",
            target: "coordinator.report-builder" as const,
          },
        ].map((task) => (
          <li
            key={task.title}
            className="min-w-0 space-y-3 rounded-xl border bg-card p-4"
          >
            <h2 className="font-semibold">{task.title}</h2>
            <span className="inline-block rounded bg-muted px-2 py-1 text-xs">
              {summary ? task.status : "Loading status…"}
            </span>
            <p className="text-sm text-muted-foreground">{task.text}</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                state.navigate(
                  task.target,
                  task.target === "coordinator.report-builder"
                    ? { official: "true" }
                    : {},
                )
              }
            >
              {task.title.slice(3)}
            </Button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            state.navigate("coordinator.forms", { tab: "submissions" })
          }
        >
          Review form responses
        </Button>
        <Button
          variant="outline"
          onClick={() => state.navigate("coordinator.forms")}
        >
          Form Library
        </Button>
      </div>
      {!!state.demoAccounts.length && (
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Try a guided sample</h2>
          <p className="text-sm text-muted-foreground">
            Prepare three blank requirements for existing fictional accounts.
            Switch through the testing accounts to answer and review them. This
            does not reset data or approve answers.
          </p>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                setDemo(await reportRequest("/api/practicum/demo", "POST", {}));
                await refreshPortal();
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Preparing sample…" : "Prepare guided sample"}
          </Button>
          {demo && (
            <div role="status" className="space-y-2 text-sm">
              <p>
                Ready for {demo.student} and {demo.supervisor}. Student:
                introduction and reflection → Supervisor: evaluation →
                Coordinator: approve responses, review sections, export Word.
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  state.navigate("coordinator.report-builder", {
                    reportId: demo.reportId,
                  })
                }
              >
                Open guided report
              </Button>
            </div>
          )}
        </section>
      )}
      {summary && (
        <section className="space-y-2 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">File storage</h2>
          <p className="text-sm">
            {mb(summary.usage.usedBytes)} MB of {mb(summary.usage.limitBytes)}{" "}
            MB used
          </p>
          <progress
            aria-label="School file storage"
            className="h-2 w-full"
            value={summary.usage.usedBytes}
            max={summary.usage.limitBytes}
          />
          <p className="text-xs text-muted-foreground">
            Formats & references: {mb(summary.usage.templateBytes)} MB ·
            Reports: {mb(summary.usage.reportBytes)} MB. Report limit:{" "}
            {mb(summary.usage.reportLimitBytes)} MB. Images are optimized;
            unchanged exports are reused.
          </p>
          <p className="text-xs text-muted-foreground">
            Remove unused evidence in its report. Export history offers cleanup
            of old unreviewed ZIP bundles; Word exports and reviewed documents
            stay retained.
          </p>
        </section>
      )}
      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Browse saved records & earlier drafts
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: "Journals", view: "coordinator.journals" as const },
            { label: "Timesheets", view: "coordinator.timesheets" as const },
            { label: "Evaluations", view: "coordinator.evaluations" as const },
            {
              label: "Submission Reviews",
              view: "coordinator.report-builder" as const,
            },
            { label: "Reports", view: "coordinator.reports" as const },
            {
              label: "External Tools",
              view: "coordinator.settings-tools" as const,
            },
          ].map((item) => (
            <Button
              key={item.view}
              variant="outline"
              onClick={() => state.navigate(item.view)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </details>
    </div>
  );
}
