import {
  checkOrigin,
  failure,
  jsonBody,
  requireAccount,
} from "@/server/security";
import { exportReport } from "@/server/reports/export";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  ctx: { params: Promise<{ reportId: string }> },
) {
  try {
    checkOrigin(request);
    return Response.json(
      await exportReport(
        (await ctx.params).reportId,
        await requireAccount(),
        await jsonBody(request),
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
