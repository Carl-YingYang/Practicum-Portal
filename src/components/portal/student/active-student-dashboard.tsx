"use client";

import { EditorialDashboard } from "@/components/portal/shared/editorial-dashboard";

/** Dashboard shown once the student has a supervisor assignment. */
export function ActiveStudentDashboard() {
  return <EditorialDashboard role="student" />;
}
