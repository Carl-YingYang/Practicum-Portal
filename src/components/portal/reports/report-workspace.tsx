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
      { id: string; title: string; studentIds: string[]; updatedAt: string }[]
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
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 p-4 sm:p-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">
          Word-first drafting
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Report Builder</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Write in sections. Assemble an editable report for your grammarian.
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
      {account.role !== "supervisor" && (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-medium">Start a practicum report</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep shared information and individual student sections together.
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
                      {state.companies.find((c) => c.id === s.companyId)?.name}
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
        </section>
      )}
      {pending ? (
        <WorkspaceLoader />
      ) : (
        <section className="space-y-3">
          <h2 className="font-medium">Saved reports</h2>
          {!reports.length && (
            <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              {account.role === "supervisor"
                ? "Your assigned students’ reports will appear here for review."
                : "Create your first report to start writing."}
            </p>
          )}
          {reports.map((r) => (
            <button
              key={r.id}
              onClick={() => void open(r.id)}
              className="flex w-full min-w-0 flex-col gap-1 rounded-xl border bg-card p-4 text-left hover:border-primary"
            >
              <span className="break-words font-medium">{r.title}</span>
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
          ))}
        </section>
      )}
    </div>
  );
}
