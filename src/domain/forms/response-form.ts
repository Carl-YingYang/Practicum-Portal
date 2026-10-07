import { editorSignature } from "@/domain/editor-history";
import type { FormDocument, FormSubmission } from "@/lib/types";

/** Ordinary never-submitted drafts follow publication. Reviewed answers and
 * report-version definitions must keep their original rubric. */
export function responseForm(
  live: FormDocument | undefined,
  sub?: FormSubmission,
) {
  const saved = sub?.formSnapshot;
  if (
    live?.status === "published" &&
    !live.trashedAt &&
    !live.origin &&
    !saved?.origin &&
    !sub?.assignmentId &&
    (!sub ||
      (sub.status === "in_progress" &&
        !sub.submittedAt &&
        (!saved || live.version > saved.version)))
  )
    return live;
  return saved ?? live;
}

export type FormDraftContent = Pick<
  FormDocument,
  "title" | "description" | "category" | "blocks"
>;
export function formDraftContent(form: FormDocument): FormDraftContent {
  return structuredClone({
    title: form.title,
    description: form.description,
    category: form.category,
    blocks: form.blocks,
  });
}
export const formDraftSignature = (form: FormDraftContent) =>
  editorSignature(formDraftContent(form as FormDocument));
