import type { AppState } from "./engine";
export const dataKeys = [
  "companies",
  "supervisors",
  "students",
  "coordinators",
  "schools",
  "evaluations",
  "journals",
  "timeLogs",
  "activity",
  "formDocuments",
  "formAssignments",
  "formSubmissions",
  "toolsConfig",
  "schoolIdentity",
  "subscription",
] as const;
export type PortalData = Pick<AppState, (typeof dataKeys)[number]>;
export function snapshot(state: AppState): PortalData {
  return structuredClone(
    Object.fromEntries(dataKeys.map((key) => [key, state[key]])),
  ) as PortalData;
}
export function withoutCredentials(data: PortalData): PortalData {
  const clean = structuredClone(data);
  for (const profiles of [
    clean.students,
    clean.supervisors,
    clean.coordinators,
  ])
    for (const profile of profiles) delete profile.password;
  return clean;
}
export const mutationNames = [
  "setToolsConfig",
  "updateSchoolIdentity",
  "resetSchoolIdentity",
  "setSchoolBranding",
  "updateSubscription",
  "setHourlyRate",
  "generateUsageInvoice",
  "changePlan",
  "resetSubscription",
  "setAccountStatus",
  "resetAccountCredentials",
  "createJournal",
  "updateJournalDraft",
  "submitJournal",
  "approveJournal",
  "rejectJournal",
  "saveEvaluation",
  "deleteEvaluation",
  "createStudent",
  "updateStudent",
  "createSupervisor",
  "updateSupervisor",
  "upsertCompany",
  "createCoordinator",
  "updateCoordinator",
  "clockIn",
  "clockOut",
  "deleteTimeLog",
  "requestTimeCorrection",
  "reviewTimeCorrection",
  "addManualTimeLog",
  "createFormDocument",
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
  "assignForm",
  "unassignForm",
  "startFormResponse",
  "saveSubmissionDraft",
  "submitFormResponse",
  "reviewSubmission",
] as const satisfies readonly (keyof AppState)[];
export type MutationName = (typeof mutationNames)[number];
