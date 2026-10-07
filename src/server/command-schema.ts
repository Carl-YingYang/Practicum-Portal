import { z } from "zod";
import { mutationNames, type MutationName } from "@/domain/portal/snapshot";
import { HttpError } from "./security";
const text = z.string().max(30000),
  id = z.string().min(1).max(150),
  role = z.enum(["student", "supervisor", "coordinator"]);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(value + "T12:00:00Z");
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  });
const email = z
  .email()
  .max(254)
  .transform((s) => s.trim().toLowerCase());
const department = z.enum([
  "Engineering",
  "QA",
  "Design",
  "Marketing",
  "Operations",
  "Other",
]);
const optionalText = text.optional();
const studentFields = {
  studentNumber: id,
  name: z.string().min(1).max(120),
  email,
  course: text,
  section: optionalText,
  schoolYear: optionalText,
  requiredHours: z.number().positive().max(10000),
  companyId: text,
  supervisorId: id.nullable(),
  position: optionalText,
  department: department.optional(),
  startDate: date.nullable().optional(),
  endDate: date.nullable().optional(),
  workMode: z.enum(["onsite", "hybrid", "remote"]).optional(),
};
const supervisorFields = {
  name: z.string().min(1).max(120),
  email,
  companyId: id,
  title: optionalText,
  department: department.optional(),
  capacity: z.number().int().min(1).max(1000).optional(),
  idNumber: optionalText,
  phone: optionalText,
  salutation: optionalText,
  schoolYear: optionalText,
};
const coordinatorFields = {
  name: z.string().min(1).max(120),
  email,
  title: optionalText,
  department: optionalText,
  idNumber: optionalText,
};
const journalInput = z
  .object({
    date,
    hours: z.number().finite().min(0),
    tasks: text,
    learnings: text,
  })
  .strict();
const jsonObject = z.record(z.string(), z.unknown());
const category = z.enum(["evaluation", "journal", "ojt", "program", "other"]);
const blockType = z.enum([
  "heading",
  "paragraph",
  "instruction",
  "divider",
  "info-field",
  "fill-in",
  "rating-table",
  "signature",
]);
const formMeta = z
  .object({ title: z.string().min(1).max(200), description: text, category })
  .strict();
const blockPatch = z
  .object({
    showIf: z
      .object({ blockId: id, equals: z.string().max(1000) })
      .strict()
      .nullable()
      .transform((value) => value ?? undefined)
      .optional(),
    text: optionalText,
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    label: optionalText,
    placeholder: optionalText,
    multiline: z.boolean().optional(),
    required: z.boolean().optional(),
    scaleLabels: z.array(text).max(10).optional(),
    criteria: z
      .array(
        z
          .object({
            id,
            label: text,
            max: optionalText,
            role: z.enum(["criterion", "heading"]).optional(),
          })
          .strict(),
      )
      .max(100)
      .optional(),
    caption: optionalText,
    scoreMode: z.boolean().optional(),
    summaryMode: z.enum(["none", "total", "average"]).optional(),
  })
  .strict();
const schoolIdentity = z
  .object({
    name: z.string().min(1).max(200),
    shortName: z.string().min(1).max(24),
    tagline: text,
    address: text,
    logoDataUrl: z
      .string()
      .max(50000)
      .nullable()
      .transform((value) => value ?? undefined),
    bannerDataUrl: z
      .string()
      .max(300000)
      .nullable()
      .transform((value) => value ?? undefined),
    heroImage: z
      .string()
      .max(300000)
      .nullable()
      .transform((value) => value ?? undefined),
    themePreset: z.enum([
      "azure-blue",
      "onyx-gold",
      "forest-green",
      "crimson-maroon",
      "royal-navy",
      "burnt-orange",
      "custom",
    ]),
    customColors: z
      .object({
        primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        deep: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        light: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      })
      .strict(),
    accentColor: z.union([
      z.string().regex(/^#[0-9a-fA-F]{6}$/),
      z.enum(["sage", "terracotta", "slate", "sand", "clay"]),
    ]),
    visibleCards: z
      .object({
        timeClock: z.boolean(),
        draftingRoom: z.boolean(),
        timesheet: z.boolean(),
        evaluations: z.boolean(),
      })
      .strict(),
    journalCadence: z.enum(["daily", "weekly", "twice-weekly"]),
  })
  .partial()
  .strict();
const schemas: Partial<Record<MutationName, z.ZodType>> = {
  setToolsConfig: z.tuple([
    z
      .object({
        driveFolderUrl: text,
        journalTemplateUrl: text,
        formUrl: text,
        formResponsesCsvUrl: text,
        jibbleInviteUrl: text,
        termStart: text,
        termEnd: text,
        journalDueDay: z.string().max(12),
        requiredHours: z.number().positive().max(10000),
      })
      .partial()
      .strict(),
  ]),
  updateSchoolIdentity: z.tuple([schoolIdentity]),
  resetSchoolIdentity: z.tuple([]),
  setSchoolBranding: z.tuple([
    id,
    z
      .object({
        name: text,
        shortName: text,
        tagline: text,
        accentColor: z.enum(["sage", "terracotta", "slate", "sand", "clay"]),
        logoDataUrl: z.string().max(50000),
        heroImages: z.array(z.string().max(300000)).max(3),
        visibleCards: z.array(text).max(10),
      })
      .partial()
      .strict(),
  ]),
  updateSubscription: z.tuple([
    z
      .object({
        planTier: z.enum(["starter", "growth", "enterprise"]),
        status: z.enum(["trialing", "active", "past_due", "canceled"]),
        hourlyRatePhp: z.number().positive(),
        billingCycle: z.enum(["monthly", "per-term", "annual"]),
        paymentMethod: z.enum(["card", "bank", "invoice"]),
        startedAt: text,
        renewsAt: text,
      })
      .partial()
      .strict(),
  ]),
  setHourlyRate: z.tuple([z.number().positive().max(100000)]),
  changePlan: z.tuple([z.enum(["starter", "growth", "enterprise"])]),
  generateUsageInvoice: z.tuple([]),
  resetSubscription: z.tuple([]),
  upsertCompany: z.tuple([
    z
      .object({
        name: z.string().trim().min(1).max(200),
        address: optionalText,
        industry: optionalText,
        contactName: optionalText,
        contactSalutation: optionalText,
        contactPosition: optionalText,
        contactPhone: optionalText,
        contactEmail: optionalText,
        schoolYear: optionalText,
      })
      .strict(),
  ]),
  createFormDocument: z.tuple([
    formMeta.extend({
      templateKey: z
        .enum(["journal", "site", "reflection", "feedback"])
        .optional(),
    }),
  ]),
  updateFormMeta: z.tuple([id, formMeta.partial()]),
  updateFormBlock: z.tuple([id, id, blockPatch]),
  addFormBlock: z
    .tuple([id, blockType, id.optional()])
    .or(z.tuple([id, blockType])),
  removeFormBlock: z.tuple([id, id]),
  duplicateFormBlock: z.tuple([id, id]),
  moveFormBlock: z.tuple([id, id, z.enum(["up", "down"])]),
  reorderFormBlocks: z.tuple([id, z.array(id).max(100)]),
  publishFormDocument: z.tuple([id]),
  unpublishFormDocument: z.tuple([id]),
  archiveFormDocument: z.tuple([id]),
  deleteFormDocument: z.tuple([id]),
  restoreFormDocument: z.tuple([id]),
  purgeFormDocument: z.tuple([id]),
  replaceFormDraft: z.tuple([
    id,
    z.string().max(500000),
    formMeta.extend({
      blocks: z.array(blockPatch.extend({ id, type: blockType })).max(100),
    }),
  ]),
  duplicateFormDocument: z.tuple([id]),
  assignForm: z.tuple([
    z
      .object({
        formId: id,
        target: z.enum(["all_supervisors", "all_students", "specific_users"]),
        targetUserIds: z.array(id).max(1000).optional(),
        dueDate: date.nullable().optional(),
      })
      .strict(),
  ]),
  unassignForm: z.tuple([id]),
  createStudent: z.tuple([z.object(studentFields).strict()]),
  updateStudent: z.tuple([
    id,
    z
      .object({ ...studentFields, status: z.enum(["active", "inactive"]) })
      .partial()
      .strict(),
  ]),
  createSupervisor: z.tuple([z.object(supervisorFields).strict()]),
  updateSupervisor: z.tuple([
    id,
    z
      .object({ ...supervisorFields, status: z.enum(["active", "inactive"]) })
      .partial()
      .strict(),
  ]),
  createCoordinator: z.tuple([z.object(coordinatorFields).strict()]),
  updateCoordinator: z.tuple([
    id,
    z
      .object({ ...coordinatorFields, status: z.enum(["active", "inactive"]) })
      .partial()
      .strict(),
  ]),
  setAccountStatus: z.tuple([
    role,
    id,
    z.enum(["active", "invited", "disabled"]),
  ]),
  resetAccountCredentials: z.tuple([role, id]),
  createJournal: z.tuple([
    journalInput.extend({ studentId: id, submit: z.boolean() }),
  ]),
  updateJournalDraft: z.tuple([id, journalInput]),
  submitJournal: z.tuple([id]),
  approveJournal: z.tuple([id]),
  rejectJournal: z.tuple([id, z.string().trim().min(1).max(3000)]),
  clockIn: z.tuple([id, role, optionalText]).or(z.tuple([id, role])),
  clockOut: z.tuple([id, optionalText]).or(z.tuple([id])),
  deleteTimeLog: z.tuple([id]),
  requestTimeCorrection: z.tuple([
    id,
    z.string().datetime({ offset: true }),
    z.string().trim().min(5).max(1000),
  ]),
  reviewTimeCorrection: z
    .tuple([
      id,
      id,
      z.enum(["approved", "rejected"]),
      z.string().trim().max(1000),
    ])
    .or(z.tuple([id, id, z.enum(["approved", "rejected"])])),
  addManualTimeLog: z.tuple([
    z
      .object({
        userId: id,
        role,
        clockInAt: text,
        clockOutAt: text,
        note: optionalText,
      })
      .strict(),
  ]),
  saveEvaluation: z.tuple([
    z
      .object({
        id: id.optional(),
        studentId: id,
        supervisorId: id,
        term: text,
        qualityOfWork: z.number().int().min(0).max(5),
        jobKnowledge: z.number().int().min(0).max(5),
        dependability: z.number().int().min(0).max(5),
        strengths: text,
        weaknesses: text,
        recommendations: text,
        submit: z.boolean(),
      })
      .strict(),
  ]),
  deleteEvaluation: z.tuple([id]),
  startFormResponse: z.tuple([
    z
      .object({
        formId: id,
        targetStudentId: id.optional(),
        assignmentId: id.optional(),
      })
      .strict(),
  ]),
  saveSubmissionDraft: z.tuple([
    id,
    z.record(
      z.string().max(150),
      z.union([text, z.record(z.string().max(150), text)]),
    ),
  ]),
  submitFormResponse: z.tuple([id]),
  reviewSubmission: z
    .tuple([id, z.enum(["approve", "request_revision"]), optionalText])
    .or(z.tuple([id, z.enum(["approve", "request_revision"])])),
};
export const commandSchema = z
  .object({
    action: z.enum(mutationNames),
    args: z.array(z.unknown()).max(4),
    ids: z.array(z.uuid()).max(100),
    requestId: z.uuid(),
  })
  .strict();
export type Command = z.infer<typeof commandSchema>;

export function validateCommandArguments(command: Command) {
  const schema = schemas[command.action];
  if (!schema) throw new HttpError(400, "Unsupported command.");
  const parsed = schema.safeParse(command.args);
  if (!parsed.success)
    throw new HttpError(400, "Check the required fields and values.");
  command.args = parsed.data as unknown[];
}
