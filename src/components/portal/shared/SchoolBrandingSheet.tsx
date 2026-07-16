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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ACCENT_HEX,
  ACCENT_OPTIONS,
  DEFAULT_VISIBLE_CARDS,
  type AccentColor,
  type School,
} from "@/lib/types";
import { useSupervisorEditableSchool } from "@/lib/use-effective-school";
import { useAppStore } from "@/store/use-app-store";
import {
  Check,
  Palette,
  Eye,
  RotateCcw,
  Upload,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

/* ========================================================================== */
/*  SchoolBrandingSheet — Supervisor-only branding editor (right Sheet).      */
/*  ------------------------------------------------------------------------  */
/*  • 5 accent swatches (Sage / Terracotta / Slate / Sand / Clay).            */
/*  • Logo upload (data URL, ≤30KB).                                          */
/*  • Hero images upload (up to 3, ≤200KB each).                              */
/*  • Tagline edit.                                                           */
/*  • 4 Switches toggling bento card visibility.                              */
/*  • Writes through to `useAppStore.setSchoolBranding` instantly.            */
/*                                                                            */
/*  Only supervisors with a single non-default school can edit. Others see a  */
/*  read-only notice.                                                         */
/* ========================================================================== */

const TOGGLEABLE_CARDS = [
  { key: "time_clock", label: "Time Clock", description: "Clock in / out + live progress" },
  { key: "drafting_room", label: "Drafting Room", description: "Weekly journal drafting" },
  { key: "timesheet", label: "Timesheet", description: "This week's logged hours" },
  { key: "evaluations", label: "Evaluations", description: "Latest supervisor evaluation" },
] as const;

const MAX_HERO_IMAGES = 3;
const MAX_LOGO_KB = 30;
const MAX_HERO_KB = 200;

interface SchoolBrandingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SchoolBrandingSheet({
  open,
  onOpenChange,
}: SchoolBrandingSheetProps) {
  const editableSchool = useSupervisorEditableSchool();
  const setSchoolBranding = useAppStore((s) => s.setSchoolBranding);

  // If the supervisor can't edit (multi-school or default), show a notice.
  if (!editableSchool) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="gap-1.5 border-b border-border/60 px-5 py-4">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4 text-muted-foreground" />
              School Branding
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Branding not editable
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                You can customize branding when all your interns belong to the
                same non-default school. With multiple schools, the default
                Practo theme is shown.
              </p>
            </div>
          </div>
          <SheetFooter className="border-t border-border/60 px-5 py-3.5">
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <BrandingEditor
      school={editableSchool}
      open={open}
      onOpenChange={onOpenChange}
      onPatch={(patch) => setSchoolBranding(editableSchool.id, patch)}
      onReset={() => {
        setSchoolBranding(editableSchool.id, {
          accentColor: "sage",
          logoDataUrl: undefined,
          heroImages: [],
          tagline: "",
          visibleCards: [...DEFAULT_VISIBLE_CARDS],
        });
        toast.success("Branding reset to defaults");
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  The actual editor — receives the school + patch callback.                 */
/* -------------------------------------------------------------------------- */

function BrandingEditor({
  school,
  open,
  onOpenChange,
  onPatch,
  onReset,
}: {
  school: School;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPatch: (patch: Partial<School>) => void;
  onReset: () => void;
}) {
  const accent = school.accentColor;
  const visible = school.visibleCards;
  const activeAccent = ACCENT_OPTIONS.find((o) => o.value === accent);

  const handleAccent = (next: AccentColor) =>
    onPatch({ accentColor: next });

  const toggleCard = (key: string, on: boolean) => {
    const set = new Set(visible);
    if (on) set.add(key);
    else {
      if (set.size <= 1) return; // keep at least one
      set.delete(key);
    }
    onPatch({ visibleCards: Array.from(set) });
  };

  const handleLogoUpload = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_LOGO_KB * 1024) {
      toast.error(`Logo too large`, {
        description: `Max ${MAX_LOGO_KB}KB. Yours is ${(file.size / 1024).toFixed(0)}KB.`,
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onPatch({ logoDataUrl: reader.result as string });
      toast.success("Logo uploaded");
    };
    reader.readAsDataURL(file);
  };

  const handleHeroUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_HERO_IMAGES - school.heroImages.length;
    if (remaining <= 0) {
      toast.error(`Max ${MAX_HERO_IMAGES} hero images`, {
        description: "Remove one before adding another.",
      });
      return;
    }
    const toRead = Array.from(files).slice(0, remaining);
    const oversized = toRead.filter((f) => f.size > MAX_HERO_KB * 1024);
    if (oversized.length > 0) {
      toast.error(`Image too large`, {
        description: `Max ${MAX_HERO_KB}KB per hero image.`,
      });
      return;
    }
    Promise.all(
      toRead.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          }),
      ),
    ).then((dataUrls) => {
      onPatch({ heroImages: [...school.heroImages, ...dataUrls] });
      toast.success(`${dataUrls.length} hero image${dataUrls.length === 1 ? "" : "s"} uploaded`);
    });
  };

  const removeHero = (index: number) => {
    onPatch({ heroImages: school.heroImages.filter((_, i) => i !== index) });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="gap-1.5 border-b border-border/60 px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-muted-foreground" />
            School Branding
          </SheetTitle>
          <SheetDescription>
            Customize how students see {school.name}. Changes save instantly.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
          {/* ── Accent color ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Accent color</h3>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: ACCENT_HEX[accent].soft,
                  color: ACCENT_HEX[accent].base,
                }}
              >
                {activeAccent?.label}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {ACCENT_OPTIONS.map((opt) => {
                const hex = ACCENT_HEX[opt.value];
                const isActive = accent === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleAccent(opt.value)}
                    aria-pressed={isActive}
                    title={opt.label}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-all",
                      isActive
                        ? "border-foreground/30 ring-1 ring-foreground/20"
                        : "border-border/50 hover:border-border",
                    )}
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full"
                      style={{ backgroundColor: hex.base }}
                    >
                      {isActive && (
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Tagline ── */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Tagline</h3>
            <Input
              value={school.tagline}
              onChange={(e) => onPatch({ tagline: e.target.value })}
              placeholder="A short descriptor under the school name"
              className="h-9"
            />
          </section>

          {/* ── Logo ── */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Logo</h3>
            <div className="flex items-center gap-3">
              {school.logoDataUrl ? (
                <div className="relative">
                  <img
                    src={school.logoDataUrl}
                    alt="School logo"
                    className="h-12 w-12 rounded-lg border border-border/50 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onPatch({ logoDataUrl: undefined })}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                    aria-label="Remove logo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/30">
                  <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                </div>
              )}
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40">
                  <Upload className="h-3.5 w-3.5" />
                  Upload logo
                </div>
              </Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => handleLogoUpload(e.target.files?.[0])}
              />
            </div>
            <p className="text-xs text-muted-foreground">PNG/JPEG, max {MAX_LOGO_KB}KB.</p>
          </section>

          {/* ── Hero images ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Hero images</h3>
              <span className="text-xs text-muted-foreground">
                {school.heroImages.length}/{MAX_HERO_IMAGES}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Shown in the student dashboard slideshow. Leave empty to use calm defaults.
            </p>
            <div className="flex flex-wrap gap-2">
              {school.heroImages.map((src, i) => (
                <div key={i} className="relative">
                  <img
                    src={src}
                    alt={`Hero ${i + 1}`}
                    className="h-16 w-24 rounded-lg border border-border/50 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeHero(i)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                    aria-label={`Remove hero ${i + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {school.heroImages.length < MAX_HERO_IMAGES && (
                <>
                  <Label htmlFor="hero-upload" className="cursor-pointer">
                    <div className="flex h-16 w-24 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/30 hover:bg-muted/50">
                      <Upload className="h-4 w-4 text-muted-foreground/60" />
                    </div>
                  </Label>
                  <Input
                    id="hero-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => handleHeroUpload(e.target.files)}
                  />
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">JPEG/PNG/WebP, max {MAX_HERO_KB}KB each.</p>
          </section>

          {/* ── Visible cards ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Visible cards</h3>
              <span className="ml-auto text-xs text-muted-foreground">
                {visible.length}/{TOGGLEABLE_CARDS.length} shown
              </span>
            </div>
            <ul className="overflow-hidden rounded-lg border border-border/50">
              {TOGGLEABLE_CARDS.map((card, i) => {
                const on = visible.includes(card.key);
                const disabled = on && visible.length <= 1;
                return (
                  <li
                    key={card.key}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2.5",
                      i > 0 && "border-t border-border/40",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{card.label}</p>
                      <p className="text-xs text-muted-foreground">{card.description}</p>
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
          </section>
        </div>

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border/60 px-5 py-3.5">
          <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default SchoolBrandingSheet;
