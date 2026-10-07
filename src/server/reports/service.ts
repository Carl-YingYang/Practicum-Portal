import type { PortalAccount, Prisma } from "@prisma/client";
import { randomUUID, createHash } from "node:crypto";
import { db } from "@/server/database";
import { accountUsers } from "@/lib/prototype";
import { actorFor } from "@/server/portal-service";
import { HttpError } from "@/server/security";
import type { PortalData } from "@/domain/portal/snapshot";
import {
  createReportContent,
  reportContentErrors,
  reportSchema,
  type ReportContent,
  type ReportRecord,
  type ReportVersion,
} from "@/domain/reports/model";
import { reportSources } from "@/domain/reports/sources";
import type { User } from "@/lib/types";
export type ReportState = {
  content: ReportContent;
  versions: ReportVersion[];
  binding?: import("@/domain/templates/model").TemplateBinding;
  retiredSections?: {
    section: import("@/domain/reports/model").ReportSection;
    version: number;
  }[];
  formatHistory?: { from: number; to: number; at: string; by: string }[];
};
export const assetSelect = {
  id: true,
  name: true,
  mime: true,
  kind: true,
  sectionId: true,
  caption: true,
  rotation: true,
  width: true,
  height: true,
  size: true,
  order: true,
  createdAt: true,
} as const;
type Database = Prisma.TransactionClient;
export async function reportContext(account: PortalAccount, tx: Database = db) {
  const live = await tx.portalAccount.findUnique({ where: { id: account.id } });
  if (!live || live.status === "disabled" || live.mustChangePassword)
    throw new HttpError(403, "This account cannot access reports.");
  const school = await tx.portalSchool.findUnique({
    where: { id: account.schoolId },
  });
  if (!school) throw new HttpError(404, "School not found.");
  const data = JSON.parse(school.stateJson) as PortalData;
  return { data, actor: actorFor(data, live) };
}
export function canReadReport(
  content: ReportContent,
  actor: User,
  data: PortalData,
) {
  return (
    actor.role === "coordinator" ||
    (actor.role === "student"
      ? content.studentIds.length === 1 &&
        content.studentIds[0] === actor.studentId
      : content.studentIds.every((id) =>
          data.students.some(
            (s) => s.id === id && s.supervisorId === actor.supervisorId,
          ),
        ))
  );
}
export function sourceFingerprint(
  content: ReportContent,
  data: PortalData,
  binding?: import("@/domain/templates/model").TemplateBinding,
) {
  data = reportSources(content, data, binding);
  const ids = new Set(content.studentIds);
  const students = data.students
    .filter((s) => ids.has(s.id))
    .map(
      ({
        id,
        name,
        studentNumber,
        course,
        companyId,
        supervisorId,
        requiredHours,
        startDate,
        endDate,
      }) => ({
        id,
        name,
        studentNumber,
        course,
        companyId,
        supervisorId,
        requiredHours,
        startDate,
        endDate,
      }),
    );
  const users = new Set(
    accountUsers(data)
      .filter((u) => u.studentId && ids.has(u.studentId))
      .map((u) => u.id),
  );
  const sources = {
    students,
    school: data.schoolIdentity,
    companies: data.companies.filter((c) =>
      students.some((s) => s.companyId === c.id),
    ),
    supervisors: data.supervisors
      .filter((s) => students.some((x) => x.supervisorId === s.id))
      .map(({ id, name }) => ({ id, name })),
    journals: data.journals.filter((j) => ids.has(j.studentId)),
    logs: data.timeLogs.filter((t) => ids.has(t.userId)),
    forms: data.formSubmissions.filter(
      (s) => ids.has(s.targetStudentId ?? "") || users.has(s.userId),
    ),
    evaluations: data.evaluations.filter((e) => ids.has(e.studentId)),
  };
  return createHash("sha256").update(JSON.stringify(sources)).digest("hex");
}
export async function loadReport(
  id: string,
  account: PortalAccount,
  tx: Database = db,
) {
  const ctx = await reportContext(account, tx);
  const record = await tx.practicumReport.findFirst({
    where: { id, schoolId: account.schoolId },
  });
  if (!record) throw new HttpError(404, "Report not found.");
  const state = JSON.parse(record.stateJson) as ReportState;
  if (!canReadReport(state.content, ctx.actor, ctx.data))
    throw new HttpError(403, "This report is outside your assigned students.");
  return {
    ...ctx,
    record,
    state,
    canEdit:
      ctx.actor.role === "coordinator" ||
      record.ownerId === ctx.actor.id ||
      (!!state.binding &&
        state.binding.sections.some((s) => s.respondent === ctx.actor.role)),
    canReview: ctx.actor.role !== "student",
  };
}
export function reportFingerprint(
  content: ReportContent,
  data: PortalData,
  assets: {
    id: string;
    kind: string;
    sectionId: string | null;
    caption: string;
    rotation: number;
    order: number;
  }[],
  binding?: import("@/domain/templates/model").TemplateBinding,
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        content,
        binding,
        source: sourceFingerprint(content, data, binding),
        evidence: assets
          .filter((a) => a.kind === "evidence")
          .map(({ id, sectionId, caption, rotation, order }) => ({
            id,
            sectionId,
            caption,
            rotation,
            order,
          }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      }),
    )
    .digest("hex");
}
export async function reportResponse(
  id: string,
  account: PortalAccount,
): Promise<ReportRecord> {
  const r = await loadReport(id, account);
  const assets = await db.reportAsset.findMany({
    where: { reportId: id },
    select: assetSelect,
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return {
    id,
    ownerId: r.record.ownerId,
    binding: r.state.binding,
    retiredSections: r.state.retiredSections,
    formatHistory: r.state.formatHistory,
    editableSectionIds: r.state.content.sections
      .filter((s) =>
        !r.state.binding
          ? r.canEdit
          : r.state.binding.sections.find((d) => d.key === s.template)
              ?.respondent === r.actor.role ||
            (r.actor.role === "student" &&
              r.state.binding.allowStudentExtras &&
              !r.state.binding.sections.some((d) => d.key === s.template)),
      )
      .map((s) => s.id),
    revision: r.record.revision,
    content: r.state.content,
    versions: r.state.versions,
    assets: assets.map((a) => ({
      ...a,
      kind: a.kind as "evidence" | "export" | "reviewed",
      createdAt: a.createdAt.toISOString(),
    })),
    canEdit: r.canEdit,
    canReview: r.canReview,
    updatedAt: r.record.updatedAt.toISOString(),
    sourceFingerprint: reportFingerprint(
      r.state.content,
      r.data,
      assets,
      r.state.binding,
    ),
    boundSourceFingerprint: sourceFingerprint(
      r.state.content,
      r.data,
      r.state.binding,
    ),
  };
}
export async function createReport(account: PortalAccount, input: unknown) {
  const studentIds = (input as { studentIds?: unknown })?.studentIds;
  if (
    !Array.isArray(studentIds) ||
    !studentIds.length ||
    studentIds.length > 20 ||
    studentIds.some((id) => typeof id !== "string") ||
    new Set(studentIds).size !== studentIds.length
  )
    throw new HttpError(400, "Choose distinct students.");
  const { actor, data } = await reportContext(account);
  if (
    actor.role === "supervisor" ||
    (actor.role === "student" &&
      (studentIds.length !== 1 || studentIds[0] !== actor.studentId))
  )
    throw new HttpError(
      403,
      "Only coordinators create combined reports; students create their own report.",
    );
  const students = studentIds.map((id) =>
    data.students.find((s) => s.id === id),
  );
  if (students.some((s) => !s))
    throw new HttpError(400, "A selected student is unavailable.");
  if (new Set(students.map((s) => s!.companyId)).size !== 1)
    throw new HttpError(
      400,
      "A combined report needs students from the same company.",
    );
  const content = createReportContent(studentIds, randomUUID);
  content.settings.start = students[0]!.startDate ?? "";
  content.settings.end = students[0]!.endDate ?? "";
  content.settings.degree = students[0]!.course;
  const id = randomUUID();
  await db.practicumReport.create({
    data: {
      id,
      schoolId: account.schoolId,
      ownerId: account.id,
      stateJson: JSON.stringify({ content, versions: [] }),
    },
  });
  return reportResponse(id, account);
}
export async function lockReport(
  tx: Database,
  id: string,
  account: PortalAccount,
  revision: number,
) {
  if (!Number.isInteger(revision) || revision < 0)
    throw new HttpError(400, "Supply the saved report revision.");
  const result = await tx.practicumReport.updateMany({
    where: { id, schoolId: account.schoolId, revision },
    data: { revision: { increment: 1 } },
  });
  if (!result.count)
    throw new HttpError(
      409,
      "This report changed in another session. Your local draft is retained; reload the saved report before merging edits.",
    );
  return loadReport(id, account, tx);
}
export async function updateReport(
  id: string,
  account: PortalAccount,
  body: unknown,
) {
  const input = body as { revision: number; content: unknown };
  const parsed = reportSchema.safeParse(input?.content);
  if (!parsed.success)
    throw new HttpError(400, "Invalid report content or settings.");
  const errors = reportContentErrors(parsed.data);
  if (errors.length) throw new HttpError(400, errors.join(" "));
  await db.$transaction(async (tx) => {
    const r = await lockReport(tx, id, account, input.revision);
    if (!r.canEdit)
      throw new HttpError(403, "Reviewers cannot rewrite student narratives.");
    const content = parsed.data;
    if (
      JSON.stringify(content.studentIds) !==
      JSON.stringify(r.state.content.studentIds)
    )
      throw new HttpError(
        400,
        "Report members cannot be changed after creation.",
      );
    if (r.state.binding) enforceAssignedEdits(r.state, content, r.actor.role);
    for (const section of content.sections) {
      const previous = r.state.content.sections.find(
        (s) => s.id === section.id,
      );
      if (section.status === "reviewed" && previous?.status !== "reviewed")
        throw new HttpError(
          403,
          "Use the review action to mark a section reviewed.",
        );
      section.reviewNote = previous?.reviewNote ?? "";
      section.reviewedAt = previous?.reviewedAt ?? null;
      section.reviewedSource = previous?.reviewedSource;
      if (
        previous &&
        (section.body !== previous.body ||
          section.title !== previous.title ||
          section.kind !== previous.kind ||
          section.studentId !== previous.studentId)
      ) {
        if (section.status === "reviewed") section.status = "draft";
        section.reviewedAt = null;
        section.reviewedSource = undefined;
      }
      if (
        section.status === "ready" &&
        section.kind === "narrative" &&
        !section.body.trim()
      )
        throw new HttpError(400, "Write the section before requesting review.");
    }
    await tx.practicumReport.update({
      where: { id },
      data: { stateJson: JSON.stringify({ ...r.state, content }) },
    });
  });
  return reportResponse(id, account);
}
export async function reviewSection(
  id: string,
  account: PortalAccount,
  input: {
    revision: number;
    sectionId: string;
    status: "reviewed" | "revision";
    note: string;
  },
) {
  await db.$transaction(async (tx) => {
    const r = await lockReport(tx, id, account, input.revision);
    if (!r.canReview)
      throw new HttpError(
        403,
        "Only assigned supervisors and coordinators review sections.",
      );
    const section = r.state.content.sections.find(
      (s) => s.id === input.sectionId,
    );
    if (!section || section.status !== "ready")
      throw new HttpError(
        409,
        "Only sections ready for review can be reviewed.",
      );
    if (
      r.actor.role === "supervisor" &&
      r.state.binding?.sections.find((d) => d.key === section.template)
        ?.respondent === "supervisor"
    )
      throw new HttpError(403, "The professor reviews supervisor responses.");
    if (
      r.actor.role === "supervisor" &&
      (!section.studentId ||
        !r.data.students.some(
          (s) =>
            s.id === section.studentId &&
            s.supervisorId === r.actor.supervisorId,
        ))
    )
      throw new HttpError(403, "Review your assigned student sections only.");
    if (
      !["reviewed", "revision"].includes(input.status) ||
      typeof input.note !== "string" ||
      input.note.length > 3000 ||
      (input.status === "revision" && !input.note.trim())
    )
      throw new HttpError(400, "Add feedback when requesting revision.");
    section.status = input.status;
    section.reviewNote = input.note.trim();
    section.reviewedAt = new Date().toISOString();
    section.reviewedSource = sourceFingerprint(
      r.state.content,
      r.data,
      r.state.binding,
    );
    await tx.practicumReport.update({
      where: { id },
      data: { stateJson: JSON.stringify(r.state) },
    });
  });
  return reportResponse(id, account);
}

/** Format and respondent rules are enforced on the server, not just disabled inputs. */
function enforceAssignedEdits(
  state: ReportState,
  content: ReportContent,
  role: string,
) {
  const binding = state.binding!;
  if (
    JSON.stringify(content.settings) !==
      JSON.stringify(state.content.settings) ||
    content.title !== state.content.title
  )
    throw new HttpError(
      403,
      "Assigned report settings come from the published format.",
    );
  const oldCore = state.content.sections.filter((s) =>
    binding.sections.some((d) => d.key === s.template),
  );
  const nextCore = content.sections.filter((s) =>
    binding.sections.some((d) => d.key === s.template),
  );
  if (
    JSON.stringify(oldCore.map((s) => s.id)) !==
    JSON.stringify(nextCore.map((s) => s.id))
  )
    throw new HttpError(
      403,
      "Only the professor changes core sections through a new template version.",
    );
  for (const next of content.sections) {
    const prev = state.content.sections.find((s) => s.id === next.id);
    const def = binding.sections.find((d) => d.key === next.template);
    if (def) {
      if (
        !prev ||
        ["title", "kind", "template", "studentId", "required"].some(
          (k) => next[k as keyof typeof next] !== prev[k as keyof typeof prev],
        ) ||
        (def.required && !next.included)
      )
        throw new HttpError(
          403,
          "Keep the assigned format and required sections intact.",
        );
      if (def.respondent !== role && !sameSection(next, prev))
        throw new HttpError(403, "This section belongs to another respondent.");
    } else if (
      (!binding.allowStudentExtras || role !== "student") &&
      (!prev || !sameSection(next, prev))
    )
      throw new HttpError(
        403,
        "Student extra sections are disabled for this format.",
      );
    if (
      !def &&
      (next.kind !== "narrative" ||
        next.required ||
        !next.template.startsWith("custom_"))
    )
      throw new HttpError(
        400,
        "Extra sections must be optional custom narratives.",
      );
  }
  const removed = state.content.sections.filter(
    (s) => !content.sections.some((n) => n.id === s.id),
  );
  if (
    removed.length &&
    (!binding.allowStudentExtras ||
      role !== "student" ||
      removed.some((s) => binding.sections.some((d) => d.key === s.template)))
  )
    throw new HttpError(403, "You cannot remove these assigned sections.");
}

export function canWriteSection(
  r: Awaited<ReturnType<typeof loadReport>>,
  sectionId: string | null,
) {
  if (!r.canEdit || !sectionId) return false;
  if (!r.state.binding) return true;
  const s = r.state.content.sections.find((s) => s.id === sectionId),
    def = r.state.binding.sections.find((d) => d.key === s?.template);
  return (
    !!s &&
    (def
      ? def.respondent === r.actor.role
      : r.actor.role === "student" && r.state.binding.allowStudentExtras)
  );
}

function sameSection(
  a: import("@/domain/reports/model").ReportSection,
  b: import("@/domain/reports/model").ReportSection,
) {
  return Object.keys(a)
    .concat(Object.keys(b))
    .every((k) => a[k as keyof typeof a] === b[k as keyof typeof b]);
}
