import type { FormDocument, FormFieldValue } from "@/lib/types";
import { isRatingHeading } from "@/domain/form-templates";
export function sampleFormValues(
  form: FormDocument,
): Record<string, FormFieldValue> {
  return Object.fromEntries(
    form.blocks.flatMap<[string, FormFieldValue]>((b) => {
      if (b.type === "rating-table")
        return [
          [
            b.id,
            Object.fromEntries(
              (b.criteria ?? [])
                .filter((c) => !isRatingHeading(c))
                .map((c) => [
                  c.id,
                  b.scoreMode
                    ? String(Math.min(4, Number(c.max?.replace("%", "")) || 4))
                    : String(Math.min(4, b.scaleLabels?.length || 5)),
                ]),
            ),
          ],
        ];
      if (b.type === "fill-in" || b.type === "info-field")
        return [[b.id, `SAMPLE — ${b.label || "Response"}`]];
      return [];
    }),
  );
}
