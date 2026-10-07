"use client";
import type { TemplateContent } from "@/domain/templates/model";
export function jumpToFormatSection(key?: string) {
  const element = document.getElementById(
    key ? `format-section-${key}` : "word-format",
  );
  if (element instanceof HTMLDetailsElement) element.open = true;
  element?.scrollIntoView({ block: "start", behavior: "instant" });
  element?.focus({ preventScroll: true });
}
export function FormatIssues({
  errors,
  content,
}: {
  errors: string[];
  content: TemplateContent;
}) {
  return (
    <ul className="space-y-2 text-sm">
      {errors.map((error, i) => {
        const section = content.sections.find(
          (s) =>
            error.startsWith(`${s.title}:`) ||
            error.includes(`section_${s.key}}}`),
        );
        return (
          <li
            key={i}
            className="rounded-lg border border-amber-200/70 bg-amber-50/30 p-3 dark:border-amber-900/60 dark:bg-amber-950/15"
          >
            <p className="break-words">{error}</p>
            <button
              type="button"
              className="mt-1 min-h-9 text-left font-medium underline underline-offset-4"
              onClick={() => jumpToFormatSection(section?.key)}
            >
              {section ? `Fix ${section.title}` : "Review Word mapping"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
