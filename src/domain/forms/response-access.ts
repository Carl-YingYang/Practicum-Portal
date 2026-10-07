import type { PortalData } from "@/domain/portal/snapshot";
import type { FormSubmission, User } from "@/lib/types";
import { accountUsers } from "@/lib/prototype";

/** One policy for portal projection and authenticated Word downloads. */
export function canReadSupervisorResponse(
  data: PortalData,
  actor: User,
  sub: FormSubmission,
) {
  if (
    actor.role !== "student" ||
    !actor.studentId ||
    sub.targetStudentId !== actor.studentId ||
    !["submitted", "under_review", "approved"].includes(sub.status)
  )
    return false;
  const student = data.students.find((s) => s.id === actor.studentId);
  const writer = accountUsers(data).find((u) => u.id === sub.userId);
  if (!student || writer?.role !== "supervisor") return false;
  // Shared legacy responses follow current placement ownership. Report-bound
  // responses follow their assigned respondent, even after a mentor transfer.
  if (!sub.assignmentId)
    return (
      !!student.supervisorId && writer.supervisorId === student.supervisorId
    );
  const assignment = data.formAssignments.find(
    (a) => a.id === sub.assignmentId,
  );
  return (
    !!assignment &&
    !assignment.retired &&
    assignment.studentId === actor.studentId &&
    assignment.targetUserIds?.includes(sub.userId) === true &&
    assignment.formId === sub.formId
  );
}
