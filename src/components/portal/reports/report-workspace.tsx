"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store/use-app-store";
import { reportRequest } from "@/client/reports";
import { Button } from "@/components/ui/button";
import { WorkspaceLoader } from "@/components/portal/shared/workspace-loader";
import { ReportEditor } from "./report-editor";
import type { ReportRecord } from "@/domain/reports/model";
export function ReportWorkspace() {
  const state = useAppStore();
  const [reports, setReports] = useState<
      {
        id: string;
        title: string;
        studentIds: string[];
        updatedAt: string;
        templateVersion: number | null;
        dueDate: string | null;
        ready: number;
        total: number;
        reviewed: number;
        cycle: string | null;
      }[]
    >([]),
    [current, setCurrent] = useState<ReportRecord | null>(null),
    [chosen, setChosen] = useState<string[]>([]),
    [pending, setPending] = useState(true),
    [error, setError] = useState("");
  const account = state.currentUser;
  async function list() {
    setPending(true);
    setError("");
    try {
      const result = await reportRequest<{ reports: typeof reports }>(
        "/api/reports",
      );
      setReports(result.reports);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  useEffect(() => {
    void list();
  }, [account?.id]); // Account changes unmount this role workspace.
  async function open(id: string) {
    setPending(true);
    setError("");
    try {
      setCurrent(await reportRequest(`/api/reports/${id}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function create() {
    setPending(true);
    setError("");
    try {
      setCurrent(
        await reportRequest("/api/reports", "POST", {
          studentIds:
            account?.role === "student" ? [account.studentId] : chosen,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  useEffect(() => {
    let active = true;
    if (state.viewParams.reportId)
      void reportRequest<ReportRecord>(
        `/api/reports/${state.viewParams.reportId}`,
      )
        .then((record) => {
          if (active) setCurrent(record);
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
  }, [state.viewParams.reportId]);
  if (!account) return null;
  if (current)
    return (
      <ReportEditor
        key={current.id}
        initial={current}
        accountId={account.id}
        onBack={() => {
          setCurrent(null);
          void list();
        }}
        onReload={() => {
          const id = current.id;
          setCurrent(null);
          void open(id);
        }}
      />
    );
  const selectedCompany = state.students.find(
    (s) => s.id === chosen[0],
  )?.companyId;
  const visibleReports = reports.filter(
    (r) =>
      (state.viewParams.official !== "true" || !!r.templateVersion) &&
      (account.role !== "supervisor" ||
        !state.viewParams.studentId ||
        r.studentIds.includes(state.viewParams.studentId)),
  );
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 p-4 sm:p-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">
          Word-first drafting
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          {account.role === "student"
            ? "My Practicum Report"
            : account.role === "coordinator"
              ? "Submission Reviews"
              : "Intern Report Review"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Assigned formats, section responses and editable Word reports for
          review.
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
        >
          {error}{" "}
          <Button variant="outline" onClick={() => void list()}>
            Retry
          </Button>
        </p>
      )}
      {account.role !== "supervisor" &&
        state.viewParams.official !== "true" && (
          <details className="rounded-xl border bg-card p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Independent / combined drafts
            </summary>
            <h2 className="font-medium">Start an independent draft</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use this for earlier or combined drafts. Official assignments
              appear below and follow the professor’s published format.
            </p>
            {account.role === "coordinator" && (
              <fieldset className="mt-3 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                <legend className="mb-2 text-sm">
                  Select students from the same company
                </legend>
                {state.students.map((s) => (
                  <label
                    key={s.id}
                    className="flex min-w-0 items-center gap-2 rounded-lg border p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={chosen.includes(s.id)}
                      disabled={
                        pending ||
                        (!!selectedCompany && selectedCompany !== s.companyId)
                      }
                      onChange={(e) =>
                        setChosen(
                          e.target.checked
                            ? [...chosen, s.id]
                            : chosen.filter((id) => id !== s.id),
                        )
                      }
                    />
                    <span className="min-w-0 break-words">
                      {s.name}
                      <small className="block text-muted-foreground">
                        {
                          state.companies.find((c) => c.id === s.companyId)
                            ?.name
                        }
                      </small>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            <Button
              className="mt-4"
              disabled={
                pending || (account.role === "coordinator" && !chosen.length)
              }
              onClick={() => void create()}
            >
              {pending ? "Please wait…" : "Create report"}
            </Button>
          </details>
        )}
      {pending ? (
        <WorkspaceLoader />
      ) : (
        <section className="space-y-3">
          <h2 className="font-medium">Official assigned reports</h2>
          {!visibleReports.some((r) => r.templateVersion) && (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No official assignment yet.{" "}
              {account.role === "coordinator"
                ? "Open Practicum → Set up format, publish it and assign students."
                : "Ask the coordinator to assign a published format. Independent drafts below are not official assignments."}
            </p>
          )}
          {!visibleReports.length && (
            <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              {account.role === "supervisor"
                ? "Your assigned students’ reports will appear here for review."
                : "No reports yet. A professor can publish a format and assign it to you."}
            </p>
          )}
          {[
            ...visibleReports.filter((r) => r.templateVersion),
            ...visibleReports.filter((r) => !r.templateVersion),
          ].map((r, index) => (
            <div key={r.id}>
              {!r.templateVersion &&
                (index === 0 ||
                  visibleReports.filter((x) => x.templateVersion).length ===
                    index) && (
                  <h2 className="mb-3 mt-6 font-medium">Independent drafts</h2>
                )}
              <button
                key={r.id}
                onClick={() => void open(r.id)}
                className="flex w-full min-w-0 flex-col gap-1 rounded-xl border bg-card p-4 text-left hover:border-primary"
              >
                <span className="break-words font-medium">{r.title}</span>
                <span className="text-xs text-primary">
                  {r.templateVersion
                    ? `Assigned format v${r.templateVersion}`
                    : "Independent draft"}
                  {r.dueDate ? ` · Due ${r.dueDate}` : ""}
                  {r.ready ? ` · ${r.ready} section(s) ready for review` : ""}
                </span>
                {r.templateVersion && (
                  <span className="text-xs text-muted-foreground">
                    {r.cycle ?? "Current practicum"} · {r.reviewed}/{r.total}{" "}
                    sections reviewed ·{" "}
                    {r.ready
                      ? "Next: review ready sections"
                      : "Next: complete requirements"}
                  </span>
                )}
                <span className="break-words text-sm text-muted-foreground">
                  {r.studentIds
                    .map(
                      (id) =>
                        state.students.find((s) => s.id === id)?.name ??
                        "Student",
                    )
                    .join(" · ")}
                </span>
                <span className="text-xs text-muted-foreground">
                  Updated {new Date(r.updatedAt).toLocaleString()}
                </span>
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
