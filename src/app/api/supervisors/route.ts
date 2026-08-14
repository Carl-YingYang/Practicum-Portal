import { NextResponse } from "next/server";
import { supervisors, companies, students } from "@/lib/mock-data";
import { supervisorLoad, supervisorLoadPct, capacityStatus } from "@/lib/selectors";

/**
 * GET /api/supervisors
 *
 * Read-only supervisor roster. Returns every company supervisor with
 * their company, intern load, capacity, and active/inactive status.
 * Designed for CSV/Google-Sheets export and BI dashboards.
 *
 * Query params (all optional):
 *   ?status=active|inactive
 *   ?company=<companyId>
 *   ?department=Engineering|QA|Design|Marketing|Operations|Other
 *   ?q=<name|email>
 *
 * Response 200: { count, filters, generatedAt, rows }
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const status = params.get("status")?.trim() || "";
  const companyId = params.get("company")?.trim() || "";
  const department = params.get("department")?.trim() || "";
  const q = params.get("q")?.trim().toLowerCase() || "";

  const rows = supervisors
    .map((sup) => {
      const company = companies.find((c) => c.id === sup.companyId);
      const load = supervisorLoad(students, sup.id);
      const loadPct = supervisorLoadPct(students, sup);
      return {
        id: sup.id,
        idNumber: sup.idNumber ?? "",
        name: sup.name,
        email: sup.email,
        phone: sup.phone ?? "",
        salutation: sup.salutation ?? "",
        title: sup.title,
        department: sup.department,
        capacity: sup.capacity,
        internCount: load,
        loadPct,
        capacityStatus: capacityStatus(students, sup),
        status: sup.status,
        schoolYear: sup.schoolYear ?? "",
        company: company
          ? { id: company.id, name: company.name }
          : { id: sup.companyId, name: "—" },
      };
    })
    .filter((r) => {
      if (status && r.status !== status) return false;
      if (companyId && r.company.id !== companyId) return false;
      if (department && r.department !== department) return false;
      if (q) {
        const hay = `${r.name} ${r.email} ${r.idNumber}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

  return NextResponse.json({
    count: rows.length,
    filters: {
      status: status || null,
      company: companyId || null,
      department: department || null,
      q: q || null,
    },
    generatedAt: new Date().toISOString(),
    rows,
  });
}
