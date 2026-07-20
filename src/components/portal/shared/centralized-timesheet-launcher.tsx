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
import { CentralizedTimesheetDocument } from "@/components/portal/shared/centralized-timesheet-document";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  FileDown,
  FileSpreadsheet,
  Eye,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/selectors";
import type { Student, TimeLog } from "@/lib/types";
import { downloadCsv, downloadPdfReport } from "@/lib/client-pdf";
import { toast } from "sonner";

export type TimesheetRangeKey = "thisMonth" | "lastMonth" | "term" | "all";

interface RangeOption {
  key: TimesheetRangeKey;
  label: string;
  description: string;
}

const RANGE_OPTIONS: RangeOption[] = [
  {
    key: "thisMonth",
    label: "This month",
    description: "Current calendar month",
  },
  {
    key: "lastMonth",
    label: "Last month",
    description: "Previous calendar month",
  },
  {
    key: "term",
    label: "This term",
    description: "Academic year 2024–2025",
  },
  { key: "all", label: "All time", description: "Every session on record" },
];

export interface CentralizedTimesheetLauncherProps {
  /** The trigger element (button). */
  trigger: React.ReactNode;
  /** Company name (header of the timesheet). */
  companyName: string;
  /** The student/intern. */
  student: Student;
  /** Supervisor name (attested-by line). */
  supervisorName?: string;
  /** Coordinator name (approved-by line). */
  coordinatorName?: string;
  /** All completed sessions for the student. */
  sessions: TimeLog[];
  /** Optional institution name shown under company. */
  institutionName?: string;
  /** Default range. */
  defaultRange?: TimesheetRangeKey;
  /** Visual variant of the trigger button — controls styling hint only. */
  variant?: "default" | "outline" | "ghost";
}

/**
 * Centralized Intern Timesheet launcher.
 *
 * Three-step flow:
 *   1. Click trigger → date-range picker dialog opens.
 *   2. Pick range → "View" opens a PdfPreviewModal with the clean
 *      CentralizedTimesheetDocument rendered inside.
 *   3. From the preview, "Download PDF" or "Download CSV" produces a
 *      real file. Every action fires a toast notification.
 *
 * Used by students (own timesheet), supervisors (intern timesheet),
 * and coordinators (any student timesheet) — fully centralized.
 */
export function CentralizedTimesheetLauncher({
  trigger,
  companyName,
  student,
  supervisorName,
  coordinatorName,
  sessions,
  institutionName,
  defaultRange = "all",
}: CentralizedTimesheetLauncherProps) {
  const [rangeOpen, setRangeOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [range, setRange] = React.useState<TimesheetRangeKey>(defaultRange);

  const openPicker = () => {
    setRange(defaultRange);
    setRangeOpen(true);
    toast.info("Timesheet generator opened", {
      description: `Preparing data for ${student.name}`,
    });
  };

  // ---- Range filtering ----
  const filteredSessions = React.useMemo(() => {
    if (range === "all") return sessions;
    const now = new Date();
    if (range === "thisMonth") {
      return sessions.filter((t) => {
        const d = new Date(t.clockInAt);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      });
    }
    if (range === "lastMonth") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return sessions.filter((t) => {
        const d = new Date(t.clockInAt);
        return (
          d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth()
        );
      });
    }
    // term
    const termStart = new Date("2024-08-01T00:00:00").getTime();
    return sessions.filter(
      (t) => new Date(t.clockInAt).getTime() >= termStart,
    );
  }, [sessions, range]);

  const totalMs = filteredSessions.reduce(
    (s, t) => s + (t.durationMs ?? 0),
    0,
  );
  const rangeLabel =
    RANGE_OPTIONS.find((o) => o.key === range)?.label ?? "All time";

  const handleView = () => {
    if (filteredSessions.length === 0) {
      toast.warning("No sessions in this range", {
        description: "Try a wider period.",
      });
      return;
    }
    setRangeOpen(false);
    setPreviewOpen(true);
    toast.success("Timesheet ready", {
      description: `${filteredSessions.length} sessions · ${formatDuration(totalMs)}`,
    });
  };

  // ---- PDF download (clean, DOCX-style layout) ----
  const buildPdf = () => {
    // Group by month for the PDF.
    const completed = filteredSessions
      .filter((t) => t.clockOutAt !== null && t.durationMs)
      .sort((a, b) => (a.clockInAt < b.clockInAt ? -1 : 1));
    const monthMap = new Map<
      string,
      { label: string; logs: TimeLog[]; totalMs: number }
    >();
    for (const t of completed) {
      const d = new Date(t.clockInAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap.has(key)) {
        const first = new Date(d.getFullYear(), d.getMonth(), 1);
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const monthName = first.toLocaleDateString("en-US", { month: "long" });
        const ds = (dd: Date) =>
          dd.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
        monthMap.set(key, {
          label: `${monthName} ${d.getFullYear()} (${ds(first)} – ${ds(last)})`,
          logs: [],
          totalMs: 0,
        });
      }
      const g = monthMap.get(key)!;
      g.logs.push(t);
      g.totalMs += t.durationMs ?? 0;
    }
    const months = Array.from(monthMap.values());
    const grandTotalMs = months.reduce((s, m) => s + m.totalMs, 0);

    const fmtDate = (iso: string) =>
      new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    const fmtDay = (iso: string) =>
      new Date(iso).toLocaleDateString("en-US", { weekday: "long" });
    const fmtClock = (iso: string | null) =>
      iso
        ? new Date(iso).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : "—";
    const fmtHours = (ms: number) => {
      if (ms <= 0) return "—";
      const min = Math.round(ms / 60000);
      return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
    };

    const safeName = student.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const safeCompany = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const filename = `timesheet-${safeCompany}-${safeName}-${range}`;

    downloadPdfReport({
      filename,
      title: companyName.toUpperCase(),
      subtitle: `Intern Monthly Timesheet · ${student.name} (${student.studentNumber}) · ${rangeLabel}`,
      meta: [
        { label: "Intern", value: student.name },
        { label: "Student No.", value: student.studentNumber },
        { label: "Sessions", value: String(completed.length) },
        { label: "Total Hours", value: fmtHours(grandTotalMs) },
        { label: "Period", value: rangeLabel },
      ],
      sections: [
        ...months.map((m) => ({
          heading: m.label,
          table: {
            head: ["Date", "Day", "Time In", "Time Out", "Hours Rendered"],
            body: m.logs.map((t) => [
              fmtDate(t.clockInAt),
              fmtDay(t.clockInAt),
              fmtClock(t.clockInAt),
              fmtClock(t.clockOutAt),
              fmtHours(t.durationMs ?? 0),
            ]),
            foot: [
              "TOTAL",
              "",
              "",
              "",
              fmtHours(m.totalMs),
            ],
            align: ["left", "left", "left", "left", "right"] as const,
          },
        })),
        {
          heading: "Grand Total (All Months)",
          keyValue: [
            { label: "Total Sessions", value: String(completed.length) },
            {
              label: "Total Hours Rendered",
              value: fmtHours(grandTotalMs),
            },
            { label: "Range", value: rangeLabel },
          ],
          paragraphs: [
            {
              label: "Certification",
              text: `This is to certify that ${student.name} has completed the required number of hours to be rendered in this establishment and a Certificate of Completion will be issued upon submission of this report to the practicum adviser.`,
            },
          ],
        },
        {
          heading: "Signatures",
          keyValue: [
            { label: "Attested by", value: supervisorName ?? "____________" },
            { label: "Approved by", value: coordinatorName ?? "____________" },
          ],
        },
      ],
      footer:
        "Practicum Evaluation Portal · Centralized Intern Timesheet · Confidential",
    });

    toast.success("Timesheet PDF downloaded", {
      description: `${filename}.pdf saved to your downloads`,
    });
  };

  // ---- CSV download ----
  const buildCsv = () => {
    const completed = filteredSessions
      .filter((t) => t.clockOutAt !== null && t.durationMs)
      .sort((a, b) => (a.clockInAt < b.clockInAt ? -1 : 1));

    const head = ["Date", "Day", "Time In", "Time Out", "Hours Rendered"];
    const body = completed.map((t) => {
      const d = new Date(t.clockInAt);
      return [
        d.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
        }),
        d.toLocaleDateString("en-US", { weekday: "long" }),
        new Date(t.clockInAt).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        t.clockOutAt
          ? new Date(t.clockOutAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          : "—",
        (() => {
          const ms = t.durationMs ?? 0;
          const min = Math.round(ms / 60000);
          return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
        })(),
      ];
    });
    const totalMin = Math.round(totalMs / 60000);
    body.push([
      "",
      "",
      "",
      "TOTAL",
      `${Math.floor(totalMin / 60)}h ${String(totalMin % 60).padStart(2, "0")}m`,
    ]);

    const safeName = student.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const safeCompany = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const filename = `timesheet-${safeCompany}-${safeName}-${range}`;
    const file = downloadCsv(filename, head, body);

    toast.success("Timesheet CSV downloaded", {
      description: `${completed.length} sessions exported to ${file}`,
    });
  };

  return (
    <>
      {/* Trigger */}
      <span onClick={openPicker} className="inline-flex">
        {trigger}
      </span>

      {/* Step 1: date-range picker */}
      <Dialog open={rangeOpen} onOpenChange={setRangeOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="border-b border-border px-5 pb-3 pt-5">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Timer className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              Generate Intern Timesheet
            </DialogTitle>
            <DialogDescription className="text-xs">
              Centralized timesheet for{" "}
              <span className="font-medium text-foreground">{student.name}</span>{" "}
              at {companyName}. Auto-built from clock-in/out data.
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
                  onClick={() => {
                    setRange(opt.key);
                    toast.info(`Range set: ${opt.label}`, {
                      description: opt.description,
                    });
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    selected
                      ? "border-teal-500 bg-teal-50/60 dark:border-teal-700 dark:bg-teal-950/30"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      selected
                        ? "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
                        : "bg-muted text-muted-foreground",
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
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                      selected
                        ? "border-teal-600 bg-teal-600 dark:border-teal-500 dark:bg-teal-500"
                        : "border-border",
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
                Preview · {rangeLabel}
              </p>
              <div className="mt-1 flex items-baseline gap-4">
                <span className="text-sm">
                  <strong className="tabular-nums text-foreground">
                    {filteredSessions.length}
                  </strong>{" "}
                  <span className="text-muted-foreground">sessions</span>
                </span>
                <span className="text-sm">
                  <strong className="tabular-nums text-foreground">
                    {formatDuration(totalMs)}
                  </strong>{" "}
                  <span className="text-muted-foreground">tracked</span>
                </span>
              </div>
              {filteredSessions.length === 0 && (
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
              onClick={() => {
                setRangeOpen(false);
                toast.info("Timesheet generation cancelled");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleView}
              disabled={filteredSessions.length === 0}
              className="gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" />
              View timesheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: PDF preview with the clean centralized document */}
      <PdfPreviewModal
        open={previewOpen}
        onOpenChange={(o) => {
          setPreviewOpen(o);
          if (!o) toast.info("Timesheet preview closed");
        }}
        title={`${companyName} — Intern Timesheet`}
        subtitle={`${student.name} (${student.studentNumber}) · ${rangeLabel} · ${filteredSessions.length} session${filteredSessions.length === 1 ? "" : "s"}`}
        onDownloadPdf={buildPdf}
        downloadFilename={`timesheet-${companyName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}-${student.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}-${range}.pdf`}
      >
        <CentralizedTimesheetDocument
          companyName={companyName}
          student={student}
          supervisorName={supervisorName}
          coordinatorName={coordinatorName}
          sessions={filteredSessions}
          institutionName={institutionName}
        />
      </PdfPreviewModal>
    </>
  );
}

// ============================================================
// Compact trigger button presets (for reuse across roles)
// ============================================================

export function TimesheetButton({
  variant = "outline",
  size = "sm",
  label = "Timesheet",
  className,
}: {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default";
  label?: string;
  className?: string;
}) {
  return (
    <Button variant={variant} size={size} className={cn("gap-1.5", className)}>
      <FileSpreadsheet className="h-4 w-4" />
      {label}
    </Button>
  );
}

export function DownloadTimesheetButton({
  variant = "outline",
  size = "sm",
  className,
}: {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default";
  className?: string;
}) {
  return (
    <Button variant={variant} size={size} className={cn("gap-1.5", className)}>
      <FileDown className="h-4 w-4" />
      Download Timesheet
    </Button>
  );
}

export default CentralizedTimesheetLauncher;
