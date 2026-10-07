import type { PortalAccount } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { reserveStorage } from "@/server/storage";
import { db } from "@/server/database";
import { HttpError } from "@/server/security";
import { lockDraft, professor, templateResponse } from "./service";
import { templateSchema } from "@/domain/templates/model";
import { syncWordSlots } from "./word";
const schema = z
  .object({
    revision: z.number().int().nonnegative(),
    formId: z.string().min(1),
    sectionKey: z.string().optional(),
    title: z.string().trim().min(1).max(200),
    respondent: z.enum(["student", "supervisor"]),
    required: z.boolean(),
  })
  .strict();
export async function linkForm(
  id: string,
  account: PortalAccount,
  input: unknown,
) {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new HttpError(
      400,
      "Choose the form, destination section and respondent.",
    );
  await db.$transaction(
    async (tx) => {
      const r = await lockDraft(id, account, parsed.data.revision, tx);
      const { data } = await professor(account, tx);
      const form = data.formDocuments.find(
        (f) =>
          f.id === parsed.data.formId && f.status === "published" && !f.origin,
      );
      if (!form)
        throw new HttpError(
          400,
          "Publish a library form first. Existing assignments keep their saved rubric.",
        );
      const content = templateSchema.parse(JSON.parse(r.draftJson));
      const found = content.sections.find(
        (s) => s.key === parsed.data.sectionKey,
      );
      if (parsed.data.sectionKey && !found)
        throw new HttpError(
          409,
          "The destination section changed. Reload and choose again.",
        );
      if (found && found.kind !== "forms")
        throw new HttpError(
          400,
          "Choose a form section or create a new one; written answers cannot be replaced by this action.",
        );
      const section = found ?? {
        key: `form_${randomUUID().slice(0, 8)}`,
        title: parsed.data.title,
        instructions:
          form.description ||
          "Complete the linked form, then send it for review.",
        kind: "forms" as const,
        respondent: parsed.data.respondent,
        required: parsed.data.required,
        pageBreak: true,
        formIds: [],
      };
      if (!found) content.sections.push(section);
      section.respondent = parsed.data.respondent;
      section.required = parsed.data.required;
      if (!section.formIds.includes(form.id)) section.formIds.push(form.id);
      const checked = templateSchema.parse(content);
      const word = r.wordBytes
        ? await syncWordSlots(
            r.wordBytes,
            checked.sections.map((s) => s.key),
            checked.allowStudentExtras,
          )
        : null;
      if (word)
        await reserveStorage(
          tx,
          account.schoolId,
          word.length - (r.wordBytes?.length ?? 0),
        );
      await tx.practicumTemplate.update({
        where: { id },
        data: {
          draftJson: JSON.stringify(checked),
          ...(word ? { wordBytes: new Uint8Array(word) } : {}),
        },
      });
    },
    { timeout: 30000 },
  );
  return templateResponse(id, account);
}
