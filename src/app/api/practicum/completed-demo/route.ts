import { checkOrigin, requireAccount, failure } from "@/server/security";
import { prepareCompletedDemo } from "@/server/templates/completed-demo";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    return Response.json(await prepareCompletedDemo(await requireAccount()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
