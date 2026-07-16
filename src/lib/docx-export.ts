/**
 * docx-export.ts — generate Word (.docx) documents from portal data.
 *
 * Uses the `docx` library (no Word installation required — pure JS doc
 * generation). Output is downloaded via `file-saver`.
 *
 * Currently supports:
 *   - Weekly journals (Tasks Performed + Learnings & Reflections)
 *   - Form submissions (block-by-block Q&A export)
 *
 * The styling mimics Google Docs: a clean white page, serif body, bold
 * headings, subtle accent color for the title bar.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  type IParagraphOptions,
  type IRunOptions,
  ShadingType,
} from "docx";
import { saveAs } from "file-saver";

// ============================================================
// Types — minimal mirrors of the portal domain types
// ============================================================

interface JournalDocInput {
  studentName: string;
  studentNumber: string;
  course: string;
  companyName: string;
  supervisorName: string;
  weekLabel: string;
  dateLabel: string;
  tasks: string;
  learnings: string;
  status?: string;
  schoolName?: string;
}

interface FormDocInput {
  formTitle: string;
  formDescription?: string;
  studentName?: string;
  studentNumber?: string;
  submittedAt?: string;
  /** Q&A pairs — the block label + the student's answer (or "—"). */
  blocks: { label: string; answer: string; type?: string }[];
  schoolName?: string;
}

// ============================================================
// Helpers
// ============================================================

const ACCENT = "0F766E"; // teal — matches the portal's brand
const MUTED = "64748B"; // slate-500

/** Split a textarea string into paragraphs (blank line separated). */
function toParagraphs(text: string): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Convert plain text with single newlines into separate TextRuns (line breaks). */
function textWithBreaks(text: string, opts: IRunOptions = {}): TextRun[] {
  if (!text) return [new TextRun({ text: "", ...opts })];
  const lines = text.split(/\r?\n/);
  const runs: TextRun[] = [];
  lines.forEach((line, i) => {
    if (i > 0) runs.push(new TextRun({ break: 1 }));
    runs.push(new TextRun({ text: line, ...opts }));
  });
  return runs;
}

// ============================================================
// Journal → .docx
// ============================================================

export async function exportJournalToDocx(input: JournalDocInput) {
  const children: Paragraph[] = [];

  // ---- Title bar (school name, accent shading) ----
  if (input.schoolName) {
    children.push(
      new Paragraph({
        shading: { type: ShadingType.SOLID, color: ACCENT, fill: ACCENT },
        spacing: { before: 0, after: 240 },
        children: [
          new TextRun({
            text: input.schoolName,
            color: "FFFFFF",
            bold: true,
            size: 22, // half-points → 11pt
            font: "Calibri",
          }),
        ],
      })
    );
  }

  // ---- Document title ----
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: "Weekly Practicum Journal",
          bold: true,
          size: 32, // 16pt
          color: "0F172A",
          font: "Calibri",
        }),
      ],
    })
  );

  // ---- Meta line ----
  children.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `${input.weekLabel} · ${input.dateLabel}`,
          color: MUTED,
          size: 20,
          font: "Calibri",
        }),
      ],
    })
  );

  // ---- Student info table-like block ----
  const metaLines: [string, string][] = [
    ["Student", `${input.studentName} (${input.studentNumber})`],
    ["Course", input.course || "—"],
    ["Company", input.companyName || "—"],
    ["Supervisor", input.supervisorName || "—"],
  ];
  if (input.status) metaLines.push(["Status", input.status]);

  for (const [label, value] of metaLines) {
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: `${label}:  `,
            bold: true,
            color: "334155",
            size: 20,
            font: "Calibri",
          }),
          new TextRun({
            text: value,
            color: "0F172A",
            size: 20,
            font: "Calibri",
          }),
        ],
      })
    );
  }

  // ---- Divider ----
  children.push(dividerParagraph());

  // ---- Tasks Performed ----
  children.push(sectionHeading("Tasks Performed"));
  const taskParas = toParagraphs(input.tasks);
  if (taskParas.length === 0) {
    children.push(bodyParagraph("No tasks recorded."));
  } else {
    for (const p of taskParas) {
      children.push(bodyParagraph(p));
    }
  }

  // ---- Learnings & Reflections ----
  children.push(sectionHeading("Learnings & Reflections"));
  const learnParas = toParagraphs(input.learnings);
  if (learnParas.length === 0) {
    children.push(bodyParagraph("No reflections recorded."));
  } else {
    for (const p of learnParas) {
      children.push(bodyParagraph(p));
    }
  }

  // ---- Footer ----
  children.push(dividerParagraph());
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240 },
      children: [
        new TextRun({
          text: `Generated ${new Date().toLocaleString()} · ${input.schoolName ?? "Practicum Portal"}`,
          color: MUTED,
          italics: true,
          size: 16,
          font: "Calibri",
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = input.studentName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  saveAs(blob, `journal-${safeName}-${input.dateLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.docx`);
}

// ============================================================
// Form submission → .docx
// ============================================================

export async function exportFormToDocx(input: FormDocInput) {
  const children: Paragraph[] = [];

  // ---- Title bar ----
  if (input.schoolName) {
    children.push(
      new Paragraph({
        shading: { type: ShadingType.SOLID, color: ACCENT, fill: ACCENT },
        spacing: { before: 0, after: 240 },
        children: [
          new TextRun({
            text: input.schoolName,
            color: "FFFFFF",
            bold: true,
            size: 22,
            font: "Calibri",
          }),
        ],
      })
    );
  }

  // ---- Form title ----
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: input.formTitle,
          bold: true,
          size: 32,
          color: "0F172A",
          font: "Calibri",
        }),
      ],
    })
  );

  if (input.formDescription) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: input.formDescription,
            color: MUTED,
            italics: true,
            size: 20,
            font: "Calibri",
          }),
        ],
      })
    );
  }

  // ---- Student / submission meta ----
  if (input.studentName || input.submittedAt) {
    const metaParts: string[] = [];
    if (input.studentName) {
      metaParts.push(
        `Student: ${input.studentName}${
          input.studentNumber ? ` (${input.studentNumber})` : ""
        }`
      );
    }
    if (input.submittedAt) metaParts.push(`Submitted: ${input.submittedAt}`);
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: metaParts.join("  ·  "),
            color: MUTED,
            size: 20,
            font: "Calibri",
          }),
        ],
      })
    );
  }

  children.push(dividerParagraph());

  // ---- Q&A blocks ----
  for (const block of input.blocks) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({
            text: block.label,
            bold: true,
            color: "334155",
            size: 22,
            font: "Calibri",
          }),
          ...(block.type
            ? [
                new TextRun({
                  text: `  (${block.type})`,
                  color: MUTED,
                  italics: true,
                  size: 18,
                  font: "Calibri",
                }),
              ]
            : []),
        ],
      })
    );
    // Answer — preserve line breaks
    const answer = block.answer?.trim() || "—";
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: textWithBreaks(answer, {
          color: "0F172A",
          size: 22,
          font: "Calibri",
        }),
      })
    );
  }

  // ---- Footer ----
  children.push(dividerParagraph());
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240 },
      children: [
        new TextRun({
          text: `Generated ${new Date().toLocaleString()} · ${input.schoolName ?? "Practicum Portal"}`,
          color: MUTED,
          italics: true,
          size: 16,
          font: "Calibri",
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeTitle = input.formTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  saveAs(blob, `form-${safeTitle}.docx`);
}

// ============================================================
// Small paragraph builders — shared
// ============================================================

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: ACCENT,
        size: 26, // 13pt
        font: "Calibri",
      }),
    ],
  });
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 276 }, // 1.15 line spacing
    children: textWithBreaks(text, {
      color: "0F172A",
      size: 22, // 11pt
      font: "Calibri",
    }),
  });
}

function dividerParagraph(): Paragraph {
  const opts: IParagraphOptions = {
    spacing: { before: 120, after: 120 },
    border: {
      bottom: {
        color: "E2E8F0",
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    children: [new TextRun({ text: "" })],
  };
  return new Paragraph(opts);
}
