"use client";
import { useState } from "react";
import { reportRequest } from "@/client/reports";
import { Button } from "@/components/ui/button";
/** Word remains the layout reference; this bounded preview makes sample content readable in-app. */
export function TemplateReference({ url }: { url: string }) {
  const [preview, setPreview] = useState<string[] | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function load() {
    if (pending || preview) return;
    setPending(true);
    setError("");
    try {
      setPreview(
        (await reportRequest<{ preview: string[] }>(url + "&preview=true"))
          .preview,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="rounded-lg border p-3">
      <summary
        className="cursor-pointer text-sm font-medium"
        onClick={() => void load()}
      >
        View filled reference
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-muted-foreground">
          Reference only. These sample answers are never copied into your
          report. This preview shows up to 300 text paragraphs; open Word to
          inspect the complete document, images and layout.
        </p>
        {pending && (
          <p role="status" className="text-sm">
            Loading reference…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}{" "}
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          </p>
        )}
        {preview && (
          <div className="max-h-80 space-y-3 overflow-y-auto rounded-md bg-muted/30 p-3">
            {preview.length ? (
              preview.map((text, i) => (
                <p key={i} className="whitespace-pre-wrap break-words text-sm">
                  {text}
                </p>
              ))
            ) : (
              <p className="text-sm">
                The reference contains no readable text paragraphs. Download it
                to view its images and layout.
              </p>
            )}
          </div>
        )}
        <a className="inline-block text-sm text-primary underline" href={url}>
          Download filled reference
        </a>
      </div>
    </details>
  );
}
