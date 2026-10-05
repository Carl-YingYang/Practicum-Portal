import { accountSnapshot, executeCommand } from "@/server/portal-service";
import {
  requireAccount,
  checkOrigin,
  jsonBody,
  failure,
} from "@/server/security";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  try {
    return Response.json(await accountSnapshot(await requireAccount()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const account = await requireAccount();
    return Response.json(
      await executeCommand(account, await jsonBody(request)),
    );
  } catch (error) {
    return failure(error);
  }
}
