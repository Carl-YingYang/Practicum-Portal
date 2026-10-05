import { type Evaluation, type Journal, type JournalStatus } from "@/lib/types";
import type { StoreApi } from "zustand/vanilla";
import { createHelpers } from "../helpers";
import type { AppState } from "../types";
export function createJournalsActions(
  set: StoreApi<AppState>["setState"],
  get: StoreApi<AppState>["getState"],
  uuid: () => string,
): Pick<
  AppState,
  | "createJournal"
  | "updateJournalDraft"
  | "submitJournal"
  | "approveJournal"
  | "rejectJournal"
  | "saveEvaluation"
  | "deleteEvaluation"
> {
  const { logActivity, genTempPassword, buildDefaultBlock } =
    createHelpers(uuid);
  return {
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
            studentId,
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
            : j,
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
            x.id === id ? { ...x, status: "pending", submittedAt: now } : x,
          ),
          activity: logActivity(
            s.activity,
            "journal_submitted",
            `${st?.name ?? "A student"} submitted a journal for ${j.date}`,
            j.studentId,
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
              : x,
          ),
          activity: logActivity(
            s.activity,
            "journal_approved",
            `${s.currentUser?.name ?? "Supervisor"} approved ${st?.name ?? "student"}'s journal (${j.date})`,
            s.currentUser?.id ?? "",
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
              : x,
          ),
          activity: logActivity(
            s.activity,
            "journal_rejected",
            `${s.currentUser?.name ?? "Supervisor"} rejected ${st?.name ?? "student"}'s journal (${j.date})`,
            s.currentUser?.id ?? "",
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
        if (
          !st ||
          st.supervisorId !== input.supervisorId ||
          s.currentUser?.supervisorId !== input.supervisorId
        )
          return s;
        if (
          input.submit &&
          ![input.qualityOfWork, input.jobKnowledge, input.dependability].every(
            (v) => Number.isInteger(v) && v >= 1 && v <= 5,
          )
        )
          return s;
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
          submittedAt: input.submit ? now : (existing?.submittedAt ?? null),
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
              s.currentUser?.id ?? "",
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
  };
}
