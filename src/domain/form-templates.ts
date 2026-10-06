import type {
  FormBlock,
  FormCategory,
  FormDocument,
  FormFieldValue,
} from "@/lib/types";
export const formStarterTemplates: {
  key: string;
  title: string;
  category: FormCategory;
  description: string;
  blocks: Omit<FormBlock, "id">[];
}[] = [
  {
    key: "journal",
    title: "Practicum Journal",
    category: "journal",
    description:
      "Editable journal response. Attendance hours remain linked through Journals and Report Builder.",
    blocks: [
      { type: "fill-in", label: "Reporting period", required: true },
      {
        type: "fill-in",
        label: "Tasks assigned",
        multiline: true,
        required: true,
      },
      {
        type: "fill-in",
        label: "Learnings and reflections",
        multiline: true,
        required: true,
      },
      {
        type: "signature",
        caption: "Prepared by — wet signature",
        required: false,
      },
      {
        type: "signature",
        caption: "Noted by — wet signature",
        required: false,
      },
    ],
  },
  {
    key: "site",
    title: "Practicum Site Evaluation",
    category: "program",
    description:
      "Narrative questions based on the provided practicum report. Review wording against your institution’s required form.",
    blocks: [
      ...[
        "Would you recommend this company for practicum? Why?",
        "Were your practicum expectations met? Explain.",
        "What obstacles did you encounter and how did you address them?",
        "What unique contribution did you make to the company?",
      ].map((label) => ({
        type: "fill-in" as const,
        label,
        multiline: true,
        required: true,
      })),
    ],
  },
  {
    key: "reflection",
    title: "Reflection and Self-Assessment",
    category: "other",
    description:
      "Draft your personal reflection using the report’s three reflection areas.",
    blocks: [
      ...[
        "Personal growth and career readiness",
        "Alignment with career goals",
        "Areas for improvement and future learning",
      ].map((label) => ({
        type: "fill-in" as const,
        label,
        multiline: true,
        required: true,
      })),
    ],
  },
  {
    key: "feedback",
    title: "Practicum Feedback",
    category: "program",
    description:
      "General feedback starter; not an official school scoring instrument.",
    blocks: [
      {
        type: "fill-in",
        label: "What worked well?",
        multiline: true,
        required: true,
      },
      {
        type: "fill-in",
        label: "What could be improved?",
        multiline: true,
        required: true,
      },
      {
        type: "fill-in",
        label: "Recommendations",
        multiline: true,
        required: false,
      },
    ],
  },
];
export function formStructureErrors(
  form: Pick<FormDocument, "title" | "blocks">,
): string[] {
  const errors: string[] = [];
  if (!form.title.trim()) errors.push("Give the form a title.");
  if (!form.blocks.length) errors.push("Add at least one block.");
  if (new Set(form.blocks.map((b) => b.id)).size !== form.blocks.length)
    errors.push("Block IDs must be unique.");
  for (const [i, b] of form.blocks.entries()) {
    const at = `Block ${i + 1}`;
    if (
      b.showIf &&
      (!b.showIf.equals.trim() ||
        !form.blocks
          .slice(0, i)
          .some(
            (previous) =>
              previous.id === b.showIf?.blockId &&
              previous.type === "fill-in" &&
              !previous.showIf,
          ))
    )
      errors.push(
        `${at}: conditions must reference an earlier unconditional text question and a nonempty answer.`,
      );
    if (
      ["heading", "paragraph", "instruction"].includes(b.type) &&
      !b.text?.trim()
    )
      errors.push(`${at}: add its text.`);
    if (["fill-in", "info-field"].includes(b.type) && !b.label?.trim())
      errors.push(`${at}: add a field label.`);
    if (b.type === "rating-table") {
      if (!b.criteria?.length || b.criteria.some((c) => !c.label.trim()))
        errors.push(`${at}: add named rating criteria.`);
      if (new Set(b.criteria?.map((c) => c.id)).size !== b.criteria?.length)
        errors.push(`${at}: criteria IDs must be unique.`);
      if (b.scoreMode) {
        if (
          b.criteria?.some(
            (c) =>
              !/^\d+(\.\d+)?%?$/.test(c.max ?? "") ||
              parseFloat(c.max ?? "") <= 0,
          )
        )
          errors.push(`${at}: every score criterion needs a positive maximum.`);
      } else if (
        !b.scaleLabels ||
        b.scaleLabels.length < 2 ||
        b.scaleLabels.length > 10 ||
        b.scaleLabels.some((s) => !s.trim()) ||
        new Set(b.scaleLabels.map((s) => s.trim().toLowerCase())).size !==
          b.scaleLabels.length
      )
        errors.push(`${at}: use 2–10 distinct named rating options.`);
    }
  }
  return errors;
}
export function ratingResponseErrors(
  block: FormBlock,
  value: FormFieldValue | undefined,
): string[] {
  if (block.type !== "rating-table") return [];
  const ratings =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? value
      : {};
  const errors: string[] = [];
  for (const c of block.criteria ?? []) {
    const raw = ratings[c.id];
    if (raw === undefined || !String(raw).trim()) {
      if (block.required !== false) errors.push(`Rate ${c.label}.`);
      continue;
    }
    const numeric = Number(raw),
      maximum = block.scoreMode
        ? parseFloat(c.max ?? "")
        : (block.scaleLabels?.length ?? 0);
    if (
      !Number.isFinite(numeric) ||
      numeric < (block.scoreMode ? 0 : 1) ||
      numeric > maximum ||
      (!block.scoreMode && !Number.isInteger(numeric))
    )
      errors.push(`Choose a valid rating for ${c.label} (up to ${maximum}).`);
  }
  return errors;
}

export function formBlockVisible(
  block: FormBlock,
  values: Record<string, FormFieldValue>,
) {
  if (!block.showIf) return true;
  const value = values[block.showIf.blockId];
  return (
    typeof value === "string" &&
    value.trim().toLowerCase() === block.showIf.equals.trim().toLowerCase()
  );
}
