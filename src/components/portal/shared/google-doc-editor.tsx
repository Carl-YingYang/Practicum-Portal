"use client";

import * as React from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  ExternalLink,
  Check,
  Cloud,
  Type,
  Heading1,
  Heading2,
  Share2,
  FileDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * GoogleDocEditor — a Docs-style embedded writing surface rendered INSIDE the
 * portal (mirrors the law-office "drafting room" pattern the user referenced).
 *
 * It is NOT a real Google Docs iframe (those are blocked by X-Frame-Options for
 * editing). Instead it is a faithful Docs-style chrome wrapped around the
 * journal's content, with a "Connected to Google Docs" badge + an "Open
 * original" link so the delegation architecture stays honest.
 *
 * The editor keeps two labelled sections (tasks / learnings) so the existing
 * data model is preserved, but visually they read as one continuous document
 * page — exactly like editing a Google Doc inline.
 *
 * The toolbar's download button exports the current document as a Word (.docx)
 * file when `onDownloadWord` is provided. Parents pass a handler that calls
 * `exportJournalToDocx` / `exportFormToDocx` with full context.
 */
export interface GoogleDocEditorProps {
  /** Document title shown in the Docs title bar. */
  title: string;
  /** Subtitle / breadcrumb under the title (e.g. "Week of Jul 1 · 40h"). */
  subtitle?: string;
  /** The Google Docs URL this doc is connected to (for the "Open original" link). */
  docUrl?: string;
  /** Tasks section content. */
  tasks: string;
  /** Learnings section content. */
  learnings: string;
  onChangeTasks: (v: string) => void;
  onChangeLearnings: (v: string) => void;
  /** Read-only mode (e.g. supervisor reviewing). */
  readOnly?: boolean;
  /** Autosave indicator state. */
  saveState?: "idle" | "saving" | "saved";
  /** Optional left rail height sync — the editor fills available height. */
  className?: string;
  /**
   * When provided, the toolbar shows an enabled "Download as Word" button.
   * The parent owns the actual export logic (calls `exportJournalToDocx`
   * with full student/supervisor context).
   */
  onDownloadWord?: () => void | Promise<void>;
}

export function GoogleDocEditor({
  title,
  subtitle,
  docUrl,
  tasks,
  learnings,
  onChangeTasks,
  onChangeLearnings,
  readOnly = false,
  saveState = "idle",
  className,
  onDownloadWord,
}: GoogleDocEditorProps) {
  const [activeFmt, setActiveFmt] = React.useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const [downloading, setDownloading] = React.useState(false);

  // Word count for the footer (tasks + learnings).
  const wordCount = React.useMemo(() => {
    const text = `${tasks} ${learnings}`.trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [tasks, learnings]);

  const toggleFmt = (key: "bold" | "italic" | "underline") => {
    if (readOnly) return;
    setActiveFmt((f) => ({ ...f, [key]: !f[key] }));
  };

  const handleDownloadWord = async () => {
    if (!onDownloadWord || downloading) return;
    setDownloading(true);
    try {
      await onDownloadWord();
      toast.success("Word document downloaded", {
        description: "Check your downloads folder.",
      });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't generate the Word document.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:bg-zinc-950",
        className,
      )}
    >
      {/* ── Docs-style menu bar ────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-border/70 bg-zinc-50/80 px-3 py-1.5 dark:bg-zinc-900/60">
        <div className="flex items-center gap-0.5">
          {["File", "Edit", "View", "Insert", "Format", "Tools"].map((m) => (
            <button
              key={m}
              type="button"
              disabled
              className="rounded px-2 py-1 text-[12px] font-medium text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {m}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {/* Connected badge */}
          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50 sm:inline-flex">
            <Cloud className="h-3 w-3" />
            Connected to Google Docs
          </span>
          {docUrl && (
            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/40"
              title="Open the original Google Doc in a new tab"
            >
              Open original <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* ── Docs-style formatting toolbar ─────────────────────────────── */}
      <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border/70 bg-white px-3 py-1.5 dark:bg-zinc-950">
        <ToolbarBtn icon={Undo2} label="Undo" disabled={readOnly} />
        <ToolbarBtn icon={Redo2} label="Redo" disabled={readOnly} />
        <Divider />
        <button
          type="button"
          disabled
          className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[12px] text-zinc-600 dark:text-zinc-400"
          title="Paragraph style"
        >
          Normal text
        </button>
        <ToolbarBtn icon={Heading1} label="Heading 1" disabled={readOnly} />
        <ToolbarBtn icon={Heading2} label="Heading 2" disabled={readOnly} />
        <Divider />
        <ToolbarBtn icon={Type} label="Font size" disabled={readOnly} />
        <Divider />
        <ToolbarBtn
          icon={Bold}
          label="Bold"
          active={activeFmt.bold}
          disabled={readOnly}
          onClick={() => toggleFmt("bold")}
        />
        <ToolbarBtn
          icon={Italic}
          label="Italic"
          active={activeFmt.italic}
          disabled={readOnly}
          onClick={() => toggleFmt("italic")}
        />
        <ToolbarBtn
          icon={Underline}
          label="Underline"
          active={activeFmt.underline}
          disabled={readOnly}
          onClick={() => toggleFmt("underline")}
        />
        <Divider />
        <ToolbarBtn icon={AlignLeft} label="Align left" disabled={readOnly} />
        <ToolbarBtn icon={AlignCenter} label="Center" disabled={readOnly} />
        <ToolbarBtn icon={AlignRight} label="Align right" disabled={readOnly} />
        <Divider />
        <ToolbarBtn icon={List} label="Bullet list" disabled={readOnly} />
        <ToolbarBtn icon={ListOrdered} label="Numbered list" disabled={readOnly} />
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <ToolbarBtn
            icon={downloading ? Loader2 : FileDown}
            label={downloading ? "Generating…" : "Download as Word"}
            disabled={!onDownloadWord || downloading}
            spinning={downloading}
            onClick={onDownloadWord ? handleDownloadWord : undefined}
          />
          <ToolbarBtn icon={Share2} label="Share" disabled={readOnly} />
        </div>
      </div>

      {/* ── Document page ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-zinc-100/60 p-3 dark:bg-zinc-900/40 sm:p-6">
        <div className="mx-auto max-w-[816px] rounded-sm bg-white px-4 py-8 shadow-md ring-1 ring-zinc-200/70 dark:bg-zinc-950 dark:ring-zinc-800 sm:px-10 sm:py-12 lg:px-14">
          {/* Title */}
          <h1 className="font-heading text-2xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          )}
          <div className="mt-4 h-px bg-zinc-200 dark:bg-zinc-800" />

          {/* Section: Tasks */}
          <DocSection
            heading="Tasks Performed"
            placeholder="Describe the work you completed this week…"
            value={tasks}
            readOnly={readOnly}
            onChange={onChangeTasks}
          />

          <div className="my-8 h-px bg-zinc-100 dark:bg-zinc-800/70" />

          {/* Section: Learnings */}
          <DocSection
            heading="Learnings & Reflections"
            placeholder="What did you learn? What challenges did you overcome?"
            value={learnings}
            readOnly={readOnly}
            onChange={onChangeLearnings}
          />
        </div>
      </div>

      {/* ── Footer status bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-zinc-50/80 px-3 py-1.5 text-[11px] text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
        <div className="flex items-center gap-3">
          <span>
            {readOnly ? "Read-only" : "Editing"} · {wordCount} words
          </span>
          {!readOnly && (
            <span className="flex items-center gap-1">
              {saveState === "saving" && (
                <>
                  <Cloud className="h-3 w-3 animate-pulse" /> Saving to Drive…
                </>
              )}
              {saveState === "saved" && (
                <>
                  <Check className="h-3 w-3 text-emerald-500" /> Saved to Drive
                </>
              )}
              {saveState === "idle" && (
                <>
                  <Cloud className="h-3 w-3" /> Autosync on
                </>
              )}
            </span>
          )}
        </div>
        <span className="hidden font-mono sm:inline">
          docs.google.com/document
        </span>
      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────

function DocSection({
  heading,
  placeholder,
  value,
  readOnly,
  onChange,
}: {
  heading: string;
  placeholder: string;
  value: string;
  readOnly?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
        {heading}
      </h2>
      {readOnly ? (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          {value || (
            <span className="italic text-zinc-400">Not provided.</span>
          )}
        </p>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-300 focus:ring-0 dark:text-zinc-200 dark:placeholder:text-zinc-600"
          rows={6}
        />
      )}
    </section>
  );
}

function ToolbarBtn({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
  spinning,
}: {
  icon: typeof Bold;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  spinning?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "shrink-0 rounded p-1.5 text-zinc-600 transition-colors dark:text-zinc-400",
        disabled && "cursor-default opacity-40",
        !disabled && "hover:bg-zinc-100 dark:hover:bg-zinc-800",
        active && "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
      )}
    >
      <Icon className={cn("h-4 w-4", spinning && "animate-spin")} />
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700" />;
}

export default GoogleDocEditor;
