"use client";
import { useState } from "react";
import type { TemplateRecord } from "@/domain/templates/model";
import { Button } from "@/components/ui/button";
import { reportRequest } from "@/client/reports";
import { downloadFile } from "@/client/download";
import { FormatIssues } from "./format-issues";
export function FormatPreflight({
  record,
  onReady,
  prepare,
}: {
  record: TemplateRecord;
  onReady: (revision: number) => void;
  prepare: () => Promise<TemplateRecord>;
}) {
  const [result, setResult] = useState<{
      revision: number;
      errors: string[];
      warnings: string[];
      preview: string[];
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function check(download = false) {
    setBusy(true);
    setError("");
    try {
      const latest = await prepare();
      const next = await reportRequest<NonNullable<typeof result>>(
        `/api/templates/${record.id}`,
        "POST",
        { action: "preflight", revision: latest.revision },
      );
      setResult(next);
      if (!next.errors.length) {
        onReady(next.revision);
        if (download)
          await downloadFile(
            `/api/templates/${record.id}?file=sample`,
            "format-sample.docx",
          );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      id="format-checks"
      className="min-w-0 space-y-3 rounded-xl border bg-card p-4"
    >
      <h2 className="font-semibold">Check format & sample</h2>
      <p className="text-sm text-muted-foreground">
        We inspect the Word package and section mapping, then build a fictional
        sample before publishing. Sample answers never enter student records.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || record.archived} onClick={() => void check()}>
          Check format
        </Button>
        <Button
          variant="outline"
          disabled={busy || record.archived}
          onClick={() => void check(true)}
        >
          Generate Sample Word
        </Button>
      </div>
      {busy && (
        <p role="status" className="text-sm">
          Inspecting and building sample…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {result && (
        <div className="min-w-0 space-y-2 text-sm">
          <p role="status">
            {result.errors.length
              ? `${result.errors.length} issue(s) to fix`
              : `Structural checks passed for draft revision ${result.revision}`}
            {result.revision !== record.revision
              ? " · Draft changed: check again before publishing."
              : ""}
          </p>
          <FormatIssues errors={result.errors} content={record.content} />
          {result.warnings.map((w, i) => (
            <p key={i} className="text-muted-foreground">
              {w}
            </p>
          ))}
          {!!result.preview.length && (
            <details>
              <summary className="cursor-pointer">
                View fictional sample text
              </summary>
              <div className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-lg bg-muted/30 p-3">
                {result.preview.map((p, i) => (
                  <p key={i} className="whitespace-pre-wrap break-words">
                    {p}
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
