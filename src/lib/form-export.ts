import {
  formBlockVisible,
  isRatingHeading,
  ratingDisplay,
  ratingSummary,
} from "@/domain/form-templates";
import type { FormDocument, FormFieldValue } from "./types";
import { downloadPdfReport, type PdfSectionSpec } from "./client-pdf";

/** Exports the same immutable blocks and answers shown in the workspace. */
export async function downloadFormPdf(
  form: FormDocument,
  values: Record<string, FormFieldValue>,
  respondent?: string,
): Promise<string> {
  return downloadPdfReport({
    filename: `${form.title.replace(/[^a-z0-9]+/gi, "-")}-v${form.version}.pdf`,
    title: form.title,
    subtitle: `${respondent ?? "Form template"} · Version ${form.version}`,
    sections: form.blocks.flatMap<PdfSectionSpec>((b) => {
      if (!formBlockVisible(b, values)) return [];
      const value = values[b.id];
      if (b.type === "divider") return [];
      if (b.type === "rating-table")
        return [
          {
            heading: b.label ?? "Ratings",
            table: {
              head: ["Criterion", "Response"],
              body: [
                ...(b.criteria ?? []).map((c) => [
                  c.label,
                  isRatingHeading(c)
                    ? ""
                    : ratingDisplay(
                        b,
                        typeof value === "object" ? value[c.id] : undefined,
                      ),
                ]),
                ...(ratingSummary(b, typeof value === "object" ? value : {})
                  ? [
                      [
                        ratingSummary(
                          b,
                          typeof value === "object" ? value : {},
                        )!.label,
                        ratingSummary(
                          b,
                          typeof value === "object" ? value : {},
                        )!.value,
                      ],
                    ]
                  : []),
              ],
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
                    : b.type === "signature"
                      ? "________________________________________"
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
