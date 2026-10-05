"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { accountUsers, recalculateHours, validateTimeEntry, responseErrors, DEFAULT_SCHOOL_ID } from "@/lib/prototype";
import { assignmentAppliesTo } from "@/lib/selectors";
import { v4 as uuid } from "uuid";
import {
  activityLog as seedActivity,
  companies as seedCompanies,
  coordinators as seedCoordinators,
  defaultSchoolIdentity,
  defaultSubscription,
  defaultToolsConfig,
  evaluations as seedEvaluations,
  formAssignments as seedFormAssignments,
  formDocuments as seedFormDocuments,
  formSubmissions as seedFormSubmissions,
  journals as seedJournals,
  mockUsers,
  schools as seedSchools,
  students as seedStudents,
  SUBSCRIPTION_PLANS,
  supervisors as seedSupervisors,
  timeLogs as seedTimeLogs,
} from "@/lib/mock-data";
import {
  type AccountStatus,
  type ActivityLog,
  type ActivityType,
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
  type FormStatus,
  type FormSubmission,
  type Journal,
  type JournalStatus,
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
import { roleHomeView } from "@/lib/nav";

interface HistoryEntry {
  view: ViewKey;
  params: ViewParams;
}

export interface AppState {
  hasHydrated: boolean;
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
  /** Patch the school identity (merges). Persists to localStorage. */
  updateSchoolIdentity: (input: Partial<SchoolIdentity>) => void;
  /** Reset to the Practo default. */
  resetSchoolIdentity: () => void;
  /** Load school identity from localStorage (called once on mount). */
  hydrateSchoolIdentity: () => void;

  // --- schools (per-school branding: accent, logo, hero images) ---
  schools: School[];
  /** Merge-patch a school's branding (accent, logo, heroImages, tagline, visibleCards). */
  setSchoolBranding: (schoolId: string, patch: Partial<School>) => void;
  /** Resolve a school by ID (falls back to the Practo default). */
  getSchool: (schoolId: string) => School;
  /** Load schools from localStorage (called once on mount). */
  hydrateSchools: () => void;

  // --- subscription & billing (pay-per-hour; coordinator-managed) ---
  subscription: Subscription;
  /** Patch subscription fields (merges). Persists to localStorage. */
  updateSubscription: (input: Partial<Subscription>) => void;
  /** Override the active per-hour billing rate (PHP). */
  setHourlyRate: (rate: number) => void;
  /** Generate a usage invoice for the current accrued (logged) hours. */
  generateUsageInvoice: () => void;
  /** Switch to a different plan tier; adopts that tier's rate + invoice. */
  changePlan: (tier: PlanTier) => void;
  /** Reset to the seeded default subscription. */
  resetSubscription: () => void;
  /** Load subscription from localStorage (called once on mount). */
  hydrateSubscription: () => void;

  // --- auth actions ---
  login: (role: Role) => void;
  loginAs: (userId: string) => void;
  /**
   * Sign a user in by email. Checks the seed demo accounts first, then the
   * live in-app coordinators / students / supervisors collections so that
   * accounts created from inside the portal (or from the login-page
   * coordinator self-registration) can sign in with their email.
   * Returns true if a matching account was found and signed in.
   */
  loginByEmail: (email: string) => boolean;
  /**
   * Validate email + password (idNumber). Returns:
   *   - "ok"       → login succeeded
   *   - "no-user"  → email not found
   *   - "bad-pw"   → password mismatch
   *   - "inactive" → account deactivated
   */
  loginByCredentials: (
    email: string,
    password: string
  ) => "ok" | "no-user" | "bad-pw" | "inactive";
  /**
   * First-login flow: replace the one-time temporary password with a personal
   * one. Activates the account (Invited → Active) so the user can proceed.
   */
  completeFirstLoginPasswordChange: (
    tempPassword: string,
    newPassword: string
  ) => FirstLoginPasswordResult;
  /**
   * Coordinator: enable or disable an account (its sign-in ability) without
   * touching the underlying placement/employment record.
   */
  setAccountStatus: (
    role: Role,
    recordId: string,
    status: AccountStatus
  ) => void;
  /**
   * Coordinator: issue a fresh one-time temporary password. The account
   * returns to "Invited" and must change the password at next sign-in.
   */
  resetAccountCredentials: (
    role: Role,
    recordId: string
  ) => { name: string; email: string; role: Role; tempPassword: string };
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
    input: { date: string; hours: number; tasks: string; learnings: string }
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
  }) => { studentId: string; tempPassword: string; idNumber: string };
  updateStudent: (
    id: string,
    input: Partial<Pick<Student, "name" | "email" | "course" | "section" | "schoolYear" | "requiredHours" | "companyId" | "supervisorId" | "status" | "position" | "department" | "startDate" | "endDate" | "workMode">>
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
  }) => { supervisorId: string; tempPassword: string; idNumber: string };
  updateSupervisor: (
    id: string,
    input: Partial<Pick<Supervisor, "name" | "email" | "companyId" | "status" | "title" | "department" | "capacity" | "idNumber" | "phone" | "salutation" | "schoolYear">>
  ) => void;
  createCoordinator: (input: {
    name: string;
    email: string;
    title?: string;
    department?: string;
    idNumber?: string;
  }) => { coordinatorId: string; tempPassword: string; idNumber: string };
  updateCoordinator: (
    id: string,
    input: Partial<Pick<Coordinator, "name" | "email" | "status" | "title" | "department">>
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
    title: string;
    description: string;
    category: FormCategory;
  }) => string;
  updateFormMeta: (
    id: string,
    input: Partial<Pick<FormDocument, "title" | "description" | "category">>
  ) => void;
  updateFormBlock: (formId: string, blockId: string, patch: Partial<FormBlock>) => void;
  addFormBlock: (formId: string, type: FormBlockType, afterBlockId?: string) => string;
  removeFormBlock: (formId: string, blockId: string) => void;
  moveFormBlock: (formId: string, blockId: string, direction: "up" | "down") => void;
  reorderFormBlocks: (formId: string, orderedBlockIds: string[]) => void;
  duplicateFormBlock: (formId: string, blockId: string) => void;
  publishFormDocument: (id: string) => void;
  unpublishFormDocument: (id: string) => void;
  archiveFormDocument: (id: string) => void;
  deleteFormDocument: (id: string) => void;
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
  }) => string;
  /** Persist the current draft values (autosave). Reopens needs_revision → in_progress. */
  saveSubmissionDraft: (
    submissionId: string,
    values: Record<string, FormFieldValue>
  ) => void;
  /** Lock a submission as submitted and timestamp it. */
  submitFormResponse: (submissionId: string) => void;
  /** Coordinator review decision — approve or request revision, with an optional note. */
  reviewSubmission: (
    submissionId: string,
    decision: "approve" | "request_revision",
    note?: string
  ) => void;
}

function logActivity(
  list: ActivityLog[],
  type: ActivityType,
  message: string,
  actorId: string
): ActivityLog[] {
  return [
    {
      id: uuid(),
      type,
      message,
      actorId,
      timestamp: new Date().toISOString(),
    },
    ...list,
  ].slice(0, 100);
}

function genTempPassword(): string {
  return (
    "Tmp-" + uuid().replaceAll("-", "").slice(0, 12)
  );
}

/** Default block factory for the form editor's "insert block" toolbar. */
function buildDefaultBlock(type: FormBlockType, id: string): FormBlock {
  switch (type) {
    case "heading":
      return { id, type, level: 2, text: "New heading" };
    case "paragraph":
      return { id, type, text: "Write something..." };
    case "instruction":
      return { id, type, text: "Instruction text shown in muted italics." };
    case "divider":
      return { id, type };
    case "info-field":
      return { id, type, label: "Label", placeholder: "" };
    case "fill-in":
      return { id, type, label: "Question", placeholder: "", multiline: true };
    case "rating-table":
      return {
        id,
        type,
        scaleLabels: ["Poor (1)", "Fair (2)", "Good (3)", "Very Good (4)", "Excellent (5)"],
        criteria: [
          { id: uuid(), label: "Criterion 1" },
          { id: uuid(), label: "Criterion 2" },
        ],
      };
    case "signature":
      return { id, type, caption: "Signature over Printed Name" };
    default:
      return { id, type: "paragraph", text: "" };
  }
}

export const useAppStore = create<AppState>()(persist((set, get) => ({
  hasHydrated: false,
  hydratePrototype: async () => {
    await useAppStore.persist.rehydrate();
    const state = get();
    const students = recalculateHours(state.students, state.timeLogs);
    const formSubmissions = state.formSubmissions.map((sub) => ({ ...sub, formSnapshot: sub.formSnapshot ?? structuredClone(state.formDocuments.find((form) => form.id === sub.formId)) }));
    const currentUser = state.currentUser ? accountUsers({ ...state, students }).find((u) => u.id === state.currentUser!.id && u.accountStatus !== "disabled") ?? null : null;
    set({ students, formSubmissions, currentUser, hasHydrated: true, view: currentUser ? roleHomeView[currentUser.role] : "login", viewParams: {}, history: [] });
  },
  resetPrototype: () => {
    set({ companies: seedCompanies, supervisors: seedSupervisors, students: recalculateHours(seedStudents, seedTimeLogs), coordinators: seedCoordinators, evaluations: seedEvaluations, journals: seedJournals, timeLogs: seedTimeLogs, activity: seedActivity, formDocuments: seedFormDocuments, formAssignments: seedFormAssignments, formSubmissions: seedFormSubmissions, currentUser: null, view: "login", viewParams: {}, history: [] });
  },
  companies: seedCompanies,
  supervisors: seedSupervisors,
  students: recalculateHours(seedStudents, seedTimeLogs),
  coordinators: seedCoordinators,
  schools: seedSchools,
  evaluations: seedEvaluations,
  journals: seedJournals,
  timeLogs: seedTimeLogs,
  activity: seedActivity,
  formDocuments: seedFormDocuments,
  formAssignments: seedFormAssignments,
  formSubmissions: seedFormSubmissions,

  currentUser: null,
  view: "login",
  viewParams: {},
  history: [],
  notificationsOpen: false,

  // v5: free-first tool integration
  toolsConfig: defaultToolsConfig,
  setToolsConfig: (input) => {
    set((s) => {
      const next = { ...s.toolsConfig, ...input };
      // Persist to localStorage (manual, no persist middleware — matches
      // the existing `pp:create-account:draft` convention).
      try {
        localStorage.setItem("pp:cohort-tools", JSON.stringify(next));
      } catch {
        // Private mode / quota — fail silently.
      }
      return { toolsConfig: next };
    });
  },
  hydrateToolsConfig: () => {
    try {
      const raw = localStorage.getItem("pp:cohort-tools");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ToolsConfig>;
      set((s) => ({ toolsConfig: { ...s.toolsConfig, ...parsed } }));
    } catch {
      // Corrupt JSON — ignore and keep defaults.
    }
  },

  // ===========================================================
  // School identity & branding
  // ===========================================================
  schoolIdentity: defaultSchoolIdentity,
  updateSchoolIdentity: (input) => {
    set((s) => {
      const next = { ...s.schoolIdentity, ...input };
      try {
        localStorage.setItem("pp:school-identity", JSON.stringify(next));
      } catch {
        // Private mode / quota — fail silently.
      }
      return { schoolIdentity: next };
    });
  },
  resetSchoolIdentity: () => {
    try {
      localStorage.removeItem("pp:school-identity");
    } catch {
      // ignore
    }
    set({ schoolIdentity: defaultSchoolIdentity });
  },
  hydrateSchoolIdentity: () => {
    try {
      const raw = localStorage.getItem("pp:school-identity");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SchoolIdentity>;
      set((s) => ({ schoolIdentity: { ...s.schoolIdentity, ...parsed } }));
    } catch {
      // Corrupt JSON — ignore and keep defaults.
    }
  },

  // ===========================================================
  // Schools (per-school branding)
  // ===========================================================
  setSchoolBranding: (schoolId, patch) => {
    set((s) => ({
      schools: s.schools.map((sch) =>
        sch.id === schoolId ? { ...sch, ...patch } : sch,
      ),
    }));
    // Persist to localStorage (survives reload).
    try {
      const next = get().schools;
      localStorage.setItem("pp:schools", JSON.stringify(next));
    } catch {
      // Quota or serialization error — non-fatal.
    }
  },
  getSchool: (schoolId) => {
    const found = get().schools.find((s) => s.id === schoolId);
    return found ?? get().schools.find((s) => s.isDefault) ?? get().schools[0];
  },
  hydrateSchools: () => {
    try {
      const raw = localStorage.getItem("pp:schools");
      if (!raw) return;
      const parsed = JSON.parse(raw) as School[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge: keep seed schools that aren't in storage, overlay stored ones.
        const storedIds = new Set(parsed.map((s) => s.id));
        const merged = [
          ...parsed,
          ...seedSchools.filter((s) => !storedIds.has(s.id)),
        ];
        set({ schools: merged });
      }
    } catch {
      // Corrupt JSON — ignore and keep seed defaults.
    }
  },

  // ===========================================================
  // Subscription & billing (pay-per-hour)
  // ===========================================================
  subscription: defaultSubscription,
  updateSubscription: (input) => {
    set((s) => {
      const next = { ...s.subscription, ...input };
      try {
        localStorage.setItem("pp:subscription", JSON.stringify(next));
      } catch {
        // Private mode / quota — fail silently.
      }
      return { subscription: next };
    });
  },
  setHourlyRate: (rate) => {
    if (!Number.isFinite(rate) || rate <= 0) return;
    const rounded = Math.round(rate * 10000) / 10000; // 4 dp
    set((s) => {
      const next = { ...s.subscription, hourlyRatePhp: rounded };
      try {
        localStorage.setItem("pp:subscription", JSON.stringify(next));
      } catch {
        // ignore
      }
      return {
        subscription: next,
        activity: logActivity(
          s.activity,
          "coordinator_action",
          `Updated billing rate to ₱${rounded}/hr`,
          s.currentUser?.id ?? ""
        ),
      };
    });
  },
  generateUsageInvoice: () => {
    const sub = get().subscription;
    const rate = sub.hourlyRatePhp;
    const usedHours = get().students
      .filter((s) => s.status === "active")
      .reduce((sum, s) => sum + (s.loggedHours || 0), 0);
    if (usedHours <= 0) return;
    const amount = Math.round(usedHours * rate * 100) / 100;
    const invoiceId = `INV-${new Date().getFullYear()}-${String(
      sub.invoices.length + 1
    ).padStart(3, "0")}`;
    const invoice = {
      id: invoiceId,
      issuedAt: new Date().toISOString(),
      description: `Usage charge — ${usedHours.toLocaleString()} intern-hours`,
      hours: usedHours,
      amountPhp: amount,
      status: "paid" as const,
    };
    set((s) => ({
      subscription: { ...s.subscription, invoices: [invoice, ...s.subscription.invoices] },
      activity: logActivity(
        s.activity,
        "coordinator_action",
        `Generated usage invoice ${invoiceId} (₱${amount.toLocaleString()})`,
        s.currentUser?.id ?? ""
      ),
    }));
    try {
      localStorage.setItem(
        "pp:subscription",
        JSON.stringify(get().subscription)
      );
    } catch {
      // ignore
    }
  },
  changePlan: (tier) => {
    const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === tier);
    if (!plan) return;
    set((s) => {
      const next = {
        ...s.subscription,
        planTier: tier,
        hourlyRatePhp: plan.hourlyRatePhp,
      };
      try {
        localStorage.setItem("pp:subscription", JSON.stringify(next));
      } catch {
        // ignore
      }
      return {
        subscription: next,
        activity: logActivity(
          s.activity,
          "coordinator_action",
          `Switched to ${plan.label} rate plan (₱${plan.hourlyRatePhp}/hr)`,
          s.currentUser?.id ?? ""
        ),
      };
    });
  },
  resetSubscription: () => {
    try {
      localStorage.removeItem("pp:subscription");
    } catch {
      // ignore
    }
    set({ subscription: defaultSubscription });
  },
  hydrateSubscription: () => {
    try {
      const raw = localStorage.getItem("pp:subscription");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Subscription>;
      set((s) => {
        // Migrate old pool-model payloads: drop `purchasedHours` and ensure a
        // valid `hourlyRatePhp` exists (fall back to the tier rate, then default).
        const { purchasedHours: _drop, ...rest } = parsed as Record<
          string,
          unknown
        >;
        void _drop;
        const tier = (rest.planTier as PlanTier) ?? s.subscription.planTier;
        const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === tier);
        const storedRate = rest.hourlyRatePhp as number | undefined;
        const hourlyRatePhp =
          Number.isFinite(storedRate) && (storedRate as number) > 0
            ? (storedRate as number)
            : plan?.hourlyRatePhp ?? s.subscription.hourlyRatePhp;
        return {
          subscription: {
            ...s.subscription,
            ...(rest as Partial<Subscription>),
            hourlyRatePhp,
          },
        };
      });
    } catch {
      // Corrupt JSON — ignore and keep defaults.
    }
  },

  login: (role) => {
    const user = accountUsers(get()).find((u) => u.role === role && u.accountStatus !== "disabled");
    if (user) get().loginAs(user.id);
  },
  loginAs: (userId) => {
    const user = accountUsers(get()).find((u) => u.id === userId && u.accountStatus !== "disabled");
    if (user) set({ currentUser: user, view: roleHomeView[user.role], viewParams: {}, history: [] });
  },
  loginByEmail: (email) => {
    // Prototype helper used only for local role previews. Normal sign-in uses credentials.
    const user = accountUsers(get()).find((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.accountStatus !== "disabled");
    if (!user) return false;
    get().loginAs(user.id);
    return true;
  },
  loginByCredentials: (email, password) => {
    const user = accountUsers(get()).find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) return "no-user";
    if (user.accountStatus === "disabled") return "inactive";
    const state = get();
    const record = user.role === "student" ? state.students.find((r) => r.id === user.studentId) : user.role === "supervisor" ? state.supervisors.find((r) => r.id === user.supervisorId) : state.coordinators.find((r) => r.id === user.coordinatorId);
    const expected = record?.password ?? user.idNumber;
    if (password !== expected) return "bad-pw";
    set({ currentUser: user, view: roleHomeView[user.role], viewParams: {}, history: [] });
    return "ok";
  },

  /**
   * First-login gate: swap the one-time temporary password for a personal
   * one, mark the record Active, and refresh the session user.
   */
  completeFirstLoginPasswordChange: (tempPassword, newPassword) => {
    const cur = get().currentUser;
    if (!cur) return { ok: false, reason: "no-session" };
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || newPassword == tempPassword) return { ok: false, reason: "weak-password" };

    // Resolve the signed-in user's backing record.
    if (cur.role === "student" && cur.studentId) {
      const rec = get().students.find((s) => s.id === cur.studentId);
      if (!rec) return { ok: false, reason: "no-session" };
      const effective = rec.password ?? rec.studentNumber;
      if (effective !== tempPassword)
        return { ok: false, reason: "bad-temp" };
      const updated: Student = {
        ...rec,
        password: newPassword,
        mustChangePassword: false,
        accountStatus: "active",
      };
      set((s) => ({
        students: s.students.map((x) => (x.id === rec.id ? updated : x)),
        currentUser: { ...cur, mustChangePassword: false, accountStatus: "active" as const },
      }));
      return { ok: true };
    }

    if (cur.role === "supervisor" && cur.supervisorId) {
      const rec = get().supervisors.find((x) => x.id === cur.supervisorId);
      if (!rec) return { ok: false, reason: "no-session" };
      const effective =
        rec.password ?? rec.idNumber ?? `EMP-${rec.id.slice(-4).toUpperCase()}`;
      if (effective !== tempPassword)
        return { ok: false, reason: "bad-temp" };
      const updated: Supervisor = {
        ...rec,
        password: newPassword,
        mustChangePassword: false,
        accountStatus: "active",
      };
      set((s) => ({
        supervisors: s.supervisors.map((x) => (x.id === rec.id ? updated : x)),
        currentUser: { ...cur, mustChangePassword: false, accountStatus: "active" as const },
      }));
      return { ok: true };
    }

    if (cur.role === "coordinator" && cur.coordinatorId) {
      const rec = get().coordinators.find((x) => x.id === cur.coordinatorId);
      if (!rec) return { ok: false, reason: "no-session" };
      const effective =
        rec.password ?? rec.idNumber ?? `COORD-${rec.id.slice(-4).toUpperCase()}`;
      if (effective !== tempPassword)
        return { ok: false, reason: "bad-temp" };
      const updated: Coordinator = {
        ...rec,
        password: newPassword,
        mustChangePassword: false,
        accountStatus: "active",
      };
      set((s) => ({
        coordinators: s.coordinators.map((x) => (x.id === rec.id ? updated : x)),
        currentUser: { ...cur, mustChangePassword: false, accountStatus: "active" as const },
      }));
      return { ok: true };
    }

    return { ok: false, reason: "no-session" };
  },

  /**
   * Coordinator: flip an account between active / disabled (sign-in ability).
   * Placement/employment records are untouched. The signed-in coordinator
   * cannot disable their own account.
   */
  setAccountStatus: (role, recordId, status) => {
    const cur = get().currentUser;
    if (status === "disabled" && cur) {
      const ownsRecord =
        (role === "student" && cur.studentId === recordId) ||
        (role === "supervisor" && cur.supervisorId === recordId) ||
        (role === "coordinator" && cur.coordinatorId === recordId);
      if (ownsRecord) return; // never lock yourself out
    }
    set((s) => {
      if (role === "student") {
        return {
          students: s.students.map((x) =>
            x.id === recordId ? { ...x, accountStatus: status } : x
          ),
        };
      }
      if (role === "supervisor") {
        return {
          supervisors: s.supervisors.map((x) =>
            x.id === recordId ? { ...x, accountStatus: status } : x
          ),
        };
      }
      return {
        coordinators: s.coordinators.map((x) =>
          x.id === recordId ? { ...x, accountStatus: status } : x
        ),
      };
    });
  },

  /**
   * Coordinator: generate a fresh one-time temporary password. The account
   * returns to "Invited"; the previous password stops working.
   */
  resetAccountCredentials: (role, recordId) => {
    const tempPassword = genTempPassword();
    let name = "";
    let email = "";
    if (role === "student") {
      const rec = get().students.find((x) => x.id === recordId);
      if (rec) {
        name = rec.name;
        email = rec.email;
        set((s) => ({
          students: s.students.map((x) =>
            x.id === recordId
              ? {
                  ...x,
                  password: tempPassword,
                  mustChangePassword: true,
                  accountStatus: "invited" as const,
                }
              : x
          ),
        }));
      }
    } else if (role === "supervisor") {
      const rec = get().supervisors.find((x) => x.id === recordId);
      if (rec) {
        name = rec.name;
        email = rec.email;
        set((s) => ({
          supervisors: s.supervisors.map((x) =>
            x.id === recordId
              ? {
                  ...x,
                  password: tempPassword,
                  mustChangePassword: true,
                  accountStatus: "invited" as const,
                }
              : x
          ),
        }));
      }
    } else {
      const rec = get().coordinators.find((x) => x.id === recordId);
      if (rec) {
        name = rec.name;
        email = rec.email;
        set((s) => ({
          coordinators: s.coordinators.map((x) =>
            x.id === recordId
              ? {
                  ...x,
                  password: tempPassword,
                  mustChangePassword: true,
                  accountStatus: "invited" as const,
                }
              : x
          ),
        }));
      }
    }
    return { name, email, role, tempPassword };
  },

  logout: () =>
    set({ currentUser: null, view: "login", viewParams: {}, history: [] }),

  navigate: (view, params = {}) => {
    const { view: curView, viewParams: curParams, history } = get();
    set({
      view,
      viewParams: params,
      history: [...history, { view: curView, params: curParams }],
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  },

  back: () => {
    const { history } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({
      view: prev.view,
      viewParams: prev.params,
      history: history.slice(0, -1),
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  },

  canGoBack: () => get().history.length > 0,

  setNotificationsOpen: (open) => set({ notificationsOpen: open }),

  createJournal: ({ studentId, date, hours, tasks, learnings, submit }) => {
    const id = uuid();
    const now = new Date().toISOString();
    const status: JournalStatus = submit ? "pending" : "draft";
    const journal: Journal = {
      id,
      studentId,
      date,
      hours,
      tasks,
      learnings,
      status,
      submittedAt: submit ? now : null,
      reviewedAt: null,
      createdAt: now,
    };
    set((s) => ({ journals: [journal, ...s.journals] }));
    if (submit) {
      const st = get().students.find((x) => x.id === studentId);
      set((s) => ({
        activity: logActivity(
          s.activity,
          "journal_submitted",
          `${st?.name ?? "A student"} submitted a journal for ${date}`,
          studentId
        ),
      }));
    }
    return id;
  },

  updateJournalDraft: (id, input) =>
    set((s) => ({
      journals: s.journals.map((j) =>
        j.id === id && (j.status === "draft" || j.status === "rejected")
          ? { ...j, ...input }
          : j
      ),
    })),

  submitJournal: (id) =>
    set((s) => {
      const j = s.journals.find((x) => x.id === id);
      if (!j || !["draft", "rejected"].includes(j.status)) return s;
      const now = new Date().toISOString();
      const st = s.students.find((x) => x.id === j.studentId);
      return {
        journals: s.journals.map((x) =>
          x.id === id
            ? { ...x, status: "pending", submittedAt: now }
            : x
        ),
        activity: logActivity(
          s.activity,
          "journal_submitted",
          `${st?.name ?? "A student"} submitted a journal for ${j.date}`,
          j.studentId
        ),
      };
    }),

  approveJournal: (id) =>
    set((s) => {
      const j = s.journals.find((x) => x.id === id);
      if (!j || j.status !== "pending") return s;
      const now = new Date().toISOString();
      const st = s.students.find((x) => x.id === j.studentId);
      return {
        journals: s.journals.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "approved",
                reviewedAt: now,
                reviewedBy: s.currentUser?.supervisorId,
                rejectionReason: undefined,
              }
            : x
        ),
        activity: logActivity(
          s.activity,
          "journal_approved",
          `${s.currentUser?.name ?? "Supervisor"} approved ${st?.name ?? "student"}'s journal (${j.date})`,
          s.currentUser?.id ?? ""
        ),
      };
    }),

  rejectJournal: (id, reason) =>
    set((s) => {
      const j = s.journals.find((x) => x.id === id);
      if (!j || j.status !== "pending" || !reason.trim()) return s;
      const now = new Date().toISOString();
      const st = s.students.find((x) => x.id === j.studentId);
      return {
        journals: s.journals.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "rejected",
                rejectionReason: reason,
                reviewedAt: now,
                reviewedBy: s.currentUser?.supervisorId,
              }
            : x
        ),
        activity: logActivity(
          s.activity,
          "journal_rejected",
          `${s.currentUser?.name ?? "Supervisor"} rejected ${st?.name ?? "student"}'s journal (${j.date})`,
          s.currentUser?.id ?? ""
        ),
      };
    }),

  saveEvaluation: (input) => {
    const id = input.id ?? uuid();
    const now = new Date().toISOString();
    set((s) => {
      const existing = s.evaluations.find((e) => e.id === id);
      if (existing?.status === "submitted") return s;
      const st = s.students.find((x) => x.id === input.studentId);
      if (!st || st.supervisorId !== input.supervisorId || s.currentUser?.supervisorId !== input.supervisorId) return s;
      if (input.submit && ![input.qualityOfWork, input.jobKnowledge, input.dependability].every((v) => Number.isInteger(v) && v >= 1 && v <= 5)) return s;
      const record: Evaluation = {
        id,
        studentId: input.studentId,
        supervisorId: input.supervisorId,
        term: input.term,
        qualityOfWork: input.qualityOfWork,
        jobKnowledge: input.jobKnowledge,
        dependability: input.dependability,
        strengths: input.strengths,
        weaknesses: input.weaknesses,
        recommendations: input.recommendations,
        status: input.submit ? "submitted" : "draft",
        submittedAt: input.submit ? now : existing?.submittedAt ?? null,
        createdAt: existing?.createdAt ?? now,
      };
      const evaluations = existing
        ? s.evaluations.map((e) => (e.id === id ? record : e))
        : [record, ...s.evaluations];
      const activity = input.submit
        ? logActivity(
            s.activity,
            "evaluation_submitted",
            `${s.currentUser?.name ?? "Supervisor"} submitted an evaluation for ${st?.name ?? "student"}`,
            s.currentUser?.id ?? ""
          )
        : s.activity;
      return { evaluations, activity };
    });
    return id;
  },

  deleteEvaluation: (id) =>
    set((s) => ({
      evaluations: s.evaluations.filter((e) => e.id !== id),
    })),

  createStudent: (input) => {
    const duplicate = accountUsers(get()).find((user) => user.email.trim().toLowerCase() === input.email.trim().toLowerCase());
    if (duplicate) throw new Error("An account already uses this email address.");
    const candidate = get().supervisors.find((sup) => sup.id === input.supervisorId);
    const load = candidate ? get().students.filter((s) => s.supervisorId === candidate.id && s.status === "active").length : 0;
    const assigned = candidate && candidate.status === "active" && candidate.accountStatus !== "disabled" && load < candidate.capacity && (!input.companyId || input.companyId === candidate.companyId) ? candidate : null;
    const id = uuid();
    const now = new Date().toISOString();
    const tempPassword = genTempPassword();
    const student: Student = {
      id,
      studentNumber: input.studentNumber,
      name: input.name,
      email: input.email,
      course: input.course,
      section: input.section,
      schoolYear: input.schoolYear,
      requiredHours: input.requiredHours,
      loggedHours: 0,
      schoolId: get().coordinators.find((c) => c.id === get().currentUser?.coordinatorId)?.schoolId ?? DEFAULT_SCHOOL_ID,
      companyId: input.companyId || assigned?.companyId || "",
      supervisorId: assigned?.id ?? null,
      status: "active",
      position: input.position,
      department: input.department,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      workMode: input.workMode ?? "onsite",
      // Controlled provisioning: the one-time temporary password IS the
      // login credential until the user sets a personal one at first sign-in.
      accountStatus: "invited",
      mustChangePassword: true,
      password: tempPassword,
      createdAt: now,
    };
    set((s) => ({
      students: [...s.students, student],
      activity: logActivity(
        s.activity,
        "student_created",
        `${input.name} was added to the cohort`,
        s.currentUser?.id ?? ""
      ),
    }));
    // The student signs in with email + temporary password, then sets a
    // personal password on first login. The User ID remains their student number.
    return { studentId: id, tempPassword, idNumber: input.studentNumber };
  },

  updateStudent: (id, input) =>
    set((s) => ({
      students: s.students.map((st) =>
        st.id === id ? { ...st, ...input } : st
      ),
    })),

  createSupervisor: (input) => {
    const duplicate = accountUsers(get()).find((user) => user.email.trim().toLowerCase() === input.email.trim().toLowerCase());
    if (duplicate) throw new Error("An account already uses this email address.");
    const id = uuid();
    const now = new Date().toISOString();
    const tempPassword = genTempPassword();
    // Auto-generate an employee ID like "EMP-007" if not provided.
    const idNumber =
      input.idNumber?.trim() ||
      `EMP-${String(get().supervisors.length + 1).padStart(3, "0")}`;
    const supervisor: Supervisor = {
      id,
      name: input.name,
      email: input.email,
      companyId: input.companyId,
      status: "active",
      title: input.title ?? "Supervisor",
      department: input.department ?? "Other",
      capacity: input.capacity ?? 5,
      idNumber,
      phone: input.phone,
      salutation: input.salutation,
      schoolYear: input.schoolYear,
      accountStatus: "invited",
      mustChangePassword: true,
      password: tempPassword,
      createdAt: now,
    };
    set((s) => ({
      supervisors: [...s.supervisors, supervisor],
      activity: logActivity(
        s.activity,
        "supervisor_created",
        `${input.name} was added as a supervisor`,
        s.currentUser?.id ?? ""
      ),
    }));
    return { supervisorId: id, tempPassword, idNumber };
  },

  updateSupervisor: (id, input) =>
    set((s) => ({
      supervisors: s.supervisors.map((sup) =>
        sup.id === id ? { ...sup, ...input } : sup
      ),
    })),

  upsertCompany: (input) => {
    const name = input.name.trim();
    if (!name) return "";
    const existing = get().companies.find(
      (c) => c.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      // Merge any newly-provided rich fields onto the existing record.
      const hasNew = (Object.keys(input) as (keyof typeof input)[]).some(
        (k) => k !== "name" && input[k] !== undefined && (existing as unknown as Record<string, unknown>)[k as string] === undefined
      );
      if (hasNew) {
        set((s) => ({
          companies: s.companies.map((c) =>
            c.id === existing.id ? { ...c, ...input, name: existing.name } : c
          ),
        }));
      }
      return existing.id;
    }
    const id = uuid();
    const company: Company = { ...input, id, name };
    set((s) => ({ companies: [...s.companies, company] }));
    return id;
  },

  createCoordinator: (input) => {
    const duplicate = accountUsers(get()).find((user) => user.email.trim().toLowerCase() === input.email.trim().toLowerCase());
    if (duplicate) throw new Error("An account already uses this email address.");
    const id = uuid();
    const now = new Date().toISOString();
    const tempPassword = genTempPassword();
    // Pick a deterministic avatar color from a small professional palette.
    const palette = ["#475569", "#0f766e", "#7c3aed", "#b45309", "#be185d", "#1e40af"];
    const avatarColor = palette[get().coordinators.length % palette.length];
    // Auto-generate a coordinator ID like "COORD-002" if not provided.
    const idNumber =
      input.idNumber?.trim() ||
      `COORD-${String(get().coordinators.length + 1).padStart(3, "0")}`;
    const coordinator: Coordinator = {
      id,
      name: input.name,
      email: input.email,
      title: input.title ?? "Practicum Coordinator",
      department: input.department ?? "Computer Studies",
      status: "active",
      avatarColor,
      schoolId: get().coordinators.find((c) => c.id === get().currentUser?.coordinatorId)?.schoolId ?? DEFAULT_SCHOOL_ID,
      idNumber,
      accountStatus: "invited",
      mustChangePassword: true,
      password: tempPassword,
      createdAt: now,
    };
    set((s) => ({
      coordinators: [...s.coordinators, coordinator],
      activity: logActivity(
        s.activity,
        "student_created",
        `${input.name} was added as a coordinator`,
        s.currentUser?.id ?? ""
      ),
    }));
    return { coordinatorId: id, tempPassword, idNumber };
  },

  updateCoordinator: (id, input) =>
    set((s) => ({
      coordinators: s.coordinators.map((c) =>
        c.id === id ? { ...c, ...input } : c
      ),
    })),

  // ---------------- Time clock ----------------
  clockIn: (userId, role, note) => {
    const active = get().timeLogs.find((t) => t.userId === userId && t.clockOutAt === null);
    if (active) return active.id;
    const id = uuid();
    const now = new Date().toISOString();
    const log: TimeLog = {
      id,
      userId,
      role,
      clockInAt: now,
      clockOutAt: null,
      durationMs: null,
      note,
      createdAt: now,
    };
    const actorName =
      role === "student"
        ? get().students.find((x) => x.id === userId)?.name
        : role === "supervisor"
          ? get().supervisors.find((x) => x.id === userId)?.name
          : get().currentUser?.name;
    set((s) => ({
      timeLogs: [log, ...s.timeLogs],
      activity: logActivity(
        s.activity,
        "time_clock_in",
        `${actorName ?? "Someone"} clocked in`,
        s.currentUser?.id ?? ""
      ),
    }));
    return id;
  },

  clockOut: (userId, note) =>
    set((s) => {
      const active = s.timeLogs.find(
        (t) => t.userId === userId && t.clockOutAt === null
      );
      if (!active) return s;
      const now = new Date();
      const inD = new Date(active.clockInAt);
      const durationMs = Math.max(0, now.getTime() - inD.getTime());
      const hours = durationMs / 3600_000;
      // Only students accumulate practicum hours toward their requirement.
      const st = active.role === "student" ? s.students.find((x) => x.id === userId) : undefined;
      const actorName = st
        ? st.name
        : active.role === "supervisor"
          ? s.supervisors.find((x) => x.id === userId)?.name
          : s.currentUser?.name;
      return {
        timeLogs: s.timeLogs.map((t) =>
          t.id === active.id
            ? {
                ...t,
                clockOutAt: now.toISOString(),
                durationMs,
                note: note ?? t.note,
              }
            : t
        ),
        students: recalculateHours(s.students, s.timeLogs.map((t) => t.id === active.id ? { ...t, clockOutAt: now.toISOString(), durationMs } : t)),
        activity: logActivity(
          s.activity,
          "time_clock_out",
          `${actorName ?? "Someone"} clocked out (${hours.toFixed(1)}h session)`,
          s.currentUser?.id ?? ""
        ),
      };
    }),

  deleteTimeLog: (id) => set((s) => {
    const timeLogs = s.timeLogs.filter((t) => t.id !== id);
    return { timeLogs, students: recalculateHours(s.students, timeLogs) };
  }),

  addManualTimeLog: ({ userId, role, clockInAt, clockOutAt, note }) => {
    const error = validateTimeEntry(get().timeLogs, userId, clockInAt, clockOutAt);
    if (error) throw new Error(error);
    const id = uuid();
    const inD = new Date(clockInAt);
    const outD = new Date(clockOutAt);
    const durationMs = Math.max(0, outD.getTime() - inD.getTime());
    const hours = durationMs / 3600_000;
    const log: TimeLog = {
      id,
      userId,
      role,
      clockInAt: inD.toISOString(),
      clockOutAt: outD.toISOString(),
      durationMs,
      note,
      createdAt: new Date().toISOString(),
    };
    set((s) => {
      // Accumulate hours for students only (mirrors clockOut logic).
      const isStudent = role === "student";
      const actorName = isStudent
        ? s.students.find((x) => x.id === userId)?.name
        : role === "supervisor"
          ? s.supervisors.find((x) => x.id === userId)?.name
          : s.currentUser?.name;
      return {
        timeLogs: [log, ...s.timeLogs],
        students: recalculateHours(s.students, [log, ...s.timeLogs]),
        activity: logActivity(
          s.activity,
          "time_clock_out",
          `${actorName ?? "Someone"} added a manual ${hours.toFixed(1)}h entry`,
          s.currentUser?.id ?? ""
        ),
      };
    });
    return id;
  },

  // ---------------- Form documents ----------------
  createFormDocument: ({ title, description, category }) => {
    const id = uuid();
    const now = new Date().toISOString();
    const doc: FormDocument = {
      id,
      title: title || "Untitled form",
      description,
      category,
      status: "draft",
      blocks: [
        { id: uuid(), type: "heading", level: 1, text: title || "Untitled form" },
      ],
      createdBy: get().currentUser?.id ?? "u-coord",
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      version: 0,
    };
    set((s) => ({ formDocuments: [doc, ...s.formDocuments] }));
    return id;
  },

  updateFormMeta: (id, input) =>
    set((s) => ({
      formDocuments: s.formDocuments.map((d) =>
        d.id === id
          ? { ...d, ...input, updatedAt: new Date().toISOString() }
          : d
      ),
    })),

  updateFormBlock: (formId, blockId, patch) =>
    set((s) => ({
      formDocuments: s.formDocuments.map((d) =>
        d.id === formId
          ? {
              ...d,
              updatedAt: new Date().toISOString(),
              blocks: d.blocks.map((b) =>
                b.id === blockId ? { ...b, ...patch } : b
              ),
            }
          : d
      ),
    })),

  addFormBlock: (formId, type, afterBlockId) => {
    const newId = uuid();
    const newBlock = buildDefaultBlock(type, newId);
    set((s) => ({
      formDocuments: s.formDocuments.map((d) => {
        if (d.id !== formId) return d;
        const blocks = [...d.blocks];
        if (afterBlockId) {
          const idx = blocks.findIndex((b) => b.id === afterBlockId);
          if (idx >= 0) {
            blocks.splice(idx + 1, 0, newBlock);
          } else {
            blocks.push(newBlock);
          }
        } else {
          blocks.push(newBlock);
        }
        return { ...d, blocks, updatedAt: new Date().toISOString() };
      }),
    }));
    return newId;
  },

  removeFormBlock: (formId, blockId) =>
    set((s) => ({
      formDocuments: s.formDocuments.map((d) =>
        d.id === formId
          ? {
              ...d,
              updatedAt: new Date().toISOString(),
              blocks: d.blocks.filter((b) => b.id !== blockId),
            }
          : d
      ),
    })),

  moveFormBlock: (formId, blockId, direction) =>
    set((s) => ({
      formDocuments: s.formDocuments.map((d) => {
        if (d.id !== formId) return d;
        const idx = d.blocks.findIndex((b) => b.id === blockId);
        if (idx < 0) return d;
        const target = direction === "up" ? idx - 1 : idx + 1;
        if (target < 0 || target >= d.blocks.length) return d;
        const blocks = [...d.blocks];
        const [moved] = blocks.splice(idx, 1);
        blocks.splice(target, 0, moved);
        return { ...d, blocks, updatedAt: new Date().toISOString() };
      }),
    })),

  reorderFormBlocks: (formId, orderedBlockIds) =>
    set((s) => ({
      formDocuments: s.formDocuments.map((d) => {
        if (d.id !== formId) return d;
        const byId = new Map(d.blocks.map((b) => [b.id, b]));
        const blocks = orderedBlockIds
          .map((id) => byId.get(id))
          .filter((b): b is FormBlock => Boolean(b));
        // append any blocks missing from the ordered list (defensive)
        for (const b of d.blocks) {
          if (!blocks.includes(b)) blocks.push(b);
        }
        return { ...d, blocks, updatedAt: new Date().toISOString() };
      }),
    })),

  duplicateFormBlock: (formId, blockId) =>
    set((s) => ({
      formDocuments: s.formDocuments.map((d) => {
        if (d.id !== formId) return d;
        const idx = d.blocks.findIndex((b) => b.id === blockId);
        if (idx < 0) return d;
        const original = d.blocks[idx];
        const copy: FormBlock = {
          ...original,
          id: uuid(),
          // deep-clone criteria array if present so edits don't bleed back
          criteria: original.criteria
            ? original.criteria.map((c) => ({ ...c, id: uuid() }))
            : undefined,
        };
        const blocks = [...d.blocks];
        blocks.splice(idx + 1, 0, copy);
        return { ...d, blocks, updatedAt: new Date().toISOString() };
      }),
    })),

  publishFormDocument: (id) =>
    set((s) => ({
      formDocuments: s.formDocuments.map((d) =>
        d.id === id
          ? {
              ...d,
              status: "published" as FormStatus,
              publishedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              version: d.version + 1,
            }
          : d
      ),
    })),

  unpublishFormDocument: (id) =>
    set((s) => ({
      formDocuments: s.formDocuments.map((d) =>
        d.id === id
          ? {
              ...d,
              status: "draft" as FormStatus,
              updatedAt: new Date().toISOString(),
            }
          : d
      ),
    })),

  archiveFormDocument: (id) =>
    set((s) => ({
      formDocuments: s.formDocuments.map((d) =>
        d.id === id
          ? {
              ...d,
              status: "archived" as FormStatus,
              updatedAt: new Date().toISOString(),
            }
          : d
      ),
    })),

  deleteFormDocument: (id) =>
    set((s) => ({
      formDocuments: s.formDocuments.filter((d) => d.id !== id),
      formAssignments: s.formAssignments.filter((a) => a.formId !== id),
      formSubmissions: s.formSubmissions.filter((sub) => sub.formId !== id),
    })),

  duplicateFormDocument: (id) => {
    const src = get().formDocuments.find((d) => d.id === id);
    if (!src) return "";
    const newId = uuid();
    const now = new Date().toISOString();
    const copy: FormDocument = {
      ...src,
      id: newId,
      title: `${src.title} (Copy)`,
      status: "draft",
      version: 0,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
      blocks: src.blocks.map((b) => ({
        ...b,
        id: uuid(),
        criteria: b.criteria
          ? b.criteria.map((c) => ({ ...c, id: uuid() }))
          : undefined,
      })),
    };
    set((s) => ({ formDocuments: [copy, ...s.formDocuments] }));
    return newId;
  },

  // ---------------- Form assignments & submissions ----------------
  assignForm: ({ formId, target, targetUserIds = [], dueDate }) => {
    if (!get().formDocuments.some((f) => f.id === formId && f.status === "published")) return "";
    if (target === "specific_users" && targetUserIds.length === 0) return "";
    const id = uuid();
    const now = new Date().toISOString();
    const assignment: FormAssignment = {
      id,
      formId,
      target,
      targetUserIds: target === "specific_users" ? [...new Set(targetUserIds)] : [],
      dueDate: dueDate ?? null,
      createdBy: get().currentUser?.id ?? "u-coord",
      createdAt: now,
    };
    set((s) => ({ formAssignments: [...s.formAssignments, assignment] }));
    return id;
  },

  unassignForm: (assignmentId) =>
    set((s) => ({
      formAssignments: s.formAssignments.filter((a) => a.id !== assignmentId),
    })),

  startFormResponse: ({ formId, targetStudentId }) => {
    const user = get().currentUser;
    const form = get().formDocuments.find((f) => f.id === formId);
    const assigned = user && get().formAssignments.some((a) => a.formId === formId && assignmentAppliesTo(a, user));
    if (!user || user.accountStatus === "disabled" || !form || form.status !== "published" || !assigned) return "";
    if (targetStudentId && (user.role !== "supervisor" || !get().students.some((s) => s.id === targetStudentId && s.supervisorId === user.supervisorId))) return "";
    const userId = user.id;
    // Reuse an existing submission for this (form, user, targetStudent) if any.
    const existing = get().formSubmissions.find(
      (s) =>
        s.formId === formId &&
        s.userId === userId &&
        (targetStudentId ? s.targetStudentId === targetStudentId : !s.targetStudentId)
    );
    if (existing) return existing.id;

    const id = uuid();
    const now = new Date().toISOString();
    const submission: FormSubmission = {
      id,
      formId,
      formSnapshot: structuredClone(form),
      userId,
      targetStudentId,
      values: {},
      status: "in_progress",
      startedAt: now,
      submittedAt: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ formSubmissions: [...s.formSubmissions, submission] }));
    return id;
  },

  saveSubmissionDraft: (submissionId, values) =>
    set((s) => ({
      formSubmissions: s.formSubmissions.map((sub) =>
        sub.id === submissionId && sub.userId === s.currentUser?.id && ["in_progress", "needs_revision"].includes(sub.status)
          ? {
              ...sub,
              values,
              // editing a needs-revision response reopens it to in_progress
              status: sub.status === "needs_revision" ? "in_progress" : sub.status,
              updatedAt: new Date().toISOString(),
            }
          : sub
      ),
    })),

  submitFormResponse: (submissionId) => {
    const sub = get().formSubmissions.find((s) => s.id === submissionId);
    const form = sub?.formSnapshot ?? get().formDocuments.find((f) => f.id === sub?.formId);
    if (!sub || !form || responseErrors(form, sub.values).length) return;
    set((s) => ({
      formSubmissions: s.formSubmissions.map((sub) =>
        sub.id === submissionId && sub.userId === s.currentUser?.id && ["in_progress", "needs_revision"].includes(sub.status)
          ? {
              ...sub,
              status: "submitted" as const,
              submittedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : sub
      ),
    }));
  },

  reviewSubmission: (submissionId, decision, note) =>
    set((s) => ({
      formSubmissions: s.formSubmissions.map((sub) =>
        sub.id === submissionId && s.currentUser?.role === "coordinator" && ["submitted", "under_review"].includes(sub.status) && (decision === "approve" || !!note?.trim())
          ? {
              ...sub,
              status: (decision === "approve"
                ? "approved"
                : "needs_revision") as FormSubmission["status"],
              reviewedAt: new Date().toISOString(),
              reviewNote: note ?? null,
              updatedAt: new Date().toISOString(),
            }
          : sub
      ),
    })),
}), {
  name: "practo:prototype:v1",
  version: 1,
  skipHydration: true,
  storage: createJSONStorage(() => ({
    getItem: (key) => localStorage.getItem(key),
    removeItem: (key) => localStorage.removeItem(key),
    setItem: (key, value) => {
      try { localStorage.setItem(key, value); }
      catch { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("practo:storage-error")); }
    },
  })),
  partialize: (state) => ({ companies: state.companies, students: state.students, supervisors: state.supervisors, coordinators: state.coordinators, evaluations: state.evaluations, journals: state.journals, timeLogs: state.timeLogs, activity: state.activity, formDocuments: state.formDocuments, formAssignments: state.formAssignments, formSubmissions: state.formSubmissions, currentUser: state.currentUser }),
}));
