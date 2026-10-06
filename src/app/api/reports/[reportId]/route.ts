import { HttpError } from "@/server/security";
import {
  checkOrigin,
  failure,
  jsonBody,
  requireAccount,
} from "@/server/security";
import {
  reportResponse,
  reviewSection,
  updateReport,
} from "@/server/reports/service";
import { updateAsset } from "@/server/reports/assets";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ reportId: string }> };
export async function GET(_: Request, ctx: Context) {
  try {
    return Response.json(
      await reportResponse((await ctx.params).reportId, await requireAccount()),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(request: Request, ctx: Context) {
  try {
    checkOrigin(request);
    return Response.json(
      await updateReport(
        (await ctx.params).reportId,
        await requireAccount(),
        await jsonBody(request),
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request, ctx: Context) {
  try {
    checkOrigin(request);
    const account = await requireAccount(),
      id = (await ctx.params).reportId,
      body = await jsonBody(request);
    if (!body || !["review", "asset"].includes(body.action))
      throw new HttpError(400, "Choose a report review or evidence action.");
    return Response.json(
      body.action === "review"
        ? await reviewSection(id, account, body)
        : await updateAsset(id, account, body),
    );
  } catch (e) {
    return failure(e);
  }
}
