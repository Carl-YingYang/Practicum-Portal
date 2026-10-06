"use client";
import { useState } from "react";
import { reportRequest } from "@/client/reports";
import type { ReportRecord } from "@/domain/reports/model";
import type { TemplateContent, TemplateRecord } from "@/domain/templates/model";
import { Button } from "@/components/ui/button";
export function TemplateUpgrade({
  report,
  onUpgrade,
  disabled,
}: {
  report: ReportRecord;
  onUpgrade: (versionId: string) => Promise<void>;
  disabled: boolean;
}) {
  const [versions, setVersions] = useState<TemplateRecord["versions"]>([]),
    [version, setVersion] = useState(""),
    [next, setNext] = useState<TemplateContent | null>(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const binding = report.binding!;
  async function load(versionId?: string) {
    setPending(true);
    setError("");
    try {
      if (versionId) {
        const result = await reportRequest<{ content: TemplateContent }>(
          `/api/templates/${binding.templateId}?version=${versionId}`,
        );
        setNext(result.content);
      } else {
        const result = await reportRequest<TemplateRecord>(
          `/api/templates/${binding.templateId}`,
        );
        setVersions(result.versions.filter((v) => v.number > binding.number));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  const added =
      next?.sections.filter(
        (s) => !binding.sections.some((d) => d.key === s.key),
      ) ?? [],
    removed = binding.sections.filter(
      (s) => next && !next.sections.some((d) => d.key === s.key),
    ),
    changed =
      next?.sections.filter((s) => {
        const old = binding.sections.find((d) => d.key === s.key);
        return old && JSON.stringify(old) !== JSON.stringify(s);
      }) ?? [];
  return (
    <details className="rounded-lg border p-3">
      <summary
        className="cursor-pointer text-sm font-medium"
        onClick={() => {
          if (!versions.length) void load();
        }}
      >
        Update assigned format
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-muted-foreground">
          This explicit update keeps answers matched by section key and retains
          removed answers and evidence in the archive. Changed sections return
          to draft. Earlier Word exports remain unchanged.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <label className="block text-sm">
          Newer published version
          <select
            className="mt-1 w-full min-w-0 rounded border bg-background p-2"
            disabled={disabled || pending}
            value={version}
            onChange={(e) => {
              setVersion(e.target.value);
              setNext(null);
              if (e.target.value) void load(e.target.value);
            }}
          >
            <option value="">
              {versions.length
                ? "Choose a newer version"
                : "No newer published versions"}
            </option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.number} · {v.title}
              </option>
            ))}
          </select>
        </label>
        {next && (
          <>
            <p className="text-sm">
              Added: {added.map((s) => s.title).join(", ") || "None"}
              <br />
              Archived: {removed.map((s) => s.title).join(", ") || "None"}
              <br />
              Changed: {changed.map((s) => s.title).join(", ") || "None"}
            </p>
            <Button
              disabled={disabled || pending}
              onClick={async () => {
                setPending(true);
                try {
                  await onUpgrade(version);
                  setNext(null);
                  setVersion("");
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setPending(false);
                }
              }}
            >
              Apply reviewed format update
            </Button>
          </>
        )}
      </div>
    </details>
  );
}
