import type { PortalAccount } from "@prisma/client";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { reportContext } from "@/server/reports/service";
import { formWordBlocks } from "@/server/reports/word";
import { responseForm } from "@/domain/forms/response-form";
import { sampleFormValues } from "@/domain/forms/sample";
import { assignmentAppliesTo } from "@/lib/selectors";
import { HttpError } from "@/server/security";
export async function exportFormWord(
  account: PortalAccount,
  formId: string,
  mode: string,
  submissionId?: string,
) {
  if (!["blank", "sample", "answered"].includes(mode))
    throw new HttpError(400, "Choose blank, sample or answered Word.");
  const { data, actor } = await reportContext(account);
  const sub = submissionId
    ? data.formSubmissions.find(
        (s) => s.id === submissionId && s.formId === formId,
      )
    : undefined;
  if (
    submissionId &&
    (!sub || (actor.role !== "coordinator" && sub.userId !== actor.id))
  )
    throw new HttpError(404, "Response not available.");
  const live = data.formDocuments.find((f) => f.id === formId);
  const form = mode === "answered" ? responseForm(live, sub) : live;
  if (!form || form.trashedAt) throw new HttpError(404, "Form not available.");
  if (
    actor.role !== "coordinator" &&
    !sub &&
    !(
      form.status === "published" &&
      data.formAssignments.some(
        (a) => a.formId === formId && assignmentAppliesTo(a, actor),
      )
    )
  )
    throw new HttpError(403, "This form is not assigned to you.");
  if (mode === "sample" && actor.role !== "coordinator")
    throw new HttpError(403, "Only coordinators generate format samples.");
  if (mode === "answered" && !sub)
    throw new HttpError(
      400,
      "Save your answers before exporting this response.",
    );
  const values =
    mode === "sample"
      ? sampleFormValues(form)
      : mode === "answered"
        ? sub!.values
        : {};
  const bytes = await Packer.toBuffer(
    new Document({
      styles: {
        default: {
          document: {
            run: { font: "Times New Roman", size: 24, color: "000000" },
            paragraph: { spacing: { after: 140 } },
          },
        },
        paragraphStyles: [1, 2].map((level) => ({
          id: `Heading${level}`,
          name: `heading ${level}`,
          basedOn: "Normal",
          next: "Normal",
          run: { font: "Times New Roman", color: "000000", bold: true },
          paragraph: { keepNext: true },
        })),
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: 12240, height: 15840 },
              margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
            },
          },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: form.title, bold: true, size: 28 }),
              ],
            }),
            new Paragraph(
              `Version ${form.version} · ${mode === "sample" ? "FICTIONAL SAMPLE — not a submitted response" : mode === "blank" ? "Blank form" : `Response: ${sub!.status}`}`,
            ),
            ...formWordBlocks(form, values),
          ],
        },
      ],
    }),
  );
  return {
    bytes,
    name: `${form.title.replace(/[^\p{L}\p{N} _-]/gu, "_").slice(0, 90)}-v${form.version}-${mode}.docx`,
  };
}
