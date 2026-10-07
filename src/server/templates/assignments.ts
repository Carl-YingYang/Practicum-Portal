import type { PortalAccount, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/server/database";
import { HttpError } from "@/server/security";
import { reportResponse, lockReport } from "@/server/reports/service";
import { professor, draft } from "./service";
import { createReportContent } from "@/domain/reports/model";
import { accountUsers } from "@/lib/prototype";
import {
  templateSchema,
  assignedSections,
  type TemplateContent,
  type TemplateBinding,
} from "@/domain/templates/model";
type Database = Prisma.TransactionClient;
const assignmentSchema = z
  .object({
    versionId: z.string(),
    studentIds: z.array(z.string()).min(1).max(100),
    dueDate: z.string().nullable(),
  })
  .strict();
function validDate(date: string | null) {
  return (
    date === null ||
    (/^\d{4}-\d{2}-\d{2}$/.test(date) &&
      Number.isFinite(Date.parse(date + "T12:00:00Z")) &&
      new Date(date + "T12:00:00Z").toISOString().slice(0, 10) === date)
  );
}
function bindingFor(
  version: {
    id: string;
    templateId: string;
    number: number;
    exampleName?: string | null;
  },
  content: TemplateContent,
  dueDate: string | null,
): TemplateBinding {
  return {
    contextual: content.contextVersion === 1,
    cycle: content.cycle,
    hasExample: !!version.exampleName,
    versionId: version.id,
    templateId: version.templateId,
    number: version.number,
    title: content.title,
    dueDate,
    allowStudentExtras: content.allowStudentExtras,
    sections: content.sections,
  };
}
async function assignLinkedForms(
  tx: Database,
  account: PortalAccount,
  binding: TemplateBinding,
  studentId: string,
) {
  const school = await tx.portalSchool.findUniqueOrThrow({
    where: { id: account.schoolId },
  });
  const { data, actor } = await professor(account, tx),
    student = data.students.find((s) => s.id === studentId)!;
  const users = accountUsers(data);
  let changed = false;
  binding.assignments ??= {};
  for (const section of binding.sections)
    for (const fid of section.formIds) {
      const user =
        section.respondent === "student"
          ? users.find((u) => u.studentId === studentId)
          : users.find((u) => u.supervisorId === student.supervisorId);
      const liveUser = user
        ? await tx.portalAccount.findFirst({
            where: {
              schoolId: account.schoolId,
              profileId:
                section.respondent === "student"
                  ? studentId
                  : (student.supervisorId ?? ""),
              role: section.respondent,
              status: "active",
            },
          })
        : null;
      if (!user || !liveUser)
        throw new HttpError(
          400,
          `${student.name} needs an active ${section.respondent} account for ${section.title}.`,
        );
      if (
        !data.formDocuments.some(
          (f) => f.id === fid && f.status === "published",
        )
      )
        throw new HttpError(
          409,
          "A linked form was archived. Publish a new template version with an active form.",
        );
      if (binding.contextual) {
        const assignment = data.formAssignments.find(
          (a) =>
            a.reportId === binding.reportId &&
            a.sectionKey === section.key &&
            a.formId === fid &&
            !a.retired,
        );
        const aid = assignment?.id ?? randomUUID();
        (binding.assignments[section.key] ??= {})[fid] = aid;
        if (!assignment) {
          data.formAssignments.push({
            id: aid,
            formId: fid,
            reportId: binding.reportId,
            sectionKey: section.key,
            sectionTitle: section.title,
            reportTitle: binding.title,
            templateVersion: binding.number,
            studentId,
            cycle: binding.cycle,
            target: "specific_users",
            targetUserIds: [user.id],
            dueDate: binding.dueDate,
            createdBy: actor.id,
            createdAt: new Date().toISOString(),
          });
          changed = true;
        }
        continue;
      }
      if (
        !data.formAssignments.some(
          (a) =>
            a.formId === fid &&
            (a.target === "specific_users"
              ? a.targetUserIds.includes(user.id)
              : a.target === `all_${section.respondent}s`),
        )
      ) {
        data.formAssignments.push({
          id: randomUUID(),
          formId: fid,
          target: "specific_users",
          targetUserIds: [user.id],
          dueDate: binding.dueDate,
          createdBy: actor.id,
          createdAt: new Date().toISOString(),
        });
        changed = true;
      }
    }
  if (changed) {
    const saved = await tx.portalSchool.updateMany({
      where: { id: school.id, revision: school.revision },
      data: { stateJson: JSON.stringify(data), revision: { increment: 1 } },
    });
    if (!saved.count)
      throw new HttpError(
        409,
        "Portal records changed. Reload and retry assignment.",
      );
  }
}
export async function assignTemplate(
  id: string,
  account: PortalAccount,
  input: unknown,
) {
  const parsed = assignmentSchema.safeParse(input);
  if (
    !parsed.success ||
    !validDate(parsed.data.dueDate) ||
    new Set(parsed.data.studentIds).size !== parsed.data.studentIds.length
  )
    throw new HttpError(
      400,
      "Choose distinct students and a valid optional due date.",
    );
  const ids: string[] = [];
  await db.$transaction(
    async (tx) => {
      const r = await draft(id, account, tx);
      if (r.archived) throw new HttpError(409, "This template is archived.");
      const { data } = await professor(account, tx),
        version = await tx.practicumTemplateVersion.findFirst({
          where: { id: parsed.data.versionId, templateId: id },
        });
      if (!version) throw new HttpError(404, "Published version not found.");
      const config = templateSchema.parse(JSON.parse(version.schemaJson));
      for (const studentId of parsed.data.studentIds) {
        const student = data.students.find((s) => s.id === studentId);
        if (!student)
          throw new HttpError(400, "A selected student is unavailable.");
        const owner = await tx.portalAccount.findFirst({
          where: {
            schoolId: account.schoolId,
            role: "student",
            profileId: studentId,
            status: "active",
          },
        });
        if (!owner)
          throw new HttpError(
            400,
            `${student.name} needs an active student account.`,
          );
        const existing = await tx.practicumAssignment.findUnique({
          where: { versionId_studentId: { versionId: version.id, studentId } },
        });
        if (existing) {
          ids.push(existing.reportId);
          continue;
        }
        const reportId = randomUUID();
        const binding = bindingFor(version, config, parsed.data.dueDate);
        binding.reportId = reportId;
        binding.cycle ||= student.schoolYear || "Current practicum";
        await assignLinkedForms(tx, account, binding, studentId);
        const content = createReportContent([studentId], randomUUID);
        content.title = config.title;
        content.settings.degree = student.course;
        content.settings.start = student.startDate ?? "";
        content.settings.end = student.endDate ?? "";
        content.sections = assignedSections(config, studentId, randomUUID);
        await tx.practicumReport.create({
          data: {
            id: reportId,
            schoolId: account.schoolId,
            ownerId: owner.id,
            stateJson: JSON.stringify({ content, versions: [], binding }),
          },
        });
        await tx.practicumAssignment.create({
          data: {
            id: randomUUID(),
            versionId: version.id,
            studentId,
            reportId,
            dueDate: parsed.data.dueDate,
          },
        });
        ids.push(reportId);
      }
    },
    { timeout: 60000 },
  );
  return { reportIds: ids };
}
export async function upgradeAssignment(
  reportId: string,
  account: PortalAccount,
  input: { revision: number; versionId: string },
) {
  const parsed = z
    .object({
      revision: z.number().int().nonnegative(),
      versionId: z.string().min(1).max(100),
    })
    .safeParse(input);
  if (!parsed.success)
    throw new HttpError(
      400,
      "Choose a valid saved revision and published version.",
    );
  await professor(account);
  await db.$transaction(
    async (tx) => {
      const r = await lockReport(tx, reportId, account, input.revision),
        old = r.state.binding;
      if (!old)
        throw new HttpError(
          400,
          "This is an independent draft, not a template assignment.",
        );
      const version = await tx.practicumTemplateVersion.findFirst({
        where: { id: input.versionId, templateId: old.templateId },
      });
      if (!version || version.number <= old.number)
        throw new HttpError(
          400,
          "Choose a newer published version of the same template.",
        );
      const duplicate = await tx.practicumAssignment.findUnique({
        where: {
          versionId_studentId: {
            versionId: version.id,
            studentId: r.state.content.studentIds[0],
          },
        },
      });
      if (duplicate && duplicate.reportId !== reportId)
        throw new HttpError(
          409,
          "This student already has a separate report on that version. Keep both reports or continue the existing assignment.",
        );
      const config = templateSchema.parse(JSON.parse(version.schemaJson)),
        binding = bindingFor(version, config, old.dueDate),
        previous = r.state.content.sections;
      const next = assignedSections(
        config,
        r.state.content.studentIds[0],
        randomUUID,
      ).map((s) => {
        const prev = previous.find((p) => p.template === s.template);
        if (!prev) return s;
        const oldDef = old.sections.find((d) => d.key === s.template),
          nextDef = config.sections.find((d) => d.key === s.template);
        const changed = JSON.stringify(oldDef) !== JSON.stringify(nextDef);
        return {
          ...s,
          id: prev.id,
          body: prev.body,
          included: s.required || prev.included,
          status: changed ? ("draft" as const) : prev.status,
          reviewNote: prev.reviewNote,
          reviewedAt: changed ? null : prev.reviewedAt,
          reviewedSource: changed ? undefined : prev.reviewedSource,
        };
      });
      if (config.allowStudentExtras)
        next.push(
          ...previous.filter(
            (s) =>
              s.template.startsWith("custom_") &&
              !old.sections.some((d) => d.key === s.template) &&
              !next.some((n) => n.id === s.id),
          ),
        );
      const retired = previous.filter((p) => !next.some((n) => n.id === p.id));
      r.state.retiredSections = [
        ...(r.state.retiredSections ?? []),
        ...retired.map((section) => ({ section, version: old.number })),
      ];
      r.state.formatHistory = [
        ...(r.state.formatHistory ?? []),
        {
          from: old.number,
          to: version.number,
          at: new Date().toISOString(),
          by: account.id,
        },
      ];
      r.state.content = {
        ...r.state.content,
        title: config.title,
        sections: next,
      };
      binding.reportId = reportId;
      binding.cycle ||= old.cycle;
      if (old.contextual) {
        const school = await tx.portalSchool.update({
          where: { id: account.schoolId },
          data: { revision: { increment: 1 } },
        });
        const data = JSON.parse(
          school.stateJson,
        ) as import("@/domain/portal/snapshot").PortalData;
        for (const a of data.formAssignments)
          if (a.reportId === reportId) a.retired = true;
        await tx.portalSchool.update({
          where: { id: school.id },
          data: { stateJson: JSON.stringify(data) },
        });
      }
      r.state.binding = binding;
      await assignLinkedForms(
        tx,
        account,
        binding,
        r.state.content.studentIds[0],
      );
      await tx.practicumReport.update({
        where: { id: reportId },
        data: { stateJson: JSON.stringify(r.state) },
      });
      await tx.practicumAssignment.update({
        where: { reportId },
        data: { versionId: version.id },
      });
    },
    { timeout: 60000 },
  );
  return reportResponse(reportId, account);
}
