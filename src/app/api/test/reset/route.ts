import { seedPortal } from "@/server/seed";
import {
  HttpError,
  testMode,
  requireAccount,
  checkOrigin,
  removeSession,
  failure,
} from "@/server/security";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (!testMode()) throw new HttpError(404, "Test reset is unavailable.");
    if ((await requireAccount()).role !== "coordinator")
      throw new HttpError(403, "Only a coordinator can reset test data.");
    await seedPortal(true);
    await removeSession();
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
