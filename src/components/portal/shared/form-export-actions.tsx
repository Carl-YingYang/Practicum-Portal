"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { flushChanges } from "@/client/portal-client";
import { downloadFile } from "@/client/download";
import { downloadFormPdf } from "@/lib/form-export";
import type { FormDocument, FormFieldValue } from "@/lib/types";
export function FormExportActions({
  form,
  values = {},
  submissionId,
  sample = false,
  beforeExport,
}: {
  form: FormDocument;
  values?: Record<string, FormFieldValue>;
  submissionId?: string;
  sample?: boolean;
  beforeExport?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(mode: "blank" | "sample" | "answered" | "pdf") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await beforeExport?.();
      await flushChanges();
      if (mode === "pdf") await downloadFormPdf(form, values);
      else
        await downloadFile(
          `/api/forms/${encodeURIComponent(form.id)}/export?mode=${mode}${submissionId ? `&submission=${encodeURIComponent(submissionId)}` : ""}`,
          "form.docx",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => void run("blank")}
      >
        Blank Word
      </Button>
      {sample && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void run("sample")}
        >
          Sample Word
        </Button>
      )}
      {submissionId && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void run("answered")}
        >
          Answered Word
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => void run("pdf")}
      >
        Export PDF
      </Button>
      {busy && (
        <span role="status" className="text-xs">
          Preparing download…
        </span>
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
