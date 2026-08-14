"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { CoordinatorDashboard } from "./coordinator-dashboard";
import { StudentsList } from "./students-list";
import { StudentForm } from "./student-form";
import { StudentDetail } from "./student-detail";
import { SupervisorsList } from "./supervisors-list";
import { SupervisorForm } from "./supervisor-form";
import { SupervisorDetail } from "./supervisor-detail";
import { AllEvaluationsList } from "./all-evaluations-list";
import { EvaluationView } from "./evaluation-view";
import { AllJournalsList } from "./all-journals-list";
import { JournalView } from "./journal-view";
import { CoordinatorReports } from "./coordinator-reports";
import { CoordinatorTimeMonitor } from "./coordinator-time-monitor";
import { CoordinatorTimesheets } from "./coordinator-timesheets";
import { CoordinatorProfile } from "./coordinator-profile";
import { FormsHub } from "./forms-hub";
import { FormEditor } from "./form-editor";
import { UserManagement } from "./user-management";
import { BulkCreateUsers } from "./bulk-create-users";
import { CoordinatorForm } from "./coordinator-form";
import { SchoolIdentitySettings } from "../settings/school-identity-settings";
import { ExternalToolsSetup } from "./external-tools-setup";

/**
 * Barrel + router for the Coordinator workspace. Reads `view` + `viewParams`
 * from the store and renders the matching page.
 */
export function CoordinatorWorkspace() {
  const view = useAppStore((s) => s.view);
  const viewParams = useAppStore((s) => s.viewParams);

  switch (view) {
    case "coordinator.dashboard":
      return <CoordinatorDashboard />;
    case "coordinator.students":
      return <StudentsList />;
    case "coordinator.student-new":
      return <StudentForm />;
    case "coordinator.student-view":
      return <StudentDetail studentId={viewParams.studentId} />;
    case "coordinator.supervisors":
      return <SupervisorsList />;
    case "coordinator.supervisor-new":
      return <SupervisorForm />;
    case "coordinator.supervisor-view":
      return <SupervisorDetail supervisorId={viewParams.supervisorId} />;
    case "coordinator.evaluations":
      return <AllEvaluationsList />;
    case "coordinator.evaluation-view":
      return <EvaluationView evaluationId={viewParams.evaluationId} />;
    case "coordinator.journals":
      return <AllJournalsList />;
    case "coordinator.journal-view":
      return <JournalView journalId={viewParams.journalId} />;
    case "coordinator.forms":
      return <FormsHub />;
    case "coordinator.form-editor":
      return <FormEditor formId={viewParams.formId} />;
    case "coordinator.user-management":
      return <UserManagement />;
    case "coordinator.bulk-create":
      return <BulkCreateUsers />;
    case "coordinator.coordinator-new":
      return <CoordinatorForm coordinatorId={viewParams.coordinatorId} />;
    case "coordinator.settings-school":
      return <SchoolIdentitySettings />;
    case "coordinator.settings-tools":
      return <ExternalToolsSetup />;
    case "coordinator.reports":
      return <CoordinatorReports />;
    case "coordinator.time-monitor":
      return <CoordinatorTimeMonitor />;
    case "coordinator.timesheets":
      return <CoordinatorTimesheets />;
    case "coordinator.profile":
      return <CoordinatorProfile />;
    default:
      return <CoordinatorDashboard />;
  }
}

export {
  CoordinatorDashboard,
  StudentsList,
  StudentForm,
  StudentDetail,
  SupervisorsList,
  SupervisorForm,
  SupervisorDetail,
  AllEvaluationsList,
  EvaluationView,
  AllJournalsList,
  JournalView,
  CoordinatorReports,
  CoordinatorTimeMonitor,
  CoordinatorTimesheets,
  CoordinatorProfile,
  FormsHub,
  FormEditor,
  UserManagement,
  BulkCreateUsers,
  CoordinatorForm,
  ExternalToolsSetup,
};
