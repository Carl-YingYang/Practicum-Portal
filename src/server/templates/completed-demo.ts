import type { PortalAccount } from "@prisma/client";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { Document, Packer, Paragraph } from "docx";
import { db } from "@/server/database";
import { demoEnabled, HttpError } from "@/server/security";
import {
  decodeSchoolState,
  writeSchoolState,
} from "@/server/persistence/school-state";
import { syncAccounts } from "@/server/portal-service";
import { accountUsers, recalculateHours } from "@/lib/prototype";
import { calendarDay } from "@/domain/journal-period";
import { todayISODate } from "@/lib/selectors";
import { isRatingHeading } from "@/domain/form-templates";
import {
  professor,
  createTemplate,
  templateResponse,
  updateTemplate,
  uploadTemplate,
  publishTemplate,
} from "./service";
import { assignTemplate } from "./assignments";
import { reportResponse, reviewSection } from "@/server/reports/service";
import { exportReport } from "@/server/reports/export";
const pending = new Map<string, Promise<Awaited<ReturnType<typeof setup>>>>();
export async function prepareCompletedDemo(account: PortalAccount) {
  await professor(account);
  if (!demoEnabled() || !account.isDemo || account.schoolId !== "practo")
    throw new HttpError(
      403,
      "Completed sample is available only to enabled testing coordinators.",
    );
  const current = pending.get(account.schoolId);
  if (current) return current;
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
  const key = createHash("sha256")
      .update(account.schoolId)
      .digest("hex")
      .slice(0, 16),
    studentId = `demo-finished-${key}`,
    supervisorId = `demo-guide-${key}`,
    templateId = `completed-${key}`;
  const start = calendarDay(todayISODate(), -32),
    end = calendarDay(todayISODate(), -1),
    now = new Date().toISOString();
  await db.$transaction(
    async (tx) => {
      const school = await tx.portalSchool.update({
          where: { id: account.schoolId },
          data: { revision: { increment: 1 } },
        }),
        data = decodeSchoolState(school.stateJson);
      const company = data.companies[0];
      if (!company)
        throw new HttpError(400, "Add a fictional partner company first.");
      if (!data.supervisors.some((s) => s.id === supervisorId))
        data.supervisors.push({
          ...data.supervisors[0],
          id: supervisorId,
          name: "Demo Supervisor — Completed Practicum",
          email: `completed-supervisor-${key}@example.test`,
          companyId: company.id,
          status: "active",
          capacity: 50,
          title: "Demo mentor",
          accountStatus: "active",
          mustChangePassword: false,
          password: randomBytes(24).toString("hex"),
          createdAt: now,
        });
      if (!data.students.some((s) => s.id === studentId)) {
        data.students.push({
          ...data.students[0],
          id: studentId,
          schoolId: account.schoolId,
          studentNumber: "DEMO-COMPLETE-001",
          name: "Demo Student — Completed Practicum",
          email: `completed-student-${key}@example.test`,
          companyId: company.id,
          supervisorId,
          status: "active",
          course: "BS Computer Science",
          section: "Completed Demo",
          schoolYear: "Completed testing cycle",
          requiredHours: 250,
          loggedHours: 0,
          startDate: start,
          endDate: end,
          position: "Demo software intern",
          department: "Engineering",
          workMode: "remote",
          accountStatus: "active",
          mustChangePassword: false,
          password: randomBytes(24).toString("hex"),
          createdAt: now,
        });
      }
      const student = data.students.find((s) => s.id === studentId)!;
      if (!data.timeLogs.some((t) => t.userId === studentId))
        for (let i = 0; i < 32; i++) {
          const date = calendarDay(student.startDate!, i),
            hours = i === 31 ? 2 : 8;
          data.timeLogs.push({
            id: `${studentId}-time-${i}`,
            userId: studentId,
            role: "student",
            clockInAt: `${date}T08:00:00+08:00`,
            clockOutAt: `${date}T${hours === 2 ? "10" : "16"}:00:00+08:00`,
            durationMs: hours * 3600000,
            note: "Fictional completed demo attendance",
            createdAt: now,
          });
          data.journals.push({
            id: `${studentId}-journal-${i}`,
            studentId,
            date,
            cadence: "daily",
            hours,
            tasks: `Fictional day ${i + 1}: tested a portal workflow and documented the result.`,
            learnings:
              "Reviewed feedback, corrected the issue and practised clearer documentation.",
            status: "approved",
            submittedAt: `${date}T17:00:00+08:00`,
            reviewedAt: `${date}T18:00:00+08:00`,
            reviewedBy: supervisorId,
            createdAt: now,
          });
        }
      if (!data.evaluations.some((e) => e.id === `${studentId}-evaluation`))
        data.evaluations.push({
          id: `${studentId}-evaluation`,
          studentId,
          supervisorId,
          term: "Completed testing cycle",
          qualityOfWork: 4,
          jobKnowledge: 5,
          dependability: 5,
          strengths:
            "Fictional example: consistent testing and clear documentation.",
          weaknesses: "Fictional example: continue practising concise reports.",
          recommendations:
            "Apply mentor feedback and keep improving technical communication.",
          status: "submitted",
          submittedAt: now,
          createdAt: now,
        });
      data.students = recalculateHours(data.students, data.timeLogs);
      for (const [suffix, title, category] of [
        ["reflection", "Completed demo — Reflection", "other"],
        ["evaluation", "Completed demo — Evaluation", "evaluation"],
      ] as const) {
        const id = `completed-form-${suffix}-${key}`;
        if (!data.formDocuments.some((f) => f.id === id))
          data.formDocuments.push({
            id,
            title,
            description:
              "Fictional completed sample. Not a real submission or signature.",
            category,
            status: "published",
            version: 1,
            createdBy: account.id,
            createdAt: now,
            updatedAt: now,
            publishedAt: now,
            blocks: [
              { id: `${id}-title`, type: "heading", text: title },
              ...(category === "evaluation"
                ? [
                    {
                      id: `${id}-ratings`,
                      type: "rating-table" as const,
                      required: true,
                      scaleLabels: [
                        "Poor (1)",
                        "Fair (2)",
                        "Good (3)",
                        "Very good (4)",
                        "Excellent (5)",
                      ],
                      criteria: [
                        {
                          id: `${id}-group`,
                          label: "Work performance",
                          role: "heading" as const,
                        },
                        { id: `${id}-quality`, label: "Quality of work" },
                        { id: `${id}-dependability`, label: "Dependability" },
                      ],
                      summaryMode: "average" as const,
                    },
                  ]
                : [
                    {
                      id: `${id}-answer`,
                      type: "fill-in" as const,
                      label: "What did you learn?",
                      required: true,
                      multiline: true,
                    },
                  ]),
            ],
          });
      }
      await syncAccounts(tx, data, account.schoolId);
      await tx.portalAccount.updateMany({
        where: {
          schoolId: account.schoolId,
          profileId: { in: [studentId, supervisorId] },
        },
        data: { isDemo: true },
      });
      await writeSchoolState(tx, account.schoolId, school.revision, data);
    },
    { timeout: 30000 },
  );
  let record = (await db.practicumTemplate.findUnique({
    where: { id: templateId },
  }))
    ? await templateResponse(templateId, account)
    : await createTemplate(account, templateId);
  if (record.archived)
    throw new HttpError(
      409,
      "The completed demo was archived. Existing student records are retained.",
    );
  if (!record.versions.length) {
    const defs = [
      {
        key: "introduction",
        title: "Introduction",
        kind: "narrative",
        respondent: "student",
        formIds: [],
      },
      {
        key: "attendance",
        title: "Completed attendance",
        kind: "attendance",
        respondent: "student",
        formIds: [],
      },
      {
        key: "journals",
        title: "Approved journals",
        kind: "journals",
        respondent: "student",
        formIds: [],
      },
      {
        key: "reflection",
        title: "Student reflection",
        kind: "forms",
        respondent: "student",
        formIds: [`completed-form-reflection-${key}`],
      },
      {
        key: "evaluation",
        title: "Supervisor evaluation",
        kind: "forms",
        respondent: "supervisor",
        formIds: [`completed-form-evaluation-${key}`],
      },
    ] as const;
    record = await updateTemplate(templateId, account, {
      revision: record.revision,
      content: {
        title: "Completed Demo Practicum Report",
        description:
          "A finished fictional example with 250 recorded hours. Wet signatures remain blank.",
        cycle: "Completed testing cycle",
        allowStudentExtras: false,
        sections: defs.map((s) => ({
          ...s,
          formIds: [...s.formIds],
          instructions: "Inspect this completed fictional example.",
          required: true,
          pageBreak: true,
        })),
      },
    });
    const bytes = await Packer.toBuffer(
      new Document({
        styles: {
          default: {
            document: {
              run: { font: "Times New Roman", size: 24, color: "000000" },
            },
          },
          paragraphStyles: [1, 2].map((level) => ({
            id: `Heading${level}`,
            name: `heading ${level}`,
            basedOn: "Normal",
            next: "Normal",
            run: { font: "Times New Roman", color: "000000", bold: true },
            paragraph: { keepNext: true },
          })),
        },
        sections: [
          {
            properties: {
              page: {
                size: { width: 12240, height: 15840 },
                margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
              },
            },
            children: [
              new Paragraph("FICTIONAL COMPLETED DEMO"),
              new Paragraph("{{report_title}}"),
              new Paragraph("Student: {{student_name}}"),
              new Paragraph(
                "Completed hours: {{completed_hours}} / {{required_hours}}",
              ),
              ...defs.map((s) => new Paragraph(`{{section_${s.key}}}`)),
              new Paragraph("Wet signature: ____________________"),
            ],
          },
        ],
      }),
    );
    const upload = new FormData();
    upload.set("revision", String(record.revision));
    upload.set("kind", "word");
    upload.set(
      "file",
      new File([new Uint8Array(bytes)], "completed-demo.docx"),
    );
    record = await uploadTemplate(templateId, account, upload);
    record = await publishTemplate(templateId, account, record.revision);
  }
  const { reportIds } = await assignTemplate(templateId, account, {
      versionId: record.versions.at(-1)!.id,
      studentIds: [studentId],
      dueDate: null,
    }),
    reportId = reportIds[0];
  let report = await reportResponse(reportId, account);
  if (!report.versions.length) {
    await db.$transaction(async (tx) => {
      const school = await tx.portalSchool.update({
          where: { id: account.schoolId },
          data: { revision: { increment: 1 } },
        }),
        data = decodeSchoolState(school.stateJson),
        users = accountUsers(data);
      for (const def of report.binding!.sections)
        for (const fid of def.formIds) {
          const aid = report.binding!.assignments![def.key][fid];
          if (data.formSubmissions.some((s) => s.assignmentId === aid))
            continue;
          const form = data.formDocuments.find((f) => f.id === fid)!,
            values: Record<string, string | Record<string, string>> = {};
          for (const b of form.blocks) {
            if (b.type === "fill-in")
              values[b.id] =
                "This fictional practicum improved my testing, teamwork and documentation skills.";
            if (b.type === "rating-table")
              values[b.id] = Object.fromEntries(
                (b.criteria ?? [])
                  .filter((c) => !isRatingHeading(c))
                  .map((c, i) => [c.id, i === 0 ? "4" : "5"]),
              );
          }
          data.formSubmissions.push({
            id: randomUUID(),
            formId: fid,
            formSnapshot: structuredClone(form),
            assignmentId: aid,
            userId: users.find((u) =>
              def.respondent === "student"
                ? u.studentId === studentId
                : u.supervisorId === supervisorId,
            )!.id,
            ...(def.respondent === "supervisor"
              ? { targetStudentId: studentId }
              : {}),
            values,
            status: "approved",
            startedAt: now,
            submittedAt: now,
            reviewedAt: now,
            reviewNote: "Completed fictional demo fixture",
            createdAt: now,
            updatedAt: now,
          });
        }
      await writeSchoolState(tx, account.schoolId, school.revision, data);
      const current = await tx.practicumReport.findUniqueOrThrow({
          where: { id: reportId },
        }),
        saved = JSON.parse(current.stateJson);
      for (const s of saved.content.sections) {
        if (s.status === "draft" && !s.body) {
          if (s.kind === "narrative")
            s.body =
              "This fictional 250-hour practicum involved testing software, recording activities and applying mentor feedback.";
          s.status = "ready";
        }
      }
      await tx.practicumReport.update({
        where: { id: reportId },
        data: { stateJson: JSON.stringify(saved), revision: { increment: 1 } },
      });
    });
    report = await reportResponse(reportId, account);
    for (const s of report.content.sections.filter((s) => s.status === "ready"))
      report = await reviewSection(reportId, account, {
        revision: report.revision,
        sectionId: s.id,
        status: "reviewed",
        note: "Reviewed fictional completed demo.",
      });
    report = await exportReport(reportId, account, {
      revision: report.revision,
    });
  }
  return {
    reportId,
    templateId,
    studentId,
    student: "Demo Student — Completed Practicum",
    supervisor: "Demo Supervisor — Completed Practicum",
    hours: 250,
  };
}
