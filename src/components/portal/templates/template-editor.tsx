"use client";
import { TemplateAssignment } from "./template-assignment";
import { FormatPreflight } from "./format-preflight";
import { ConfirmDialog } from "../shared/confirm-dialog";
import { useState } from "react";
import { useAppStore } from "@/store/use-app-store";
import { refreshPortal } from "@/client/portal-client";
import { reportRequest } from "@/client/reports";
import { useTemplateDraft } from "@/hooks/use-template-draft";
import {
  templateErrors,
  metadataSlots,
  type TemplateRecord,
  type TemplateSection,
} from "@/domain/templates/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TemplateReference } from "./template-reference";
import { SectionSettings } from "./section-settings";
export function TemplateEditor({
  initial,
  onBack,
}: {
  initial: TemplateRecord;
  onBack: () => void;
}) {
  const state = useAppStore(),
    draft = useTemplateDraft(initial, state.currentUser!.id),
    { report: record, content } = draft;
  const [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [checkedRevision, setCheckedRevision] = useState<number | null>(null),
    [publishOpen, setPublishOpen] = useState(false);
  const disabled = pending || record.archived;
  const problems = templateErrors(content, record.slots);
  async function run(action: (saved: TemplateRecord) => Promise<void>) {
    if (pending) return false;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await draft.save();
      const saved = await reportRequest<TemplateRecord>(
        `/api/templates/${record.id}`,
      );
      await action(saved);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setPending(false);
    }
  }
  async function operation(action: string) {
    return run(async (saved) => {
      const next = await reportRequest<TemplateRecord>(
        `/api/templates/${record.id}`,
        "POST",
        { action, revision: saved.revision },
      );
      draft.accept(next);
      if (action === "publish") {
        setMessage(
          `Published version ${next.versions[0].number}. Existing assignments stay on their version.`,
        );
      } else
        setMessage(
          action === "sync"
            ? "Word section placeholders updated. Download and inspect the format before publishing."
            : "Template archived. Existing assignments remain available.",
        );
    });
  }
  async function upload(file: File | undefined, kind: "word" | "example") {
    if (!file) return;
    await run(async (saved) => {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", kind);
      form.set("revision", String(saved.revision));
      draft.accept(
        await reportRequest<TemplateRecord>(
          `/api/templates/${record.id}`,
          "POST",
          form,
        ),
      );
      setMessage("File saved in the draft. Published versions are unchanged.");
    });
  }
  function changeSection(index: number, next: TemplateSection) {
    draft.change({
      ...content,
      sections: content.sections.map((s, i) => (i === index ? next : s)),
    });
  }
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => void run(async () => onBack())}
        >
          ← Templates
        </Button>
        <span role="status" className="text-xs text-muted-foreground">
          {draft.saving ? "Saving…" : draft.dirty ? "Unsaved changes" : "Saved"}{" "}
          · Draft revision {record.revision}
        </span>
      </div>
      <h1 className="text-2xl font-semibold">Template setup</h1>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={disabled || draft.saving || !draft.canUndo}
          onClick={draft.undo}
        >
          Undo
        </Button>
        <Button
          variant="outline"
          disabled={disabled || draft.saving || !draft.canRedo}
          onClick={draft.redo}
        >
          Redo
        </Button>
        <a className="rounded-md border p-2 text-sm" href="#format-checks">
          Check format
        </a>
        <a className="rounded-md border p-2 text-sm" href="#assign-students">
          Assign students
        </a>
      </div>
      <p className="text-sm text-muted-foreground">
        Configure the professor’s blank format, keep the filled sample as a
        reference, then publish and assign a frozen version.
      </p>
      {(error || draft.error) && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
        >
          {error || draft.error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg bg-primary/10 p-3 text-sm">
          {message}
        </p>
      )}
      {draft.recovery && (
        <div className="flex flex-wrap gap-2 rounded-lg border p-3">
          <p className="w-full text-sm">
            A local unsaved template draft is available.
          </p>
          <Button onClick={draft.restore}>Restore local draft</Button>
          <Button variant="outline" onClick={draft.discardRecovery}>
            Discard local draft
          </Button>
        </div>
      )}
      <fieldset
        disabled={disabled}
        className="space-y-4 rounded-xl border bg-card p-4"
      >
        <label className="block text-sm">
          Template name
          <Input
            value={content.title}
            maxLength={200}
            onChange={(e) =>
              draft.change({ ...content, title: e.target.value })
            }
          />
        </label>
        <label className="block text-sm">
          Description
          <Textarea
            value={content.description}
            maxLength={3000}
            onChange={(e) =>
              draft.change({ ...content, description: e.target.value })
            }
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={content.allowStudentExtras}
            onChange={(e) =>
              draft.change({ ...content, allowStudentExtras: e.target.checked })
            }
          />
          Allow students to add optional custom written sections
        </label>
      </fieldset>
      <section className="min-w-0 space-y-4 rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Word format & reference</h2>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer font-medium">
            How to prepare the Word format
          </summary>
          <ol className="mt-2 list-inside list-decimal space-y-2 text-sm">
            <li>
              Download the starter. Keep page size, header/footer and static
              text in Word.
            </li>
            <li>
              Use account fields inside ordinary paragraphs. Put each section
              placeholder on its own body paragraph, outside table cells.
            </li>
            <li>
              Add/remove sections here, then use Update Word section
              placeholders. Keep a copy of your Word file before changing its
              mapping.
            </li>
            <li>
              Run Check format, generate Sample Word, inspect pagination and
              tables in Word, then publish and assign.
            </li>
          </ol>
          <a
            href="/templates/practicum-pilot.docx"
            className="mt-3 inline-block text-sm text-primary underline"
            download
          >
            Download starter Word
          </a>
          <p className="mt-2 text-xs">
            Settings undo covers sections and instructions. Uploaded files and
            layout synchronization are separate file operations.
          </p>
        </details>
        <p className="text-sm text-muted-foreground">
          Edit page layout, header/footer, logos and fixed instructions in Word.
          Dynamic sections use a placeholder on its own paragraph. The content
          preview below shows text and placement markers; open the downloaded
          DOCX to inspect page layout.
        </p>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          {(["word", "example"] as const).map((kind) => (
            <div key={kind} className="min-w-0 space-y-2">
              <label className="block text-sm">
                {kind === "word"
                  ? "Blank official format (.docx)"
                  : "Filled example (.docx, reference only)"}
                <input
                  type="file"
                  accept=".docx"
                  disabled={disabled}
                  className="mt-2 block w-full min-w-0 text-sm file:mr-2 file:rounded file:border-0 file:bg-muted file:p-2"
                  onChange={(e) => {
                    void upload(e.target.files?.[0], kind);
                    e.target.value = "";
                  }}
                />
              </label>
              {(kind === "word" ? record.wordName : record.exampleName) && (
                <a
                  className="inline-block break-all text-sm text-primary underline"
                  href={`/api/templates/${record.id}?file=${kind}`}
                >
                  Download{" "}
                  {kind === "word" ? record.wordName : record.exampleName}
                </a>
              )}
            </div>
          ))}
        </div>
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            Available account & placement fields
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {metadataSlots.map((k) => (
              <code
                key={k}
                className="break-all rounded bg-muted px-2 py-1 text-xs"
              >{`{{${k}}}`}</code>
            ))}
          </div>
        </details>
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            Preview blank format content
          </summary>
          <div className="mt-3 max-h-96 space-y-2 overflow-y-auto rounded-lg bg-muted/40 p-4">
            {record.preview.map((text, i) => (
              <p key={i} className="break-words text-sm">
                {text}
              </p>
            ))}
          </div>
        </details>
        <Button
          disabled={disabled}
          variant="outline"
          onClick={() => void operation("sync")}
        >
          Sync Word sections
        </Button>
        <p className="text-xs text-muted-foreground">
          Updates owned section placeholders to match the order below. Fixed
          text stays in Word. New slots are appended before the document’s final
          section properties; inspect the downloaded format after changes.
        </p>
      </section>
      {record.exampleName && (
        <TemplateReference
          key={record.revision}
          url={`/api/templates/${record.id}?file=example`}
        />
      )}
      <label className="block text-sm">
        Practicum cycle / batch
        <Input
          disabled={disabled}
          value={content.cycle ?? ""}
          maxLength={120}
          placeholder="e.g. 2026–2027 Summer"
          onChange={(e) => draft.change({ ...content, cycle: e.target.value })}
        />
        <span className="text-xs text-muted-foreground">
          Label for these assignments. Each report keeps its own responses and
          placement period.
        </span>
      </label>
      <fieldset disabled={disabled} className="min-w-0 space-y-3">
        <legend className="mb-3 text-lg font-semibold">Report sections</legend>
        {content.sections.map((section, i) => (
          <SectionSettings
            key={i}
            section={section}
            index={i}
            count={content.sections.length}
            onChange={(next) => changeSection(i, next)}
            onDelete={() =>
              draft.change({
                ...content,
                sections: content.sections.filter((_, n) => n !== i),
              })
            }
            onMove={(delta) => {
              const sections = [...content.sections];
              [sections[i], sections[i + delta]] = [
                sections[i + delta],
                sections[i],
              ];
              draft.change({ ...content, sections });
            }}
          />
        ))}
        <Button
          disabled={disabled || content.sections.length >= 50}
          variant="outline"
          onClick={() =>
            draft.change({
              ...content,
              sections: [
                ...content.sections,
                {
                  key: `custom_${crypto.randomUUID().slice(0, 8)}`,
                  title: "Custom section",
                  instructions: "Explain what the respondent needs to provide.",
                  kind: "narrative",
                  required: false,
                  respondent: "student",
                  pageBreak: true,
                  formIds: [],
                },
              ],
            })
          }
        >
          Add custom section
        </Button>
      </fieldset>
      <FormatPreflight
        record={record}
        save={draft.save}
        onReady={setCheckedRevision}
      />
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-semibold">Publish a version</h2>
        {problems.length ? (
          <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-amber-700 dark:text-amber-300">
            {problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Every configured section has its own Word slot. Publish after
            checking the downloaded format.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={disabled}
            onClick={() => void run(async () => setMessage("Draft saved."))}
          >
            Save draft
          </Button>
          <Button
            disabled={
              disabled ||
              problems.length > 0 ||
              draft.dirty ||
              checkedRevision !== record.revision
            }
            onClick={() => setPublishOpen(true)}
          >
            Publish new version
          </Button>
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        Publish unlocks after structural checks pass for the saved draft.
        Assignment is a separate recipient review below.
      </p>
      <ConfirmDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title="Publish this checked format?"
        description="Inspect Sample Word in Microsoft Word first, including page breaks, tables and header/footer. Publication creates a fixed version. Existing reports retain their version."
        confirmLabel="Publish new version"
        onConfirm={async () => {
          if (draft.dirty || checkedRevision !== record.revision)
            throw Error("The draft changed. Run Check format again.");
          if (!(await operation("publish")))
            throw Error("Publication failed. Check the error and retry.");
        }}
      />
      <TemplateAssignment
        record={record}
        beforeAssign={draft.save}
        onUpdated={draft.accept}
      />
      {!record.archived && (
        <details className="rounded-xl border p-4">
          <summary className="cursor-pointer text-sm">
            Retire this template
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Archiving prevents new assignments and preserves published versions
            and existing reports.
          </p>
          <Button
            className="mt-3"
            variant="outline"
            disabled={pending}
            onClick={() => void operation("archive")}
          >
            Archive template
          </Button>
        </details>
      )}
    </div>
  );
}
