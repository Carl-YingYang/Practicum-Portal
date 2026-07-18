"use client";

import { useAppStore } from "@/store/use-app-store";
import { SupervisorDashboard } from "./supervisor-dashboard";
import { InternsList } from "./interns-list";
import { InternDetail } from "./intern-detail";
import { EvaluationForm } from "./evaluation-form";
import { EvaluationView } from "./evaluation-view";
import { EvaluationsList } from "./evaluations-list";
import { JournalApprovalQueue } from "./journal-approval-queue";
import { JournalReview } from "./journal-review";
import { SupervisorReports } from "./supervisor-reports";
import { SupervisorProfile } from "./supervisor-profile";
import { SupervisorFormsList } from "./supervisor-forms-list";
import { SupervisorFormWorkspace } from "./supervisor-form-workspace";

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
    case "supervisor.reports":
      return <SupervisorReports />;
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
