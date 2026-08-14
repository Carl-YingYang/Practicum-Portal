"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FileText,
  FileSpreadsheet,
  FolderOpen,
  Clock,
  ExternalLink,
  Plus,
  Check,
  Cloud,
  CloudOff,
  HelpCircle,
  Sparkles,
  Calendar,
  GraduationCap,
} from "lucide-react";
import type {
  ToolsConfig,
  ToolKey,
  JournalDueDay,
} from "@/lib/types";

// ============================================================
// Quick-Create launchers
// Google's `.new` shortcuts instantly create a fresh Doc / Form /
// Drive folder / Sheet in the signed-in Google account. The
// coordinator creates the resource, copies the URL, pastes it back
// here, and the portal wires it into every student/supervisor view.
// ============================================================

interface ToolDef {
  key: ToolKey;
  title: string;
  description: string;
  /** Field in ToolsConfig that stores this tool's URL. */
  urlField: keyof Pick<
    ToolsConfig,
    "driveFolderUrl" | "journalTemplateUrl" | "formUrl" | "jibbleInviteUrl"
  >;
  /** Secondary field (optional) — e.g. form responses CSV. */
  extraField?: keyof Pick<ToolsConfig, "formResponsesCsvUrl">;
  extraLabel?: string;
  /** Quick-create URL (opens a fresh resource in a new tab). */
  createUrl: string;
  createLabel: string;
  /** Human hint shown under the input. */
  hint: string;
  icon: typeof FileText;
  accent: "teal" | "amber" | "emerald" | "violet";
}

const TOOLS: ToolDef[] = [
  {
    key: "drive",
    title: "Google Drive Folder",
    description:
      "The shared folder where interns drop weekly journals, evaluations, and supporting docs.",
    urlField: "driveFolderUrl",
    createUrl: "https://drive.new",
    createLabel: "Create new Drive folder",
    hint: "Create a folder in the cohort's Google Drive, then paste its sharing URL here.",
    icon: FolderOpen,
    accent: "amber",
  },
  {
    key: "journalTemplate",
    title: "Journal Template (Google Doc)",
    description:
      "The master weekly-journal template doc. Students make a copy each week and submit the link.",
    urlField: "journalTemplateUrl",
    createUrl: "https://docs.new",
    createLabel: "Create new Google Doc",
    hint: "Open a fresh Google Doc, format your weekly journal template, then paste its URL.",
    icon: FileText,
    accent: "teal",
  },
  {
    key: "form",
    title: "Google Form (optional)",
    description:
      "An optional Google Form for collecting structured responses. The portal's built-in Forms system works without this.",
    urlField: "formUrl",
    extraField: "formResponsesCsvUrl",
    extraLabel: "Responses CSV link",
    createUrl: "https://forms.new",
    createLabel: "Create new Google Form",
    hint: "Create a Google Form, then paste both the form URL and its responses-CSV link.",
    icon: FileSpreadsheet,
    accent: "emerald",
  },
  {
    key: "jibble",
    title: "Jibble (Time Tracking)",
    description:
      "Optional external time-clock tool. The portal has a built-in time clock — Jibble is only for teams already using it.",
    urlField: "jibbleInviteUrl",
    createUrl: "https://www.jibble.io/",
    createLabel: "Open Jibble signup",
    hint: "Sign up at Jibble, create an org, then paste the intern invite link here.",
    icon: Clock,
    accent: "violet",
  },
];

const DUE_DAYS: { value: JournalDueDay; label: string }[] = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const ACCENT_STYLES: Record<
  ToolDef["accent"],
  { ring: string; bg: string; text: string; badge: string; btn: string }
> = {
  teal: {
    ring: "ring-teal-200 dark:ring-teal-900/50",
    bg: "bg-teal-50 dark:bg-teal-950/30",
    text: "text-teal-700 dark:text-teal-300",
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
    btn: "border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-400 dark:hover:bg-teal-950/40",
  },
  amber: {
    ring: "ring-amber-200 dark:ring-amber-900/50",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    btn: "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40",
  },
  emerald: {
    ring: "ring-emerald-200 dark:ring-emerald-900/50",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    btn: "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40",
  },
  violet: {
    ring: "ring-violet-200 dark:ring-violet-900/50",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    text: "text-violet-700 dark:text-violet-300",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
    btn: "border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950/40",
  },
};

function isValidUrl(s: string): boolean {
  if (!s.trim()) return false;
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function ExternalToolsSetup() {
  const toolsConfig = useAppStore((s) => s.toolsConfig);
  const setToolsConfig = useAppStore((s) => s.setToolsConfig);

  // Connection status — how many of the 4 tools have a valid URL.
  const connectedCount = React.useMemo(() => {
    return TOOLS.filter((t) =>
      isValidUrl(toolsConfig[t.urlField] as string),
    ).length;
  }, [toolsConfig]);

  const connectedPct = Math.round((connectedCount / TOOLS.length) * 100);

  const handleSave = <K extends keyof ToolsConfig>(
    field: K,
    value: ToolsConfig[K],
    label: string,
  ) => {
    setToolsConfig({ [field]: value } as Partial<ToolsConfig>);
    if (typeof value === "string" && value && !isValidUrl(value)) {
      toast.warning(`${label} saved, but URL looks invalid`, {
        description: "Make sure it starts with http:// or https://",
      });
    } else if (typeof value === "string" && value) {
      toast.success(`${label} connected`, {
        description: "The link is now live for students and supervisors.",
      });
    } else {
      toast.info(`${label} cleared`);
    }
  };

  const handleQuickCreate = (tool: ToolDef) => {
    window.open(tool.createUrl, "_blank", "noopener,noreferrer");
    toast.info(`Opening ${tool.createLabel}…`, {
      description: "Create the resource in Google, copy its URL, then paste it below.",
    });
  };

  const handleOpen = (tool: ToolDef) => {
    const url = toolsConfig[tool.urlField] as string;
    if (!isValidUrl(url)) {
      toast.error("No valid URL to open", {
        description: `Paste a ${tool.title} URL first.`,
      });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    toast.info(`Opening ${tool.title}…`);
  };

  return (
    <div>
      <PageHeader
        title="External Tools Setup"
        description="Connect Google Docs, Forms, Drive, and Jibble. Use the Quick-Create buttons to spin up new resources, then paste their URLs here."
        breadcrumb="Configuration · External Tools"
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-foreground">
              {connectedCount}/{TOOLS.length} connected
            </span>
            <div className="ml-1 h-2 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  connectedPct === 100
                    ? "bg-emerald-500"
                    : connectedPct >= 50
                      ? "bg-teal-500"
                      : "bg-amber-500",
                )}
                style={{ width: `${connectedPct}%` }}
              />
            </div>
          </div>
        }
      />

      {/* Help banner */}
      <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50/60 p-4 dark:border-teal-900/50 dark:bg-teal-950/20">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              How this works — for coordinators
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              The portal has its own built-in Forms system, time clock, and
              timesheet generator — you can run the whole program without
              connecting anything. These external tools are{" "}
              <strong className="text-foreground">optional</strong>: link a
              Google Drive folder and journal template so students can draft in
              Docs, or connect a Google Form if you prefer collecting responses
              there. Click{" "}
              <span className="font-medium text-teal-700 dark:text-teal-300">
                Quick Create
              </span>{" "}
              to spin up a fresh Doc / Form / Drive folder in your Google
              account, then paste its URL into the field below.
            </p>
          </div>
        </div>
      </div>

      {/* Tool cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const accent = ACCENT_STYLES[tool.accent];
          const url = toolsConfig[tool.urlField] as string;
          const connected = isValidUrl(url);
          const extraUrl = tool.extraField
            ? (toolsConfig[tool.extraField] as string)
            : "";

          return (
            <SectionCard key={tool.key} contentClassName="p-5">
              {/* Card header */}
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1",
                    accent.bg,
                    accent.text,
                    accent.ring,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {tool.title}
                    </h3>
                    {connected ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          accent.badge,
                        )}
                      >
                        <Check className="h-3 w-3" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <CloudOff className="h-3 w-3" /> Not connected
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    {tool.description}
                  </p>
                </div>
              </div>

              {/* Quick-create + open */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn("gap-1.5 bg-transparent", accent.btn)}
                  onClick={() => handleQuickCreate(tool)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {tool.createLabel}
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        disabled={!connected}
                        onClick={() => handleOpen(tool)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {connected
                        ? "Open the connected resource in a new tab"
                        : "Connect a URL first"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* URL input */}
              <div className="mt-4 space-y-2">
                <Label
                  htmlFor={`url-${tool.key}`}
                  className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {tool.title} URL
                </Label>
                <Input
                  id={`url-${tool.key}`}
                  type="url"
                  inputMode="url"
                  placeholder="https://docs.google.com/…"
                  value={url}
                  onChange={(e) =>
                    setToolsConfig({
                      [tool.urlField]: e.target.value,
                    } as Partial<ToolsConfig>)
                  }
                  onBlur={() =>
                    handleSave(tool.urlField, url, tool.title)
                  }
                  className={cn(
                    connected && "border-emerald-300 dark:border-emerald-800",
                  )}
                />
                {tool.extraField && (
                  <>
                    <Label
                      htmlFor={`extra-${tool.key}`}
                      className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {tool.extraLabel}
                    </Label>
                    <Input
                      id={`extra-${tool.key}`}
                      type="url"
                      inputMode="url"
                      placeholder="https://docs.google.com/spreadsheets/…"
                      value={extraUrl}
                      onChange={(e) =>
                        setToolsConfig({
                          [tool.extraField]: e.target.value,
                        } as Partial<ToolsConfig>)
                      }
                      onBlur={() =>
                        tool.extraField &&
                        handleSave(
                          tool.extraField,
                          extraUrl,
                          tool.extraLabel ?? "Link",
                        )
                      }
                    />
                  </>
                )}
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {tool.hint}
                </p>
              </div>
            </SectionCard>
          );
        })}
      </div>

      {/* Term configuration */}
      <SectionCard
        className="mt-6"
        contentClassName="p-5"
        title="Term configuration"
        description="Drives the journal due-day banner and the required-hours target shown to students."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label
              htmlFor="termStart"
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <Calendar className="h-3 w-3" /> Term start
            </Label>
            <Input
              id="termStart"
              type="date"
              value={toolsConfig.termStart}
              onChange={(e) =>
                handleSave("termStart", e.target.value, "Term start")
              }
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="termEnd"
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <Calendar className="h-3 w-3" /> Term end
            </Label>
            <Input
              id="termEnd"
              type="date"
              value={toolsConfig.termEnd}
              onChange={(e) =>
                handleSave("termEnd", e.target.value, "Term end")
              }
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="dueDay"
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <FileText className="h-3 w-3" /> Journal due day
            </Label>
            <Select
              value={toolsConfig.journalDueDay}
              onValueChange={(v) =>
                handleSave(
                  "journalDueDay",
                  v as JournalDueDay,
                  "Journal due day",
                )
              }
            >
              <SelectTrigger id="dueDay" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DUE_DAYS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="requiredHours"
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <GraduationCap className="h-3 w-3" /> Required hours
            </Label>
            <Input
              id="requiredHours"
              type="number"
              min={0}
              max={1000}
              value={toolsConfig.requiredHours}
              onChange={(e) =>
                handleSave(
                  "requiredHours",
                  Number(e.target.value) || 0,
                  "Required hours",
                )
              }
            />
          </div>
        </div>
      </SectionCard>

      {/* Status footer */}
      <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {connectedCount === TOOLS.length ? (
            <>
              <Cloud className="h-4 w-4 text-emerald-500" />
              <span>
                All external tools connected. Students will see quick-launch
                buttons on their dashboard.
              </span>
            </>
          ) : (
            <>
              <CloudOff className="h-4 w-4 text-amber-500" />
              <span>
                {TOOLS.length - connectedCount} tool
                {TOOLS.length - connectedCount === 1 ? "" : "s"} not connected
                yet — the portal still works with built-in forms &amp; time
                clock.
              </span>
            </>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            toast.success("Settings saved", {
              description: "External tool links are live for this cohort.",
            })
          }
        >
          <Check className="h-3.5 w-3.5" /> Done
        </Button>
      </div>
    </div>
  );
}

export default ExternalToolsSetup;
