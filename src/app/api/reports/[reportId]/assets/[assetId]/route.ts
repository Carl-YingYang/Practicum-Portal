import { db } from "@/server/database";
import { failure, HttpError, requireAccount } from "@/server/security";
import { loadReport } from "@/server/reports/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _: Request,
  ctx: { params: Promise<{ reportId: string; assetId: string }> },
) {
  try {
    const { reportId, assetId } = await ctx.params;
    await loadReport(reportId, await requireAccount());
    const asset = await db.reportAsset.findFirst({
      where: { id: assetId, reportId },
    });
    if (!asset) throw new HttpError(404, "File not found.");
    return new Response(new Uint8Array(asset.bytes), {
      headers: {
        "Content-Type": asset.mime,
        "Content-Disposition": `attachment; filename="${asset.name.replace(/[^a-zA-Z0-9._ -]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(asset.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
