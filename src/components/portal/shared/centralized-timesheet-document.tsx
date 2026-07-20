"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { formatDate, formatDuration, formatTime } from "@/lib/selectors";
import type { Student, TimeLog } from "@/lib/types";

// ============================================================
// Centralized Intern Timesheet Document
// ------------------------------------------------------------
// Clean, print-ready layout matching the official practicum
// timesheet format (sample: Timesheet_Nieva_CMN-2_Full_June-July2026.docx).
//
// Header (minimal):
//   <Company Name>
//   Intern Monthly Timesheet
//   Intern: <name>     Period Covered: <range>
//
// Body:
//   One table per month, columns:
//     Date | Day | Time In | Time Out | Hours Rendered
//   Each month ends with a TOTAL row.
//   A GRAND TOTAL (All Months) row follows.
//
// Footer:
//   Certification text + signature lines (Attested by / Approved by).
//
// Auto-builds entirely from a Student + TimeLog[] (clock-in/out
// sessions), so it stays in sync with the portal's time clock.
// ============================================================

export interface CentralizedTimesheetProps {
  /** Company name shown as the document header (large). */
  companyName: string;
  /** The intern/student this timesheet belongs to. */
  student: Student;
  /** Supervisor name (for the "Attested by" line). */
  supervisorName?: string;
  /** Coordinator name (for the "Approved by" line). */
  coordinatorName?: string;
  /** All completed clock-in/out sessions (will be filtered by period). */
  sessions: TimeLog[];
  /** Optional period label override. Auto-derived if omitted. */
  periodLabel?: string;
  /** School / institution name (small line under company). */
  institutionName?: string;
}

/** "Jun 03, 2026" style date. */
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/** "Wednesday" */
function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long" });
}

/** "8:11 am" */
function fmtClock(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** "9h 11m" from ms. */
function fmtHours(ms: number): string {
  if (ms <= 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** "June 2026 (01 Jun – 30 Jun)" */
function monthLabel(year: number, month: number): string {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const monthName = first.toLocaleDateString("en-US", { month: "long" });
  const ds = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  return `${monthName} ${year} (${ds(first)} – ${ds(last)})`;
}

interface MonthGroup {
  key: string; // "2026-06"
  label: string;
  logs: TimeLog[];
  totalMs: number;
}

/** Group completed sessions by calendar month, oldest first. */
function groupByMonth(sessions: TimeLog[]): MonthGroup[] {
  const completed = sessions
    .filter((t) => t.clockOutAt !== null && t.durationMs)
    .sort((a, b) => (a.clockInAt < b.clockInAt ? -1 : 1));
  const map = new Map<string, MonthGroup>();
  for (const t of completed) {
    const d = new Date(t.clockInAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: monthLabel(d.getFullYear(), d.getMonth()),
        logs: [],
        totalMs: 0,
      });
    }
    const g = map.get(key)!;
    g.logs.push(t);
    g.totalMs += t.durationMs ?? 0;
  }
  return Array.from(map.values());
}

/**
 * Clean, centralized timesheet document. Renders inside a PdfPreviewModal
 * or standalone. Designed to mirror the official practicum timesheet
 * (company header + per-month tables + totals + certification + signatures).
 */
export function CentralizedTimesheetDocument({
  companyName,
  student,
  supervisorName,
  coordinatorName,
  sessions,
  periodLabel,
  institutionName,
}: CentralizedTimesheetProps) {
  const months = React.useMemo(() => groupByMonth(sessions), [sessions]);
  const grandTotalMs = months.reduce((s, m) => s + m.totalMs, 0);
  const totalSessions = months.reduce((s, m) => s + m.logs.length, 0);

  // Auto-derive period label from sessions if not provided.
  const derivedPeriod = React.useMemo(() => {
    if (periodLabel) return periodLabel;
    if (months.length === 0) return "No sessions on record";
    const first = months[0].logs[0];
    const last = months[months.length - 1].logs[months[months.length - 1].logs.length - 1];
    const f = new Date(first.clockInAt).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    const l = new Date(last.clockInAt).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    return `${f} – ${l}`;
  }, [periodLabel, months]);

  const generatedLabel = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6 bg-white px-2 py-1 text-slate-900">
      {/* ===== Minimal header: company + timesheet + duration ===== */}
      <div className="border-b-2 border-slate-800 pb-3">
        <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-900">
          {companyName}
        </h1>
        <p className="mt-0.5 text-sm font-semibold uppercase tracking-wide text-slate-700">
          Intern Monthly Timesheet
        </p>
        {institutionName && (
          <p className="text-[11px] text-slate-500">{institutionName}</p>
        )}
        <div className="mt-3 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-700">Intern:</span>{" "}
            <span className="font-medium">{student.name}</span>
            <span className="ml-2 text-xs text-slate-500">
              ({student.studentNumber})
            </span>
          </p>
          <p className="sm:text-right">
            <span className="font-semibold text-slate-700">Period Covered:</span>{" "}
            <span className="font-medium">{derivedPeriod}</span>
          </p>
        </div>
        <p className="mt-1 text-[10px] text-slate-400">
          Generated {generatedLabel} · Practicum Evaluation Portal
        </p>
      </div>

      {/* ===== Per-month tables ===== */}
      {months.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
          <Clock className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">
            No completed sessions on record
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Clock-in/out sessions will populate this timesheet automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {months.map((m) => (
            <MonthTable key={m.key} group={m} />
          ))}

          {/* ===== Grand total ===== */}
          <div className="flex items-center justify-between border-t-2 border-slate-800 bg-slate-100 px-4 py-2.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Grand Total (All Months) · {totalSessions} session
              {totalSessions === 1 ? "" : "s"}
            </span>
            <span className="font-mono text-lg font-bold tabular-nums text-slate-900">
              {fmtHours(grandTotalMs)}
            </span>
          </div>
        </div>
      )}

      {/* ===== Certification ===== */}
      <div className="rounded border border-slate-200 bg-slate-50/50 px-4 py-3 text-[11px] leading-relaxed text-slate-700">
        <p className="font-semibold uppercase tracking-wide text-slate-600">
          Certification
        </p>
        <p className="mt-1">
          This is to certify that{" "}
          <span className="font-semibold">{student.name}</span> has completed the
          required number of hours to be rendered in this establishment and a
          Certificate of Completion will be issued upon submission of this
          report to the practicum adviser.
        </p>
      </div>

      {/* ===== Signature lines ===== */}
      <div className="grid grid-cols-1 gap-8 pt-4 sm:grid-cols-2">
        <div className="text-center">
          <div className="mt-8 border-t border-slate-500" />
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Attested by
          </p>
          <p className="text-sm font-medium text-slate-900">
            {supervisorName ?? "________________________"}
          </p>
          <p className="text-[10px] text-slate-500">Company Supervisor</p>
        </div>
        <div className="text-center">
          <div className="mt-8 border-t border-slate-500" />
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Approved by
          </p>
          <p className="text-sm font-medium text-slate-900">
            {coordinatorName ?? "________________________"}
          </p>
          <p className="text-[10px] text-slate-500">Practicum Coordinator</p>
        </div>
      </div>

      {/* Footer note */}
      <div className="flex items-center gap-1.5 border-t border-slate-200 pt-2 text-[10px] text-slate-400">
        <Clock className="h-3 w-3" />
        Generated by Practicum Evaluation Portal · Centralized Intern Timesheet
      </div>
    </div>
  );
}

// ============================================================
// Per-month table
// ============================================================

function MonthTable({ group }: { group: MonthGroup }) {
  return (
    <div className="break-inside-avoid">
      {/* Month section heading */}
      <div className="mb-1.5 flex items-baseline justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
          {group.label}
        </h3>
        <span className="text-[11px] text-slate-500">
          {group.logs.length} session{group.logs.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Sessions table */}
      <table className="w-full border-collapse border border-slate-400 text-[11px]">
        <thead>
          <tr className="border border-slate-400 bg-slate-700 text-left text-[10px] font-bold uppercase tracking-wide text-white">
            <th className="border border-slate-400 px-2 py-1.5">Date</th>
            <th className="border border-slate-400 px-2 py-1.5">Day</th>
            <th className="border border-slate-400 px-2 py-1.5">Time In</th>
            <th className="border border-slate-400 px-2 py-1.5">Time Out</th>
            <th className="border border-slate-400 px-2 py-1.5 text-right">
              Hours Rendered
            </th>
          </tr>
        </thead>
        <tbody>
          {group.logs.map((t) => (
            <tr
              key={t.id}
              className="border border-slate-300 odd:bg-white even:bg-slate-50"
            >
              <td className="border border-slate-300 px-2 py-1 font-medium">
                {fmtDate(t.clockInAt)}
              </td>
              <td className="border border-slate-300 px-2 py-1 text-slate-600">
                {fmtDay(t.clockInAt)}
              </td>
              <td className="border border-slate-300 px-2 py-1 font-mono tabular-nums">
                {fmtClock(t.clockInAt)}
              </td>
              <td className="border border-slate-300 px-2 py-1 font-mono tabular-nums">
                {fmtClock(t.clockOutAt)}
              </td>
              <td className="border border-slate-300 px-2 py-1 text-right font-mono font-semibold tabular-nums">
                {fmtHours(t.durationMs ?? 0)}
              </td>
            </tr>
          ))}
          {/* Monthly total */}
          <tr className="border border-slate-400 bg-slate-200 font-bold">
            <td
              colSpan={4}
              className="border border-slate-400 px-2 py-1.5 text-right text-[10px] uppercase tracking-wide text-slate-700"
            >
              TOTAL · {group.label.split(" (")[0]}
            </td>
            <td className="border border-slate-400 px-2 py-1.5 text-right font-mono tabular-nums text-slate-900">
              {fmtHours(group.totalMs)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default CentralizedTimesheetDocument;
