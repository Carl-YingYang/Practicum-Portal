import { NextResponse } from "next/server";
import {
  students,
  supervisors,
  companies,
  timeLogs,
} from "@/lib/mock-data";
import { formatDuration, getCompany, getSupervisor } from "@/lib/selectors";

/**
 * GET /api/timesheets/:studentId
 *
 * Full timesheet detail for a single intern — the raw clock-in/out
 * sessions plus a month-by-month breakdown (mirrors the PDF layout).
 * Used by the preview modal and any external consumer that needs the
 * granular session list.
 *
 * Response 200:
 *   {
 *     student, company, supervisor, sessions: TimeLog[],
 *     totalMs, totalHours, months: [{ label, sessions, totalMs, totalHours }]
 *   }
 * Response 404: { error: "Student not found" }
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const st = students.find((s) => s.id === studentId);
  if (!st) {
    return NextResponse.json(
      { error: "Student not found", studentId },
      { status: 404 },
    );
  }

  const company = getCompany(companies, st.companyId);
  const sup = getSupervisor(supervisors, st.supervisorId);
  const sessions = timeLogs
    .filter(
      (t) =>
        t.userId === st.id &&
        t.role === "student" &&
        t.clockOutAt !== null &&
        t.durationMs,
    )
    .sort((a, b) => (a.clockInAt < b.clockInAt ? -1 : 1));

  const totalMs = sessions.reduce(
    (sum, t) => sum + (t.durationMs ?? 0),
    0,
  );

  // Month-by-month breakdown.
  const monthMap = new Map<
    string,
    { label: string; sessions: number; totalMs: number }
  >();
  for (const t of sessions) {
    const d = new Date(t.clockInAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap.has(key)) {
      const monthName = d.toLocaleDateString("en-US", { month: "long" });
      monthMap.set(key, {
        label: `${monthName} ${d.getFullYear()}`,
        sessions: 0,
        totalMs: 0,
      });
    }
    const g = monthMap.get(key)!;
    g.sessions += 1;
    g.totalMs += t.durationMs ?? 0;
  }
  const months = Array.from(monthMap.values()).map((m) => ({
    ...m,
    totalHours: formatDuration(m.totalMs),
  }));

  return NextResponse.json({
    student: {
      id: st.id,
      studentNumber: st.studentNumber,
      name: st.name,
      email: st.email,
      course: st.course,
      section: st.section ?? "",
      schoolYear: st.schoolYear ?? "",
      status: st.status,
      requiredHours: st.requiredHours,
      loggedHours: st.loggedHours,
    },
    company: company
      ? { id: company.id, name: company.name }
      : { id: st.companyId, name: "—" },
    supervisor:
      sup !== undefined ? { id: sup.id, name: sup.name, title: sup.title } : null,
    sessions: sessions.map((t) => ({
      id: t.id,
      clockInAt: t.clockInAt,
      clockOutAt: t.clockOutAt,
      durationMs: t.durationMs,
      hours: formatDuration(t.durationMs ?? 0),
    })),
    sessionsCount: sessions.length,
    totalMs,
    totalHours: formatDuration(totalMs),
    months,
  });
}
