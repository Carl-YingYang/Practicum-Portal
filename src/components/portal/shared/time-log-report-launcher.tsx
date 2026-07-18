"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PdfPreviewModal } from "@/components/portal/shared/pdf-preview-modal";
import { TimeLogReportDocument } from "@/components/portal/shared/time-log-report-document";
import { Button } from "@/components/ui/button";
import { Calendar, FileDown, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatDate, formatTime } from "@/lib/selectors";
import type { StudentTimeReportRow } from "@/components/portal/shared/time-log-report-document";
import { downloadPdfReport } from "@/lib/client-pdf";

export type TimeLogRangeKey = "7d" | "30d" | "90d" | "term" | "all";

interface RangeOption {
  key: TimeLogRangeKey;
  label: string;
  description: string;
}

const RANGE_OPTIONS: RangeOption[] = [
  { key: "7d", label: "Last 7 days", description: "This week's sessions" },
  { key: "30d", label: "Last 30 days", description: "Past month" },
  { key: "90d", label: "Last 90 days", description: "Past quarter" },
  {
    key: "term",
    label: "This term",
    description: "Academic year 2024–2025",
  },
  { key: "all", label: "All time", description: "Every session on record" },
];

interface TimeLogReportLauncherProps {
  /** The trigger element (button). Clicking it opens the date-range dialog. */
  trigger: React.ReactNode;
  title: string;
  subtitle?: string;
  /** All rows (unfiltered). The launcher filters by the chosen range. */
  rows: StudentTimeReportRow[];
  /** Optional cohort summary stats shown in the PDF header. */
  summaryStats?: { label: string; value: string }[];
  /** Default range selection. Defaults to "all". */
  defaultRange?: TimeLogRangeKey;
}

/**
 * Two-step launcher:
 *   1. A dialog lets the user pick a date range.
 *   2. On "Generate", rows are filtered and a PdfPreviewModal opens
 *      with a TimeLogReportDocument.
 *
 * Reused by student/supervisor/coordinator reports pages and both
 * time-monitor Export buttons so the date-range UX is consistent.
 */
export function TimeLogReportLauncher({
  trigger,
  title,
  subtitle,
  rows,
  summaryStats,
  defaultRange = "all",
}: TimeLogReportLauncherProps) {
  const [rangeOpen, setRangeOpen] = React.useState(false);
  const [pdfOpen, setPdfOpen] = React.useState(false);
  const [range, setRange] = React.useState<TimeLogRangeKey>(defaultRange);

  const openPicker = () => {
    setRange(defaultRange);
    setRangeOpen(true);
  };

  const generate = () => {
    setRangeOpen(false);
    setPdfOpen(true);
  };

  // Compute the cutoff timestamp for the chosen range.
  const cutoffMs = React.useMemo(() => {
    const now = Date.now();
    switch (range) {
      case "7d":
        return now - 7 * 86400_000;
      case "30d":
        return now - 30 * 86400_000;
      case "90d":
        return now - 90 * 86400_000;
      case "term":
        // "2024-2025" term — start of academic year (Aug 1, 2024).
        return new Date("2024-08-01T00:00:00").getTime();
      case "all":
      default:
        return 0;
    }
  }, [range]);

  const filteredRows = React.useMemo(() => {
    if (range === "all") return rows;
    return rows
      .map((r) => ({
        ...r,
        sessions: r.sessions.filter(
          (t) => new Date(t.clockInAt).getTime() >= cutoffMs
        ),
      }))
      .filter((r) => r.sessions.length > 0);
  }, [rows, range, cutoffMs]);

  const filteredSessions = filteredRows.reduce(
    (n, r) => n + r.sessions.length,
    0
  );
  const filteredMs = filteredRows.reduce(
    (ms, r) =>
      ms +
      r.sessions.reduce((s, t) => s + (t.durationMs ?? 0), 0),
    0
  );

  // Re-derive summary stats when a custom range is applied so the
  // PDF header reflects the filtered data (unless caller passed stats).
  const effectiveStats = React.useMemo(() => {
    if (summaryStats && range === "all") return summaryStats;
    return [
      { label: "Students", value: String(filteredRows.length) },
      { label: "Sessions", value: String(filteredSessions) },
      { label: "Tracked", value: formatDuration(filteredMs) },
    ];
  }, [summaryStats, range, filteredRows.length, filteredSessions, filteredMs]);

  const rangeLabel =
    RANGE_OPTIONS.find((o) => o.key === range)?.label ?? "All time";

  // ---------- Real PDF download builder ----------
  const buildTimeLogPdf = () => {
    // Helper: Monday-of-the-week key for a session date.
    const weekOf = (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diff);
      return monday.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    };

    const safeFilename =
      title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      "time-log-report";

    downloadPdfReport({
      filename: `${safeFilename}-${range}`,
      title,
      subtitle: `${subtitle ? subtitle + " · " : ""}${rangeLabel} · ${filteredSessions} session${
        filteredSessions === 1 ? "" : "s"
      }`,
      meta: effectiveStats,
      sections: filteredRows.map((r) => {
        const studentTotalMs = r.sessions.reduce(
          (s, t) => s + (t.durationMs ?? 0),
          0,
        );
        return {
          heading: `${r.student.name} · ${r.student.studentNumber}`,
          keyValue: [
            { label: "Course", value: r.student.course },
            { label: "Company", value: r.companyName ?? "—" },
            { label: "Supervisor", value: r.supervisorName ?? "—" },
            {
              label: "Sessions",
              value: String(r.sessions.length),
            },
            {
              label: "Tracked",
              value: formatDuration(studentTotalMs),
            },
            {
              label: "Required",
              value: `${r.student.requiredHours}h`,
            },
          ],
          table:
            r.sessions.length === 0
              ? undefined
              : {
                  head: ["Date", "Week of", "Clock In", "Clock Out", "Duration"],
                  body: r.sessions
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(a.clockInAt).getTime() -
                        new Date(b.clockInAt).getTime(),
                    )
                    .map((t) => [
                      formatDate(t.clockInAt),
                      weekOf(t.clockInAt),
                      formatTime(t.clockInAt),
                      t.clockOutAt ? formatTime(t.clockOutAt) : "—",
                      t.durationMs ? formatDuration(t.durationMs) : "—",
                    ]),
                  foot: [
                    "Total",
                    "",
                    "",
                    "",
                    formatDuration(studentTotalMs),
                  ],
                  align: ["left", "left", "left", "left", "right"],
                },
          paragraphs:
            r.sessions.length === 0
              ? [{ text: "No sessions in this range." }]
              : undefined,
        };
      }),
    });
  };

  return (
    <>
      {/* Trigger — wrap in a span so any element can trigger the picker */}
      <span onClick={openPicker} className="inline-flex">
        {trigger}
      </span>

      {/* Step 1: date-range picker dialog */}
      <Dialog open={rangeOpen} onOpenChange={setRangeOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b border-border px-5 pb-3 pt-5">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Timer className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              Generate Time Log Report
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choose a date range for the report. The PDF will include only
              sessions that started within the selected period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 px-5 py-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Date range
            </p>
            {RANGE_OPTIONS.map((opt) => {
              const selected = range === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRange(opt.key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    selected
                      ? "border-teal-500 bg-teal-50/60 dark:border-teal-700 dark:bg-teal-950/30"
                      : "border-border hover:border-border/80 hover:bg-muted/50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      selected
                        ? "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Calendar className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {opt.label}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {opt.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      selected
                        ? "border-teal-600 bg-teal-600 dark:border-teal-500 dark:bg-teal-500"
                        : "border-border"
                    )}
                  >
                    {selected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                </button>
              );
            })}

            {/* Live preview of filtered counts */}
            <div className="mt-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Report preview · {rangeLabel}
              </p>
              <div className="mt-1 flex items-baseline gap-4">
                <span className="text-sm">
                  <strong className="tabular-nums text-foreground">
                    {filteredRows.length}
                  </strong>{" "}
                  <span className="text-muted-foreground">students</span>
                </span>
                <span className="text-sm">
                  <strong className="tabular-nums text-foreground">
                    {filteredSessions}
                  </strong>{" "}
                  <span className="text-muted-foreground">sessions</span>
                </span>
                <span className="text-sm">
                  <strong className="tabular-nums text-foreground">
                    {formatDuration(filteredMs)}
                  </strong>{" "}
                  <span className="text-muted-foreground">tracked</span>
                </span>
              </div>
              {filteredSessions === 0 && (
                <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                  No sessions in this range — try a wider period.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-border px-5 py-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRangeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={generate}
              disabled={filteredSessions === 0}
              className="gap-1.5"
            >
              <FileDown className="h-3.5 w-3.5" />
              Generate report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: PDF preview with filtered data */}
      <PdfPreviewModal
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        title={title}
        subtitle={`${subtitle ? subtitle + " · " : ""}${rangeLabel} · ${filteredSessions} session${
          filteredSessions === 1 ? "" : "s"
        }`}
        onDownloadPdf={buildTimeLogPdf}
        downloadFilename={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${range}.pdf`}
      >
        <TimeLogReportDocument
          title={title}
          subtitle={subtitle}
          summaryStats={effectiveStats}
          rows={filteredRows}
        />
      </PdfPreviewModal>
    </>
  );
}
