import { requireAccount, failure } from "@/server/security";
import { professor } from "@/server/templates/service";
import { storageUsage } from "@/server/storage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const account = await requireAccount();
    await professor(account);
    return Response.json(await storageUsage(account.schoolId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
