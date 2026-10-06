"use client";
import { useState } from "react";
import { useAppStore } from "@/store/use-app-store";
import { snapshot } from "@/domain/portal/snapshot";
import { reportChecks } from "@/domain/reports/checks";
import {
  makeSection,
  sectionTemplates,
  type ReportRecord,
  type ReportSection,
  type ReportAssetInfo,
} from "@/domain/reports/model";
import { useReportDraft } from "@/hooks/use-report-draft";
import { reportRequest, reportAssetUrl } from "@/client/reports";
import { ReportSectionPreview } from "./report-section-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Download,
  Eye,
  FileText,
  Save,
  Trash2,
} from "lucide-react";
export function ReportEditor({
  initial,
  accountId,
  onBack,
  onReload,
}: {
  initial: ReportRecord;
  accountId: string;
  onBack: () => void;
  onReload: () => void;
}) {
  const state = useAppStore();
  const draft = useReportDraft(initial, accountId),
    { report, content } = draft;
  const [activeId, setActiveId] = useState(content.sections[0]?.id),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(false),
    [wholePreview, setWholePreview] = useState(false),
    [allowDraft, setAllowDraft] = useState(false),
    [reviewNote, setReviewNote] = useState(""),
    [template, setTemplate] = useState(sectionTemplates[0].key);
  const section =
    content.sections.find((s) => s.id === activeId) ?? content.sections[0];
  const activeIndex = content.sections.indexOf(section);
  const checks = reportChecks(content, snapshot(state), report.assets);
  for (const s of content.sections.filter(
    (s) =>
      s.included &&
      s.status === "reviewed" &&
      ["journals", "forms", "attendance"].includes(s.kind),
  ))
    if (s.reviewedSource !== report.boundSourceFingerprint)
      checks.push(
        `${s.title}: linked records changed since review; reopen for review.`,
      );
  function scopeChecks(ids: string[]) {
    return reportChecks(
      {
        ...content,
        sections: content.sections.filter((s) => ids.includes(s.id)),
      },
      snapshot(state),
      report.assets,
    );
  }
  async function run(action: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await draft.save();
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  function editSection(patch: Partial<ReportSection>) {
    const changes = { ...section, ...patch };
    if (patch.body !== undefined || patch.title !== undefined) {
      changes.status = "draft";
      changes.reviewedAt = null;
    }
    draft.change({
      ...content,
      sections: content.sections.map((s) =>
        s.id === section.id ? changes : s,
      ),
    });
  }
  async function back() {
    await run(async () => onBack());
  }
  async function upload(
    file: File | undefined,
    kind: "evidence" | "reviewed",
    sectionId: string,
  ) {
    if (!file) return;
    await run(async () => {
      const form = new FormData();
      form.set("file", file);
      form.set("revision", String(draft.revision()));
      form.set("kind", kind);
      form.set("sectionId", sectionId);
      draft.accept(
        await reportRequest(`/api/reports/${report.id}/assets`, "POST", form),
      );
    });
  }
  async function assetAction(
    asset: ReportAssetInfo,
    patch: {
      caption?: string;
      rotation?: number;
      order?: number;
      remove?: boolean;
    },
  ) {
    await run(async () =>
      draft.accept(
        await reportRequest(`/api/reports/${report.id}`, "POST", {
          action: "asset",
          revision: draft.revision(),
          assetId: asset.id,
          ...patch,
        }),
      ),
    );
  }
  async function review(status: "reviewed" | "revision") {
    await run(async () => {
      draft.accept(
        await reportRequest(`/api/reports/${report.id}`, "POST", {
          action: "review",
          revision: draft.revision(),
          sectionId: section.id,
          status,
          note: reviewNote,
        }),
      );
      setReviewNote("");
    });
  }
  async function exportWord(scope: "full" | "section" | "chapter") {
    await run(async () => {
      const sectionIds =
        scope === "full"
          ? undefined
          : scope === "section"
            ? [section.id]
            : content.sections
                .filter((s) => s.studentId === section.studentId && s.included)
                .map((s) => s.id);
      draft.accept(
        await reportRequest(`/api/reports/${report.id}/export`, "POST", {
          revision: draft.revision(),
          sectionIds,
          allowIncomplete: allowDraft,
        }),
      );
    });
  }
  function move(delta: number) {
    const next = content.sections[activeIndex + delta];
    if (!next || next.studentId !== section.studentId) return;
    const sections = [...content.sections];
    [sections[activeIndex], sections[activeIndex + delta]] = [
      sections[activeIndex + delta],
      sections[activeIndex],
    ];
    draft.change({ ...content, sections });
  }
  function add() {
    const t = sectionTemplates.find((t) => t.key === template)!;
    const studentId =
      t.scope === "shared"
        ? null
        : (section.studentId ?? content.studentIds[0]);
    const added = makeSection(t, studentId, crypto.randomUUID());
    let index = content.sections.findLastIndex(
      (s) => s.studentId === studentId,
    );
    if (studentId === null)
      index = content.sections.findIndex((s) => s.studentId !== null) - 1;
    const sections = [...content.sections];
    sections.splice(Math.max(0, index + 1), 0, added);
    draft.change({ ...content, sections });
    setActiveId(added.id);
  }
  const editDisabled = !report.canEdit || pending;
  const statusLabel = (
    {
      draft: "Draft",
      ready: "For review",
      revision: "Needs revision",
      reviewed: "Reviewed",
    } as const
  )[section.status];
  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" disabled={pending} onClick={() => void back()}>
          <ArrowLeft className="mr-2 size-4" />
          Saved reports
        </Button>
        <div role="status" className="text-xs text-muted-foreground">
          {draft.saving ? "Saving…" : draft.dirty ? "Unsaved changes" : "Saved"}{" "}
          · Revision {report.revision}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Report Builder</h1>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => setWholePreview(!wholePreview)}
        >
          <Eye className="mr-2 size-4" />
          {wholePreview ? "Close report preview" : "Preview report"}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            void run(async () => {
              await draft.save();
            })
          }
        >
          <Save className="mr-2 size-4" />
          Save now
        </Button>
      </div>
      {(error || draft.error) && (
        <div
          role="alert"
          className="space-y-2 rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
        >
          <p>{error || draft.error}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => void run(async () => {})}
            >
              Retry save
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([JSON.stringify(content, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob),
                  a = document.createElement("a");
                a.href = url;
                a.download = "report-local-draft.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download local draft
            </Button>
            <Button variant="outline" disabled={pending} onClick={onReload}>
              Reload saved report
            </Button>
          </div>
          <p className="text-xs">
            Download your local draft before reloading if another session
            changed this report.
          </p>
        </div>
      )}
      {draft.recovery && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
          <span>A previous local draft is available.</span>
          <Button onClick={draft.restore}>Restore local draft</Button>
          <Button variant="ghost" onClick={draft.discardRecovery}>
            Discard local draft
          </Button>
        </div>
      )}
      <fieldset
        disabled={editDisabled}
        className="grid min-w-0 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2"
      >
        <label className="min-w-0 text-sm">
          Report title
          <Input
            value={content.title}
            maxLength={200}
            onChange={(e) =>
              draft.change({ ...content, title: e.target.value })
            }
          />
        </label>
        <div className="text-sm">
          <span className="text-muted-foreground">Students</span>
          <p className="mt-1 break-words">
            {content.studentIds
              .map((id) => state.students.find((s) => s.id === id)?.name)
              .join(" · ")}
          </p>
        </div>
      </fieldset>
      <details className="rounded-xl border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Word layout and placement details
        </summary>
        <fieldset
          disabled={editDisabled}
          className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {(
            [
              ["department", "Department"],
              ["degree", "Degree"],
              ["start", "Placement start"],
              ["end", "Placement end"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm">
              {label}
              <Input
                type={key === "start" || key === "end" ? "date" : "text"}
                value={content.settings[key]}
                onChange={(e) =>
                  draft.change({
                    ...content,
                    settings: { ...content.settings, [key]: e.target.value },
                  })
                }
              />
            </label>
          ))}
          <label className="text-sm">
            Paper
            <select
              className="mt-1 min-h-10 w-full rounded-md border bg-background px-3"
              value={content.settings.paper}
              onChange={(e) =>
                draft.change({
                  ...content,
                  settings: {
                    ...content.settings,
                    paper: e.target.value as "letter" | "a4",
                  },
                })
              }
            >
              <option value="letter">Letter</option>
              <option value="a4">A4</option>
            </select>
          </label>
          <label className="text-sm">
            Font
            <select
              className="mt-1 min-h-10 w-full rounded-md border bg-background px-3"
              value={content.settings.font}
              onChange={(e) =>
                draft.change({
                  ...content,
                  settings: {
                    ...content.settings,
                    font: e.target.value as "Arial" | "Times New Roman",
                  },
                })
              }
            >
              <option>Times New Roman</option>
              <option>Arial</option>
            </select>
          </label>
          <label className="text-sm">
            Font size
            <Input
              type="number"
              min={10}
              max={14}
              value={content.settings.fontSize}
              onChange={(e) =>
                draft.change({
                  ...content,
                  settings: {
                    ...content.settings,
                    fontSize: Number(e.target.value),
                  },
                })
              }
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Margins: left 1.5″; top, bottom and right 1″. Word updates the table
            of contents after opening.
          </p>
        </fieldset>
      </details>
      {wholePreview ? (
        <section className="space-y-6 rounded-xl border bg-card p-4">
          <h2 className="text-xl font-semibold">{content.title}</h2>
          {content.sections
            .filter((s) => s.included)
            .map((s) => (
              <article key={s.id} className="space-y-3 border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  {s.studentId
                    ? state.students.find((st) => st.id === s.studentId)?.name
                    : "Shared section"}
                </p>
                <h3 className="font-semibold">{s.title}</h3>
                <ReportSectionPreview
                  section={s}
                  assets={report.assets}
                  reportId={report.id}
                />
              </article>
            ))}
        </section>
      ) : (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-xl border bg-card p-3">
            <h2 className="mb-3 text-sm font-semibold">Report sections</h2>
            <label className="block text-sm lg:hidden">
              Current section
              <select
                className="mt-1 min-h-11 w-full min-w-0 rounded-md border bg-background px-2"
                aria-label="Current section"
                value={section.id}
                onChange={(e) => {
                  setActiveId(e.target.value);
                  setReviewNote("");
                }}
              >
                {content.sections.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.studentId
                      ? state.students.find((st) => st.id === s.studentId)
                          ?.name + " — "
                      : ""}
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <nav
              className="hidden max-h-[65vh] space-y-1 overflow-y-auto lg:block"
              aria-label="Report sections"
            >
              {content.sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveId(s.id);
                    setReviewNote("");
                  }}
                  className={`w-full rounded-lg p-3 text-left text-sm ${s.id === section.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                >
                  <span className="block break-words">{s.title}</span>
                  <small className="block truncate text-muted-foreground">
                    {s.studentId
                      ? state.students.find((st) => st.id === s.studentId)?.name
                      : "Shared"}{" "}
                    · {s.included ? s.status : "Excluded"}
                  </small>
                </button>
              ))}
            </nav>
            {report.canEdit && (
              <div className="mt-4 space-y-2 border-t pt-3">
                <label className="text-xs">
                  Add section template
                  <select
                    className="mt-1 min-h-10 w-full min-w-0 rounded-md border bg-background px-2 text-sm"
                    disabled={pending}
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                  >
                    {sectionTemplates.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={pending}
                  onClick={add}
                >
                  Add section
                </Button>
              </div>
            )}
          </aside>
          <section className="min-w-0 space-y-4 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                {statusLabel}
              </span>
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setPreview(!preview)}
                >
                  <Eye className="mr-1 size-4" />
                  {preview ? "Editor" : "Preview"}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Move section up"
                  disabled={
                    editDisabled ||
                    content.sections[activeIndex - 1]?.studentId !==
                      section.studentId
                  }
                  onClick={() => move(-1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Move section down"
                  disabled={
                    editDisabled ||
                    content.sections[activeIndex + 1]?.studentId !==
                      section.studentId
                  }
                  onClick={() => move(1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
              </div>
            </div>
            <label className="block text-sm">
              Section title
              <Input
                disabled={editDisabled}
                value={section.title}
                onChange={(e) => editSection({ title: e.target.value })}
              />
            </label>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={editDisabled}
                  checked={section.included}
                  onChange={(e) => editSection({ included: e.target.checked })}
                />
                Include in report
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={editDisabled}
                  checked={section.required}
                  onChange={(e) => editSection({ required: e.target.checked })}
                />
                Required section
              </label>
            </div>
            <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
              {sectionTemplates.find((t) => t.key === section.template)?.prompt}
            </p>
            {preview || !report.canEdit ? (
              <ReportSectionPreview
                section={section}
                assets={report.assets}
                reportId={report.id}
              />
            ) : (
              <label className="block text-sm">
                {section.kind === "narrative"
                  ? "Section content"
                  : "Additional notes"}
                <Textarea
                  disabled={pending}
                  aria-label={
                    section.kind === "narrative"
                      ? "Section content"
                      : "Additional notes"
                  }
                  className="mt-2 min-h-64 resize-y leading-relaxed"
                  value={section.body}
                  maxLength={100000}
                  placeholder="Write your own content. Use # headings, **bold**, - bullets, or a Markdown table."
                  onChange={(e) => editSection({ body: e.target.value })}
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  Use blank lines between paragraphs. Linked journals and
                  attendance are assembled from saved records.
                </span>
              </label>
            )}
            {!!section.reviewNote && (
              <div className="rounded-lg border p-3 text-sm">
                <strong>Review feedback</strong>
                <p className="mt-1 whitespace-pre-wrap">{section.reviewNote}</p>
              </div>
            )}
            {report.canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={
                    pending ||
                    section.status === "ready" ||
                    (section.kind === "narrative" && !section.body.trim())
                  }
                  onClick={() => editSection({ status: "ready" })}
                >
                  Ready for review
                </Button>
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => editSection({ status: "draft" })}
                >
                  Reopen draft
                </Button>
                <Button
                  variant="ghost"
                  disabled={
                    pending || section.required || content.sections.length < 2
                  }
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Remove this optional section? Uploaded files remain retained, but excluded from export.",
                      )
                    )
                      return;
                    draft.change({
                      ...content,
                      sections: content.sections.filter(
                        (s) => s.id !== section.id,
                      ),
                    });
                    setActiveId(
                      content.sections.find((s) => s.id !== section.id)!.id,
                    );
                  }}
                >
                  <Trash2 className="mr-1 size-4" />
                  Remove optional section
                </Button>
              </div>
            )}
            {report.canReview &&
              section.status === "ready" &&
              (state.currentUser?.role === "coordinator" ||
                !!section.studentId) && (
                <div className="space-y-2 rounded-lg border p-3">
                  <label className="text-sm">
                    Reviewer feedback
                    <Textarea
                      value={reviewNote}
                      maxLength={3000}
                      onChange={(e) => setReviewNote(e.target.value)}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={pending}
                      onClick={() => void review("reviewed")}
                    >
                      Mark reviewed
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pending || !reviewNote.trim()}
                      onClick={() => void review("revision")}
                    >
                      Request revision
                    </Button>
                  </div>
                </div>
              )}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold">
                Evidence and attachments
              </h3>
              {report.canEdit && (
                <label className="block text-xs text-muted-foreground">
                  PNG, JPEG, PDF or DOCX · up to 32 MB per file
                  <input
                    type="file"
                    disabled={pending}
                    accept="image/png,image/jpeg,.pdf,.docx"
                    className="mt-2 block w-full min-w-0 rounded-md border p-2 text-sm"
                    onChange={(e) => {
                      void upload(e.target.files?.[0], "evidence", section.id);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              {report.assets
                .filter(
                  (a) => a.kind === "evidence" && a.sectionId === section.id,
                )
                .map((a) => (
                  <EvidenceRow
                    key={a.id}
                    asset={a}
                    reportId={report.id}
                    disabled={editDisabled}
                    onChange={(patch) => void assetAction(a, patch)}
                  />
                ))}
              {!report.assets.some(
                (a) => a.kind === "evidence" && a.sectionId === section.id,
              ) && (
                <p className="text-xs text-muted-foreground">
                  No attachments for this section.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
      <details className="rounded-xl border bg-card p-4" open>
        <summary className="cursor-pointer text-sm font-medium">
          Before export · {checks.length} checks
        </summary>
        {checks.length ? (
          <ul className="mt-3 max-h-52 list-disc space-y-1 overflow-y-auto pl-5 text-xs text-muted-foreground">
            {checks.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm">All included sections are ready.</p>
        )}
        {report.canEdit && (
          <>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowDraft}
                onChange={(e) => setAllowDraft(e.target.checked)}
              />
              Export a draft with outstanding checks
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                disabled={pending || (!!checks.length && !allowDraft)}
                onClick={() => void exportWord("full")}
              >
                <FileText className="mr-2 size-4" />
                {pending ? "Working…" : "Build full Word report"}
              </Button>
              <Button
                variant="outline"
                disabled={
                  pending ||
                  !section.included ||
                  (!!scopeChecks([section.id]).length && !allowDraft)
                }
                onClick={() => void exportWord("section")}
              >
                Export current section
              </Button>
              <Button
                variant="outline"
                disabled={
                  pending ||
                  (!!scopeChecks(
                    content.sections
                      .filter(
                        (s) => s.studentId === section.studentId && s.included,
                      )
                      .map((s) => s.id),
                  ).length &&
                    !allowDraft)
                }
                onClick={() => void exportWord("chapter")}
              >
                Export current chapter
              </Button>
            </div>
          </>
        )}
      </details>
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">
            Export history and grammarian review
          </h2>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              void run(async () =>
                draft.accept(await reportRequest(`/api/reports/${report.id}`)),
              )
            }
          >
            Refresh saved records
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Each export stays unchanged. Reviewed Word files are retained
          separately; Word edits are not automatically imported into section
          editors.
        </p>
        {!report.versions.length && (
          <p className="text-sm text-muted-foreground">
            Build a report to create its first version.
          </p>
        )}
        {[...report.versions].reverse().map((v) => (
          <article key={v.id} className="space-y-3 rounded-lg border p-3">
            <h3 className="text-sm font-medium">
              Version {v.number} · {new Date(v.createdAt).toLocaleString()}
            </h3>
            {v.sourceFingerprint !== report.sourceFingerprint && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Report content or linked records have changed since this export.
                The saved document remains unchanged.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {report.assets
                .filter((a) => a.sectionId === v.id)
                .map((a) => (
                  <a
                    key={a.id}
                    className="inline-flex min-h-11 items-center gap-1 break-all text-sm text-primary underline"
                    href={reportAssetUrl(report.id, a.id)}
                    download
                  >
                    <Download className="size-4 shrink-0" />
                    {a.kind === "reviewed" ? "Reviewed: " : ""}
                    {a.name}
                  </a>
                ))}
            </div>
            {report.canEdit && (
              <label className="block text-xs text-muted-foreground">
                Upload grammarian-reviewed DOCX for this version
                <input
                  type="file"
                  accept=".docx"
                  disabled={pending}
                  className="mt-1 block w-full min-w-0 rounded-md border p-2"
                  onChange={(e) => {
                    void upload(e.target.files?.[0], "reviewed", v.id);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
function EvidenceRow({
  asset,
  reportId,
  disabled,
  onChange,
}: {
  asset: ReportAssetInfo;
  reportId: string;
  disabled: boolean;
  onChange: (patch: {
    caption?: string;
    rotation?: number;
    order?: number;
    remove?: boolean;
  }) => void;
}) {
  const [caption, setCaption] = useState(asset.caption);
  return (
    <div className="min-w-0 space-y-2 rounded-lg border p-3">
      <a
        className="break-all text-sm text-primary underline"
        href={reportAssetUrl(reportId, asset.id)}
        download
      >
        {asset.name}
      </a>
      <p className="text-xs text-muted-foreground">
        {(asset.size / 1024 / 1024).toFixed(2)} MB
      </p>
      <label className="block text-xs">
        Caption
        <Input
          disabled={disabled}
          value={caption}
          maxLength={1000}
          onChange={(e) => setCaption(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange({ caption })}
        >
          Save caption
        </Button>
        {asset.mime.startsWith("image/") && (
          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onChange({ rotation: (asset.rotation + 90) % 360 })}
          >
            Rotate
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange({ order: Math.max(0, asset.order - 1) })}
        >
          Earlier
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange({ order: asset.order + 1 })}
        >
          Later
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => {
            if (
              window.confirm(
                "Remove this evidence? Existing exports retain their original copy.",
              )
            )
              onChange({ remove: true });
          }}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
