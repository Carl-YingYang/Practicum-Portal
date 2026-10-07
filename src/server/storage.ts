import { studentUploadPolicy } from "./storage/policy";
import type { Prisma } from "@prisma/client";
import { db } from "./database";
import { HttpError } from "./security";
export const REPORT_STORAGE_BYTES = 100 * 1024 * 1024;
export function schoolBudget() {
  const mb = Number(process.env.PORTAL_STORAGE_MB ?? 512);
  return (
    (Number.isFinite(mb) && mb >= 1 && mb <= 102400 ? mb : 512) * 1024 * 1024
  );
}
export async function storageUsage(
  schoolId: string,
  tx: Prisma.TransactionClient = db,
) {
  const assets = await tx.reportAsset.aggregate({
    where: { report: { schoolId } },
    _sum: { size: true },
    _count: true,
  });
  const rows = await tx.$queryRaw<{ bytes: bigint | number }[]>`
    SELECT COALESCE((SELECT SUM(COALESCE(length(wordBytes),0) + COALESCE(length(exampleBytes),0)) FROM PracticumTemplate WHERE schoolId=${schoolId}),0)
    + COALESCE((SELECT SUM(length(v.wordBytes) + COALESCE(length(v.exampleBytes),0)) FROM PracticumTemplateVersion v JOIN PracticumTemplate t ON t.id=v.templateId WHERE t.schoolId=${schoolId}),0) AS bytes`;
  const templateBytes = Number(rows[0]?.bytes ?? 0);
  return {
    usedBytes: (assets._sum.size ?? 0) + templateBytes,
    reportBytes: assets._sum.size ?? 0,
    templateBytes,
    files: assets._count,
    limitBytes: schoolBudget(),
    studentUploads: studentUploadPolicy(),
    reportLimitBytes: REPORT_STORAGE_BYTES,
  };
}
/** Acquire the same school write lock as portal commands before counting.
 * Existing files remain readable even when a smaller budget is configured. */
export async function reserveStorage(
  tx: Prisma.TransactionClient,
  schoolId: string,
  growth: number,
) {
  await tx.portalSchool.update({
    where: { id: schoolId },
    data: { revision: { increment: 0 } },
  });
  const usage = await storageUsage(schoolId, tx);
  if (growth > 0 && usage.usedBytes + growth > usage.limitBytes)
    throw new HttpError(
      413,
      "School file storage is full. Remove unused evidence or old generated bundles in the report export history, then retry. Existing records are retained.",
    );
}
