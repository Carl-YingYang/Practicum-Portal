import { z } from "zod";
import { sectionTemplates, type ReportSection } from "@/domain/reports/model";
export const templateSectionSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]{0,49}$/),
    title: z.string().trim().min(1).max(200),
    instructions: z.string().max(3000),
    kind: z.enum(["narrative", "journals", "forms", "attendance", "evidence"]),
    required: z.boolean(),
    respondent: z.enum(["student", "supervisor", "coordinator"]),
    pageBreak: z.boolean(),
    formIds: z.array(z.string().min(1).max(100)).max(20),
  })
  .strict();
export const templateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(3000),
    allowStudentExtras: z.boolean(),
    sections: z.array(templateSectionSchema).min(1).max(50),
  })
  .strict();
export type TemplateContent = z.infer<typeof templateSchema>;
export type TemplateSection = z.infer<typeof templateSectionSchema>;
export interface TemplateBinding {
  hasExample?: boolean;
  versionId: string;
  templateId: string;
  number: number;
  title: string;
  dueDate: string | null;
  allowStudentExtras: boolean;
  sections: TemplateSection[];
}
export interface TemplateRecord {
  id: string;
  revision: number;
  content: TemplateContent;
  archived: boolean;
  wordName: string | null;
  exampleName: string | null;
  slots: string[];
  preview: string[];
  versions: {
    id: string;
    number: number;
    title: string;
    publishedAt: string;
    assignments: number;
  }[];
}
export const metadataSlots = [
  "report_title",
  "student_name",
  "student_number",
  "course",
  "company_name",
  "company_address",
  "supervisor_name",
  "school_name",
  "placement_start",
  "placement_end",
  "required_hours",
  "completed_hours",
  "report_date",
] as const;
export function pilotContent(): TemplateContent {
  return {
    title: "Practicum Report",
    description:
      "Word-first practicum format based on the supplied sample. Keep the filled reference separate from the blank official format.",
    allowStudentExtras: false,
    sections: sectionTemplates.map((t) => ({
      key: t.key,
      title: t.title,
      instructions: t.prompt,
      kind: t.kind,
      required: t.required,
      respondent: "student",
      pageBreak: true,
      formIds: [],
    })),
  };
}
export function templateErrors(content: TemplateContent, slots: string[]) {
  const errors: string[] = [];
  const keys = content.sections.map((s) => s.key);
  if (new Set(keys).size !== keys.length)
    errors.push("Section keys must be unique.");
  const expected = new Set<string>([
    ...metadataSlots,
    ...keys.map((k) => `section_${k}`),
    ...(content.allowStudentExtras ? ["extra_sections"] : []),
  ]);
  for (const key of keys)
    if (!slots.includes(`section_${key}`))
      errors.push(`Missing Word placeholder {{section_${key}}}.`);
  if (content.allowStudentExtras && !slots.includes("extra_sections"))
    errors.push("Student extras need {{extra_sections}} in Word.");
  for (const slot of slots)
    if (!expected.has(slot))
      errors.push(`Unknown or removed Word placeholder {{${slot}}}.`);
  return errors;
}
export function assignedSections(
  content: TemplateContent,
  studentId: string,
  uuid: () => string,
): ReportSection[] {
  return content.sections.map((s) => ({
    id: uuid(),
    template: s.key,
    title: s.title,
    kind: s.kind,
    studentId,
    body: "",
    required: s.required,
    included: s.required,
    status: "draft",
    reviewNote: "",
    reviewedAt: null,
  }));
}
