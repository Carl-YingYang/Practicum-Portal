"use client";

import { create } from "zustand";
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
  students as seedStudents,
  SUBSCRIPTION_PLANS,
  supervisors as seedSupervisors,
  timeLogs as seedTimeLogs,
} from "@/lib/mock-data";
import {
  type ActivityLog,
  type ActivityType,
  type Company,
  type Coordinator,
  type Evaluation,
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

interface AppState {
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
    input: Partial<Pick<Student, "name" | "email" | "course" | "requiredHours" | "companyId" | "supervisorId" | "status" | "position" | "department" | "startDate" | "endDate" | "workMode">>
  ) => void;
  createSupervisor: (input: {
    name: string;
    email: string;
    companyId: string;
    title?: string;
    department?: Supervisor["department"];
    capacity?: number;
    idNumber?: string;
  }) => { supervisorId: string; tempPassword: string; idNumber: string };
  updateSupervisor: (
    id: string,
    input: Partial<Pick<Supervisor, "name" | "email" | "companyId" | "status" | "title" | "department" | "capacity" | "idNumber">>
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
    "Tmp-" +
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    Math.random().toString(36).slice(2, 6)
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

export const useAppStore = create<AppState>((set, get) => ({
  companies: seedCompanies,
  supervisors: seedSupervisors,
  students: seedStudents,
  coordinators: seedCoordinators,
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
    const user = mockUsers.find((u) => u.role === role) ?? mockUsers[0];
    set({
      currentUser: user,
      view: roleHomeView[role],
      viewParams: {},
      history: [],
    });
  },

  loginAs: (userId) => {
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) return;
    set({
      currentUser: user,
      view: roleHomeView[user.role],
      viewParams: {},
      history: [],
    });
  },

  loginByEmail: (email) => {
    const lower = email.trim().toLowerCase();
    if (!lower) return false;

    // 1. Seed demo accounts (static).
    const mockMatch = mockUsers.find((u) => u.email.toLowerCase() === lower);
    if (mockMatch) {
      set({
        currentUser: mockMatch,
        view: roleHomeView[mockMatch.role],
        viewParams: {},
        history: [],
      });
      return true;
    }

    // 2. Coordinators created in-app (incl. login-page self-registration).
    const coord = get().coordinators.find(
      (c) => c.email.toLowerCase() === lower
    );
    if (coord && coord.status === "active") {
      const user: User = {
        id: `u-coord-${coord.id}`,
        name: coord.name,
        email: coord.email,
        role: "coordinator",
        coordinatorId: coord.id,
        idNumber: coord.idNumber ?? `COORD-${coord.id.slice(-4).toUpperCase()}`,
        avatarColor: coord.avatarColor,
      };
      set({
        currentUser: user,
        view: roleHomeView["coordinator"],
        viewParams: {},
        history: [],
      });
      return true;
    }

    // 3. Students created in-app.
    const stu = get().students.find((s) => s.email.toLowerCase() === lower);
    if (stu && stu.status === "active") {
      const user: User = {
        id: `u-stu-${stu.id}`,
        name: stu.name,
        email: stu.email,
        role: "student",
        studentId: stu.id,
        // For students, their login ID IS their student number.
        idNumber: stu.studentNumber,
        avatarColor: "#0f766e",
      };
      set({
        currentUser: user,
        view: roleHomeView["student"],
        viewParams: {},
        history: [],
      });
      return true;
    }

    // 4. Supervisors created in-app.
    const sup = get().supervisors.find((s) => s.email.toLowerCase() === lower);
    if (sup && sup.status === "active") {
      const user: User = {
        id: `u-sup-${sup.id}`,
        name: sup.name,
        email: sup.email,
        role: "supervisor",
        supervisorId: sup.id,
        idNumber: sup.idNumber ?? `EMP-${sup.id.slice(-4).toUpperCase()}`,
        avatarColor: "#d97706",
      };
      set({
        currentUser: user,
        view: roleHomeView["supervisor"],
        viewParams: {},
        history: [],
      });
      return true;
    }

    return false;
  },

  /**
   * loginByCredentials — validates BOTH email (username) and idNumber
   * (password). Returns one of:
   *   - "ok"      → login succeeded, currentUser set
   *   - "no-user" → no account with that email
   *   - "bad-pw"  → email found, but password didn't match
   *   - "inactive"→ account exists but is deactivated
   *
   * The "user ID = password" model: students use their studentNumber,
   * supervisors/coordinators use their assigned idNumber. Demo accounts
   * use the idNumber field on the mock User.
   */
  loginByCredentials: (email, password) => {
    const lower = email.trim().toLowerCase();
    if (!lower || !password) return "no-user";
    const pw = password.trim();

    // Helper: case-insensitive password compare (IDs like "EMP-001" should
    // match regardless of case the user typed).
    const pwMatch = (a?: string, b?: string) =>
      !!a && !!b && a.toLowerCase() === b.toLowerCase();

    // 1. Seed demo accounts.
    const mockMatch = mockUsers.find((u) => u.email.toLowerCase() === lower);
    if (mockMatch) {
      if (pwMatch(mockMatch.idNumber, pw)) {
        set({
          currentUser: mockMatch,
          view: roleHomeView[mockMatch.role],
          viewParams: {},
          history: [],
        });
        return "ok";
      }
      return "bad-pw";
    }

    // 2. Coordinators.
    const coord = get().coordinators.find(
      (c) => c.email.toLowerCase() === lower
    );
    if (coord) {
      if (coord.status !== "active") return "inactive";
      const expected = coord.idNumber ?? `COORD-${coord.id.slice(-4).toUpperCase()}`;
      if (pwMatch(expected, pw)) {
        const user: User = {
          id: `u-coord-${coord.id}`,
          name: coord.name,
          email: coord.email,
          role: "coordinator",
          coordinatorId: coord.id,
          idNumber: expected,
          avatarColor: coord.avatarColor,
        };
        set({
          currentUser: user,
          view: roleHomeView["coordinator"],
          viewParams: {},
          history: [],
        });
        return "ok";
      }
      return "bad-pw";
    }

    // 3. Students.
    const stu = get().students.find((s) => s.email.toLowerCase() === lower);
    if (stu) {
      if (stu.status !== "active") return "inactive";
      if (pwMatch(stu.studentNumber, pw)) {
        const user: User = {
          id: `u-stu-${stu.id}`,
          name: stu.name,
          email: stu.email,
          role: "student",
          studentId: stu.id,
          idNumber: stu.studentNumber,
          avatarColor: "#0f766e",
        };
        set({
          currentUser: user,
          view: roleHomeView["student"],
          viewParams: {},
          history: [],
        });
        return "ok";
      }
      return "bad-pw";
    }

    // 4. Supervisors.
    const sup = get().supervisors.find((s) => s.email.toLowerCase() === lower);
    if (sup) {
      if (sup.status !== "active") return "inactive";
      const expected = sup.idNumber ?? `EMP-${sup.id.slice(-4).toUpperCase()}`;
      if (pwMatch(expected, pw)) {
        const user: User = {
          id: `u-sup-${sup.id}`,
          name: sup.name,
          email: sup.email,
          role: "supervisor",
          supervisorId: sup.id,
          idNumber: expected,
          avatarColor: "#d97706",
        };
        set({
          currentUser: user,
          view: roleHomeView["supervisor"],
          viewParams: {},
          history: [],
        });
        return "ok";
      }
      return "bad-pw";
    }

    return "no-user";
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
        j.id === id && j.status === "draft"
          ? { ...j, ...input }
          : j
      ),
    })),

  submitJournal: (id) =>
    set((s) => {
      const j = s.journals.find((x) => x.id === id);
      if (!j) return s;
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
      if (!j) return s;
      const now = new Date().toISOString();
      const st = s.students.find((x) => x.id === j.studentId);
      // bump logged hours by journal hours on approval
      const students = s.students.map((st2) =>
        st2.id === j.studentId
          ? { ...st2, loggedHours: st2.loggedHours + j.hours }
          : st2
      );
      return {
        students,
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
      if (!j) return s;
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
      const st = s.students.find((x) => x.id === input.studentId);
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
    const id = uuid();
    const now = new Date().toISOString();
    const tempPassword = genTempPassword();
    const student: Student = {
      id,
      studentNumber: input.studentNumber,
      name: input.name,
      email: input.email,
      course: input.course,
      requiredHours: input.requiredHours,
      loggedHours: 0,
      companyId: input.companyId,
      supervisorId: input.supervisorId,
      status: "active",
      position: input.position,
      department: input.department,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      workMode: input.workMode ?? "onsite",
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
    // For students, the login password IS their student number.
    return { studentId: id, tempPassword, idNumber: input.studentNumber };
  },

  updateStudent: (id, input) =>
    set((s) => ({
      students: s.students.map((st) =>
        st.id === id ? { ...st, ...input } : st
      ),
    })),

  createSupervisor: (input) => {
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

  createCoordinator: (input) => {
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
      idNumber,
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
        // accumulate the session hours into the student's loggedHours (students only)
        students: st
          ? s.students.map((stu) =>
              stu.id === userId
                ? {
                    ...stu,
                    loggedHours: stu.loggedHours + Math.round(hours * 100) / 100,
                  }
                : stu
            )
          : s.students,
        activity: logActivity(
          s.activity,
          "time_clock_out",
          `${actorName ?? "Someone"} clocked out (${hours.toFixed(1)}h session)`,
          s.currentUser?.id ?? ""
        ),
      };
    }),

  deleteTimeLog: (id) =>
    set((s) => {
      const log = s.timeLogs.find((t) => t.id === id);
      if (!log) return s;
      // Reconcile student.loggedHours: subtract the deleted session's hours,
      // but only for COMPLETED student sessions (active sessions haven't been
      // counted yet, and supervisor/coordinator sessions don't touch loggedHours).
      const isCompletedStudentSession =
        log.role === "student" && log.clockOutAt !== null && log.durationMs;
      const hoursToSubtract = isCompletedStudentSession
        ? Math.round((log.durationMs! / 3600_000) * 100) / 100
        : 0;
      return {
        timeLogs: s.timeLogs.filter((t) => t.id !== id),
        students:
          hoursToSubtract > 0
            ? s.students.map((stu) =>
                stu.id === log.userId
                  ? {
                      ...stu,
                      loggedHours: Math.max(0, stu.loggedHours - hoursToSubtract),
                    }
                  : stu
              )
            : s.students,
      };
    }),

  addManualTimeLog: ({ userId, role, clockInAt, clockOutAt, note }) => {
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
        students: isStudent
          ? s.students.map((stu) =>
              stu.id === userId
                ? {
                    ...stu,
                    loggedHours: stu.loggedHours + Math.round(hours * 100) / 100,
                  }
                : stu
            )
          : s.students,
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
  assignForm: ({ formId, target, dueDate }) => {
    const id = uuid();
    const now = new Date().toISOString();
    const assignment: FormAssignment = {
      id,
      formId,
      target,
      targetUserIds: [],
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
    const userId = user?.id ?? "anonymous";
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
        sub.id === submissionId
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

  submitFormResponse: (submissionId) =>
    set((s) => ({
      formSubmissions: s.formSubmissions.map((sub) =>
        sub.id === submissionId
          ? {
              ...sub,
              status: "submitted" as const,
              submittedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : sub
      ),
    })),

  reviewSubmission: (submissionId, decision, note) =>
    set((s) => ({
      formSubmissions: s.formSubmissions.map((sub) =>
        sub.id === submissionId
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
}));
