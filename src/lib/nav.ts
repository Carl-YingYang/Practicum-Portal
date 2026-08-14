import {
  LayoutDashboard,
  NotebookText,
  ClipboardCheck,
  FileText,
  Users,
  UserSquare2,
  FileCheck2,
  ClipboardList,
  GraduationCap,
  Timer,
  Radar,
  FilePlus2,
  UserCircle,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { NavItem, Role, ViewKey } from "./types";

const iconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  journals: NotebookText,
  evaluations: ClipboardCheck,
  reports: FileText,
  students: Users,
  supervisors: UserSquare2,
  users: Users,
  approvals: FileCheck2,
  allEvaluations: ClipboardCheck,
  allJournals: ClipboardList,
  roster: GraduationCap,
  timeClock: Timer,
  timeMonitor: Radar,
  forms: FilePlus2,
  profile: UserCircle,
  settings: Settings,
};

export function getNavIcon(name: string): LucideIcon {
  return iconMap[name] ?? LayoutDashboard;
}

export const navConfig: Record<Role, NavItem[]> = {
  student: [
    { key: "dashboard", label: "Dashboard", shortLabel: "Home", view: "student.dashboard", icon: "dashboard", section: "Overview" },
    { key: "timeClock", label: "Time Clock", shortLabel: "Clock", view: "student.time-clock", icon: "timeClock", section: "My Work" },
    { key: "journals", label: "Journals", shortLabel: "Journals", view: "student.journals", icon: "journals", section: "My Work" },
    { key: "evaluations", label: "Evaluations", shortLabel: "Evals", view: "student.evaluations", icon: "evaluations", section: "My Work" },
    { key: "forms", label: "Forms", shortLabel: "Forms", view: "student.forms", icon: "forms", section: "My Work" },
    { key: "reports", label: "Reports & PDFs", shortLabel: "Reports", view: "student.reports", icon: "reports", section: "Insights" },
  ],
  supervisor: [
    { key: "dashboard", label: "Dashboard", shortLabel: "Home", view: "supervisor.dashboard", icon: "dashboard", section: "Overview" },
    { key: "interns", label: "My Interns", shortLabel: "Interns", view: "supervisor.interns", icon: "students", section: "Interns" },
    {
      key: "evaluations",
      label: "Evaluations",
      shortLabel: "Evals",
      view: "supervisor.evaluations",
      icon: "evaluations",
      badgeKey: "pendingEvaluations",
      section: "Workflow",
    },
    {
      key: "journals",
      label: "Journal Approvals",
      shortLabel: "Journals",
      view: "supervisor.journals",
      icon: "approvals",
      badgeKey: "pendingJournals",
      section: "Workflow",
    },
    {
      key: "forms",
      label: "Shared Forms",
      shortLabel: "Forms",
      view: "supervisor.forms",
      icon: "forms",
      section: "Workflow",
    },
    { key: "reports", label: "Reports & PDFs", shortLabel: "Reports", view: "supervisor.reports", icon: "reports", section: "Insights" },
  ],
  coordinator: [
    { key: "dashboard", label: "Dashboard", shortLabel: "Home", view: "coordinator.dashboard", icon: "dashboard", section: "Overview" },
    { key: "students", label: "Students", shortLabel: "Students", view: "coordinator.students", icon: "students", badgeKey: "unassignedStudents", section: "People" },
    { key: "supervisors", label: "Supervisors", shortLabel: "Supervisors", view: "coordinator.supervisors", icon: "supervisors", section: "People" },
    { key: "users", label: "User Management", shortLabel: "Users", view: "coordinator.user-management", icon: "users", section: "People" },
    {
      key: "forms",
      label: "Forms",
      shortLabel: "Forms",
      view: "coordinator.forms",
      icon: "forms",
      section: "Workflow",
    },
    { key: "evaluations", label: "Evaluations", shortLabel: "Evals", view: "coordinator.evaluations", icon: "allEvaluations", section: "Workflow" },
    { key: "journals", label: "Journals", shortLabel: "Journals", view: "coordinator.journals", icon: "allJournals", section: "Workflow" },
    { key: "timesheets", label: "Timesheets", shortLabel: "Timesheets", view: "coordinator.timesheets", icon: "timeClock", section: "Workflow" },
    { key: "reports", label: "Reports", shortLabel: "Reports", view: "coordinator.reports", icon: "reports", section: "Insights" },
    { key: "settings", label: "School Settings", shortLabel: "Settings", view: "coordinator.settings-school", icon: "settings", section: "Configuration" },
    { key: "tools", label: "External Tools", shortLabel: "Tools", view: "coordinator.settings-tools", icon: "forms", section: "Configuration" },
  ],
};

/** The landing view for each role after login. */
export const roleHomeView: Record<Role, ViewKey> = {
  student: "student.dashboard",
  supervisor: "supervisor.dashboard",
  coordinator: "coordinator.dashboard",
};

/** Friendly page titles per view (for topbar + breadcrumb). */
export const viewTitles: Record<ViewKey, string> = {
  login: "Sign in",
  "student.dashboard": "Dashboard",
  "student.journals": "Weekly Journals",
  "student.journal-new": "New Journal",
  "student.journal-view": "Journal",
  "student.evaluations": "My Evaluations",
  "student.evaluation-view": "Evaluation Report",
  "student.reports": "Reports & PDFs",
  "student.time-clock": "Time Clock",
  "student.forms": "Forms",
  "student.form-view": "Form",
  "student.profile": "My Profile",
  "supervisor.dashboard": "Dashboard",
  "supervisor.interns": "My Interns",
  "supervisor.intern-view": "Intern Detail",
  "supervisor.evaluations": "Evaluations",
  "supervisor.evaluation-new": "Create Evaluation",
  "supervisor.evaluation-view": "Evaluation",
  "supervisor.journals": "Journal Approvals",
  "supervisor.journal-review": "Review Journal",
  "supervisor.reports": "Reports & PDFs",
  "supervisor.time-monitor": "Time Tracking",
  "supervisor.time-clock": "Time Clock",
  "supervisor.forms": "Shared Forms",
  "supervisor.form-view": "View Form",
  "supervisor.profile": "My Profile",
  "coordinator.dashboard": "Dashboard",
  "coordinator.students": "Students",
  "coordinator.student-new": "Add Student",
  "coordinator.student-view": "Student Detail",
  "coordinator.supervisors": "Supervisors",
  "coordinator.supervisor-new": "Add Supervisor",
  "coordinator.supervisor-view": "Supervisor Detail",
  "coordinator.evaluations": "All Evaluations",
  "coordinator.evaluation-view": "Evaluation",
  "coordinator.journals": "All Journals",
  "coordinator.journal-view": "Journal",
  "coordinator.reports": "Reports",
  "coordinator.time-monitor": "Time Tracking",
  "coordinator.timesheets": "Intern Timesheets",
  "coordinator.time-clock": "Time Clock",
  "coordinator.forms": "Forms",
  "coordinator.form-editor": "Edit Form",
  "coordinator.user-management": "User Management",
  "coordinator.bulk-create": "Bulk Create Users",
  "coordinator.coordinator-new": "Add Coordinator",
  "coordinator.settings-school": "School Settings",
  "coordinator.settings-tools": "External Tools Setup",
  "coordinator.subscription": "Billing & Usage Summary",
  "coordinator.profile": "My Profile",
};

export const roleBreadcrumbs: Record<Role, string> = {
  student: "Student",
  supervisor: "Supervisor",
  coordinator: "Coordinator",
};

/**
 * Bottom tab bar items — shown only on mobile (<lg). Max 4 tabs, one of which
 * is always Profile so the user can always reach their account / switch role.
 * Primary navigation is here; the drawer is for secondary items.
 */
export const bottomTabs: Record<Role, NavItem[]> = {
  student: [
    { key: "dashboard", label: "Dashboard", shortLabel: "Home", view: "student.dashboard", icon: "dashboard" },
    { key: "journals", label: "Journals", shortLabel: "Journals", view: "student.journals", icon: "journals" },
    { key: "forms", label: "Forms", shortLabel: "Forms", view: "student.forms", icon: "forms" },
    { key: "timeClock", label: "Time Clock", shortLabel: "Time", view: "student.time-clock", icon: "timeClock" },
    { key: "profile", label: "Profile", shortLabel: "Profile", view: "student.profile", icon: "profile" },
  ],
  supervisor: [
    { key: "dashboard", label: "Dashboard", shortLabel: "Home", view: "supervisor.dashboard", icon: "dashboard" },
    {
      key: "journals",
      label: "Journal Approvals",
      shortLabel: "Queue",
      view: "supervisor.journals",
      icon: "approvals",
      badgeKey: "pendingJournals",
    },
    { key: "interns", label: "My Interns", shortLabel: "Interns", view: "supervisor.interns", icon: "students" },
    { key: "profile", label: "Profile", shortLabel: "Profile", view: "supervisor.profile", icon: "profile" },
  ],
  coordinator: [
    { key: "dashboard", label: "Dashboard", shortLabel: "Home", view: "coordinator.dashboard", icon: "dashboard" },
    {
      key: "students",
      label: "Students",
      shortLabel: "Students",
      view: "coordinator.students",
      icon: "students",
      badgeKey: "unassignedStudents",
    },
    { key: "supervisors", label: "Supervisors", shortLabel: "Superv.", view: "coordinator.supervisors", icon: "supervisors" },
    { key: "profile", label: "Profile", shortLabel: "Profile", view: "coordinator.profile", icon: "profile" },
  ],
};

/** Secondary nav items — shown in the mobile drawer only (not the bottom bar). */
export const secondaryNavItems: Record<Role, NavItem[]> = {
  student: [
    { key: "evaluations", label: "Evaluations", shortLabel: "Evals", view: "student.evaluations", icon: "evaluations" },
    { key: "reports", label: "Reports & PDFs", shortLabel: "Reports", view: "student.reports", icon: "reports" },
  ],
  supervisor: [
    {
      key: "evaluations",
      label: "Evaluations",
      shortLabel: "Evals",
      view: "supervisor.evaluations",
      icon: "evaluations",
      badgeKey: "pendingEvaluations",
    },
    { key: "forms", label: "Shared Forms", shortLabel: "Forms", view: "supervisor.forms", icon: "forms" },
    { key: "reports", label: "Reports & PDFs", shortLabel: "Reports", view: "supervisor.reports", icon: "reports" },
  ],
  coordinator: [
    { key: "forms", label: "Forms", shortLabel: "Forms", view: "coordinator.forms", icon: "forms" },
    { key: "evaluations", label: "Evaluations", shortLabel: "Evals", view: "coordinator.evaluations", icon: "allEvaluations" },
    { key: "journals", label: "Journals", shortLabel: "Journals", view: "coordinator.journals", icon: "allJournals" },
    { key: "timesheets", label: "Timesheets", shortLabel: "Timesheets", view: "coordinator.timesheets", icon: "timeClock" },
    { key: "reports", label: "Reports", shortLabel: "Reports", view: "coordinator.reports", icon: "reports" },
  ],
};
