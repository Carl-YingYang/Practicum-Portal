import { z } from "zod";
export const sectionSchema = z
  .object({
    id: z.string().min(1).max(100),
    template: z.string().max(100),
    title: z.string().trim().min(1).max(200),
    kind: z.enum(["narrative", "journals", "forms", "attendance", "evidence"]),
    studentId: z.string().nullable(),
    body: z.string().max(100000),
    included: z.boolean(),
    required: z.boolean(),
    status: z.enum(["draft", "ready", "revision", "reviewed"]),
    reviewNote: z.string().max(3000),
    reviewedAt: z.string().nullable(),
    reviewedSource: z.string().optional(),
  })
  .strict();
export const reportSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    studentIds: z.array(z.string()).min(1).max(20),
    settings: z
      .object({
        paper: z.enum(["letter", "a4"]),
        font: z.enum(["Times New Roman", "Arial"]),
        fontSize: z.number().int().min(10).max(14),
        department: z.string().max(200),
        degree: z.string().max(200),
        start: z.string().max(10),
        end: z.string().max(10),
      })
      .strict(),
    sections: z.array(sectionSchema).min(1).max(150),
  })
  .strict();
export type ReportSection = z.infer<typeof sectionSchema>;
export type ReportContent = z.infer<typeof reportSchema>;
export interface ReportVersion {
  id: string;
  number: number;
  revision: number;
  createdAt: string;
  sourceFingerprint: string;
  sectionIds: string[];
}
export interface ReportAssetInfo {
  id: string;
  name: string;
  mime: string;
  kind: "evidence" | "export" | "reviewed";
  sectionId: string | null;
  caption: string;
  rotation: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  size: number;
  order: number;
}
export interface ReportRecord {
  id: string;
  ownerId: string;
  retiredSections?: { section: ReportSection; version: number }[];
  formatHistory?: { from: number; to: number; at: string; by: string }[];
  binding?: import("@/domain/templates/model").TemplateBinding;
  editableSectionIds?: string[];
  revision: number;
  content: ReportContent;
  versions: ReportVersion[];
  assets: ReportAssetInfo[];
  canEdit: boolean;
  canReview: boolean;
  updatedAt: string;
  sourceFingerprint: string;
  boundSourceFingerprint: string;
}
export interface SectionTemplate {
  key: string;
  title: string;
  kind: ReportSection["kind"];
  scope: "shared" | "student";
  required: boolean;
  prompt: string;
}
export const sectionTemplates: SectionTemplate[] = [
  {
    key: "acknowledgments",
    title: "Acknowledgments",
    kind: "narrative",
    scope: "shared",
    required: true,
    prompt:
      "Acknowledge the people and organizations who supported your practicum. Explain their contribution in your own words.",
  },
  {
    key: "introduction",
    title: "Introduction",
    kind: "narrative",
    scope: "shared",
    required: true,
    prompt:
      "Explain the practicum purpose, objectives, placement and duration. Relate it to your degree and professional preparation.",
  },
  {
    key: "company",
    title: "Company Overview",
    kind: "narrative",
    scope: "shared",
    required: true,
    prompt:
      "Describe the company, location and services. Add a verified history, mission, vision and core values as applicable. Cite sources; do not invent company facts.",
  },
  {
    key: "organization",
    title: "Organizational Structure",
    kind: "narrative",
    scope: "shared",
    required: false,
    prompt:
      "Explain the organizational structure and each relevant role. Upload the organizational chart and give it a caption.",
  },
  {
    key: "technology",
    title: "Technology and Scope of Work",
    kind: "narrative",
    scope: "shared",
    required: false,
    prompt:
      "Describe the technologies actually used and the office workflow. Explain how they supported the work.",
  },
  {
    key: "assignment",
    title: "Work Assignment and Contributions",
    kind: "narrative",
    scope: "student",
    required: true,
    prompt:
      "Describe your role, responsibilities, tools, methods and specific deliverables. Use headings and bullet lists where helpful.",
  },
  {
    key: "pictorial",
    title: "Pictorial",
    kind: "evidence",
    scope: "student",
    required: false,
    prompt: "Upload activity photographs with dates and descriptive captions.",
  },
  {
    key: "journals",
    title: "Practicum Journals",
    kind: "journals",
    scope: "student",
    required: true,
    prompt:
      "Includes your saved journal entries, reporting periods, tasks, learnings and attendance-derived cumulative hours. Edit journals in the Journals workspace.",
  },
  {
    key: "reflection",
    title: "Reflection and Self-Assessment",
    kind: "narrative",
    scope: "student",
    required: true,
    prompt:
      "Discuss personal growth and career readiness, alignment with career goals, and areas for improvement and future learning.",
  },
  {
    key: "recommendations",
    title: "Recommendations",
    kind: "narrative",
    scope: "student",
    required: true,
    prompt:
      "Give general recommendations, positive and constructive company feedback, and suggestions for the academic institution.",
  },
  {
    key: "evaluations",
    title: "Evaluation Forms",
    kind: "forms",
    scope: "student",
    required: false,
    prompt:
      "Includes approved custom form responses linked to this student and submitted supervisor evaluations. Attach official signed sheets separately where required.",
  },
  {
    key: "confirmation",
    title: "Practicum Confirmation",
    kind: "evidence",
    scope: "student",
    required: false,
    prompt: "Upload the completed confirmation document.",
  },
  {
    key: "waiver",
    title: "Practicum Contract and Waiver",
    kind: "evidence",
    scope: "student",
    required: false,
    prompt: "Upload the existing signed contract or waiver.",
  },
  {
    key: "attendance",
    title: "Summary of Attendance",
    kind: "attendance",
    scope: "student",
    required: true,
    prompt:
      "Includes completed clock records. Attach signed attendance sheets if required; running sessions are excluded.",
  },
  {
    key: "outputs",
    title: "Sample Outputs",
    kind: "evidence",
    scope: "student",
    required: false,
    prompt:
      "Upload representative outputs with clear captions describing your contribution.",
  },
  {
    key: "certificate",
    title: "Certificate of Completion",
    kind: "evidence",
    scope: "student",
    required: false,
    prompt: "Upload the company-issued certificate.",
  },
  {
    key: "profile",
    title: "Student Profile",
    kind: "evidence",
    scope: "student",
    required: false,
    prompt: "Upload the student profile or resume required by the institution.",
  },
  {
    key: "bibliography",
    title: "Bibliography",
    kind: "narrative",
    scope: "shared",
    required: false,
    prompt:
      "List actual sources used in the report. Use the citation format required by your school.",
  },
  {
    key: "grammarian",
    title: "Grammarian’s Certificate",
    kind: "evidence",
    scope: "shared",
    required: false,
    prompt: "Upload the grammarian-issued certificate after review.",
  },
];
export function makeSection(
  template: SectionTemplate,
  studentId: string | null,
  id: string,
): ReportSection {
  return {
    id,
    template: template.key,
    title: template.title,
    kind: template.kind,
    studentId,
    body: "",
    included: template.required,
    required: template.required,
    status: "draft",
    reviewNote: "",
    reviewedAt: null,
  };
}
export function createReportContent(
  studentIds: string[],
  uuid: () => string,
): ReportContent {
  const sections: ReportSection[] = [];
  for (const t of sectionTemplates.filter(
    (t) =>
      t.scope === "shared" && !["bibliography", "grammarian"].includes(t.key),
  ))
    sections.push(makeSection(t, null, uuid()));
  for (const id of studentIds)
    for (const t of sectionTemplates.filter((t) => t.scope === "student"))
      sections.push(makeSection(t, id, uuid()));
  for (const t of sectionTemplates.filter((t) =>
    ["bibliography", "grammarian"].includes(t.key),
  ))
    sections.push(makeSection(t, null, uuid()));
  return {
    title: "Practicum Report",
    studentIds,
    settings: {
      paper: "letter",
      font: "Times New Roman",
      fontSize: 12,
      department: "Computer Studies and Information Technology Department",
      degree: "Bachelor of Science in Computer Science",
      start: "",
      end: "",
    },
    sections,
  };
}
export function reportContentErrors(content: ReportContent): string[] {
  const errors: string[] = [];
  if (new Set(content.studentIds).size !== content.studentIds.length)
    errors.push("Choose each student once.");
  if (
    new Set(content.sections.map((s) => s.id)).size !== content.sections.length
  )
    errors.push("Section identifiers must be unique.");
  for (const s of content.sections)
    if (s.studentId && !content.studentIds.includes(s.studentId))
      errors.push("A section belongs to a student outside this report.");
  for (const value of [content.settings.start, content.settings.end])
    if (
      value &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value + "T12:00:00Z")) ||
        new Date(value + "T12:00:00Z").toISOString().slice(0, 10) !== value)
    )
      errors.push("Choose valid placement dates.");
  if (
    content.settings.start &&
    content.settings.end &&
    content.settings.start > content.settings.end
  )
    errors.push("Placement end must follow its start.");
  for (const s of content.sections)
    if (["journals", "forms", "attendance"].includes(s.kind) && !s.studentId)
      errors.push("Linked record sections must belong to a selected student.");
  const grouped = content.sections
    .filter((s) => s.studentId)
    .map((s) => s.studentId!);
  const seen = new Set<string>();
  let previous = "";
  for (const id of grouped) {
    if (id !== previous && seen.has(id))
      errors.push("Keep each student’s sections together in the report order.");
    seen.add(id);
    previous = id;
  }
  return [...new Set(errors)];
}
