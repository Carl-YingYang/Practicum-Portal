// ============================================================
// Practicum Evaluation Portal — Domain Types
// Single source of truth for the MVP mock implementation.
// ============================================================

export type Role = "student" | "supervisor" | "coordinator";

// ============================================================
// School Identity & Branding
// Coordinator-configured per-school theming. Reflects across all
// roles' views (login page, sidebar, dashboard). Stored as data URLs
// in the MVP store (persisted to localStorage).
// ============================================================

/** A built-in theme preset key, or "custom" for coordinator-picked colors. */
export type SchoolThemePreset =
  | "azure-blue"
  | "onyx-gold"
  | "forest-green"
  | "crimson-maroon"
  | "royal-navy"
  | "burnt-orange"
  | "custom";

export interface SchoolIdentity {
  /** Full institution name, e.g. "Your University Name". */
  name: string;
  /** Short abbreviation shown in collapsed sidebar, e.g. "ABC". */
  shortName: string;
  /** A one-line descriptor under the name. */
  tagline: string;
  /** Physical address line. */
  address: string;
  /** Optional logo as a data URL (PNG/JPEG, ≤ 30KB after compression). */
  logoDataUrl?: string;
  /** Optional hero banner as a data URL (JPEG, ≤ 200KB). */
  bannerDataUrl?: string;
  /** Which preset palette to use, or "custom". */
  themePreset: SchoolThemePreset;
  /** When themePreset === "custom", the coordinator's picked colors. */
  customColors?: {
    /** Primary brand color (sidebar + buttons), hex. */
    primary: string;
    /** Deep accent for gradients/dark-mode chrome, hex. */
    deep: string;
    /** Pale accent for highlights, hex. */
    light: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** link to the role-specific record */
  studentId?: string;
  supervisorId?: string;
  coordinatorId?: string;
  /**
   * User-facing login ID. Used as the password on the login screen
   * (email = username, idNumber = password). For students this is their
   * studentNumber; for supervisors/coordinators it's an assigned employee
   * ID; for seed demo accounts it's a readable slug.
   */
  idNumber?: string;
  /** initials avatar background */
  avatarColor: string;
}

export type StudentStatus = "active" | "inactive";

/** Department enum — shared between Student and Supervisor for matching. */
export type Department =
  | "Engineering"
  | "QA"
  | "Design"
  | "Marketing"
  | "Operations"
  | "Other";

export const DEPARTMENTS: Department[] = [
  "Engineering",
  "QA",
  "Design",
  "Marketing",
  "Operations",
  "Other",
];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  Engineering: "Engineering",
  QA: "QA",
  Design: "Design",
  Marketing: "Marketing",
  Operations: "Operations",
  Other: "Other",
};

export type WorkMode = "onsite" | "hybrid" | "remote";

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  onsite: "Onsite",
  hybrid: "Hybrid",
  remote: "Remote",
};

export interface Student {
  id: string;
  studentNumber: string;
  name: string;
  email: string;
  course: string;
  requiredHours: number;
  loggedHours: number;
  companyId: string;
  supervisorId: string | null;
  status: StudentStatus;
  /** What the intern does at the company (e.g. "Frontend Developer Intern"). */
  position: string;
  /** Department/team they sit in — used for matching to a supervisor. */
  department: Department;
  /** Placement start date (ISO). */
  startDate: string | null;
  /** Placement end date (ISO). */
  endDate: string | null;
  /** Where the intern works. */
  workMode: WorkMode;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
}

export type SupervisorStatus = "active" | "inactive";

export interface Supervisor {
  id: string;
  name: string;
  email: string;
  companyId: string;
  status: SupervisorStatus;
  /** Their actual role at the company (e.g. "Senior Frontend Engineer"). */
  title: string;
  /** Department they mentor in — used for matching students. */
  department: Department;
  /** Max interns they will take. */
  capacity: number;
  /**
   * User-facing login ID (used as password). Auto-generated like "EMP-001"
   * if not provided. Displayed in the coordinator's user-management list
   * and shared with the supervisor as their login credential.
   */
  idNumber?: string;
  createdAt: string;
}

export type CoordinatorStatus = "active" | "inactive";

/** Academic department options for coordinators (university-side). */
export const COORDINATOR_DEPARTMENTS: string[] = [
  "Computer Studies",
  "Engineering",
  "Business",
  "Arts & Sciences",
  "Education",
  "Accountancy",
  "Other",
];

/** Coordinator — university staff who manage the practicum program. */
export interface Coordinator {
  id: string;
  name: string;
  email: string;
  /** Their role/title at the university (e.g. "Practicum Coordinator"). */
  title: string;
  /** Academic department (e.g. "Computer Studies"). */
  department: string;
  status: CoordinatorStatus;
  /**
   * User-facing login ID (used as password). Auto-generated like "COORD-001"
   * if not provided. Coordinators also self-register and may pick their own.
   */
  idNumber?: string;
  /** initials avatar background */
  avatarColor: string;
  createdAt: string;
}

export type EvaluationStatus = "draft" | "submitted";

export interface Evaluation {
  id: string;
  studentId: string;
  supervisorId: string;
  term: string;
  /** 1-5 ratings */
  qualityOfWork: number;
  jobKnowledge: number;
  dependability: number;
  /** comments */
  strengths: string;
  weaknesses: string;
  recommendations: string;
  status: EvaluationStatus;
  submittedAt: string | null;
  createdAt: string;
}

export type JournalStatus = "draft" | "pending" | "approved" | "rejected";

export interface Journal {
  id: string;
  studentId: string;
  date: string;
  hours: number;
  tasks: string;
  learnings: string;
  status: JournalStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  /** v5 link-based model: Google Docs URL for this week's journal. */
  docUrl?: string;
}

// ------------------------------------------------------------
// v5 — Free-first tool integration (Phase 1)
// ------------------------------------------------------------

/** Day-of-week for weekly journal due dates. */
export type JournalDueDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/**
 * Per-cohort external tool configuration. Stored in the Zustand store and
 * persisted to localStorage key `pp:cohort-tools`. All URL fields are
 * optional (empty string = not connected). The portal works in
 * "disconnected" mode — the banner just shows 0/4.
 */
export interface ToolsConfig {
  driveFolderUrl: string;
  journalTemplateUrl: string;
  formUrl: string;
  formResponsesCsvUrl: string;
  jibbleInviteUrl: string;
  termStart: string;
  termEnd: string;
  journalDueDay: JournalDueDay;
  requiredHours: number;
}

/** Which of the 4 external tools are connected (derived from ToolsConfig). */
export type ToolKey = "drive" | "journalTemplate" | "form" | "jibble";

/**
 * A clock-in / clock-out time-tracking session for ANY user (student,
 * supervisor, or coordinator). While `clockOutAt` is null the session is
 * considered ACTIVE (the user is currently on the clock). `durationMs` is
 * finalised on clock-out.
 *
 * `userId` is the identifier of the clocking entity:
 *   - for a student → their student record id (e.g. "s1")
 *   - for a supervisor → their supervisor record id (e.g. "sup1")
 *   - for a coordinator → their user id (e.g. "u-coord")
 * `role` is denormalised for convenient grouping/filtering in monitoring views.
 */
export interface TimeLog {
  id: string;
  userId: string;
  role: Role;
  clockInAt: string;          // ISO timestamp
  clockOutAt: string | null;  // ISO timestamp; null = active session
  durationMs: number | null;  // finalised on clock-out
  note?: string;
  createdAt: string;
}

export type ActivityType =
  | "evaluation_submitted"
  | "evaluation_saved_draft"
  | "journal_submitted"
  | "journal_approved"
  | "journal_rejected"
  | "student_created"
  | "supervisor_created"
  | "time_clock_in"
  | "time_clock_out";

export interface ActivityLog {
  id: string;
  type: ActivityType;
  message: string;
  actorId: string;
  timestamp: string;
}

// ============================================================
// Custom form documents — coordinator-authored templates that
// supervisors can fill in / view. Block-based, Google-Docs-style.
// ============================================================

export type FormBlockType =
  | "heading"
  | "paragraph"
  | "instruction"
  | "divider"
  | "info-field"
  | "fill-in"
  | "rating-table"
  | "signature";

export interface FormRatingCriterion {
  id: string;
  label: string;
}

export interface FormBlock {
  id: string;
  type: FormBlockType;
  /** heading text / paragraph body / instruction text */
  text?: string;
  /** heading level (1 = section title, 2 = sub-section, 3 = minor) */
  level?: 1 | 2 | 3;
  /** info-field + fill-in: the field label shown to the left/above the blank */
  label?: string;
  /** info-field + fill-in: placeholder hint */
  placeholder?: string;
  /** fill-in: render as multi-line textarea instead of single-line input */
  multiline?: boolean;
  /** rating-table: column header labels (e.g. ["Poor (1)", "Fair (2)", ...]) */
  scaleLabels?: string[];
  /** rating-table: row criteria */
  criteria?: FormRatingCriterion[];
  /** signature: caption under the line (e.g. "Signature over Printed Name") */
  caption?: string;
}

export type FormStatus = "draft" | "published" | "archived";

export type FormCategory =
  | "evaluation"
  | "journal"
  | "ojt"
  | "program"
  | "other";

export interface FormDocument {
  id: string;
  title: string;
  description: string;
  category: FormCategory;
  status: FormStatus;
  blocks: FormBlock[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  /** monotonically increasing version, bumped on each publish */
  version: number;
}

export const FORM_CATEGORY_LABELS: Record<FormCategory, string> = {
  evaluation: "Performance Evaluation",
  journal: "Practicum Journal",
  ojt: "Training Sheet",
  program: "Program Evaluation",
  other: "Other",
};

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

// ============================================================
// Navigation & view routing
// ============================================================

export type ViewKey =
  // public
  | "login"
  // student
  | "student.dashboard"
  | "student.journals"
  | "student.journal-new"
  | "student.journal-view"
  | "student.evaluations"
  | "student.evaluation-view"
  | "student.reports"
  | "student.time-clock"
  | "student.profile"
  // supervisor
  | "supervisor.dashboard"
  | "supervisor.interns"
  | "supervisor.intern-view"
  | "supervisor.evaluations"
  | "supervisor.evaluation-new"
  | "supervisor.evaluation-view"
  | "supervisor.journals"
  | "supervisor.journal-review"
  | "supervisor.reports"
  | "supervisor.time-monitor"
  | "supervisor.time-clock"
  | "supervisor.forms"
  | "supervisor.form-view"
  | "supervisor.profile"
  // coordinator
  | "coordinator.dashboard"
  | "coordinator.students"
  | "coordinator.student-new"
  | "coordinator.student-view"
  | "coordinator.supervisors"
  | "coordinator.supervisor-new"
  | "coordinator.supervisor-view"
  | "coordinator.evaluations"
  | "coordinator.evaluation-view"
  | "coordinator.journals"
  | "coordinator.journal-view"
  | "coordinator.reports"
  | "coordinator.time-monitor"
  | "coordinator.time-clock"
  | "coordinator.forms"
  | "coordinator.form-editor"
  | "coordinator.user-management"
  | "coordinator.bulk-create"
  | "coordinator.coordinator-new"
  | "coordinator.settings-school"
  | "coordinator.profile";

export interface NavItem {
  key: string;
  label: string;
  /** Optional shorter label for the mobile bottom nav (≤6 chars ideal). */
  shortLabel?: string;
  view: ViewKey;
  icon: string; // lucide icon name
  /** optional dynamic badge selector key */
  badgeKey?:
    | "pendingEvaluations"
    | "pendingJournals"
    | "unassignedStudents";
  /** Optional section label for grouping in the sidebar (e.g. "Overview", "People"). */
  section?: string;
}

export interface ViewParams {
  studentId?: string;
  supervisorId?: string;
  coordinatorId?: string;
  evaluationId?: string;
  journalId?: string;
  formId?: string;
  /** preselect student when creating an evaluation */
  preselectStudentId?: string;
}

// ============================================================
// Helpers
// ============================================================

export const RATING_CRITERIA = [
  {
    key: "qualityOfWork" as const,
    label: "Quality of Work",
    hint: "Overall standard and accuracy of completed work.",
  },
  {
    key: "jobKnowledge" as const,
    label: "Job Knowledge",
    hint: "Grasp of role responsibilities and required skills.",
  },
  {
    key: "dependability" as const,
    label: "Dependability",
    hint: "Reliability, punctuality, and follow-through.",
  },
];

export const RATING_ANCHORS: Record<number, string> = {
  1: "Poor",
  2: "Below Expectations",
  3: "Meets Expectations",
  4: "Exceeds",
  5: "Outstanding",
};

export const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  supervisor: "Company Supervisor",
  coordinator: "Practicum Coordinator",
};
