import {
  formStarterTemplates,
  formStructureErrors,
} from "@/domain/form-templates";
import { responseErrors } from "@/lib/prototype";
import { assignmentAppliesTo } from "@/lib/selectors";
import {
  type FormAssignment,
  type FormBlock,
  type FormDocument,
  type FormStatus,
  type FormSubmission,
} from "@/lib/types";
import type { StoreApi } from "zustand/vanilla";
import { createHelpers } from "../helpers";
import type { AppState } from "../types";
export function createFormsActions(
  set: StoreApi<AppState>["setState"],
  get: StoreApi<AppState>["getState"],
  uuid: () => string,
): Pick<
  AppState,
  | "createFormDocument"
  | "updateFormMeta"
  | "updateFormBlock"
  | "addFormBlock"
  | "removeFormBlock"
  | "moveFormBlock"
  | "reorderFormBlocks"
  | "duplicateFormBlock"
  | "publishFormDocument"
  | "unpublishFormDocument"
  | "archiveFormDocument"
  | "deleteFormDocument"
  | "duplicateFormDocument"
  | "assignForm"
  | "unassignForm"
  | "startFormResponse"
  | "saveSubmissionDraft"
  | "submitFormResponse"
  | "reviewSubmission"
> {
  const { logActivity, genTempPassword, buildDefaultBlock } =
    createHelpers(uuid);
  return {
    createFormDocument: ({ title, description, category, templateKey }) => {
      const id = uuid();
      const now = new Date().toISOString();
      const doc: FormDocument = {
        id,
        title: title || "Untitled form",
        description,
        category,
        status: "draft",
        blocks: [
          {
            id: uuid(),
            type: "heading",
            level: 1,
            text: title || "Untitled form",
          },
        ],
        createdBy: get().currentUser?.id ?? "u-coord",
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
        version: 0,
      };
      const starter = formStarterTemplates.find((t) => t.key === templateKey);
      if (starter)
        doc.blocks.push(
          ...starter.blocks.map((b) => ({ ...structuredClone(b), id: uuid() })),
        );
      set((s) => ({ formDocuments: [doc, ...s.formDocuments] }));
      return id;
    },
    updateFormMeta: (id, input) =>
      set((s) => ({
        formDocuments: s.formDocuments.map((d) =>
          d.id === id
            ? { ...d, ...input, updatedAt: new Date().toISOString() }
            : d,
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
                  b.id === blockId ? { ...b, ...patch } : b,
                ),
              }
            : d,
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
            : d,
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
    publishFormDocument: (id) => {
      const form = get().formDocuments.find((f) => f.id === id);
      if (!form || formStructureErrors(form).length)
        throw new Error("Complete the form blocks before publishing.");
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
            : d,
        ),
      }));
    },
    unpublishFormDocument: (id) =>
      set((s) => ({
        formDocuments: s.formDocuments.map((d) =>
          d.id === id
            ? {
                ...d,
                status: "draft" as FormStatus,
                updatedAt: new Date().toISOString(),
              }
            : d,
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
            : d,
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
      const blockIds = new Map(src.blocks.map((b) => [b.id, uuid()]));
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
          id: blockIds.get(b.id)!,
          showIf: b.showIf
            ? { ...b.showIf, blockId: blockIds.get(b.showIf.blockId)! }
            : undefined,
          criteria: b.criteria
            ? b.criteria.map((c) => ({ ...c, id: uuid() }))
            : undefined,
        })),
      };
      set((s) => ({ formDocuments: [copy, ...s.formDocuments] }));
      return newId;
    },
    assignForm: ({ formId, target, targetUserIds = [], dueDate }) => {
      if (
        !get().formDocuments.some(
          (f) => f.id === formId && f.status === "published",
        )
      )
        return "";
      if (target === "specific_users" && targetUserIds.length === 0) return "";
      const id = uuid();
      const now = new Date().toISOString();
      const assignment: FormAssignment = {
        id,
        formId,
        target,
        targetUserIds:
          target === "specific_users" ? [...new Set(targetUserIds)] : [],
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
      const assigned =
        user &&
        get().formAssignments.some(
          (a) => a.formId === formId && assignmentAppliesTo(a, user),
        );
      if (
        !user ||
        user.accountStatus === "disabled" ||
        !form ||
        form.status !== "published" ||
        !assigned
      )
        return "";
      if (
        targetStudentId &&
        (user.role !== "supervisor" ||
          !get().students.some(
            (s) =>
              s.id === targetStudentId && s.supervisorId === user.supervisorId,
          ))
      )
        return "";
      const userId = user.id;
      // Reuse an existing submission for this (form, user, targetStudent) if any.
      const existing = get().formSubmissions.find(
        (s) =>
          s.formId === formId &&
          s.userId === userId &&
          (targetStudentId
            ? s.targetStudentId === targetStudentId
            : !s.targetStudentId),
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
          sub.id === submissionId &&
          sub.userId === s.currentUser?.id &&
          ["in_progress", "needs_revision"].includes(sub.status)
            ? {
                ...sub,
                values,
                // editing a needs-revision response reopens it to in_progress
                status:
                  sub.status === "needs_revision" ? "in_progress" : sub.status,
                updatedAt: new Date().toISOString(),
              }
            : sub,
        ),
      })),
    submitFormResponse: (submissionId) => {
      const sub = get().formSubmissions.find((s) => s.id === submissionId);
      const form =
        sub?.formSnapshot ??
        get().formDocuments.find((f) => f.id === sub?.formId);
      if (!sub || !form || responseErrors(form, sub.values).length) return;
      set((s) => ({
        formSubmissions: s.formSubmissions.map((sub) =>
          sub.id === submissionId &&
          sub.userId === s.currentUser?.id &&
          ["in_progress", "needs_revision"].includes(sub.status)
            ? {
                ...sub,
                status: "submitted" as const,
                submittedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : sub,
        ),
      }));
    },
    reviewSubmission: (submissionId, decision, note) =>
      set((s) => ({
        formSubmissions: s.formSubmissions.map((sub) =>
          sub.id === submissionId &&
          s.currentUser?.role === "coordinator" &&
          ["submitted", "under_review"].includes(sub.status) &&
          (decision === "approve" || !!note?.trim())
            ? {
                ...sub,
                status: (decision === "approve"
                  ? "approved"
                  : "needs_revision") as FormSubmission["status"],
                reviewedAt: new Date().toISOString(),
                reviewNote: note ?? null,
                updatedAt: new Date().toISOString(),
              }
            : sub,
        ),
      })),
  };
}
