import type { PortalAccount, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { db } from "@/server/database";
import { HttpError } from "@/server/security";
import { reportContext, loadReport } from "@/server/reports/service";
import {
  pilotContent,
  templateSchema,
  templateErrors,
  type TemplateContent,
} from "@/domain/templates/model";
import { reserveStorage } from "@/server/storage";
import { pinPublishedForms } from "./published-forms";
import { inspectTemplateWord } from "./word";
type Database = Prisma.TransactionClient;
export async function professor(account: PortalAccount, tx: Database = db) {
  const ctx = await reportContext(account, tx);
  if (ctx.actor.role !== "coordinator")
    throw new HttpError(
      403,
      "Only the professor/coordinator manages official templates and assignments.",
    );
  return ctx;
}
export async function draft(
  id: string,
  account: PortalAccount,
  tx: Database = db,
) {
  await professor(account, tx);
  const record = await tx.practicumTemplate.findFirst({
    where: { id, schoolId: account.schoolId },
  });
  if (!record) throw new HttpError(404, "Template not found.");
  return record;
}
export async function lockDraft(
  id: string,
  account: PortalAccount,
  revision: number,
  tx: Database,
) {
  if (!Number.isInteger(revision) || revision < 0)
    throw new HttpError(400, "Supply the saved template revision.");
  const record = await draft(id, account, tx);
  if (record.archived)
    throw new HttpError(
      409,
      "Archived templates cannot be changed or assigned.",
    );
  if (
    !(
      await tx.practicumTemplate.updateMany({
        where: { id, revision },
        data: { revision: { increment: 1 } },
      })
    ).count
  )
    throw new HttpError(
      409,
      "Template changed in another session. Reload before merging your edits.",
    );
  return record;
}
export async function listTemplates(account: PortalAccount) {
  await professor(account);
  const records = await db.practicumTemplate.findMany({
    where: { schoolId: account.schoolId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      draftJson: true,
      revision: true,
      archived: true,
      versions: {
        orderBy: { number: "desc" },
        take: 1,
        select: { number: true },
      },
    },
  });
  return {
    templates: records.map((r) => ({
      id: r.id,
      title: (JSON.parse(r.draftJson) as TemplateContent).title,
      revision: r.revision,
      archived: r.archived,
      latestVersion: r.versions[0]?.number ?? null,
    })),
  };
}
export async function templateResponse(id: string, account: PortalAccount) {
  const r = await draft(id, account);
  const info = r.wordBytes
    ? await inspectTemplateWord(r.wordBytes, false)
    : { slots: [], preview: [] };
  const versions = await db.practicumTemplateVersion.findMany({
    where: { templateId: id },
    select: {
      id: true,
      number: true,
      schemaJson: true,
      publishedAt: true,
      _count: { select: { assignments: true } },
    },
    orderBy: { number: "desc" },
  });
  return {
    id,
    revision: r.revision,
    content: JSON.parse(r.draftJson) as TemplateContent,
    archived: r.archived,
    wordName: r.wordName,
    exampleName: r.exampleName,
    ...info,
    versions: versions.map((v) => ({
      id: v.id,
      number: v.number,
      title: (JSON.parse(v.schemaJson) as TemplateContent).title,
      publishedAt: v.publishedAt.toISOString(),
      assignments: v._count.assignments,
    })),
  };
}
export async function createTemplate(
  account: PortalAccount,
  id: string = randomUUID(),
) {
  await professor(account);
  const bytes = await readFile(
    join(process.cwd(), "public/templates/practicum-pilot.docx"),
  );
  await db.$transaction(async (tx) => {
    await reserveStorage(tx, account.schoolId, bytes.length);
    await tx.practicumTemplate.create({
      data: {
        id,
        schoolId: account.schoolId,
        ownerId: account.id,
        draftJson: JSON.stringify(pilotContent()),
        wordName: "practicum-pilot.docx",
        wordBytes: new Uint8Array(bytes),
      },
    });
  });
  return templateResponse(id, account);
}
export async function updateTemplate(
  id: string,
  account: PortalAccount,
  input: unknown,
) {
  const parsed = z
    .object({
      revision: z.number().int().nonnegative(),
      content: templateSchema,
    })
    .strict()
    .safeParse(input);
  if (!parsed.success)
    throw new HttpError(400, "Invalid template settings or sections.");
  const keys = parsed.data.content.sections.map((s) => s.key);
  if (new Set(keys).size !== keys.length)
    throw new HttpError(400, "Section keys must be unique.");
  await db.$transaction(async (tx) => {
    await lockDraft(id, account, parsed.data.revision, tx);
    await tx.practicumTemplate.update({
      where: { id },
      data: { draftJson: JSON.stringify(parsed.data.content) },
    });
  });
  return templateResponse(id, account);
}
export async function uploadTemplate(
  id: string,
  account: PortalAccount,
  form: FormData,
) {
  const file = form.get("file"),
    kind = form.get("kind"),
    revision = Number(form.get("revision"));
  if (!(file instanceof File) || !["word", "example"].includes(String(kind)))
    throw new HttpError(
      400,
      "Choose a blank format or separate filled example DOCX.",
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  await inspectTemplateWord(bytes, kind === "word");
  const name =
    file.name
      .replace(/[^\p{L}\p{N} ._-]/gu, "_")
      .slice(0, 150)
      .replace(/\.[^.]*$/, "") + ".docx";
  await db.$transaction(async (tx) => {
    const r = await lockDraft(id, account, revision, tx);
    await reserveStorage(
      tx,
      account.schoolId,
      bytes.length -
        (kind === "word"
          ? (r.wordBytes?.length ?? 0)
          : (r.exampleBytes?.length ?? 0)),
    );
    await tx.practicumTemplate.update({
      where: { id },
      data:
        kind === "word"
          ? { wordBytes: bytes, wordName: name }
          : { exampleBytes: bytes, exampleName: name },
    });
  });
  return templateResponse(id, account);
}
export async function publishTemplate(
  id: string,
  account: PortalAccount,
  revision: number,
) {
  await db.$transaction(
    async (tx) => {
      const r = await lockDraft(id, account, revision, tx),
        content = templateSchema.parse(JSON.parse(r.draftJson));
      if (!r.wordBytes || !r.wordName)
        throw new HttpError(400, "Upload a mapped blank Word format first.");
      const info = await inspectTemplateWord(r.wordBytes),
        errors = templateErrors(content, info.slots);
      const { data } = await professor(account, tx);
      for (const s of content.sections) {
        if (s.kind === "forms" && !s.formIds.length)
          errors.push(
            `${s.title}: link at least one published form before publishing this format.`,
          );
        if (s.kind !== "forms" && s.formIds.length)
          errors.push(`${s.title}: only form sections can link forms.`);
        if (s.formIds.length && s.respondent === "coordinator")
          errors.push(
            `${s.title}: linked forms support student or supervisor respondents.`,
          );
        for (const fid of s.formIds)
          if (
            !data.formDocuments.some(
              (f) => f.id === fid && f.status === "published",
            )
          )
            errors.push(`${s.title}: select published forms.`);
      }
      if (errors.length) throw new HttpError(400, errors.join(" "));
      const { buildFormatSample } = await import("./preflight");
      const checked = await buildFormatSample(r.wordBytes, content, data);
      if (checked.errors.length)
        throw new HttpError(400, checked.errors.join(" "));
      const latest = await tx.practicumTemplateVersion.findFirst({
        where: { templateId: id },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      await reserveStorage(
        tx,
        account.schoolId,
        r.wordBytes.length + (r.exampleBytes?.length ?? 0),
      );
      const versionId = randomUUID();
      const pinned = await pinPublishedForms(
        tx,
        account,
        content,
        id,
        versionId,
      );
      await tx.practicumTemplateVersion.create({
        data: {
          id: versionId,
          templateId: id,
          number: (latest?.number ?? 0) + 1,
          schemaJson: JSON.stringify(pinned),
          wordBytes: r.wordBytes,
          wordName: r.wordName,
          exampleBytes: r.exampleBytes,
          exampleName: r.exampleName,
        },
      });
    },
    { timeout: 30000 },
  );
  return templateResponse(id, account);
}
export async function templateFile(
  id: string,
  account: PortalAccount,
  kind: string,
  versionId?: string,
) {
  if (!["word", "example"].includes(kind))
    throw new HttpError(400, "Choose a format or example.");
  if (versionId) {
    const version = await db.practicumTemplateVersion.findFirst({
      where: {
        id: versionId,
        templateId: id,
        template: { schoolId: account.schoolId },
      },
    });
    if (!version) throw new HttpError(404, "Version not found.");
    const { actor } = await reportContext(account);
    if (actor.role !== "coordinator") {
      const assignments = await db.practicumAssignment.findMany({
        where: { versionId },
        select: { reportId: true },
      });
      let allowed = false;
      for (const a of assignments) {
        try {
          await loadReport(a.reportId, account);
          allowed = true;
          break;
        } catch {
          /* Another student's assignment. */
        }
      }
      if (!allowed)
        throw new HttpError(403, "This version is not assigned to you.");
    }
    const bytes = kind === "word" ? version.wordBytes : version.exampleBytes,
      name = kind === "word" ? version.wordName : version.exampleName;
    if (!bytes || !name)
      throw new HttpError(404, "No separate example has been uploaded.");
    return { bytes, name };
  }
  const r = await draft(id, account),
    bytes = kind === "word" ? r.wordBytes : r.exampleBytes,
    name = kind === "word" ? r.wordName : r.exampleName;
  if (!bytes || !name) throw new HttpError(404, "File not found.");
  return { bytes, name };
}
export async function archiveTemplate(
  id: string,
  account: PortalAccount,
  revision: number,
) {
  await db.$transaction(async (tx) => {
    await lockDraft(id, account, revision, tx);
    await tx.practicumTemplate.update({
      where: { id },
      data: { archived: true },
    });
  });
  return templateResponse(id, account);
}

export async function syncTemplateLayout(
  id: string,
  account: PortalAccount,
  revision: number,
) {
  await db.$transaction(
    async (tx) => {
      const r = await lockDraft(id, account, revision, tx),
        content = templateSchema.parse(JSON.parse(r.draftJson));
      if (!r.wordBytes)
        throw new HttpError(400, "Upload a blank format first.");
      const { syncWordSlots } = await import("./word");
      const bytes = await syncWordSlots(
        r.wordBytes,
        content.sections.map((s) => s.key),
        content.allowStudentExtras,
      );
      await reserveStorage(
        tx,
        account.schoolId,
        bytes.length - r.wordBytes.length,
      );
      await tx.practicumTemplate.update({
        where: { id },
        data: { wordBytes: new Uint8Array(bytes) },
      });
    },
    { timeout: 30000 },
  );
  return templateResponse(id, account);
}
export async function publishedTemplate(
  id: string,
  versionId: string,
  account: PortalAccount,
) {
  await professor(account);
  const v = await db.practicumTemplateVersion.findFirst({
    where: {
      id: versionId,
      templateId: id,
      template: { schoolId: account.schoolId },
    },
  });
  if (!v) throw new HttpError(404, "Published version not found.");
  return {
    id: v.id,
    number: v.number,
    content: templateSchema.parse(JSON.parse(v.schemaJson)),
  };
}
