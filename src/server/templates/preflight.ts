import { randomUUID, createHash } from "node:crypto";
import type { PortalAccount } from "@prisma/client";
import type { TemplateContent } from "@/domain/templates/model";
import { templateErrors, assignedSections } from "@/domain/templates/model";
import { createReportContent } from "@/domain/reports/model";
import { sampleFormValues } from "@/domain/forms/sample";
import type { PortalData } from "@/domain/portal/snapshot";
import { accountUsers } from "@/lib/prototype";
import { buildMappedWord, inspectTemplateWord } from "./word";
import { draft, professor } from "./service";
import { HttpError } from "@/server/security";
export async function buildFormatSample(
  source: Uint8Array,
  content: TemplateContent,
  original: PortalData,
) {
  const info = await inspectTemplateWord(source),
    errors = templateErrors(content, info.slots);
  for (const s of content.sections) {
    if (s.kind === "forms" && !s.formIds.length)
      errors.push(`${s.title}: link a published form.`);
    if (
      s.formIds.length &&
      (s.kind !== "forms" || s.respondent === "coordinator")
    )
      errors.push(`${s.title}: forms need a student or supervisor respondent.`);
    if (
      s.formIds.some(
        (id) =>
          !original.formDocuments.some(
            (f) => f.id === id && f.status === "published" && !f.trashedAt,
          ),
      )
    )
      errors.push(`${s.title}: select active published forms.`);
  }
  if (errors.length)
    return { errors, warnings: [], preview: [] as string[], bytes: null };
  const data = structuredClone(original);
  const student: import("@/lib/types").Student = {
    id: "format-sample-student",
    studentNumber: "SAMPLE-001",
    name: "FICTIONAL SAMPLE STUDENT",
    email: "sample@example.test",
    course: "Sample degree",
    requiredHours: 250,
    loggedHours: 8,
    companyId: data.companies[0]?.id ?? "sample-company",
    supervisorId: data.supervisors[0]?.id ?? null,
    status: "active",
    position: "Sample intern",
    department: "Engineering",
    workMode: "onsite",
    schoolId: "sample-school",
    startDate: "2026-01-05",
    endDate: "2026-01-31",
    createdAt: "2026-01-05T00:00:00Z",
  };
  data.students = [student];
  data.schoolIdentity.name = "Sample School";
  data.companies = data.companies.map((c) => ({
    ...c,
    name: "Sample Company",
    address: "Sample City",
    addressLine: "Sample Address",
    barangay: "",
    city: "Sample City",
    province: "",
  }));
  data.supervisors = data.supervisors.map((s) => ({
    ...s,
    name: "Sample Supervisor",
  }));
  data.evaluations = [];
  data.timeLogs = [
    {
      id: "sample-log",
      userId: student.id,
      role: "student",
      clockInAt: "2026-01-05T08:00:00+08:00",
      clockOutAt: "2026-01-05T16:00:00+08:00",
      durationMs: 28800000,
      createdAt: "2026-01-05T08:00:00+08:00",
    },
  ];
  data.journals = [
    {
      id: "sample-journal",
      studentId: student.id,
      date: "2026-01-05",
      cadence: "daily",
      hours: 8,
      tasks: "SAMPLE — Completed an assigned task.",
      learnings: "SAMPLE — Practised a new skill.",
      status: "approved",
      submittedAt: "2026-01-05T17:00:00+08:00",
      reviewedAt: "2026-01-05T18:00:00+08:00",
      createdAt: "2026-01-05T17:00:00+08:00",
    },
  ];
  const user = accountUsers(data).find((u) => u.studentId === student.id)!;
  data.formSubmissions = [
    ...new Set(content.sections.flatMap((s) => s.formIds)),
  ].map((id) => {
    const form = data.formDocuments.find((f) => f.id === id)!;
    return {
      id: randomUUID(),
      formId: id,
      formSnapshot: form,
      userId: user.id,
      targetStudentId: student.id,
      values: sampleFormValues(form),
      status: "approved" as const,
      startedAt: null,
      submittedAt: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: "2026-01-05T17:00:00+08:00",
      updatedAt: "2026-01-05T17:00:00+08:00",
    };
  });
  const report = createReportContent([student.id], randomUUID);
  report.title = "FICTIONAL SAMPLE — " + content.title;
  report.sections = assignedSections(content, student.id, randomUUID).map(
    (s) => ({
      ...s,
      included: true,
      body: `SAMPLE — Content for ${s.title}. Replace with the student's own work.`,
      status: "reviewed" as const,
    }),
  );
  const bytes = await buildMappedWord(
    source,
    {
      versionId: "sample",
      templateId: "sample",
      number: 0,
      title: content.title,
      dueDate: null,
      allowStudentExtras: content.allowStudentExtras,
      sections: content.sections,
    },
    report,
    data,
    [],
  );
  const output = await inspectTemplateWord(bytes, false);
  if (output.slots.length)
    errors.push(`Unresolved output fields: ${output.slots.join(", ")}.`);
  return {
    bytes,
    errors,
    warnings: [
      "Sample text preview does not verify pagination. Open Sample Word in Microsoft Word before publishing.",
      ...(content.sections.some((s) => s.kind === "evidence")
        ? [
            "Evidence sections use written image placeholders. Inspect their spacing in Sample Word; students cannot upload evidence.",
          ]
        : []),
    ],
    preview: output.preview,
  };
}
export async function templatePreflight(
  id: string,
  account: PortalAccount,
  revision: number,
) {
  const r = await draft(id, account);
  if (r.revision !== revision)
    throw new HttpError(
      409,
      "Template changed. Save and check the latest draft.",
    );
  if (!r.wordBytes)
    throw new HttpError(400, "Upload a blank Word format first.");
  const { data } = await professor(account),
    content = JSON.parse(r.draftJson) as TemplateContent;
  const result = await buildFormatSample(r.wordBytes, content, data);
  return {
    ...result,
    revision: r.revision,
    signature: createHash("sha256")
      .update(r.draftJson)
      .update(r.wordBytes)
      .digest("hex"),
  };
}
