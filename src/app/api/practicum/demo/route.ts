import { checkOrigin, requireAccount, failure } from "@/server/security";
import { prepareGuidedDemo } from "@/server/templates/guided-demo";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    return Response.json(await prepareGuidedDemo(await requireAccount()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
