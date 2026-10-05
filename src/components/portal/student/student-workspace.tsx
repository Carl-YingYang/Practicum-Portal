"use client";
import dynamic from "next/dynamic";
import { WorkspaceLoader } from "@/components/portal/shared/workspace-loader";
import { useAppStore } from "@/store/use-app-store";
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
const StudentDashboard = dynamic(
  () => import("./student-dashboard").then((module) => module.StudentDashboard),
  { loading: () => <WorkspaceLoader /> },
);
const JournalsList = dynamic(
  () => import("./journals-list").then((module) => module.JournalsList),
  { loading: () => <WorkspaceLoader /> },
);
const JournalForm = dynamic(
  () => import("./journal-form").then((module) => module.JournalForm),
  { loading: () => <WorkspaceLoader /> },
);
const JournalDetail = dynamic(
  () => import("./journal-detail").then((module) => module.JournalDetail),
  { loading: () => <WorkspaceLoader /> },
);
const EvaluationsList = dynamic(
  () => import("./evaluations-list").then((module) => module.EvaluationsList),
  { loading: () => <WorkspaceLoader /> },
);
const EvaluationView = dynamic(
  () => import("./evaluation-view").then((module) => module.EvaluationView),
  { loading: () => <WorkspaceLoader /> },
);
const StudentReports = dynamic(
  () => import("./student-reports").then((module) => module.StudentReports),
  { loading: () => <WorkspaceLoader /> },
);
const TimeClockView = dynamic(
  () =>
    import("@/components/portal/shared/time-clock-view").then(
      (module) => module.TimeClockView,
    ),
  { loading: () => <WorkspaceLoader /> },
);
const StudentProfile = dynamic(
  () => import("./student-profile").then((module) => module.StudentProfile),
  { loading: () => <WorkspaceLoader /> },
);
const StudentForms = dynamic(
  () => import("./student-forms").then((module) => module.StudentForms),
  { loading: () => <WorkspaceLoader /> },
);
const StudentFormWorkspace = dynamic(
  () =>
    import("./student-form-workspace").then(
      (module) => module.StudentFormWorkspace,
    ),
  { loading: () => <WorkspaceLoader /> },
);
/**
 * Top-level router for the Student workspace. Reads `view` from the store
 * and renders the matching page component. Default falls back to dashboard.
 */
export function StudentWorkspace() {
  const view = useAppStore((s) => s.view);
  const viewParams = useAppStore((s) => s.viewParams);
  const currentUser = useAppStore((s) => s.currentUser);
  const student = useAppStore((s) =>
    s.students.find((st) => st.id === currentUser?.studentId),
  );
  if (!student?.supervisorId && view !== "student.profile")
    return <StudentDashboard />;
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
