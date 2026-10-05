import type { FormDocument, FormFieldValue } from "./types";
import { downloadPdfReport, type PdfSectionSpec } from "./client-pdf";

/** Exports the same immutable blocks and answers shown in the workspace. */
export function downloadFormPdf(
  form: FormDocument,
  values: Record<string, FormFieldValue>,
  respondent?: string,
): string {
  return downloadPdfReport({
    filename: `${form.title.replace(/[^a-z0-9]+/gi, "-")}-v${form.version}.pdf`,
    title: form.title,
    subtitle: `${respondent ?? "Form template"} · Version ${form.version}`,
    sections: form.blocks.flatMap<PdfSectionSpec>((b) => {
      const value = values[b.id];
      if (b.type === "divider") return [];
      if (b.type === "rating-table")
        return [
          {
            heading: b.label ?? "Ratings",
            table: {
              head: ["Criterion", "Response"],
              body: (b.criteria ?? []).map((c) => [
                c.label,
                typeof value === "object" ? (value[c.id] ?? "—") : "—",
              ]),
            },
          },
        ];
      return [
        {
          heading: b.type === "heading" ? b.text : undefined,
          paragraphs: [
            {
              label: b.label ?? b.caption,
              text:
                b.type === "heading"
                  ? ""
                  : b.type === "paragraph" || b.type === "instruction"
                    ? (b.text ?? "")
                    : typeof value === "string"
                      ? value || "—"
                      : "—",
            },
          ],
        },
      ];
    }),
    footer: "Practo prototype · Review and signatures take place separately.",
  });
}
