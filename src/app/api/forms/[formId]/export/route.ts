import { requireAccount, failure } from "@/server/security";
import { exportFormWord } from "@/server/forms/export";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  ctx: { params: Promise<{ formId: string }> },
) {
  try {
    const url = new URL(request.url),
      file = await exportFormWord(
        await requireAccount(),
        (await ctx.params).formId,
        url.searchParams.get("mode") ?? "blank",
        url.searchParams.get("submission") ?? undefined,
      );
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
