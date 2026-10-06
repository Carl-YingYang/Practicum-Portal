import { db } from "@/server/database";
import {
  checkOrigin,
  failure,
  jsonBody,
  requireAccount,
} from "@/server/security";
import {
  canReadReport,
  createReport,
  reportContext,
  type ReportState,
} from "@/server/reports/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const account = await requireAccount();
    const { actor, data } = await reportContext(account);
    const reports = await db.practicumReport.findMany({
      where: { schoolId: account.schoolId },
      orderBy: { updatedAt: "desc" },
    });
    return Response.json(
      {
        reports: reports.flatMap((r) => {
          const state = JSON.parse(r.stateJson) as ReportState;
          return canReadReport(state.content, actor, data)
            ? [
                {
                  id: r.id,
                  title: state.content.title,
                  templateVersion: state.binding?.number ?? null,
                  dueDate: state.binding?.dueDate ?? null,
                  ready: state.content.sections.filter(
                    (s) => s.included && s.status === "ready",
                  ).length,
                  studentIds: state.content.studentIds,
                  updatedAt: r.updatedAt,
                },
              ]
            : [];
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    return Response.json(
      await createReport(await requireAccount(), await jsonBody(request)),
      { status: 201 },
    );
  } catch (e) {
    return failure(e);
  }
}
