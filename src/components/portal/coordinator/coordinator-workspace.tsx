"use client";
import dynamic from "next/dynamic";
import { WorkspaceLoader } from "@/components/portal/shared/workspace-loader";
import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
/**
 * Barrel + router for the Coordinator workspace. Reads `view` + `viewParams`
 * from the store and renders the matching page.
 */
const CoordinatorDashboard = dynamic(
  () =>
    import("./coordinator-dashboard").then(
      (module) => module.CoordinatorDashboard,
    ),
  { loading: () => <WorkspaceLoader /> },
);
const StudentsList = dynamic(
  () => import("./students-list").then((module) => module.StudentsList),
  { loading: () => <WorkspaceLoader /> },
);
const StudentForm = dynamic(
  () => import("./student-form").then((module) => module.StudentForm),
  { loading: () => <WorkspaceLoader /> },
);
const StudentDetail = dynamic(
  () => import("./student-detail").then((module) => module.StudentDetail),
  { loading: () => <WorkspaceLoader /> },
);
const SupervisorsList = dynamic(
  () => import("./supervisors-list").then((module) => module.SupervisorsList),
  { loading: () => <WorkspaceLoader /> },
);
const SupervisorForm = dynamic(
  () => import("./supervisor-form").then((module) => module.SupervisorForm),
  { loading: () => <WorkspaceLoader /> },
);
const SupervisorDetail = dynamic(
  () => import("./supervisor-detail").then((module) => module.SupervisorDetail),
  { loading: () => <WorkspaceLoader /> },
);
const AllEvaluationsList = dynamic(
  () =>
    import("./all-evaluations-list").then(
      (module) => module.AllEvaluationsList,
    ),
  { loading: () => <WorkspaceLoader /> },
);
const EvaluationView = dynamic(
  () => import("./evaluation-view").then((module) => module.EvaluationView),
  { loading: () => <WorkspaceLoader /> },
);
const AllJournalsList = dynamic(
  () => import("./all-journals-list").then((module) => module.AllJournalsList),
  { loading: () => <WorkspaceLoader /> },
);
const JournalView = dynamic(
  () => import("./journal-view").then((module) => module.JournalView),
  { loading: () => <WorkspaceLoader /> },
);
const CoordinatorReports = dynamic(
  () =>
    import("./coordinator-reports").then((module) => module.CoordinatorReports),
  { loading: () => <WorkspaceLoader /> },
);
const CoordinatorTimeMonitor = dynamic(
  () =>
    import("./coordinator-time-monitor").then(
      (module) => module.CoordinatorTimeMonitor,
    ),
  { loading: () => <WorkspaceLoader /> },
);
const CoordinatorTimesheets = dynamic(
  () =>
    import("./coordinator-timesheets").then(
      (module) => module.CoordinatorTimesheets,
    ),
  { loading: () => <WorkspaceLoader /> },
);
const CoordinatorProfile = dynamic(
  () =>
    import("./coordinator-profile").then((module) => module.CoordinatorProfile),
  { loading: () => <WorkspaceLoader /> },
);
const FormsHub = dynamic(
  () => import("./forms-hub").then((module) => module.FormsHub),
  { loading: () => <WorkspaceLoader /> },
);
const FormEditor = dynamic(
  () => import("./form-editor").then((module) => module.FormEditor),
  { loading: () => <WorkspaceLoader /> },
);
const UserManagement = dynamic(
  () => import("./user-management").then((module) => module.UserManagement),
  { loading: () => <WorkspaceLoader /> },
);
const BulkCreateUsers = dynamic(
  () => import("./bulk-create-users").then((module) => module.BulkCreateUsers),
  { loading: () => <WorkspaceLoader /> },
);
const CoordinatorForm = dynamic(
  () => import("./coordinator-form").then((module) => module.CoordinatorForm),
  { loading: () => <WorkspaceLoader /> },
);
const SchoolIdentitySettings = dynamic(
  () =>
    import("../settings/school-identity-settings").then(
      (module) => module.SchoolIdentitySettings,
    ),
  { loading: () => <WorkspaceLoader /> },
);
const ExternalToolsSetup = dynamic(
  () =>
    import("./external-tools-setup").then(
      (module) => module.ExternalToolsSetup,
    ),
  { loading: () => <WorkspaceLoader /> },
);
const ReportWorkspace = dynamic(
  () => import("../reports/report-workspace").then((m) => m.ReportWorkspace),
  { loading: () => <WorkspaceLoader /> },
);
const TemplateWorkspace = dynamic(
  () =>
    import("../templates/template-workspace").then((m) => m.TemplateWorkspace),
  { loading: () => <WorkspaceLoader /> },
);
const PracticumWorkspace = dynamic(
  () => import("./practicum-workspace").then((m) => m.PracticumWorkspace),
  { loading: () => <WorkspaceLoader /> },
);
export function CoordinatorWorkspace() {
  const view = useAppStore((s) => s.view);
  const viewParams = useAppStore((s) => s.viewParams);
  switch (view) {
    case "coordinator.practicum":
      return <PracticumWorkspace />;
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
      return (
        <FormsHub
          key={`${viewParams.tab ?? "forms"}:${viewParams.formId ?? "all"}`}
        />
      );
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
    case "coordinator.templates":
      return <TemplateWorkspace />;
    case "coordinator.report-builder":
      return <ReportWorkspace />;
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
