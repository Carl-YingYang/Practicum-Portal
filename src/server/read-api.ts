import { accountSnapshot } from "./portal-service";
import { failure, requireAccount } from "./security";
import type { PortalData } from "@/domain/portal/snapshot";
export async function readCollection(
  collection: keyof PortalData,
  studentId?: string,
) {
  try {
    const result = await accountSnapshot(await requireAccount());
    if (studentId && !result.data.students.some((s) => s.id === studentId))
      return Response.json(
        { error: "Student not available." },
        { status: 404 },
      );
    const data = result.data[collection];
    return Response.json(
      {
        data:
          studentId && Array.isArray(data)
            ? data.filter(
                (item) => "userId" in item && item.userId === studentId,
              )
            : data,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
