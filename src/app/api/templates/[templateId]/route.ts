import { templatePreflight } from "@/server/templates/preflight";
import { templateRecipients } from "@/server/templates/recipients";
import { linkForm } from "@/server/templates/link-form";
import { assignTemplate } from "@/server/templates/assignments";
import {
  checkOrigin,
  failure,
  HttpError,
  jsonBody,
  requireAccount,
} from "@/server/security";
import { inspectTemplateWord } from "@/server/templates/word";
import { boundedUpload } from "@/server/reports/upload-body";
import {
  templateResponse,
  updateTemplate,
  uploadTemplate,
  publishTemplate,
  templateFile,
  archiveTemplate,
  syncTemplateLayout,
  publishedTemplate,
} from "@/server/templates/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ templateId: string }> };
export async function GET(request: Request, ctx: Context) {
  try {
    const account = await requireAccount(),
      id = (await ctx.params).templateId,
      url = new URL(request.url),
      kind = url.searchParams.get("file");
    if (url.searchParams.has("recipients"))
      return Response.json(
        await templateRecipients(
          id,
          account,
          url.searchParams.get("version") ?? undefined,
        ),
        { headers: { "Cache-Control": "no-store" } },
      );
    if (kind === "sample") {
      const record = await templateResponse(id, account);
      const result = await templatePreflight(id, account, record.revision);
      if (result.errors.length || !result.bytes)
        throw new HttpError(400, result.errors.join(" "));
      return new Response(new Uint8Array(result.bytes), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition":
            "attachment; filename=practicum-format-sample.docx",
          "Cache-Control": "no-store",
        },
      });
    }
    if (!kind && url.searchParams.has("version"))
      return Response.json(
        await publishedTemplate(id, url.searchParams.get("version")!, account),
        { headers: { "Cache-Control": "no-store" } },
      );
    if (!kind)
      return Response.json(await templateResponse(id, account), {
        headers: { "Cache-Control": "no-store" },
      });
    const file = await templateFile(
      id,
      account,
      kind,
      url.searchParams.get("version") ?? undefined,
    );
    if (url.searchParams.get("preview") === "true")
      return Response.json(
        { name: file.name, ...(await inspectTemplateWord(file.bytes, false)) },
        { headers: { "Cache-Control": "no-store" } },
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
export async function PUT(request: Request, ctx: Context) {
  try {
    checkOrigin(request);
    return Response.json(
      await updateTemplate(
        (await ctx.params).templateId,
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
      id = (await ctx.params).templateId;
    if (request.headers.get("content-type")?.includes("multipart/form-data"))
      return Response.json(
        await uploadTemplate(id, account, await boundedUpload(request)),
      );
    const body = await jsonBody(request);
    if (!body || typeof body !== "object")
      throw new HttpError(400, "Choose a template action.");
    if (body.action === "preflight") {
      const { bytes: _bytes, ...result } = await templatePreflight(
        id,
        account,
        body.revision,
      );
      return Response.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (body.action === "link") {
      const { action: _action, ...input } = body;
      return Response.json(await linkForm(id, account, input));
    }
    if (body.action === "sync")
      return Response.json(
        await syncTemplateLayout(id, account, body.revision),
      );
    if (body.action === "publish")
      return Response.json(await publishTemplate(id, account, body.revision));
    if (body.action === "archive")
      return Response.json(await archiveTemplate(id, account, body.revision));
    if (body.action === "assign")
      return Response.json(
        await assignTemplate(id, account, {
          versionId: body.versionId,
          studentIds: body.studentIds,
          dueDate: body.dueDate,
        }),
      );
    throw new HttpError(400, "Choose publish, archive or assign.");
  } catch (e) {
    return failure(e);
  }
}
