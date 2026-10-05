import {
  defaultSchoolIdentity,
  defaultSubscription,
  defaultToolsConfig,
  activityLog as seedActivity,
  companies as seedCompanies,
  coordinators as seedCoordinators,
  evaluations as seedEvaluations,
  formAssignments as seedFormAssignments,
  formDocuments as seedFormDocuments,
  formSubmissions as seedFormSubmissions,
  journals as seedJournals,
  schools as seedSchools,
  students as seedStudents,
  supervisors as seedSupervisors,
  timeLogs as seedTimeLogs,
} from "@/lib/mock-data";
import { recalculateHours } from "@/lib/prototype";
import { v4 as randomId } from "uuid";
import { createStore } from "zustand/vanilla";
import { createAccountsActions } from "./actions/accounts";
import { createAttendanceActions } from "./actions/attendance";
import { createFormsActions } from "./actions/forms";
import { createJournalsActions } from "./actions/journals";
import { createNavigationActions } from "./actions/navigation";
import { createSettingsActions } from "./actions/settings";
import type { AppState } from "./types";
export type { AppState } from "./types";
export function createPortalStore(idFactory: () => string = randomId) {
  return createStore<AppState>()((set, get) => ({
    hasHydrated: false,
    syncStatus: "idle",
    syncError: "",
    testMode: false,
    demoAccounts: [],
    companies: seedCompanies,
    supervisors: seedSupervisors,
    students: recalculateHours(seedStudents, seedTimeLogs),
    coordinators: seedCoordinators,
    schools: seedSchools,
    evaluations: seedEvaluations,
    journals: seedJournals,
    timeLogs: seedTimeLogs,
    activity: seedActivity,
    formDocuments: seedFormDocuments,
    formAssignments: seedFormAssignments,
    formSubmissions: seedFormSubmissions,
    currentUser: null,
    view: "login",
    viewParams: {},
    history: [],
    notificationsOpen: false,
    toolsConfig: defaultToolsConfig,
    schoolIdentity: defaultSchoolIdentity,
    subscription: defaultSubscription,
    ...createSettingsActions(set, get, idFactory),
    ...createAccountsActions(set, get, idFactory),
    ...createNavigationActions(set, get, idFactory),
    ...createJournalsActions(set, get, idFactory),
    ...createAttendanceActions(set, get, idFactory),
    ...createFormsActions(set, get, idFactory),
  }));
}
