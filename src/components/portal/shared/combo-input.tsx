"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Plus, Check } from "lucide-react";

export interface ComboInputProps {
  value: string;
  onChange: (v: string) => void;
  /** Suggestion options (case-insensitive includes filtering). */
  options: string[];
  placeholder?: string;
  /** When true (default), a "Create '<typed>'" item appears for non-matching input. */
  allowCreate?: boolean;
  className?: string;
  /** Pass-through to the underlying <Input> for aria + id wiring. */
  id?: string;
  "aria-invalid"?: boolean;
  /** Input type (defaults to "text"). */
  type?: "text" | "tel" | "email";
  /** Disabled state. */
  disabled?: boolean;
}

/**
 * ComboInput — a lightweight combobox: free-text input with a dropdown of
 * suggestions that filters as you type. Selecting a suggestion fills the
 * input; typing a brand-new value is allowed and becomes a valid value
 * (with a "Create '<typed>'" hint shown at the top of the dropdown).
 *
 * No new npm dependencies — built on the existing shadcn <Input> and
 * Tailwind for the dropdown. Keyboard accessible:
 *   - ArrowDown / ArrowUp  → move highlight
 *   - Enter                → select highlighted (or create)
 *   - Escape               → close dropdown
 *   - Tab / blur           → close (value stays as typed)
 *
 * Fully responsive — the dropdown matches the input width.
 */
export function ComboInput({
  value,
  onChange,
  options,
  placeholder,
  allowCreate = true,
  className,
  id,
  "aria-invalid": ariaInvalid,
  type = "text",
  disabled,
}: ComboInputProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);

  // Build the filtered suggestion list (case-insensitive includes).
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  const filtered = React.useMemo(() => {
    if (!lower) return options.slice(0, 50);
    const matches = options.filter((o) => o.toLowerCase().includes(lower));
    return matches.slice(0, 50);
  }, [options, lower]);

  // Determine whether the typed value is an exact (case-insensitive) match
  // of an existing option. If so, we don't show a "Create" item.
  const exactMatch = React.useMemo(() => {
    if (!trimmed) return true;
    return options.some((o) => o.toLowerCase() === lower);
  }, [options, lower, trimmed]);

  // Build the list of items to render: optional "Create" item + filtered options.
  const items = React.useMemo(() => {
    const list: { kind: "create" | "option"; label: string; value: string }[] = [];
    if (allowCreate && trimmed && !exactMatch) {
      list.push({ kind: "create", label: trimmed, value: trimmed });
    }
    for (const o of filtered) {
      list.push({ kind: "option", label: o, value: o });
    }
    return list;
  }, [allowCreate, trimmed, exactMatch, filtered]);

  // Reset highlight when the item list changes — done as a derived clamp
  // (no effect) so we don't trip the set-state-in-effect rule.
  const safeHighlight = items.length === 0 ? 0 : Math.min(highlight, items.length - 1);

  // Click-outside handling.
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  const openDropdown = () => {
    if (disabled) return;
    setOpen(true);
    setHighlight(0);
  };

  const selectItem = (val: string) => {
    onChange(val);
    setOpen(false);
    // Return focus to the input after selecting.
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (!open) {
        openDropdown();
        return;
      }
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      if (!open) return;
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && items.length > 0) {
        e.preventDefault();
        const item = items[highlight] ?? items[0];
        if (item) selectItem(item.value);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    } else if (e.key === "Tab") {
      // Tab closes the dropdown (blur default behaviour). The current typed
      // value is preserved — it's a valid free-text value.
      setOpen(false);
    }
  };

  // Determine whether to show the dropdown: open AND (there are suggestions
  // OR we can show a "Create" item).
  const showDropdown =
    open && (items.length > 0 || (!exactMatch && !!trimmed && allowCreate));

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <Input
        ref={inputRef}
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setHighlight(0);
          if (!open) setOpen(true);
        }}
        onFocus={openDropdown}
        onKeyDown={onKeyDown}
        onBlur={() => {
          // Defer so click-on-item fires first.
          setTimeout(() => setOpen(false), 120);
        }}
      />
      {showDropdown && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md scroll-area-custom"
        >
          {items.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              No matches.
            </div>
          )}
          {items.map((item, idx) => {
            const isHighlighted = idx === safeHighlight;
            const isCreate = item.kind === "create";
            return (
              <button
                key={`${item.kind}-${item.label}`}
                type="button"
                role="option"
                aria-selected={isHighlighted}
                onMouseDown={(e) => {
                  // Prevent blur from closing before the click lands.
                  e.preventDefault();
                }}
                onClick={() => selectItem(item.value)}
                onMouseEnter={() => setHighlight(idx)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                  isHighlighted
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent/60",
                )}
              >
                {isCreate ? (
                  <>
                    <Plus className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                    <span className="min-w-0 flex-1 truncate">
                      Create{" "}
                      <span className="font-medium">“{item.label}”</span>
                    </span>
                  </>
                ) : (
                  <>
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-transparent",
                        value === item.value && "text-teal-600 dark:text-teal-400",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
