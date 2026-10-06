import { checkOrigin, failure, requireAccount } from "@/server/security";
import { listTemplates, createTemplate } from "@/server/templates/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await listTemplates(await requireAccount()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    return Response.json(await createTemplate(await requireAccount()), {
      status: 201,
    });
  } catch (e) {
    return failure(e);
  }
}
