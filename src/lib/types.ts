// ============================================================
// Practicum Evaluation Portal — Domain Types
// Single source of truth for the MVP mock implementation.
// ============================================================

export type Role = "student" | "supervisor" | "coordinator";

// ============================================================
// School Entity & Branding
// Per-school branding (accent, logo, hero images) customized by
// supervisors. Students/coordinators see their assigned school's
// branding; supervisors with multi-school interns see the default.
// ============================================================

/** Editorial accent palette — calm, muted, warm. */
export type AccentColor = "sage" | "terracotta" | "slate" | "sand" | "clay";

/** A school with its branding configuration. */
export interface School {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  /** Editorial accent color. */
  accentColor: AccentColor;
  /** Optional logo as a data URL (PNG/JPEG, ≤ 30KB). */
  logoDataUrl?: string;
  /** Optional hero images as data URLs (≤ 200KB each, max 3). Empty = use defaults. */
  heroImages: string[];
  /** When true, this is the system default (Practo) — flat hero slideshow. */
  isDefault?: boolean;
  /** Card visibility order for the student bento dashboard. */
  visibleCards: string[];
}

/** Default Practo school ID. */
export const DEFAULT_SCHOOL_ID = "practo";

/** Default visible cards for a new school. */
export const DEFAULT_VISIBLE_CARDS: string[] = [
  "time_clock",
  "drafting_room",
  "timesheet",
  "evaluations",
];

/** Accent → hex color map (for CSS custom properties). */
export const ACCENT_HEX: Record<AccentColor, { base: string; soft: string }> = {
  sage: { base: "#5f8b7a", soft: "#e8f0ec" },
  terracotta: { base: "#c47a5a", soft: "#f5e8e0" },
  slate: { base: "#64748b", soft: "#e2e8f0" },
  sand: { base: "#b89968", soft: "#f5efe0" },
  clay: { base: "#a67b6b", soft: "#f0e6e0" },
};

export const ACCENT_OPTIONS: { value: AccentColor; label: string }[] = [
  { value: "sage", label: "Sage" },
  { value: "terracotta", label: "Terracotta" },
  { value: "slate", label: "Slate" },
  { value: "sand", label: "Sand" },
  { value: "clay", label: "Clay" },
];

// ============================================================
// School Identity (legacy — still used by the school-identity-card
// component and coordinator settings. Will be migrated to School.)
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
  /** Accent color for highlights — hex. One of: sage, terracotta, slate, sand, clay, or a custom hex. */
  accentColor?: string;
  /** Single hero image as data URL (JPEG/PNG, ≤ 200KB). Replaces the old 3-image slideshow. */
  heroImage?: string;
  /** Which dashboard cards are visible to students. */
  visibleCards?: {
    timeClock: boolean;
    draftingRoom: boolean;
    timesheet: boolean;
    evaluations: boolean;
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
  /** School this student belongs to (drives branding). Defaults to "practo". */
  schoolId: string;
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
  /** School this coordinator belongs to (drives branding). Defaults to "practo". */
  schoolId: string;
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

// ============================================================
// Subscription & billing (pay-per-hour)
// ============================================================

/**
 * Subscription tier the school is on. Billing is **pay-per-hour**: the school is
 * charged a configurable `hourlyRatePhp` for every intern-hour. Each student's
 * `requiredHours` (assigned at creation) drives the *committed* bill, while
 * their `loggedHours` drive the *accrued* (earned) bill. Each tier sets its own
 * per-hour rate + max-students cap; the coordinator may override the active rate.
 *
 * Canonical example (default Growth rate): ₱0.0667/hr ⇒ 15 hours = ₱1.00.
 */
export type PlanTier = "starter" | "growth" | "enterprise";
export type BillingCycle = "monthly" | "per-term" | "annual";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";
export type PaymentMethod = "card" | "bank" | "invoice";

export interface SubscriptionPlan {
  tier: PlanTier;
  label: string;
  /** Per-hour billing rate for this tier (PHP). */
  hourlyRatePhp: number;
  /** Max enrolled students on this tier. */
  maxStudents: number;
  blurb: string;
  features: string[];
  accent: "teal" | "amber" | "emerald" | "slate" | "red";
}

export interface SubscriptionInvoice {
  id: string;
  /** ISO date issued. */
  issuedAt: string;
  description: string;
  /** Number of intern-hours billed on this invoice (0 for non-hour line items). */
  hours: number;
  amountPhp: number;
  status: "paid" | "pending" | "failed";
}

export interface Subscription {
  planTier: PlanTier;
  status: SubscriptionStatus;
  /**
   * Active per-hour billing rate (PHP). Defaults to the current tier's
   * `hourlyRatePhp` but can be overridden by the coordinator. This is the
   * single source of truth for all billing math.
   */
  hourlyRatePhp: number;
  billingCycle: BillingCycle;
  paymentMethod: PaymentMethod;
  /** ISO date the subscription started. */
  startedAt: string;
  /** ISO date of next renewal. */
  renewsAt: string;
  invoices: SubscriptionInvoice[];
}

/** Derived billing metrics computed from the subscription + active students. */
export interface SubscriptionMetrics {
  /** Σ active students' requiredHours — the committed hour load for the term. */
  totalAssignedHours: number;
  /** Σ active students' loggedHours — actual hours clocked so far. */
  totalUsedHours: number;
  /** Active per-hour rate (PHP). */
  hourlyRatePhp: number;
  /** Committed bill = totalAssignedHours × hourlyRatePhp. */
  committedCostPhp: number;
  /** Accrued (earned) bill = totalUsedHours × hourlyRatePhp. */
  accruedCostPhp: number;
  /** Outstanding commitment = committedCostPhp − accruedCostPhp. */
  outstandingCostPhp: number;
  /** Progress of logged vs assigned hours, 0–100. */
  utilizationPct: number;
  /** Count of active students driving the commitment. */
  activeStudents: number;
}

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
  /**
   * score-mode rating tables only: the max rating shown in the "Max" column
   * (e.g. "20%", "15"). Ignored in radio mode.
   */
  max?: string;
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
  /**
   * rating-table: when true, render a weighted score table
   * (Criterion | Max | Score input) instead of radio columns. Used by the
   * OJT Performance Evaluation Sheet which uses weighted percentages.
   */
  scoreMode?: boolean;
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
// Form assignments & submissions — the filling / review layer.
// A coordinator assigns a published form to an audience
// (all supervisors / all students / specific people). Each recipient
// then creates a FormSubmission (one per intern for evaluation/ojt
// forms). The coordinator reviews submissions (approve / request
// revision).
// ============================================================

export type FormAssignmentTarget =
  | "all_supervisors"
  | "all_students"
  | "specific_users";

export interface FormAssignment {
  id: string;
  formId: string;
  target: FormAssignmentTarget;
  /** for specific_users: the recipient user ids; empty otherwise */
  targetUserIds: string[];
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
}

export type FormSubmissionStatus =
  /** virtual — no submission exists yet (used in inbox rows only) */
  | "not_started"
  /** draft, being filled */
  | "in_progress"
  /** submitted, awaiting coordinator review */
  | "submitted"
  /** coordinator opened the review */
  | "under_review"
  /** coordinator approved */
  | "approved"
  /** coordinator sent back for revision */
  | "needs_revision";

export type FormFieldValue = string | Record<string, string>;

export interface FormSubmission {
  id: string;
  formId: string;
  /** the user who fills the form (the submitter) */
  userId: string;
  /**
   * for evaluation/ojt forms: the intern being evaluated. Undefined for
   * self-reflective forms (journal / program / site evaluation).
   */
  targetStudentId?: string;
  /** blockId → value (string for text fields, Record for rating tables) */
  values: Record<string, FormFieldValue>;
  status: FormSubmissionStatus;
  startedAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  /** coordinator's approve / revision note */
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export const FORM_SUBMISSION_STATUS_LABELS: Record<FormSubmissionStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  needs_revision: "Needs revision",
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
  | "student.forms"
  | "student.form-view"
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
  | "coordinator.subscription"
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
