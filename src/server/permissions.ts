import type { PortalData } from "@/domain/portal/snapshot";
import { validateCommandArguments, type Command } from "./command-schema";
export { commandSchema } from "./command-schema";
import type { User } from "@/lib/types";
import { responseErrors } from "@/lib/prototype";
import { assignmentAppliesTo } from "@/lib/selectors";
import { journalHours, journalPeriod } from "@/domain/journal-period";
import { todayISODate } from "@/lib/selectors";
import { HttpError } from "./security";
function deny(
  message = "You do not have permission to change this record.",
): never {
  throw new HttpError(403, message);
}
function exists<
  T extends {
    id: string;
  },
>(rows: T[], value: unknown): T {
  const record = rows.find((row) => row.id === value);
  if (!record)
    throw new HttpError(404, "This record is not available in your school.");
  return record;
}
function safePatch(value: unknown, keys: string[]) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key))
  )
    throw new HttpError(400, "Invalid update fields.");
}
export function authorizeCommand(
  command: Command,
  data: PortalData,
  actor: User,
) {
  const { action, args } = command;
  validateCommandArguments(command);
  const a = command.args;
  const input = a[0] as Record<string, unknown>;
  const coordinator = actor.role === "coordinator";
  const profileId =
    actor.studentId ?? actor.supervisorId ?? actor.coordinatorId;
  const ownStudent = (value: unknown, writing = false) => {
    const student = exists(data.students, value);
    if (
      !coordinator &&
      (actor.role === "student"
        ? student.id !== actor.studentId
        : student.supervisorId !== actor.supervisorId)
    )
      deny();
    if (writing && actor.role !== "student") deny();
    return student;
  };
  if (
    [
      "createJournal",
      "updateJournalDraft",
      "submitJournal",
      "approveJournal",
      "rejectJournal",
    ].includes(action)
  ) {
    const journal =
      action === "createJournal" ? undefined : exists(data.journals, a[0]);
    ownStudent(journal?.studentId ?? input.studentId);
    if (["approveJournal", "rejectJournal"].includes(action)) {
      if (actor.role !== "supervisor" || journal?.status !== "pending") deny();
    } else {
      if (
        actor.role !== "student" ||
        (journal && !["draft", "rejected"].includes(journal.status))
      )
        deny();
      const payload = (
        action === "createJournal"
          ? a[0]
          : action === "updateJournalDraft"
            ? a[1]
            : journal
      ) as {
        date: string;
        hours: number;
        tasks: string;
        learnings: string;
        submit?: boolean;
      };
      if (payload.date > todayISODate())
        throw new HttpError(400, "Journal dates cannot be in the future.");
      const cadence =
        journal?.cadence ?? data.schoolIdentity.journalCadence ?? "weekly";
      payload.hours = journalHours(
        data.timeLogs,
        actor.studentId!,
        payload.date,
        cadence,
      ).hours;
      if (
        action === "submitJournal" ||
        (action === "createJournal" && payload.submit)
      ) {
        if (
          payload.hours <= 0 ||
          !payload.tasks.trim() ||
          !payload.learnings.trim()
        )
          throw new HttpError(
            400,
            "Complete your entry and log attendance for this period first.",
          );
        const period = journalPeriod(payload.date, cadence);
        if (
          data.journals.some(
            (j) =>
              j.id !== journal?.id &&
              j.studentId === actor.studentId &&
              ["approved", "pending"].includes(j.status) &&
              journalPeriod(j.date, j.cadence ?? cadence).start <= period.end &&
              journalPeriod(j.date, j.cadence ?? cadence).end >= period.start,
          )
        )
          throw new HttpError(
            409,
            "You already submitted a journal for this period.",
          );
      }
    }
    return;
  }
  if (["requestTimeCorrection", "reviewTimeCorrection"].includes(action)) {
    const log = exists(data.timeLogs, a[0]);
    const student = exists(data.students, log.userId);
    if (log.role !== "student") deny();
    if (action === "requestTimeCorrection") {
      if (actor.role !== "student" || actor.studentId !== log.userId) deny();
    } else if (actor.role !== "supervisor" || student.supervisorId !== actor.supervisorId) {
      deny("Only the assigned supervisor can review this correction.");
    }
    return;
  }
  if (
    ["clockIn", "clockOut", "addManualTimeLog", "deleteTimeLog"].includes(
      action,
    )
  ) {
    const log =
      action === "deleteTimeLog" ? exists(data.timeLogs, a[0]) : undefined;
    const target =
      log?.userId ?? (action === "addManualTimeLog" ? input.userId : a[0]);
    const targetRole =
      log?.role ??
      (action === "addManualTimeLog"
        ? input.role
        : action === "clockIn"
          ? a[1]
          : actor.role);
    if (action === "deleteTimeLog" && !coordinator && log?.corrections?.length)
      deny("Sessions with correction requests are retained for review.");
    if (!coordinator && (target !== profileId || targetRole !== actor.role))
      deny();
    if (
      coordinator &&
      ![...data.students, ...data.supervisors, ...data.coordinators].some(
        (p) => p.id === target,
      )
    )
      deny();
    return;
  }
  if (["saveEvaluation", "deleteEvaluation"].includes(action)) {
    const evaluation =
      action === "deleteEvaluation"
        ? exists(data.evaluations, a[0])
        : input.id
          ? exists(data.evaluations, input.id)
          : undefined;
    if (
      actor.role !== "supervisor" ||
      (evaluation?.supervisorId ?? input.supervisorId) !== actor.supervisorId
    )
      deny();
    ownStudent(evaluation?.studentId ?? input.studentId);
    if (
      action === "saveEvaluation" &&
      input.submit &&
      ![input.qualityOfWork, input.jobKnowledge, input.dependability].every(
        (v) => typeof v === "number" && v >= 1 && v <= 5,
      )
    )
      throw new HttpError(
        400,
        "Rate every evaluation criterion before submitting.",
      );
    if (evaluation?.status === "submitted")
      deny("Submitted evaluations are locked.");
    return;
  }
  if (
    ["startFormResponse", "saveSubmissionDraft", "submitFormResponse"].includes(
      action,
    )
  ) {
    if (action === "startFormResponse") {
      const form = exists(data.formDocuments, input.formId);
      if (
        form.status !== "published" ||
        !data.formAssignments.some(
          (assignment) =>
            assignment.formId === form.id &&
            assignmentAppliesTo(assignment, actor),
        )
      )
        deny();
      if (input.targetStudentId) {
        if (actor.role !== "supervisor") deny();
        ownStudent(input.targetStudentId);
      }
    } else {
      const sub = exists(data.formSubmissions, a[0]);
      if (
        sub.userId !== actor.id ||
        !["in_progress", "needs_revision"].includes(sub.status)
      )
        deny();
      const form = sub.formSnapshot ?? exists(data.formDocuments, sub.formId);
      if (
        action === "submitFormResponse" &&
        responseErrors(form, sub.values).length
      )
        throw new HttpError(400, "Complete the required form fields first.");
    }
    return;
  }
  if (!coordinator) deny();
  if (action === "resetAccountCredentials" && a[1] === profileId)
    deny("Ask another coordinator to reset your credentials.");
  if (
    ["updateStudent", "updateSupervisor", "updateCoordinator"].includes(action)
  )
    exists<{
      id: string;
    }>(
      action === "updateStudent"
        ? data.students
        : action === "updateSupervisor"
          ? data.supervisors
          : data.coordinators,
      a[0],
    );
  if (["setAccountStatus", "resetAccountCredentials"].includes(action)) {
    exists<{
      id: string;
    }>(
      a[0] === "student"
        ? data.students
        : a[0] === "supervisor"
          ? data.supervisors
          : data.coordinators,
      a[1],
    );
    if (
      a[1] === profileId &&
      action === "setAccountStatus" &&
      a[2] !== "active"
    )
      deny("You cannot disable your own coordinator account.");
  }
  if (
    [
      "createStudent",
      "updateStudent",
      "createSupervisor",
      "updateSupervisor",
    ].includes(action)
  ) {
    const fields = (action.startsWith("update") ? a[1] : a[0]) as Record<
      string,
      unknown
    >;
    if (fields.companyId) exists(data.companies, fields.companyId);
    if (fields.supervisorId) exists(data.supervisors, fields.supervisorId);
  }
  if (action === "setSchoolBranding") {
    exists(data.schools, a[0]);
    safePatch(a[1], [
      "name",
      "shortName",
      "tagline",
      "accentColor",
      "logoDataUrl",
      "heroImages",
      "visibleCards",
    ]);
  }
  if (action === "updateSchoolIdentity") {
    safePatch(a[0], [
      "name",
      "shortName",
      "tagline",
      "address",
      "logoDataUrl",
      "bannerDataUrl",
      "themePreset",
      "customColors",
      "accentColor",
      "heroImage",
      "visibleCards",
      "journalCadence",
    ]);
    if (
      input.journalCadence &&
      !["daily", "weekly", "twice-weekly"].includes(
        input.journalCadence as string,
      )
    )
      throw new HttpError(400, "Choose a valid journal schedule.");
  }
  if (action === "updateFormMeta")
    safePatch(a[1], ["title", "description", "category"]);
  if (action === "updateFormBlock")
    safePatch(a[2], [
      "text",
      "level",
      "label",
      "placeholder",
      "multiline",
      "required",
      "scaleLabels",
      "criteria",
      "caption",
      "defaultValue",
      "prefill",
      "options",
      "scoreMode",
    ]);
  if (
    [
      "updateFormMeta",
      "updateFormBlock",
      "addFormBlock",
      "removeFormBlock",
      "moveFormBlock",
      "reorderFormBlocks",
      "duplicateFormBlock",
      "publishFormDocument",
      "unpublishFormDocument",
      "archiveFormDocument",
      "deleteFormDocument",
      "duplicateFormDocument",
    ].includes(action)
  )
    exists(data.formDocuments, a[0]);
  if (action === "assignForm") {
    exists(data.formDocuments, input.formId);
    const users = [...data.students, ...data.supervisors, ...data.coordinators];
    if (
      (input.targetUserIds as string[] | undefined)?.some(
        (value) => !users.some((p) => actorUserId(p.id, data) === value),
      )
    )
      deny();
  }
  if (action === "unassignForm") exists(data.formAssignments, a[0]);
  if (action === "reviewSubmission") exists(data.formSubmissions, a[0]);
}
import { accountUsers } from "@/lib/prototype";
function actorUserId(profileId: string, data: PortalData) {
  return accountUsers(data).find(
    (u) => (u.studentId ?? u.supervisorId ?? u.coordinatorId) === profileId,
  )?.id;
}
export function scopedData(data: PortalData, actor: User): PortalData {
  if (actor.role === "coordinator") return data;
  const students = data.students.filter((s) =>
    actor.role === "student"
      ? s.id === actor.studentId
      : s.supervisorId === actor.supervisorId,
  );
  const ids = new Set(students.map((s) => s.id));
  const supervisors = data.supervisors.filter((s) =>
    actor.role === "supervisor"
      ? s.id === actor.supervisorId
      : students.some((st) => st.supervisorId === s.id),
  );
  const profileId = actor.studentId ?? actor.supervisorId;
  const forms = data.formDocuments.filter(
    (f) =>
      f.status === "published" &&
      data.formAssignments.some(
        (a) => a.formId === f.id && assignmentAppliesTo(a, actor),
      ),
  );
  return {
    ...data,
    students,
    supervisors,
    coordinators: [],
    companies: data.companies.filter(
      (c) =>
        students.some((s) => s.companyId === c.id) ||
        supervisors.some((s) => s.companyId === c.id),
    ),
    journals: data.journals.filter((j) => ids.has(j.studentId)),
    evaluations: data.evaluations.filter(
      (e) =>
        ids.has(e.studentId) &&
        (actor.role === "supervisor"
          ? e.supervisorId === actor.supervisorId
          : e.status === "submitted"),
    ),
    timeLogs: data.timeLogs.filter((t) =>
      actor.role === "student"
        ? t.userId === profileId
        : t.userId === profileId || ids.has(t.userId),
    ),
    activity: data.activity.filter(
      (a) => a.actorId === actor.id || a.actorId === profileId,
    ),
    formDocuments: forms,
    formAssignments: data.formAssignments
      .filter(
        (a) =>
          forms.some((f) => f.id === a.formId) && assignmentAppliesTo(a, actor),
      )
      .map((a) => ({
        ...a,
        targetUserIds: a.targetUserIds?.filter((id) => id === actor.id) ?? [],
      })),
    formSubmissions: data.formSubmissions.filter((s) => s.userId === actor.id),
    subscription: { ...data.subscription, invoices: [] },
  };
}
