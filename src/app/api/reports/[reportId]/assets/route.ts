import { boundedUpload } from "@/server/reports/upload-body";
import {
  checkOrigin,
  failure,
  HttpError,
  requireAccount,
} from "@/server/security";
import { uploadReportAsset } from "@/server/reports/assets";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  ctx: { params: Promise<{ reportId: string }> },
) {
  try {
    checkOrigin(request);
    const account = await requireAccount();
    if (Number(request.headers.get("content-length")) > 33 * 1024 * 1024)
      throw new HttpError(413, "Upload limit: 32 MB per file.");
    return Response.json(
      await uploadReportAsset(
        (await ctx.params).reportId,
        account,
        await boundedUpload(request),
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
