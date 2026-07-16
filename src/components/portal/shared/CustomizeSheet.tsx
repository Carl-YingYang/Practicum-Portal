"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ACCENT_CLASSES,
  ACCENT_OPTIONS,
  DEFAULT_SCHOOL_THEME,
  SCHOOL_ID,
  TOGGLEABLE_CARDS,
  useSchoolTheme,
  useThemeStore,
} from "@/store/useThemeStore";
import { Check, Palette, Eye, RotateCcw } from "lucide-react";

/* ========================================================================== */
/*  CustomizeSheet — Supervisor-only theme editor (right-side Sheet).         */
/*  ------------------------------------------------------------------------  */
/*  • 3 accent swatches (Sage / Terracotta / Slate).                          */
/*  • 4 Switches toggling bento card visibility.                              */
/*  • Writes through to `useThemeStore` on every change (instant).            */
/*  • Controlled via `open` / `onOpenChange`.                                  */
/* ========================================================================== */

interface CustomizeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** School ID to edit. Defaults to the single-school constant. */
  schoolId?: string;
}

export function CustomizeSheet({
  open,
  onOpenChange,
  schoolId = SCHOOL_ID,
}: CustomizeSheetProps) {
  const theme = useSchoolTheme(schoolId);
  const setSchoolTheme = useThemeStore((s) => s.setSchoolTheme);
  const resetSchoolTheme = useThemeStore((s) => s.resetSchoolTheme);

  const accent = theme.accentColor;
  const visible = theme.visibleCards;
  const activeAccent = ACCENT_OPTIONS.find((o) => o.value === accent);

  const handleAccent = (next: (typeof ACCENT_OPTIONS)[number]["value"]) =>
    setSchoolTheme(schoolId, { accentColor: next });

  const toggleCard = (key: string, on: boolean) => {
    const set = new Set(visible);
    if (on) set.add(key);
    else {
      // Prevent disabling the last visible card.
      if (set.size <= 1) return;
      set.delete(key);
    }
    setSchoolTheme(schoolId, { visibleCards: Array.from(set) });
  };

  const handleReset = () => resetSchoolTheme(schoolId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="gap-1.5 border-b border-border/60 px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-muted-foreground" />
            Customize Workspace
          </SheetTitle>
          <SheetDescription>
            Choose an accent and pick which cards appear on the student
            dashboard. Changes save instantly.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
          {/* ── Accent color ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Accent color
              </h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  ACCENT_CLASSES[accent].bg,
                  ACCENT_CLASSES[accent].text,
                )}
              >
                {activeAccent?.label}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {ACCENT_OPTIONS.map((opt) => {
                const cls = ACCENT_CLASSES[opt.value];
                const active = accent === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleAccent(opt.value)}
                    aria-pressed={active}
                    className={cn(
                      "group relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
                      active
                        ? cn("border-transparent ring-2", cls.ring)
                        : "border-border/60 hover:border-border hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-transform",
                        cls.swatch,
                        active ? "scale-105" : "group-hover:scale-105",
                      )}
                    >
                      {active && (
                        <Check className="h-4 w-4 text-white" strokeWidth={3} />
                      )}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Visible cards ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Visible cards
              </h3>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {visible.length}/{TOGGLEABLE_CARDS.length} shown
              </span>
            </div>
            <ul className="overflow-hidden rounded-xl border border-border/60">
              {TOGGLEABLE_CARDS.map((card, i) => {
                const on = visible.includes(card.key);
                const disabled = on && visible.length <= 1;
                return (
                  <li
                    key={card.key}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3.5 py-3",
                      i > 0 && "border-t border-border/50",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {card.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {card.description}
                      </p>
                    </div>
                    <Switch
                      checked={on}
                      disabled={disabled}
                      onCheckedChange={(v) => toggleCard(card.key, v)}
                      aria-label={`Toggle ${card.label}`}
                    />
                  </li>
                );
              })}
            </ul>
            <p className="text-[11px] text-muted-foreground">
              At least one card stays visible — hiding all cards would leave the
              dashboard empty.
            </p>
          </section>
        </div>

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border/60 px-5 py-3.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </Button>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            Defaults: {DEFAULT_SCHOOL_THEME.accentColor} ·{" "}
            {DEFAULT_SCHOOL_THEME.visibleCards.length} cards
          </span>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default CustomizeSheet;
