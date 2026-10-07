import type { Prisma } from "@prisma/client";
import type { PortalData } from "@/domain/portal/snapshot";
import { withoutCredentials } from "@/domain/portal/snapshot";
import { HttpError } from "@/server/security";
/** SQLite adapter boundary. A future normalized Postgres adapter can assemble
 * the same domain snapshot without exposing its persistence to components. */
export function decodeSchoolState(stateJson: string): PortalData {
  try {
    const data = JSON.parse(stateJson);
    if (
      !data ||
      !Array.isArray(data.students) ||
      !Array.isArray(data.formDocuments)
    )
      throw Error();
    return data;
  } catch {
    throw new HttpError(
      503,
      "Saved school records could not be read. Restore a database backup; do not reset user records.",
    );
  }
}
export async function writeSchoolState(
  tx: Prisma.TransactionClient,
  schoolId: string,
  expectedRevision: number,
  data: PortalData,
) {
  const result = await tx.portalSchool.updateMany({
    where: { id: schoolId, revision: expectedRevision },
    data: {
      name: data.schoolIdentity.name,
      stateJson: JSON.stringify(withoutCredentials(data)),
    },
  });
  if (!result.count)
    throw new HttpError(409, "School records changed. Reload before retrying.");
}
