import type { PortalAccount } from "@prisma/client";
import { db } from "@/server/database";
import { demoEnabled, HttpError } from "@/server/security";
import {
  professor,
  createTemplate,
  updateTemplate,
  syncTemplateLayout,
  publishTemplate,
  templateResponse,
  uploadTemplate,
} from "./service";
import { assignTemplate } from "./assignments";
import { executeCommand } from "@/server/portal-service";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { randomUUID, createHash } from "node:crypto";
/** Resumable setup: fixed fixture titles are unique within this test school.
 * Saved answers/accounts remain untouched, and no response is auto-approved. */
const pending = new Map<string, Promise<Awaited<ReturnType<typeof setup>>>>();
export async function prepareGuidedDemo(account: PortalAccount) {
  await professor(account);
  if (!demoEnabled() || !account.isDemo)
    throw new HttpError(
      403,
      "Guided sample setup is available only for enabled testing accounts.",
    );
  const existing = pending.get(account.schoolId);
  if (existing) return existing;
  const task = setup(account);
  pending.set(account.schoolId, task);
  try {
    return await task;
  } finally {
    if (pending.get(account.schoolId) === task)
      pending.delete(account.schoolId);
  }
}
async function setup(account: PortalAccount) {
  await professor(account);
  if (!demoEnabled() || !account.isDemo)
    throw new HttpError(
      403,
      "Guided sample setup is available only for enabled testing accounts.",
    );
  const { data } = await professor(account);
  const student = data.students.find(
    (s) => s.supervisorId && s.status === "active",
  );
  if (!student)
    throw new HttpError(
      400,
      "Add an active sample student with an assigned supervisor first.",
    );
  const definitions = [
    {
      title: "Guided demo — Student reflection",
      description:
        "Briefly describe one thing you learned. Submit this response for coordinator review.",
      category: "other",
      templateKey: "reflection",
    },
    {
      title: "Guided demo — Supervisor evaluation",
      description:
        "Rate this intern's progress, then submit for coordinator review.",
      category: "evaluation",
    },
  ];
  const formIds: string[] = [];
  for (const def of definitions) {
    let current = (await professor(account)).data;
    let form = current.formDocuments.find(
      (f) => f.title === def.title && !f.origin && f.status !== "archived",
    );
    if (!form) {
      await executeCommand(account, {
        action: "createFormDocument",
        args: [def],
        requestId: randomUUID(),
        ids: Array.from({ length: 20 }, () => randomUUID()),
      });
      current = (await professor(account)).data;
      form = current.formDocuments.find(
        (f) => f.title === def.title && !f.origin,
      )!;
    }
    if (
      form.status === "draft" &&
      def.category === "evaluation" &&
      !form.blocks.some((b) => b.type === "rating-table")
    ) {
      await executeCommand(account, {
        action: "addFormBlock",
        args: [form.id, "rating-table"],
        requestId: randomUUID(),
        ids: [],
      });
      form = (await professor(account)).data.formDocuments.find(
        (f) => f.id === form!.id,
      )!;
      const rating = form.blocks.find((b) => b.type === "rating-table")!;
      await executeCommand(account, {
        action: "updateFormBlock",
        args: [
          form.id,
          rating.id,
          {
            criteria: [
              { id: randomUUID(), label: "Quality of work" },
              { id: randomUUID(), label: "Dependability" },
            ],
            summaryMode: "average",
            required: true,
          },
        ],
        requestId: randomUUID(),
        ids: [],
      });
    }
    if (form.status === "draft")
      await executeCommand(account, {
        action: "publishFormDocument",
        args: [form.id],
        requestId: randomUUID(),
        ids: [],
      });
    formIds.push(form.id);
  }
  const templateId =
    "guided-" +
    createHash("sha256").update(account.schoolId).digest("hex").slice(0, 32);
  const existing = await db.practicumTemplate.findFirst({
    where: { id: templateId, schoolId: account.schoolId },
  });
  if (existing?.archived)
    throw new HttpError(
      409,
      "The guided sample was archived. Restore it or use your own format.",
    );
  let record = existing
    ? await templateResponse(existing.id, account)
    : await createTemplate(account, templateId);
  if (
    !record.versions.length &&
    record.content.title !== "Guided demo practicum"
  ) {
    record = await updateTemplate(record.id, account, {
      revision: record.revision,
      content: {
        title: "Guided demo practicum",
        cycle: "Guided testing cycle",
        description:
          "Three real requirements to follow as coordinator, student and supervisor. Answers start blank.",
        allowStudentExtras: false,
        sections: [
          {
            key: "introduction",
            title: "My practicum introduction",
            instructions:
              "Write two sentences about your placement and goal, then mark this section ready.",
            kind: "narrative",
            respondent: "student",
            required: true,
            pageBreak: false,
            formIds: [],
          },
          {
            key: "student_reflection",
            title: "Student reflection",
            instructions:
              "Open the linked reflection, answer it and submit. After approval, mark this section ready.",
            kind: "forms",
            respondent: "student",
            required: true,
            pageBreak: false,
            formIds: [formIds[0]],
          },
          {
            key: "supervisor_evaluation",
            title: "Supervisor evaluation",
            instructions:
              "The assigned supervisor answers the linked evaluation. The coordinator approves its response and reviews this section.",
            kind: "forms",
            respondent: "supervisor",
            required: true,
            pageBreak: false,
            formIds: [formIds[1]],
          },
        ],
      },
    });
  }
  if (!record.versions.length && record.wordName === "practicum-pilot.docx") {
    // The guided sample has its own short layout; the user's pilot remains intact.
    const bytes = await Packer.toBuffer(
      new Document({
        styles: {
          paragraphStyles: [1, 2].map((level) => ({
            id: `Heading${level}`,
            name: `heading ${level}`,
            basedOn: "Normal",
            next: "Normal",
            run: {
              font: "Times New Roman",
              color: "000000",
              bold: true,
              size: level === 1 ? 28 : 24,
            },
            paragraph: { spacing: { before: 240, after: 120 }, keepNext: true },
          })),
          default: {
            document: {
              run: { font: "Times New Roman", size: 24, color: "000000" },
              paragraph: { spacing: { after: 160 } },
            },
          },
        },
        sections: [
          {
            properties: {
              page: {
                size: { width: 12240, height: 15840 },
                margin: { top: 1440, bottom: 1440, left: 2160, right: 1440 },
              },
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "{{report_title}}",
                    bold: true,
                    size: 32,
                  }),
                ],
              }),
              new Paragraph("Student: {{student_name}}"),
              new Paragraph("School: {{school_name}}"),
              ...record.content.sections.map(
                (s) => new Paragraph(`{{section_${s.key}}}`),
              ),
            ],
          },
        ],
      }),
    );
    const form = new FormData();
    form.set("kind", "word");
    form.set("revision", String(record.revision));
    form.set(
      "file",
      new File([new Uint8Array(bytes)], "guided-practicum.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    );
    record = await uploadTemplate(record.id, account, form);
  }
  if (!record.versions.length) {
    record = await syncTemplateLayout(record.id, account, record.revision);
    record = await publishTemplate(record.id, account, record.revision);
  }
  const assignment = await assignTemplate(record.id, account, {
    versionId: record.versions[0].id,
    studentIds: [student.id],
    dueDate: null,
  });
  const supervisor = data.supervisors.find(
    (s) => s.id === student.supervisorId,
  );
  return {
    templateId: record.id,
    reportId: assignment.reportIds[0],
    student: student.name,
    supervisor: supervisor?.name,
    cycle: "Guided testing cycle",
  };
}
