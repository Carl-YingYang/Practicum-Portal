import type { PortalAccount } from "@prisma/client";
import { db } from "@/server/database";
import { draft, professor, publishedTemplate } from "./service";
import { HttpError } from "@/server/security";
import type { TemplateContent } from "@/domain/templates/model";
import type { TemplateRecipients } from "@/domain/templates/recipients";

/** Read the selected immutable version, never guess from the editor's new draft. */
export async function templateRecipients(
  id: string,
  account: PortalAccount,
  versionId?: string,
): Promise<TemplateRecipients> {
  const record = await draft(id, account);
  if (record.archived) throw new HttpError(409, "This format is archived.");
  const { data } = await professor(account);
  const content: TemplateContent = versionId
    ? (await publishedTemplate(id, versionId, account)).content
    : JSON.parse(record.draftJson);
  const accounts = await db.portalAccount.findMany({
    where: {
      schoolId: account.schoolId,
      status: "active",
      role: { in: ["student", "supervisor"] },
    },
    select: { role: true, profileId: true },
  });
  const assigned = versionId
    ? await db.practicumAssignment.findMany({
        where: { versionId },
        select: { studentId: true, reportId: true },
      })
    : [];
  const needsSupervisor = content.sections.some(
    (s) => s.respondent === "supervisor",
  );
  const unavailableForms = content.sections
    .flatMap((s) => s.formIds)
    .some(
      (fid) =>
        !data.formDocuments.some(
          (f) => f.id === fid && f.status === "published" && !f.trashedAt,
        ),
    );
  return {
    revision: record.revision,
    versionId: versionId ?? null,
    students: data.students
      .filter((s) => s.status === "active")
      .map((s) => {
        const reportId =
          assigned.find((a) => a.studentId === s.id)?.reportId ?? null;
        const reason = !accounts.some(
          (a) => a.role === "student" && a.profileId === s.id,
        )
          ? "Activate the student account."
          : !reportId &&
              needsSupervisor &&
              !accounts.some(
                (a) =>
                  a.role === "supervisor" && a.profileId === s.supervisorId,
              )
            ? "Assign an active supervisor account."
            : !reportId && unavailableForms
              ? "A linked form is unavailable. Update and publish the format."
              : null;
        return {
          id: s.id,
          name: s.name,
          studentNumber: s.studentNumber,
          cohort: [
            s.course,
            s.section || "No section",
            s.schoolYear || "No batch",
          ].join(" · "),
          ready: !reason,
          reason,
          reportId,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
