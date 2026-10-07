import {
  type AccountStatus,
  type ActivityLog,
  type Company,
  type Coordinator,
  type Evaluation,
  type FirstLoginPasswordResult,
  type FormAssignment,
  type FormAssignmentTarget,
  type FormBlock,
  type FormBlockType,
  type FormCategory,
  type FormDocument,
  type FormFieldValue,
  type FormSubmission,
  type Journal,
  type PlanTier,
  type Role,
  type School,
  type SchoolIdentity,
  type Student,
  type Subscription,
  type Supervisor,
  type TimeLog,
  type ToolsConfig,
  type User,
  type ViewKey,
  type ViewParams,
} from "@/lib/types";
interface HistoryEntry {
  view: ViewKey;
  params: ViewParams;
}
export interface AppState {
  hasHydrated: boolean;
  syncStatus: "idle" | "saving" | "error";
  syncError: string;
  testMode: boolean;
  demoAccounts: User[];
  hydratePrototype: () => Promise<void>;
  resetPrototype: () => void;
  // --- data collections ---
  companies: Company[];
  supervisors: Supervisor[];
  students: Student[];
  coordinators: Coordinator[];
  evaluations: Evaluation[];
  journals: Journal[];
  timeLogs: TimeLog[];
  activity: ActivityLog[];
  formDocuments: FormDocument[];
  /** published-form → audience assignments (coordinator-managed) */
  formAssignments: FormAssignment[];
  /** in-progress / submitted / reviewed form responses */
  formSubmissions: FormSubmission[];
  // --- auth + navigation ---
  currentUser: User | null;
  view: ViewKey;
  viewParams: ViewParams;
  history: HistoryEntry[];
  notificationsOpen: boolean;
  // --- v5: free-first tool integration (Phase 1) ---
  toolsConfig: ToolsConfig;
  setToolsConfig: (input: Partial<ToolsConfig>) => void;
  hydrateToolsConfig: () => void;
  // --- school identity & branding (coordinator-configured) ---
  schoolIdentity: SchoolIdentity;
  /** Patch the school identity (merges). Saved by the server command layer. */
  updateSchoolIdentity: (input: Partial<SchoolIdentity>) => void;
  /** Reset to the Practo default. */
  resetSchoolIdentity: () => void;
  /** Compatibility no-op; bootstrap loads server settings. */
  hydrateSchoolIdentity: () => void;
  // --- schools (per-school branding: accent, logo, hero images) ---
  schools: School[];
  /** Merge-patch a school's branding (accent, logo, heroImages, tagline, visibleCards). */
  setSchoolBranding: (schoolId: string, patch: Partial<School>) => void;
  /** Resolve a school by ID (falls back to the Practo default). */
  getSchool: (schoolId: string) => School;
  /** Compatibility no-op; bootstrap loads server settings. */
  hydrateSchools: () => void;
  // --- subscription & billing (pay-per-hour; coordinator-managed) ---
  subscription: Subscription;
  /** Patch subscription fields (merges). Saved by the server command layer. */
  updateSubscription: (input: Partial<Subscription>) => void;
  /** Override the active per-hour billing rate (PHP). */
  setHourlyRate: (rate: number) => void;
  /** Generate a usage invoice for the current accrued (logged) hours. */
  generateUsageInvoice: () => void;
  /** Switch to a different plan tier; adopts that tier's rate + invoice. */
  changePlan: (tier: PlanTier) => void;
  /** Reset to the seeded default subscription. */
  resetSubscription: () => void;
  /** Compatibility no-op; bootstrap loads server settings. */
  hydrateSubscription: () => void;
  // --- auth actions ---
  login: (role: Role) => void;
  loginAs: (userId: string) => void;
  /**
   * Coordinator: enable or disable an account (its sign-in ability) without
   * touching the underlying placement/employment record.
   */
  setAccountStatus: (
    role: Role,
    recordId: string,
    status: AccountStatus,
  ) => void;
  /**
   * Coordinator: issue a fresh one-time temporary password. The account
   * returns to "Invited" and must change the password at next sign-in.
   */
  resetAccountCredentials: (
    role: Role,
    recordId: string,
  ) => {
    name: string;
    email: string;
    role: Role;
    tempPassword: string;
  };
  logout: () => void;
  // --- navigation actions ---
  navigate: (view: ViewKey, params?: ViewParams) => void;
  back: () => void;
  canGoBack: () => boolean;
  setNotificationsOpen: (open: boolean) => void;
  // --- domain actions ---
  createJournal: (input: {
    studentId: string;
    date: string;
    hours: number;
    tasks: string;
    learnings: string;
    submit: boolean;
  }) => string;
  updateJournalDraft: (
    id: string,
    input: {
      date: string;
      hours: number;
      tasks: string;
      learnings: string;
    },
  ) => void;
  submitJournal: (id: string) => void;
  approveJournal: (id: string) => void;
  rejectJournal: (id: string, reason: string) => void;
  saveEvaluation: (input: {
    id?: string;
    studentId: string;
    supervisorId: string;
    term: string;
    qualityOfWork: number;
    jobKnowledge: number;
    dependability: number;
    strengths: string;
    weaknesses: string;
    recommendations: string;
    submit: boolean;
  }) => string;
  deleteEvaluation: (id: string) => void;
  createStudent: (input: {
    studentNumber: string;
    name: string;
    email: string;
    course: string;
    section?: string;
    schoolYear?: string;
    requiredHours: number;
    companyId: string;
    supervisorId: string | null;
    position: string;
    department: Student["department"];
    startDate?: string | null;
    endDate?: string | null;
    workMode?: Student["workMode"];
  }) => {
    studentId: string;
    tempPassword: string;
    idNumber: string;
  };
  updateStudent: (
    id: string,
    input: Partial<
      Pick<
        Student,
        | "name"
        | "email"
        | "course"
        | "section"
        | "schoolYear"
        | "requiredHours"
        | "companyId"
        | "supervisorId"
        | "status"
        | "position"
        | "department"
        | "startDate"
        | "endDate"
        | "workMode"
      >
    >,
  ) => void;
  createSupervisor: (input: {
    name: string;
    email: string;
    companyId: string;
    title?: string;
    department?: Supervisor["department"];
    capacity?: number;
    idNumber?: string;
    phone?: string;
    salutation?: string;
    schoolYear?: string;
  }) => {
    supervisorId: string;
    tempPassword: string;
    idNumber: string;
  };
  updateSupervisor: (
    id: string,
    input: Partial<
      Pick<
        Supervisor,
        | "name"
        | "email"
        | "companyId"
        | "status"
        | "title"
        | "department"
        | "capacity"
        | "idNumber"
        | "phone"
        | "salutation"
        | "schoolYear"
      >
    >,
  ) => void;
  createCoordinator: (input: {
    name: string;
    email: string;
    title?: string;
    department?: string;
    idNumber?: string;
  }) => {
    coordinatorId: string;
    tempPassword: string;
    idNumber: string;
  };
  updateCoordinator: (
    id: string,
    input: Partial<
      Pick<Coordinator, "name" | "email" | "status" | "title" | "department">
    >,
  ) => void;
  /**
   * Find a company by exact (case-insensitive) name, or create a new one.
   * Used by the free-text Company combobox in student/supervisor forms —
   * when the coordinator types a brand-new company name, this ensures a
   * Company record exists and returns its id. If the name matches an
   * existing company, returns that company's id (no duplicate).
   */
  upsertCompany: (input: {
    name: string;
    addressLine?: string;
    barangay?: string;
    city?: string;
    province?: string;
    contactName?: string;
    contactSalutation?: string;
    contactPosition?: string;
    contactPhone?: string;
    contactEmail?: string;
    schoolYear?: string;
  }) => string;
  // --- time clock actions (available to ALL roles) ---
  clockIn: (userId: string, role: Role, note?: string) => string;
  clockOut: (userId: string, note?: string) => void;
  deleteTimeLog: (id: string) => void;
  requestTimeCorrection: (
    logId: string,
    clockOutAt: string,
    reason: string,
  ) => string;
  reviewTimeCorrection: (
    logId: string,
    correctionId: string,
    decision: "approved" | "rejected",
    note?: string,
  ) => void;
  /**
   * Add a manual (back-dated) time entry — used by the Jibble-style timesheet
   * calendar's "Add entry" affordance. Lets users fill in gaps in their
   * timesheet without needing to clock in/out live.
   */
  addManualTimeLog: (input: {
    userId: string;
    role: Role;
    clockInAt: string; // ISO
    clockOutAt: string; // ISO
    note?: string;
  }) => string;
  // --- form documents (coordinator-authored templates) ---
  createFormDocument: (input: {
    templateKey?: string;
    title: string;
    description: string;
    category: FormCategory;
  }) => string;
  updateFormMeta: (
    id: string,
    input: Partial<Pick<FormDocument, "title" | "description" | "category">>,
  ) => void;
  updateFormBlock: (
    formId: string,
    blockId: string,
    patch: Partial<FormBlock>,
  ) => void;
  addFormBlock: (
    formId: string,
    type: FormBlockType,
    afterBlockId?: string,
  ) => string;
  removeFormBlock: (formId: string, blockId: string) => void;
  moveFormBlock: (
    formId: string,
    blockId: string,
    direction: "up" | "down",
  ) => void;
  reorderFormBlocks: (formId: string, orderedBlockIds: string[]) => void;
  duplicateFormBlock: (formId: string, blockId: string) => void;
  publishFormDocument: (id: string) => void;
  unpublishFormDocument: (id: string) => void;
  archiveFormDocument: (id: string) => void;
  deleteFormDocument: (id: string) => void;
  restoreFormDocument: (id: string) => void;
  purgeFormDocument: (id: string) => void;
  replaceFormDraft: (
    id: string,
    expected: string,
    content: Pick<
      FormDocument,
      "title" | "description" | "category" | "blocks"
    >,
  ) => void;
  duplicateFormDocument: (id: string) => string;
  // --- form assignments & submissions (fill / review layer) ---
  /** Assign a published form to an audience (optionally with a due date). */
  assignForm: (input: {
    formId: string;
    target: FormAssignmentTarget;
    targetUserIds?: string[];
    dueDate?: string;
  }) => string;
  /** Remove an assignment. */
  unassignForm: (assignmentId: string) => void;
  /**
   * Get-or-create an in-progress submission for (formId, currentUser,
   * optional targetStudentId). Returns the submission id. If one already
   * exists (any status), returns its id without mutating.
   */
  startFormResponse: (input: {
    formId: string;
    targetStudentId?: string;
    assignmentId?: string;
  }) => string;
  /** Persist the current draft values (autosave). Reopens needs_revision → in_progress. */
  saveSubmissionDraft: (
    submissionId: string,
    values: Record<string, FormFieldValue>,
  ) => void;
  /** Lock a submission as submitted and timestamp it. */
  submitFormResponse: (submissionId: string) => void;
  /** Coordinator review decision — approve or request revision, with an optional note. */
  reviewSubmission: (
    submissionId: string,
    decision: "approve" | "request_revision",
    note?: string,
  ) => void;
}
