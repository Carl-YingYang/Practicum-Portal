import type { PortalAccount, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { PortalData } from "@/domain/portal/snapshot";
import type { TemplateContent } from "@/domain/templates/model";
import { HttpError } from "@/server/security";

/** One shared immutable definition per form/version, never per student. */
export async function pinPublishedForms(
  tx: Prisma.TransactionClient,
  account: PortalAccount,
  content: TemplateContent,
  templateId: string,
  versionId: string,
) {
  const school = await tx.portalSchool.update({
    where: { id: account.schoolId },
    data: { revision: { increment: 1 } },
  });
  const data = JSON.parse(school.stateJson) as PortalData;
  const copies = new Map<string, string>();
  const sections = content.sections.map((section) => ({
    ...section,
    formIds: section.formIds.map((id) => {
      if (copies.has(id)) return copies.get(id)!;
      const original = data.formDocuments.find(
        (f) => f.id === id && f.status === "published" && !f.origin,
      );
      if (!original)
        throw new HttpError(
          409,
          "Choose an active published library form, then publish again.",
        );
      const copy = structuredClone(original);
      copy.id = randomUUID();
      copy.origin = {
        formId: original.id,
        version: original.version,
        templateId,
        templateVersionId: versionId,
      };
      data.formDocuments.push(copy);
      copies.set(id, copy.id);
      return copy.id;
    }),
  }));
  await tx.portalSchool.update({
    where: { id: school.id },
    data: { stateJson: JSON.stringify(data) },
  });
  return { ...content, contextVersion: 1 as const, sections };
}
