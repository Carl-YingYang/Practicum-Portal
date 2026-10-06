import {
  formBlockVisible,
  isRatingHeading,
  ratingNumber,
  ratingSummary,
} from "@/domain/form-templates";
import sharp from "sharp";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
  TableOfContents,
  ImageRun,
  BorderStyle,
  type FileChild,
} from "docx";
import type { ReportAsset } from "@prisma/client";
import type { FormBlock, FormFieldValue } from "@/lib/types";
import type { ReportContent } from "@/domain/reports/model";
import type { PortalData } from "@/domain/portal/snapshot";
import { accountUsers } from "@/lib/prototype";
import { attendanceMinutes, durationLabel } from "@/domain/reports/checks";
import { journalPeriod, cadenceLabels } from "@/domain/journal-period";
const p = (
  text: string,
  options: ConstructorParameters<typeof Paragraph>[0] = {},
) =>
  new Paragraph({
    children: [new TextRun(text)],
    ...(typeof options === "object" ? options : {}),
  });
const heading = (text: string, level: 1 | 2 = 1) =>
  p(text, {
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: { before: 240, after: 120 },
  });
function richRuns(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map(
    (t) =>
      new TextRun({
        text: t.startsWith("**") ? t.slice(2, -2) : t,
        bold: t.startsWith("**"),
      }),
  );
}
function narrative(body: string, compact = false): (Paragraph | Table)[] {
  const lines = body.split(/\r?\n/);
  const result: (Paragraph | Table)[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      result.push(p("", { spacing: { after: 100 } }));
      continue;
    }
    if (
      line.trim().startsWith("|") &&
      lines[i + 1]?.match(/^\s*\|?\s*:?-{3}/)
    ) {
      const rows: string[][] = [];
      rows.push(
        line
          .split("|")
          .slice(1, -1)
          .map((s) => s.trim()),
      );
      i += 2;
      for (; i < lines.length && lines[i].trim().startsWith("|"); i++)
        rows.push(
          lines[i]
            .split("|")
            .slice(1, -1)
            .map((s) => s.trim()),
        );
      i--;
      result.push(table(rows));
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.+)/);
    if (h) {
      result.push(heading(h[2], 2));
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.+)/);
    const text = bullet?.[1] ?? line;
    result.push(
      new Paragraph({
        children: richRuns(text),
        ...(bullet ? { bullet: { level: 0 } } : {}),
        spacing: { after: 100, ...(compact ? { line: 276 } : {}) },
        keepLines: false,
        alignment: AlignmentType.JUSTIFIED,
      }),
    );
  }
  return result;
}
function table(rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (row, index) =>
        new TableRow({
          tableHeader: index === 0,
          children: row.map(
            (text) =>
              new TableCell({
                children: narrative(text),
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
              }),
          ),
        }),
    ),
  });
}
/** Full-width task/learning cells keep long journal answers readable on paper. */
function journalTable(rows: string[][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (row, index) =>
        new TableRow({
          tableHeader: index < 2,
          cantSplit: false,
          children:
            index === 2 || index === 3
              ? [
                  new TableCell({
                    columnSpan: 2,
                    margins: { top: 100, bottom: 100, left: 120, right: 120 },
                    children: [
                      p(row[0], {
                        keepNext: true,
                        spacing: { after: 100 },
                        children: [new TextRun({ text: row[0], bold: true })],
                      }),
                      ...narrative(row[1], true),
                    ],
                  }),
                ]
              : row.map(
                  (text) =>
                    new TableCell({
                      margins: { top: 80, bottom: 80, left: 100, right: 100 },
                      children: narrative(text, true),
                    }),
                ),
        }),
    ),
  });
}
/** Wide criterion text, compact rating columns and merged non-scored headings. */
function formRatingTable(block: FormBlock, value: FormFieldValue | undefined) {
  const ratings = typeof value === "object" ? value : {};
  const labels = block.scoreMode
    ? ["Maximum", "Score"]
    : (block.scaleLabels ?? []);
  const columns = labels.length + 1,
    widths = [
      5200,
      ...labels.map(() => Math.floor(3440 / Math.max(1, labels.length))),
    ];
  const cell = (text: string, index: number, bold = false, span = 1) =>
    new TableCell({
      columnSpan: span,
      width: {
        size: widths.slice(index, index + span).reduce((a, b) => a + b, 0),
        type: WidthType.DXA,
      },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [
        new Paragraph({
          spacing: { line: 240, after: 80 },
          children: [new TextRun({ text, bold })],
        }),
      ],
    });
  const rows = [
    new TableRow({
      tableHeader: true,
      children: ["Criterion", ...labels].map((text, i) => cell(text, i, true)),
    }),
  ];
  for (const criterion of block.criteria ?? []) {
    if (isRatingHeading(criterion))
      rows.push(
        new TableRow({ children: [cell(criterion.label, 0, true, columns)] }),
      );
    else {
      const raw = ratings[criterion.id],
        n = ratingNumber(block, raw);
      const values = block.scoreMode
        ? [criterion.max ?? "", raw ?? ""]
        : labels.map((_, i) => (n === i + 1 ? "✓" : ""));
      rows.push(
        new TableRow({
          children: [criterion.label, ...values].map((text, i) =>
            cell(text, i),
          ),
        }),
      );
    }
  }
  const summary = ratingSummary(block, ratings);
  if (summary)
    rows.push(
      new TableRow({
        children: [
          cell(summary.label, 0, true, columns - 1),
          cell(summary.value, columns - 1, true),
        ],
      }),
    );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths,
    rows,
  });
}
export async function buildReportWord(
  content: ReportContent,
  data: PortalData,
  assets: ReportAsset[],
  sectionIds?: string[],
) {
  const children: FileChild[] = [];
  const students = content.studentIds.map((id) =>
    data.students.find((s) => s.id === id)!,
  );
  const company = data.companies.find((c) => c.id === students[0]?.companyId);
  const full = !sectionIds;
  const included = content.sections.filter(
    (s) => s.included && (!sectionIds || sectionIds.includes(s.id)),
  );
  if (!included.length)
    throw new Error("Choose at least one included section.");
  if (full) {
    children.push(
      p(content.title, {
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200, after: 480 },
      }),
      p(company?.name ?? "Company", { alignment: AlignmentType.CENTER }),
      p(
        [content.settings.start, content.settings.end]
          .filter(Boolean)
          .join(" – "),
        { alignment: AlignmentType.CENTER },
      ),
      p("In Partial Fulfillment of the Requirements for Practicum", {
        alignment: AlignmentType.CENTER,
        spacing: { before: 480 },
      }),
      p(content.settings.degree, { alignment: AlignmentType.CENTER }),
      p(data.schoolIdentity.name, { alignment: AlignmentType.CENTER }),
    );
    for (const s of students)
      children.push(
        p(`${s.name} · ${s.studentNumber}`, {
          alignment: AlignmentType.CENTER,
          spacing: { before: 240 },
        }),
      );
    children.push(
      p("Table of Contents", {
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: true,
      }),
      new TableOfContents("", { hyperlink: true, headingStyleRange: "1-3" }),
    );
  }
  children.push(
    ...(await buildSectionBlocks(content, data, assets, sectionIds)),
  );
  const logoChildren: Paragraph[] = [];
  if (
    data.schoolIdentity.logoDataUrl?.match(/^data:image\/(png|jpeg);base64,/)
  ) {
    try {
      const bytes = Buffer.from(
          data.schoolIdentity.logoDataUrl.split(",")[1],
          "base64",
        ),
        meta = await sharp(bytes).metadata(),
        width = meta.width ?? 40,
        height = meta.height ?? 40,
        scale = Math.min(40 / width, 40 / height);
      logoChildren.push(
        new Paragraph({
          spacing: { line: 200, after: 0 },
          children: [
            new ImageRun({
              type: meta.format === "png" ? "png" : "jpg",
              data: bytes,
              transformation: {
                width: Math.round(width * scale),
                height: Math.round(height * scale),
              },
            }),
          ],
        }),
      );
    } catch {
      /* Preserve report text when a legacy logo is invalid. */
    }
  }
  const headerText = (text: string) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 200, before: 0, after: 0 },
      children: [new TextRun({ text, bold: true, size: 18 })],
    });
  const headerChildren: (Paragraph | Table)[] = [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.SINGLE, color: "95B3D7", size: 8 },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              children: logoChildren.length ? logoChildren : [p("")],
            }),
            new TableCell({
              width: { size: 90, type: WidthType.PERCENTAGE },
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              children: [
                headerText(data.schoolIdentity.name),
                headerText(content.settings.department),
              ],
            }),
          ],
        }),
      ],
    }),
  ];
  const document = new Document({
    creator: "Practo",
    title: content.title,
    features: { updateFields: true },
    styles: {
      default: {
        document: {
          run: {
            font: content.settings.font,
            size: content.settings.fontSize * 2,
          },
          paragraph: { spacing: { line: 360, after: 120 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size:
              content.settings.paper === "letter"
                ? { width: 12240, height: 15840 }
                : { width: 11906, height: 16838 },
            margin: { left: 2160, right: 1440, top: 1440, bottom: 1440 },
          },
        },
        headers: { default: new Header({ children: headerChildren }) },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ children: [PageNumber.CURRENT] })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
  return Packer.toBuffer(document);
}

export async function buildSectionBlocks(
  content: ReportContent,
  data: PortalData,
  assets: ReportAsset[],
  sectionIds?: string[],
  definitions?: import("@/domain/templates/model").TemplateSection[],
): Promise<FileChild[]> {
  const children: FileChild[] = [];
  const students = content.studentIds.map((id) =>
    data.students.find((s) => s.id === id)!,
  );
  const included = content.sections.filter(
    (s) => s.included && (!sectionIds || sectionIds.includes(s.id)),
  );
  let previousStudent: string | null = null;
  for (const section of included) {
    if (section.studentId && previousStudent !== section.studentId) {
      const student = students.find((s) => s.id === section.studentId)!;
      children.push(
        p(student.name, {
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: true,
        }),
        p(`${student.studentNumber} · ${student.course}`),
      );
    }
    previousStudent = section.studentId;
    children.push(
      p(section.title, {
        heading: definitions
          ? HeadingLevel.HEADING_1
          : section.studentId
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_1,
        pageBreakBefore:
          definitions?.find((d) => d.key === section.template)?.pageBreak ??
          true,
        keepNext: true,
      }),
    );
    if (section.body.trim()) children.push(...narrative(section.body));
    if (section.kind === "journals") {
      const student = students.find((s) => s.id === section.studentId)!;
      const supervisor = data.supervisors.find(
        (s) => s.id === student.supervisorId,
      );
      const journals = data.journals
        .filter((j) => j.studentId === student.id)
        .sort((a, b) => a.date.localeCompare(b.date));
      for (const [index, j] of journals.entries()) {
        const period = journalPeriod(j.date, j.cadence ?? "weekly");
        children.push(
          p(`Journal ${index + 1} · ${cadenceLabels[j.cadence ?? "weekly"]}`, {
            heading: HeadingLevel.HEADING_3,
            keepNext: true,
            spacing: { before: 240 },
          }),
        );
        children.push(
          journalTable([
            ["Practicum Journal", student.name],
            [`Period: ${period.start} – ${period.end}`, `Status: ${j.status}`],
            ["Tasks Assigned", j.tasks],
            ["Learnings", j.learnings],
            [
              "Cumulative Number of Hours",
              durationLabel(attendanceMinutes(data, student.id, period.endMs)),
            ],
          ]),
        );
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                cantSplit: true,
                children: [
                  new TableCell({
                    children: [
                      p("Prepared by:"),
                      p(""),
                      p(student.name),
                      p("Student · Wet signature"),
                    ],
                  }),
                  new TableCell({
                    children: [
                      p("Noted by:"),
                      p(""),
                      p(supervisor?.name ?? "Supervisor"),
                      p("Supervisor · Wet signature"),
                    ],
                  }),
                ],
              }),
            ],
          }),
        );
      }
    }
    if (section.kind === "forms") {
      const user = accountUsers(data).find(
        (u) => u.studentId === section.studentId,
      );
      for (const sub of data.formSubmissions.filter(
        (f) =>
          f.status === "approved" &&
          (!definitions?.find((d) => d.key === section.template)?.formIds
            .length ||
            definitions!
              .find((d) => d.key === section.template)!
              .formIds.includes(f.formId)) &&
          (f.targetStudentId === section.studentId || f.userId === user?.id),
      )) {
        const form =
          sub.formSnapshot ??
          data.formDocuments.find((f) => f.id === sub.formId);
        if (!form) continue;
        children.push(heading(`${form.title} · Version ${form.version}`, 2));
        for (const block of form.blocks) {
          if (!formBlockVisible(block, sub.values)) continue;
          const value = sub.values[block.id];
          if (block.type === "heading")
            children.push(heading(block.text ?? "", 2));
          else if (block.type === "rating-table")
            children.push(formRatingTable(block, value));
          else if (block.type === "signature")
            children.push(
              p(
                `${block.caption ?? "Signature over printed name"}: ____________________`,
              ),
            );
          else if (["fill-in", "info-field"].includes(block.type))
            children.push(
              p(
                `${block.label ?? "Field"}: ${typeof value === "string" ? value : ""}`,
              ),
            );
          else if (block.text) children.push(...narrative(block.text));
        }
      }
      for (const e of data.evaluations.filter(
        (e) =>
          !definitions?.find((d) => d.key === section.template)?.formIds
            .length &&
          e.studentId === section.studentId &&
          e.status === "submitted",
      ))
        children.push(
          heading(`Supervisor Evaluation · ${e.term}`, 2),
          table([
            ["Criterion", "Rating (1–5)"],
            ["Quality of work", String(e.qualityOfWork)],
            ["Job knowledge", String(e.jobKnowledge)],
            ["Dependability", String(e.dependability)],
          ]),
          p(`Strengths: ${e.strengths}`),
          p(`Areas for improvement: ${e.weaknesses}`),
          p(`Recommendations: ${e.recommendations}`),
        );
    }
    if (section.kind === "attendance") {
      const logs = data.timeLogs
        .filter(
          (t) =>
            t.userId === section.studentId &&
            t.role === "student" &&
            t.clockOutAt,
        )
        .sort((a, b) => a.clockInAt.localeCompare(b.clockInAt));
      const date = (iso: string) =>
        new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila" });
      children.push(
        table([
          ["Clock in (Philippine time)", "Clock out", "Duration"],
          ...logs.map((t) => [
            date(t.clockInAt),
            date(t.clockOutAt!),
            durationLabel(
              Math.floor(
                (Date.parse(t.clockOutAt!) - Date.parse(t.clockInAt)) / 60000,
              ),
            ),
          ]),
        ]),
        p(
          `Completed attendance: ${durationLabel(attendanceMinutes(data, section.studentId!))}`,
        ),
        p(
          "Running sessions are excluded. Attendance is subject to review and correction.",
        ),
      );
    }
    for (const asset of assets
      .filter((a) => a.kind === "evidence" && a.sectionId === section.id)
      .sort((a, b) => a.order - b.order)) {
      if (asset.mime.startsWith("image/")) {
        const rotated = await sharp(asset.bytes)
          .rotate(asset.rotation)
          .toBuffer({ resolveWithObject: true });
        const w = rotated.info.width,
          h = rotated.info.height,
          scale = Math.min(576 / w, 650 / h, 1);
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            keepNext: true,
            children: [
              new ImageRun({
                type: rotated.info.format === "png" ? "png" : "jpg",
                data: rotated.data,
                transformation: {
                  width: Math.round(w * scale),
                  height: Math.round(h * scale),
                },
                altText: {
                  title: asset.name,
                  description: asset.caption || asset.name,
                  name: asset.name,
                },
              }),
            ],
          }),
        );
        children.push(
          p(asset.caption || asset.name, {
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
        );
      } else
        children.push(
          p(
            `Attachment: ${asset.name}${asset.caption ? ` — ${asset.caption}` : ""}. See the original file in the companion evidence folder.`,
          ),
        );
    }
  }
  return children;
}
