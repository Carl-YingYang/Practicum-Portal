import { NextResponse } from "next/server";
import {
  students,
  supervisors,
  companies,
  timeLogs,
} from "@/lib/mock-data";
import { formatDuration, getCompany, getSupervisor } from "@/lib/selectors";
import type { TimeLog } from "@/lib/types";

/**
 * GET /api/timesheets
 *
 * Centralized intern timesheet index. Returns one row per student with
 * their company, supervisor, completed clock-in/out sessions, total
 * rendered hours, and active/inactive status. Auto-generated from
 * time-clock data — exactly mirrors what the coordinator sees on the
 * "Timesheets" Workflow tab.
 *
 * Query params (all optional, combinable):
 *   ?section=BSCS 3-1      — filter by section/block
 *   ?status=active|inactive
 *   ?schoolYear=2025-2026 2nd Semester
 *   ?company=<companyId>
 *   ?q=<name|studentNo|company>  — free-text search
 *   ?format=index           — default; returns the summary index
 *
 * Response 200:
 *   {
 *     count, filters, generatedAt,
 *     rows: [{
 *       studentId, studentNumber, name, email, course, section,
 *       schoolYear, status, company { id, name }, supervisor { id, name } | null,
 *       sessions: number, totalMs, totalHours, period
 *     }]
 *   }
 *
 * This is a READ-ONLY endpoint backed by mock data. It exists so
 * coordinators / devs / external integrations have a real JSON API to
 * point to (e.g. for a BI dashboard, a Google Sheets import, or a
 * future migration to a persisted DB).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const section = params.get("section")?.trim() || "";
  const status = params.get("status")?.trim() || "";
  const schoolYear = params.get("schoolYear")?.trim() || "";
  const companyId = params.get("company")?.trim() || "";
  const q = params.get("q")?.trim().toLowerCase() || "";

  const rows = students
    .map((st) => {
      const company = getCompany(companies, st.companyId);
      const sup = getSupervisor(supervisors, st.supervisorId);
      const sessions: TimeLog[] = timeLogs.filter(
        (t) =>
          t.userId === st.id &&
          t.role === "student" &&
          t.clockOutAt !== null &&
          t.durationMs,
      );
      const totalMs = sessions.reduce(
        (sum, t) => sum + (t.durationMs ?? 0),
        0,
      );

      // Period string (first – last session date).
      let period = "—";
      if (sessions.length > 0) {
        const sorted = [...sessions].sort((a, b) =>
          a.clockInAt < b.clockInAt ? -1 : 1,
        );
        const fmt = (iso: string) =>
          new Date(iso).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        period =
          sorted.length === 1
            ? fmt(sorted[0].clockInAt)
            : `${fmt(sorted[0].clockInAt)} – ${fmt(sorted[sorted.length - 1].clockInAt)}`;
      }

      return {
        studentId: st.id,
        studentNumber: st.studentNumber,
        name: st.name,
        email: st.email,
        course: st.course,
        section: st.section ?? "",
        schoolYear: st.schoolYear ?? "",
        status: st.status,
        company: company
          ? { id: company.id, name: company.name }
          : { id: st.companyId, name: "—" },
        supervisor:
          sup !== undefined ? { id: sup.id, name: sup.name } : null,
        sessions: sessions.length,
        totalMs,
        totalHours: formatDuration(totalMs),
        period,
      };
    })
    .filter((r) => {
      if (section && r.section !== section) return false;
      if (status && r.status !== status) return false;
      if (schoolYear && r.schoolYear !== schoolYear) return false;
      if (companyId && r.company.id !== companyId) return false;
      if (q) {
        const hay = `${r.name} ${r.studentNumber} ${r.company.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

  return NextResponse.json({
    count: rows.length,
    filters: {
      section: section || null,
      status: status || null,
      schoolYear: schoolYear || null,
      company: companyId || null,
      q: q || null,
    },
    generatedAt: new Date().toISOString(),
    rows,
  });
}
