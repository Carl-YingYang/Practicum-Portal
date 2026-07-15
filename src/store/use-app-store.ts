"use client";

import { create } from "zustand";
import { v4 as uuid } from "uuid";
import {
  activityLog as seedActivity,
  companies as seedCompanies,
  conversations as seedConversations,
  coordinators as seedCoordinators,
  defaultToolsConfig,
  evaluations as seedEvaluations,
  formDocuments as seedFormDocuments,
  journals as seedJournals,
  mockUsers,
  students as seedStudents,
  supervisors as seedSupervisors,
  timeLogs as seedTimeLogs,
} from "@/lib/mock-data";
import {
  type ActivityLog,
  type ActivityType,
  type Company,
  type Conversation,
  type Coordinator,
  type Evaluation,
  type FormBlock,
  type FormBlockType,
  type FormCategory,
  type FormDocument,
  type FormStatus,
  type Journal,
  type JournalStatus,
  type Message,
  type Role,
  type Student,
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
  conversations: Conversation[];
  formDocuments: FormDocument[];

  // --- auth + navigation ---
  currentUser: User | null;
  view: ViewKey;
  viewParams: ViewParams;
  history: HistoryEntry[];
  notificationsOpen: boolean;
  /** conversation ids the current user has marked as read (in-memory) */
  readConversationIds: string[];

  // --- v5: free-first tool integration (Phase 1) ---
  toolsConfig: ToolsConfig;
  setToolsConfig: (input: Partial<ToolsConfig>) => void;
  hydrateToolsConfig: () => void;

  // --- auth actions ---
  login: (role: Role) => void;
  loginAs: (userId: string) => void;
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
  }) => { studentId: string; tempPassword: string };
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
  }) => { supervisorId: string; tempPassword: string };
  updateSupervisor: (
    id: string,
    input: Partial<Pick<Supervisor, "name" | "email" | "companyId" | "status" | "title" | "department" | "capacity">>
  ) => void;
  createCoordinator: (input: {
    name: string;
    email: string;
    title?: string;
    department?: string;
  }) => { coordinatorId: string; tempPassword: string };
  updateCoordinator: (
    id: string,
    input: Partial<Pick<Coordinator, "name" | "email" | "status" | "title" | "department">>
  ) => void;

  // --- time clock actions (available to ALL roles) ---
  clockIn: (userId: string, role: Role, note?: string) => string;
  clockOut: (userId: string, note?: string) => void;
  deleteTimeLog: (id: string) => void;

  // --- messaging actions (supervisor ↔ coordinator) ---
  sendMessage: (conversationId: string, body: string) => void;
  startConversation: (input: {
    participantId: string;
    topic: Conversation["topic"];
    title: string;
    studentId?: string;
    body: string;
  }) => string;
  markConversationRead: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => void;
  unarchiveConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;

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
  conversations: seedConversations,
  formDocuments: seedFormDocuments,

  currentUser: null,
  view: "login",
  viewParams: {},
  history: [],
  notificationsOpen: false,
  readConversationIds: [],

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

  login: (role) => {
    const user = mockUsers.find((u) => u.role === role) ?? mockUsers[0];
    set({
      currentUser: user,
      view: roleHomeView[role],
      viewParams: {},
      history: [],
      readConversationIds: [],
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
      readConversationIds: [],
    });
  },

  logout: () =>
    set({ currentUser: null, view: "login", viewParams: {}, history: [], readConversationIds: [] }),

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
    return { studentId: id, tempPassword };
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
    const supervisor: Supervisor = {
      id,
      name: input.name,
      email: input.email,
      companyId: input.companyId,
      status: "active",
      title: input.title ?? "Supervisor",
      department: input.department ?? "Other",
      capacity: input.capacity ?? 5,
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
    return { supervisorId: id, tempPassword };
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
    const coordinator: Coordinator = {
      id,
      name: input.name,
      email: input.email,
      title: input.title ?? "Practicum Coordinator",
      department: input.department ?? "Computer Studies",
      status: "active",
      avatarColor,
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
    return { coordinatorId: id, tempPassword };
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

  // --- messaging ---
  sendMessage: (conversationId, body) => {
    const user = get().currentUser;
    if (!user || !body.trim()) return;
    const now = new Date().toISOString();
    const msg: Message = {
      id: uuid(),
      conversationId,
      senderId: user.id,
      body: body.trim(),
      createdAt: now,
    };
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, msg], lastMessageAt: now }
          : c
      ),
    }));
  },

  startConversation: ({ participantId, topic, title, studentId, body }) => {
    const user = get().currentUser;
    if (!user || !body.trim()) return "";
    const now = new Date().toISOString();
    const id = uuid();
    const msg: Message = {
      id: uuid(),
      conversationId: id,
      senderId: user.id,
      body: body.trim(),
      createdAt: now,
    };
    const conv: Conversation = {
      id,
      participantIds: [user.id, participantId],
      topic,
      title,
      studentId,
      lastMessageAt: now,
      messages: [msg],
    };
    set((s) => ({ conversations: [conv, ...s.conversations] }));
    return id;
  },

  markConversationRead: (conversationId) => {
    const user = get().currentUser;
    if (!user) return;
    set((s) =>
      s.readConversationIds.includes(conversationId)
        ? s
        : { readConversationIds: [...s.readConversationIds, conversationId] }
    );
  },

  archiveConversation: (conversationId) => {
    const now = new Date().toISOString();
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, archivedAt: now } : c
      ),
    }));
  },

  unarchiveConversation: (conversationId) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, archivedAt: null } : c
      ),
    }));
  },

  deleteConversation: (conversationId) => {
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== conversationId),
      readConversationIds: s.readConversationIds.filter(
        (id) => id !== conversationId
      ),
    }));
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
}));
