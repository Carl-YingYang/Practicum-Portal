import { NextResponse } from "next/server";
import { students, companies, supervisors } from "@/lib/mock-data";
import { hoursPercent } from "@/lib/selectors";

/**
 * GET /api/students
 *
 * Read-only student roster. Returns every student with their company
 * name, supervisor name, hours progress, and active/inactive status.
 *
 * Query params (all optional, combinable):
 *   ?status=active|inactive
 *   ?section=BSCS 3-1
 *   ?schoolYear=2025-2026 2nd Semester
 *   ?company=<companyId>
 *   ?supervisor=<supervisorId>
 *   ?q=<name|studentNo|email>
 *
 * Response 200: { count, filters, generatedAt, rows: Student[] }
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const status = params.get("status")?.trim() || "";
  const section = params.get("section")?.trim() || "";
  const schoolYear = params.get("schoolYear")?.trim() || "";
  const companyId = params.get("company")?.trim() || "";
  const supervisorId = params.get("supervisor")?.trim() || "";
  const q = params.get("q")?.trim().toLowerCase() || "";

  const rows = students
    .map((st) => {
      const company = companies.find((c) => c.id === st.companyId);
      const sup = supervisors.find((s) => s.id === st.supervisorId);
      return {
        id: st.id,
        studentNumber: st.studentNumber,
        name: st.name,
        email: st.email,
        course: st.course,
        section: st.section ?? "",
        schoolYear: st.schoolYear ?? "",
        requiredHours: st.requiredHours,
        loggedHours: st.loggedHours,
        hoursProgressPct: hoursPercent(st),
        status: st.status,
        position: st.position,
        department: st.department,
        workMode: st.workMode,
        startDate: st.startDate,
        endDate: st.endDate,
        company: company
          ? { id: company.id, name: company.name }
          : { id: st.companyId, name: "—" },
        supervisor:
          sup !== undefined ? { id: sup.id, name: sup.name } : null,
      };
    })
    .filter((r) => {
      if (status && r.status !== status) return false;
      if (section && r.section !== section) return false;
      if (schoolYear && r.schoolYear !== schoolYear) return false;
      if (companyId && r.company.id !== companyId) return false;
      if (supervisorId && r.supervisor?.id !== supervisorId) return false;
      if (q) {
        const hay = `${r.name} ${r.studentNumber} ${r.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

  return NextResponse.json({
    count: rows.length,
    filters: {
      status: status || null,
      section: section || null,
      schoolYear: schoolYear || null,
      company: companyId || null,
      supervisor: supervisorId || null,
      q: q || null,
    },
    generatedAt: new Date().toISOString(),
    rows,
  });
}
