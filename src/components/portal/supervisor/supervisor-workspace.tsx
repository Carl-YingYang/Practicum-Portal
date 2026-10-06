"use client";
import dynamic from "next/dynamic";
import { WorkspaceLoader } from "@/components/portal/shared/workspace-loader";
import { useAppStore } from "@/store/use-app-store";
const SupervisorDashboard = dynamic(
  () =>
    import("./supervisor-dashboard").then(
      (module) => module.SupervisorDashboard,
    ),
  { loading: () => <WorkspaceLoader /> },
);
const InternsList = dynamic(
  () => import("./interns-list").then((module) => module.InternsList),
  { loading: () => <WorkspaceLoader /> },
);
const InternDetail = dynamic(
  () => import("./intern-detail").then((module) => module.InternDetail),
  { loading: () => <WorkspaceLoader /> },
);
const EvaluationForm = dynamic(
  () => import("./evaluation-form").then((module) => module.EvaluationForm),
  { loading: () => <WorkspaceLoader /> },
);
const EvaluationView = dynamic(
  () => import("./evaluation-view").then((module) => module.EvaluationView),
  { loading: () => <WorkspaceLoader /> },
);
const EvaluationsList = dynamic(
  () => import("./evaluations-list").then((module) => module.EvaluationsList),
  { loading: () => <WorkspaceLoader /> },
);
const JournalApprovalQueue = dynamic(
  () =>
    import("./journal-approval-queue").then(
      (module) => module.JournalApprovalQueue,
    ),
  { loading: () => <WorkspaceLoader /> },
);
const JournalReview = dynamic(
  () => import("./journal-review").then((module) => module.JournalReview),
  { loading: () => <WorkspaceLoader /> },
);
const SupervisorReports = dynamic(
  () =>
    import("./supervisor-reports").then((module) => module.SupervisorReports),
  { loading: () => <WorkspaceLoader /> },
);
const SupervisorProfile = dynamic(
  () =>
    import("./supervisor-profile").then((module) => module.SupervisorProfile),
  { loading: () => <WorkspaceLoader /> },
);
const SupervisorFormsList = dynamic(
  () =>
    import("./supervisor-forms-list").then(
      (module) => module.SupervisorFormsList,
    ),
  { loading: () => <WorkspaceLoader /> },
);
const SupervisorFormWorkspace = dynamic(
  () =>
    import("./supervisor-form-workspace").then(
      (module) => module.SupervisorFormWorkspace,
    ),
  { loading: () => <WorkspaceLoader /> },
);
const ReportWorkspace = dynamic(() => import("../reports/report-workspace").then(m => m.ReportWorkspace), { loading: () => <WorkspaceLoader /> });
export function SupervisorWorkspace() {
  const view = useAppStore((s) => s.view);
  const viewParams = useAppStore((s) => s.viewParams);
  switch (view) {
    case "supervisor.dashboard":
      return <SupervisorDashboard />;
    case "supervisor.interns":
      return <InternsList />;
    case "supervisor.intern-view":
      return <InternDetail />;
    case "supervisor.evaluations":
      return <EvaluationsList />;
    case "supervisor.evaluation-new":
      return <EvaluationForm />;
    case "supervisor.evaluation-view":
      return <EvaluationView />;
    case "supervisor.journals":
      return <JournalApprovalQueue />;
    case "supervisor.journal-review":
      return <JournalReview />;
    case "supervisor.forms":
      return <SupervisorFormsList />;
    case "supervisor.form-view":
      return <SupervisorFormWorkspace formId={viewParams.formId} />;
    case "supervisor.report-builder":
      return <ReportWorkspace />;
    case "supervisor.reports":
      return <SupervisorReports />;
    // Alias: time-monitor now points to My Interns (the live board + roster
    // were merged into the My Interns page per the supervisor's request).
    case "supervisor.time-monitor":
      return <InternsList />;
    case "supervisor.profile":
      return <SupervisorProfile />;
    default:
      return <SupervisorDashboard />;
  }
}
// Re-export page components as named exports.
export {
  SupervisorDashboard,
  InternsList,
  InternDetail,
  EvaluationForm,
  EvaluationView,
  EvaluationsList,
  JournalApprovalQueue,
  JournalReview,
  SupervisorReports,
  SupervisorProfile,
  SupervisorFormsList,
  SupervisorFormWorkspace,
};
export default SupervisorWorkspace;
