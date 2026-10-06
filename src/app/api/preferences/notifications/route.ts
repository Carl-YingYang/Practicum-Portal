import { z } from "zod";
import { db } from "@/server/database";
import {
  checkOrigin,
  failure,
  HttpError,
  jsonBody,
  requireAccount,
} from "@/server/security";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z
  .object({
    accountId: z.string().optional(),
    sound: z.boolean(),
    volume: z.number().min(0).max(1),
    readIds: z.array(z.string().max(200)).max(2000),
    seenIds: z.array(z.string().max(200)).max(2000),
  })
  .strict();
const defaults = { sound: false, volume: 0.35, readIds: [], seenIds: [] };
export async function GET() {
  try {
    const account = await requireAccount();
    let raw;
    try {
      raw = JSON.parse(account.notificationPreferencesJson);
    } catch {
      raw = {};
    }
    const parsed = schema.safeParse(raw);
    return Response.json(parsed.success ? parsed.data : defaults, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const account = await requireAccount(),
      parsed = schema.safeParse(await jsonBody(request));
    if (!parsed.success)
      throw new HttpError(400, "Invalid notification preferences.");
    if (parsed.data.accountId !== account.id)
      throw new HttpError(
        403,
        "Notification account changed; reload settings.",
      );
    await db.portalAccount.update({
      where: { id: account.id },
      data: { notificationPreferencesJson: JSON.stringify(parsed.data) },
    });
    return Response.json(parsed.data);
  } catch (e) {
    return failure(e);
  }
}
