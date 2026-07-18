"use client";

import { useAppStore } from "@/store/use-app-store";
import { StudentDashboard } from "./student-dashboard";
import { JournalsList } from "./journals-list";
import { JournalForm } from "./journal-form";
import { JournalDetail } from "./journal-detail";
import { EvaluationsList } from "./evaluations-list";
import { EvaluationView } from "./evaluation-view";
import { StudentReports } from "./student-reports";
import { TimeClockView } from "@/components/portal/shared/time-clock-view";
import { StudentProfile } from "./student-profile";
import { StudentForms } from "./student-forms";
import { StudentFormWorkspace } from "./student-form-workspace";

export {
  StudentDashboard,
  JournalsList,
  JournalForm,
  JournalDetail,
  EvaluationsList,
  EvaluationView,
  StudentReports,
  TimeClockView,
  StudentProfile,
  StudentForms,
  StudentFormWorkspace,
};

/**
 * Top-level router for the Student workspace. Reads `view` from the store
 * and renders the matching page component. Default falls back to dashboard.
 */
export function StudentWorkspace() {
  const view = useAppStore((s) => s.view);
  const viewParams = useAppStore((s) => s.viewParams);

  switch (view) {
    case "student.dashboard":
      return <StudentDashboard />;
    case "student.journals":
      return <JournalsList />;
    case "student.journal-new":
      return <JournalForm />;
    case "student.journal-view":
      return <JournalDetail />;
    case "student.evaluations":
      return <EvaluationsList />;
    case "student.evaluation-view":
      return <EvaluationView />;
    case "student.reports":
      return <StudentReports />;
    case "student.time-clock":
      return <TimeClockView />;
    case "student.forms":
      return <StudentForms />;
    case "student.form-view":
      return <StudentFormWorkspace formId={viewParams.formId} />;
    case "student.profile":
      return <StudentProfile />;
    default:
      return <StudentDashboard />;
  }
}

export default StudentWorkspace;
