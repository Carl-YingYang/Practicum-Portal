"use client";
import { useState } from "react";
import type { TemplateSection } from "@/domain/templates/model";
import { useAppStore } from "@/store/use-app-store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
export function SectionSettings({
  section,
  index,
  count,
  onChange,
  onMove,
  onDelete,
}: {
  section: TemplateSection;
  index: number;
  count: number;
  onChange: (next: TemplateSection) => void;
  onMove: (delta: number) => void;
  onDelete: () => void;
}) {
  const [copyNotice, setCopyNotice] = useState("");
  const forms = useAppStore((s) => s.formDocuments);
  const selectClass =
    "mt-1 min-h-10 w-full min-w-0 rounded-md border bg-background px-2 text-sm";
  return (
    <details
      open={section.key.startsWith("custom_")}
      className="min-w-0 rounded-xl border bg-card p-4"
    >
      <summary className="cursor-pointer break-words text-sm font-medium">
        {index + 1}. {section.title}
        <span className="mt-1 block text-xs font-normal text-muted-foreground">
          {section.respondent} · {section.kind} ·{" "}
          {section.required ? "Required" : "Optional"}
        </span>
      </summary>
      <div className="mt-3 space-y-3 border-t pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="break-words font-medium">
            {index + 1}. {section.title}
          </h3>
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="outline"
              aria-label={`Move ${section.title} up`}
              disabled={!index}
              onClick={() => onMove(-1)}
            >
              ↑
            </Button>
            <Button
              size="sm"
              variant="outline"
              aria-label={`Move ${section.title} down`}
              disabled={index === count - 1}
              onClick={() => onMove(1)}
            >
              ↓
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={count === 1}
              onClick={onDelete}
            >
              Remove
            </Button>
          </div>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="min-w-0 text-sm">
            Section title
            <Input
              value={section.title}
              maxLength={200}
              onChange={(e) => onChange({ ...section, title: e.target.value })}
            />
          </label>
          <details className="min-w-0 text-sm">
            <summary className="cursor-pointer">
              Word mapping (advanced)
            </summary>
            Word placeholder key
            <Input
              value={section.key}
              maxLength={50}
              onChange={(e) => onChange({ ...section, key: e.target.value })}
            />
            <small className="block break-all text-muted-foreground">{`{{section_${section.key}}}`}</small>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `{{section_${section.key}}}`,
                  );
                  setCopyNotice("Copied.");
                } catch {
                  setCopyNotice("Copy the placeholder text above manually.");
                }
              }}
            >
              Copy Word placeholder
            </Button>
            <span role="status" className="ml-2 text-xs">
              {copyNotice}
            </span>
          </details>
          <label className="text-sm">
            Content source
            <select
              className={selectClass}
              value={section.kind}
              onChange={(e) =>
                onChange({
                  ...section,
                  kind: e.target.value as TemplateSection["kind"],
                  formIds: [],
                })
              }
            >
              <option value="narrative">Written answer</option>
              <option value="journals">Saved journals</option>
              <option value="attendance">Attendance records</option>
              <option value="forms">Assigned forms & evaluations</option>
              <option value="evidence">Uploaded evidence</option>
            </select>
          </label>
          <label className="text-sm">
            Responsible respondent
            <select
              className={selectClass}
              value={section.respondent}
              onChange={(e) =>
                onChange({
                  ...section,
                  respondent: e.target.value as TemplateSection["respondent"],
                })
              }
            >
              <option value="student">Student</option>
              <option value="supervisor">Assigned supervisor</option>
              <option value="coordinator">Professor / coordinator</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">
          Instructions
          <Textarea
            value={section.instructions}
            maxLength={3000}
            onChange={(e) =>
              onChange({ ...section, instructions: e.target.value })
            }
          />
        </label>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={section.required}
              onChange={(e) =>
                onChange({ ...section, required: e.target.checked })
              }
            />
            Required
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={section.pageBreak}
              onChange={(e) =>
                onChange({ ...section, pageBreak: e.target.checked })
              }
            />
            Start on a new page
          </label>
        </div>
        {section.kind === "forms" && (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Link published forms
            </legend>
            <p className="text-xs text-muted-foreground">
              The selected respondent receives these forms on assignment.
              Approved responses appear here in the report.
            </p>
            {forms
              .filter((f) => f.status === "published" && !f.origin)
              .map((f) => (
                <label
                  key={f.id}
                  className="flex min-w-0 items-start gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={section.formIds.includes(f.id)}
                    onChange={(e) =>
                      onChange({
                        ...section,
                        formIds: e.target.checked
                          ? [...section.formIds, f.id]
                          : section.formIds.filter((id) => id !== f.id),
                      })
                    }
                  />
                  <span className="break-words">
                    {f.title} · v{f.version}
                  </span>
                </label>
              ))}
          </fieldset>
        )}
      </div>
    </details>
  );
}
