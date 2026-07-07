"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import type { FormBlock } from "@/lib/types";

/**
 * Read-only / interactive renderer for a single form block.
 *
 * Used by:
 *  - the supervisor viewer (interactive=true, fields editable in-memory)
 *  - the editor's live preview (interactive=false, fields inert)
 *  - the editor itself (NOT — the editor uses inline editable wrappers)
 */
export interface FormBlockRendererProps {
  block: FormBlock;
  /** When true, fill-in / info-field / rating-table / signature are interactive. */
  interactive?: boolean;
  /** Optional callback when an interactive value changes (in-memory only). */
  onValueChange?: (blockId: string, value: string | Record<string, string>) => void;
  /** Pre-fill values keyed by block id (interactive mode). */
  values?: Record<string, string | Record<string, string>>;
  className?: string;
}

export function FormBlockRenderer({
  block,
  interactive = false,
  onValueChange,
  values,
  className,
}: FormBlockRendererProps) {
  const value = values?.[block.id];

  switch (block.type) {
    case "heading": {
      const level = block.level ?? 2;
      const cls =
        level === 1
          ? "font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl"
          : level === 2
            ? "font-heading text-[15px] font-semibold tracking-tight text-foreground"
            : "font-heading text-sm font-semibold tracking-tight text-foreground";
      const Tag = (level === 1 ? "h2" : level === 2 ? "h3" : "h4") as keyof React.JSX.IntrinsicElements;
      return (
        <Tag className={cn(cls, "mt-2 first:mt-0", className)}>
          {block.text || (level === 1 ? "Untitled section" : "New heading")}
        </Tag>
      );
    }

    case "paragraph":
      return (
        <p className={cn("text-[13.5px] leading-relaxed text-foreground/90", className)}>
          {block.text || <span className="text-muted-foreground/60">Empty paragraph</span>}
        </p>
      );

    case "instruction":
      return (
        <p className={cn(
          "rounded-md bg-muted/40 px-3 py-2 text-[12.5px] italic leading-relaxed text-muted-foreground",
          className
        )}>
          {block.text || "Instruction text"}
        </p>
      );

    case "divider":
      return <Separator className={cn("my-1 bg-border/70", className)} />;

    case "info-field":
      return (
        <InfoField
          label={block.label || "Label"}
          placeholder={block.placeholder}
          interactive={interactive}
          value={(typeof value === "string" ? value : "") || ""}
          onChange={(v) => onValueChange?.(block.id, v)}
          className={className}
        />
      );

    case "fill-in":
      return (
        <FillIn
          label={block.label || "Question"}
          placeholder={block.placeholder}
          multiline={block.multiline}
          interactive={interactive}
          value={(typeof value === "string" ? value : "") || ""}
          onChange={(v) => onValueChange?.(block.id, v)}
          className={className}
        />
      );

    case "rating-table":
      return (
        <RatingTable
          scaleLabels={block.scaleLabels ?? []}
          criteria={block.criteria ?? []}
          interactive={interactive}
          selectedMap={(typeof value === "object" && value ? value : {}) as Record<string, string>}
          onSelect={(criterionId, scaleLabel) =>
            onValueChange?.(block.id, { ...(typeof value === "object" && value ? value : {}), [criterionId]: scaleLabel })
          }
          className={className}
        />
      );

    case "signature":
      return (
        <SignatureBlock
          caption={block.caption || "Signature over Printed Name"}
          interactive={interactive}
          value={(typeof value === "string" ? value : "") || ""}
          onChange={(v) => onValueChange?.(block.id, v)}
          className={className}
        />
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------

function InfoField({
  label,
  placeholder,
  interactive,
  value,
  onChange,
  className,
}: {
  label: string;
  placeholder?: string;
  interactive: boolean;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  if (!interactive) {
    return (
      <div className={cn("flex items-baseline gap-2", className)}>
        <span className="shrink-0 text-[13px] font-medium text-foreground">{label}:</span>
        <span className="flex-1 border-b border-dashed border-border/80 pb-0.5 text-[13px] text-muted-foreground/70">
          {placeholder || "\u00A0"}
        </span>
      </div>
    );
  }
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <label className="shrink-0 text-[13px] font-medium text-foreground">{label}:</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 border-b border-dashed border-border bg-transparent pb-0.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
      />
    </div>
  );
}

function FillIn({
  label,
  placeholder,
  multiline,
  interactive,
  value,
  onChange,
  className,
}: {
  label: string;
  placeholder?: string;
  multiline?: boolean;
  interactive: boolean;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  if (!interactive) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="text-[12.5px] font-medium text-foreground">{label}</div>
        {multiline ? (
          <div className="min-h-[60px] rounded-md border border-dashed border-border/80 bg-muted/20 p-2 text-[12.5px] text-muted-foreground/60">
            {placeholder || "\u00A0"}
          </div>
        ) : (
          <div className="border-b border-dashed border-border/80 pb-0.5 text-[13px] text-muted-foreground/70">
            {placeholder || "\u00A0"}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={cn("space-y-1", className)}>
      <label className="block text-[12.5px] font-medium text-foreground">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-y rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border-b border-dashed border-border bg-transparent pb-0.5 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
        />
      )}
    </div>
  );
}

function RatingTable({
  scaleLabels,
  criteria,
  interactive,
  selectedMap,
  onSelect,
  className,
}: {
  scaleLabels: string[];
  criteria: { id: string; label: string }[];
  interactive: boolean;
  selectedMap: Record<string, string>;
  onSelect: (criterionId: string, scaleLabel: string) => void;
  className?: string;
}) {
  if (criteria.length === 0 || scaleLabels.length === 0) {
    return (
      <div className={cn("rounded-md border border-dashed border-border/70 p-3 text-[12px] text-muted-foreground", className)}>
        Empty rating table — add criteria and scale columns.
      </div>
    );
  }
  return (
    <div className={cn("overflow-x-auto rounded-md border border-border/60", className)}>
      <table className="w-full border-collapse text-left text-[12.5px]">
        <thead>
          <tr className="bg-muted/50">
            <th className="border-b border-border/60 px-2.5 py-1.5 font-medium text-muted-foreground">
              Criterion
            </th>
            {scaleLabels.map((s) => (
              <th
                key={s}
                className="border-b border-l border-border/60 px-2 py-1.5 text-center font-medium text-muted-foreground"
              >
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {criteria.map((c, idx) => {
            const isGroupHeader = /^(\d+\.?\s*)?[A-Z][A-Z\s&/()-]{2,}$/.test(c.label.trim()) && !/^[a-z]\./.test(c.label.trim());
            return (
              <tr
                key={c.id}
                className={cn(idx % 2 === 1 && "bg-muted/20")}
              >
                <td
                  className={cn(
                    "border-b border-border/40 px-2.5 py-1.5 align-top text-foreground",
                    isGroupHeader && "font-semibold"
                  )}
                >
                  {c.label}
                </td>
                {scaleLabels.map((s) => {
                  const selected = selectedMap[c.id] === s;
                  return (
                    <td
                      key={s}
                      className="border-b border-l border-border/40 px-2 py-1.5 text-center"
                    >
                      {interactive ? (
                        <button
                          type="button"
                          onClick={() => onSelect(c.id, s)}
                          className={cn(
                            "mx-auto flex h-5 w-5 items-center justify-center rounded-full border text-[11px] transition-colors",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/80 text-transparent hover:border-primary/60 hover:bg-primary/5"
                          )}
                          aria-label={`Rate "${c.label}" as ${s}`}
                          aria-pressed={selected}
                        >
                          {selected ? "✓" : ""}
                        </button>
                      ) : (
                        <span className="text-muted-foreground/40">○</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SignatureBlock({
  caption,
  interactive,
  value,
  onChange,
  className,
}: {
  caption: string;
  interactive: boolean;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("pt-2", className)}>
      {interactive ? (
        <input
          type="text"
          value={value}
          placeholder="Type your full name to sign"
          onChange={(e) => onChange(e.target.value)}
          className="w-full max-w-xs border-b border-border bg-transparent pb-0.5 font-[400] italic text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
          style={{ fontFamily: "'Brush Script MT', cursive, system-ui" }}
        />
      ) : (
        <div className="h-7 w-full max-w-xs border-b border-border" />
      )}
      <div className="mt-1 text-[11.5px] text-muted-foreground">{caption}</div>
    </div>
  );
}
