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
import { CoordinatorProfile } from "./coordinator-profile";
import { MessagesView } from "@/components/portal/shared/messages-view";
import { FormsList } from "./forms-list";
import { FormEditor } from "./form-editor";

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
    case "coordinator.messages":
      return <MessagesView />;
    case "coordinator.forms":
      return <FormsList />;
    case "coordinator.form-editor":
      return <FormEditor formId={viewParams.formId} />;
    case "coordinator.reports":
      return <CoordinatorReports />;
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
  CoordinatorProfile,
  FormsList,
  FormEditor,
};
