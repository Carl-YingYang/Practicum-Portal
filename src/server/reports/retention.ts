import type { PortalAccount } from "@prisma/client";
import { db } from "@/server/database";
import { HttpError } from "@/server/security";
import { lockReport, reportResponse } from "./service";
/** Deliberate removal of old ZIP bundles only. Keep every Word export, the
 * newest bundle and any bundle with a grammarian-reviewed companion. */
export async function cleanExportBundles(
  id: string,
  account: PortalAccount,
  revision: number,
) {
  await db.$transaction(async (tx) => {
    const r = await lockReport(tx, id, account, revision);
    if (!r.canEdit || r.actor.role === "supervisor")
      throw new HttpError(
        403,
        "Only the author/coordinator manages generated bundles.",
      );
    const protectedIds = new Set(
      (
        await tx.reportAsset.findMany({
          where: { reportId: id, kind: "reviewed" },
          select: { sectionId: true },
        })
      ).map((a) => a.sectionId),
    );
    const latest = r.state.versions.at(-1)?.id;
    const ids = r.state.versions
      .filter((v) => v.id !== latest && !protectedIds.has(v.id))
      .map((v) => v.id);
    await tx.reportAsset.deleteMany({
      where: {
        reportId: id,
        kind: "export",
        mime: "application/zip",
        sectionId: { in: ids },
      },
    });
  });
  return reportResponse(id, account);
}
