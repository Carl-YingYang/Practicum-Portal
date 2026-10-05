import { z } from "zod";
import { db } from "@/server/database";
import {
  checkOrigin,
  failure,
  HttpError,
  jsonBody,
  requireAccount,
} from "@/server/security";
import { defaultWritingPreferences } from "@/domain/writing-assistant";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z
  .object({
    language: z.enum(["english", "filipino", "taglish"]),
    detail: z.enum(["concise", "detailed"]),
  })
  .strict();
export async function GET() {
  try {
    const account = await requireAccount();
    let stored: unknown;
    try {
      stored = JSON.parse(account.writingPreferencesJson);
    } catch {
      stored = {};
    }
    const parsed = schema.safeParse(stored);
    return Response.json(
      { preferences: parsed.success ? parsed.data : defaultWritingPreferences },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const account = await requireAccount();
    const parsed = schema.safeParse(await jsonBody(request));
    if (!parsed.success)
      throw new HttpError(
        400,
        "Choose a supported language and response detail.",
      );
    await db.portalAccount.update({
      where: { id: account.id },
      data: { writingPreferencesJson: JSON.stringify(parsed.data) },
    });
    return Response.json(
      { preferences: parsed.data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
