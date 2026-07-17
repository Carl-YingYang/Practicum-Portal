"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { PageHeader } from "@/components/portal/layout/page-header";
import { SectionCard } from "@/components/portal/shared/section-card";
import { ActionBar } from "@/components/portal/shared/action-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  School,
  Upload,
  Palette,
  Check,
  RotateCcw,
  Trash2,
  GraduationCap,
  MapPin,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Clock,
  FileText,
  CalendarRange,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  SCHOOL_THEME_PRESETS,
  resolveSchoolTheme,
} from "@/lib/school-themes";
import { resizeAndCompress, formatBytes } from "@/lib/image-utils";
import type { SchoolIdentity, SchoolThemePreset } from "@/lib/types";

const LOGO_MAX = 128; // px
const LOGO_MAX_BYTES = 30 * 1024; // 30 KB


// Hero image — wider, larger byte budget (≤ 200KB data URL).
const HERO_MAX_DIM = 1600; // px — wide hero, kept under 1600px on the long edge
const HERO_MAX_BYTES = 200 * 1024; // 200 KB

// Accent color swatches — Facebook-page style warm editorial palette.
const ACCENT_SWATCHES: { value: string; label: string; hex: string }[] = [
  { value: "sage", label: "Sage", hex: "#84a98c" },
  { value: "terracotta", label: "Terracotta", hex: "#c17a5a" },
  { value: "slate", label: "Slate", hex: "#64748b" },
  { value: "sand", label: "Sand", hex: "#d4b896" },
  { value: "clay", label: "Clay", hex: "#a67c5a" },
];

export function SchoolIdentitySettings() {
  const schoolIdentity = useAppStore((s) => s.schoolIdentity);
  const updateSchoolIdentity = useAppStore((s) => s.updateSchoolIdentity);
  const resetSchoolIdentity = useAppStore((s) => s.resetSchoolIdentity);

  // Local draft so changes can be saved/cancelled as a unit.
  const [draft, setDraft] = React.useState<SchoolIdentity>(schoolIdentity);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<"logo" | "hero" | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(schoolIdentity);

  React.useEffect(() => {
    setDraft(schoolIdentity);
  }, [schoolIdentity]);

  const set = <K extends keyof SchoolIdentity>(k: K, v: SchoolIdentity[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next.name = "School name is required.";
    if (!draft.shortName.trim()) next.shortName = "Short name is required.";
    if (!draft.tagline.trim()) next.tagline = "Tagline is required.";
    if (draft.themePreset === "custom") {
      const c = draft.customColors;
      if (!c?.primary || !c?.deep || !c?.light) {
        next.themePreset = "Pick all three custom colors.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    updateSchoolIdentity({
      name: draft.name.trim(),
      shortName: draft.shortName.trim(),
      tagline: draft.tagline.trim(),
      address: draft.address.trim(),
      logoDataUrl: draft.logoDataUrl,
      bannerDataUrl: draft.bannerDataUrl,
      themePreset: draft.themePreset,
      customColors: draft.customColors,
      accentColor: draft.accentColor,
      heroImage: draft.heroImage,
      visibleCards: draft.visibleCards,
    });
    toast.success("School identity saved", {
      description: "Students and supervisors will see the new branding.",
    });
  };

  const handleReset = () => {
    resetSchoolIdentity();
    toast.success("Reset to Practo default", {
      description: "All branding has been cleared.",
    });
  };

  const handleLogoUpload = async (file: File) => {
    setBusy("logo");
    try {
      const out = await resizeAndCompress(file, {
        maxDim: LOGO_MAX,
        quality: 0.92,
        mime: "image/png",
        maxBytes: LOGO_MAX_BYTES,
        square: true,
      });
      set("logoDataUrl", out.dataUrl);
      toast.success("Logo ready", {
        description: `${out.width}×${out.height} · ${formatBytes(out.bytes)}`,
      });
    } catch (e) {
      toast.error("Logo upload failed", {
        description: e instanceof Error ? e.message : "Unknown error.",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleHeroUpload = async (file: File) => {
    setBusy("hero");
    try {
      const out = await resizeAndCompress(file, {
        maxDim: HERO_MAX_DIM,
        quality: 0.82,
        mime: "image/jpeg",
        maxBytes: HERO_MAX_BYTES,
      });
      set("heroImage", out.dataUrl);
      toast.success("Hero image ready", {
        description: `${out.width}×${out.height} · ${formatBytes(out.bytes)}`,
      });
    } catch (e) {
      toast.error("Hero image upload failed", {
        description: e instanceof Error ? e.message : "Unknown error.",
      });
    } finally {
      setBusy(null);
    }
  };

  const themeColors = resolveSchoolTheme(draft);

  return (
    <div>
      <PageHeader
        title="School Settings"
        description="Brand every student and supervisor's view with your school's identity and colors."
        breadcrumb="School Settings"
      />

      <div className="flex flex-col gap-3 pb-8 lg:grid lg:grid-cols-[1fr_320px] lg:gap-4">
        {/* ============ LIVE PREVIEW (first on mobile, right on desktop) ============ */}
        <div className="order-1 mb-1 lg:order-2 lg:sticky lg:top-4 lg:self-start lg:mb-0">
          <SectionCard
            title="Live Preview"
            description="Updates as you edit."
            contentClassName="p-3.5"
          >
            <LivePreview identity={draft} />
          </SectionCard>
        </div>

        {/* ============ FORM (second on mobile, left on desktop) ============ */}
        <div className="order-2 space-y-3 lg:order-1">
          {/* ---- Section 1: Identity ---- */}
          <SectionCard
            title="School Identity"
            description="Shown in the sidebar and dashboard header."
            contentClassName="p-4"
          >
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="School Name" required error={errors.name}>
                  <Input
                    value={draft.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Your institution name"
                    aria-invalid={!!errors.name}
                  />
                </Field>
                <Field
                  label="Short Name"
                  required
                  error={errors.shortName}
                  hint="Abbreviation for the collapsed sidebar."
                >
                  <Input
                    value={draft.shortName}
                    onChange={(e) => set("shortName", e.target.value)}
                    placeholder="ABC"
                    maxLength={8}
                    aria-invalid={!!errors.shortName}
                  />
                </Field>
              </div>
              <Field label="Tagline" required error={errors.tagline}>
                <Input
                  value={draft.tagline}
                  onChange={(e) => set("tagline", e.target.value)}
                  placeholder="Center of Academic Excellence"
                  aria-invalid={!!errors.tagline}
                />
              </Field>
              <Field label="Address" error={errors.address}>
                <Textarea
                  value={draft.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Your institution address"
                  rows={2}
                />
              </Field>
            </div>
          </SectionCard>

          {/* ---- Section 2: Logo ---- */}
          <SectionCard
            title="School Logo"
            description="Square image, optimized to 128×128 PNG."
            contentClassName="p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Preview */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
                {draft.logoDataUrl ? (
                   
                  <img
                    src={draft.logoDataUrl}
                    alt="School logo preview"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <UploadButton
                  accept="image/png,image/jpeg"
                  onFile={handleLogoUpload}
                  busy={busy === "logo"}
                  label="Upload logo"
                  hint="PNG or JPG, square preferred. Max 5 MB source."
                />
                {draft.logoDataUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => set("logoDataUrl", undefined)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove logo
                  </Button>
                )}
              </div>
            </div>
          </SectionCard>

          {/* ---- Section 3: Theme ---- */}
          <SectionCard
            title="Color Theme"
            description="Drives the sidebar, buttons, and accents across the entire portal."
            contentClassName="p-4"
          >
            <div className="space-y-3">
              {/* Preset grid — responsive: 1 col on mobile, 2 on sm, 3 on lg.
                  Descriptions wrap with line-clamp-2 so they never overflow. */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {SCHOOL_THEME_PRESETS.map((preset) => {
                  const active = draft.themePreset === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => set("themePreset", preset.key as SchoolThemePreset)}
                      className={cn(
                        "group relative flex flex-col items-start gap-1.5 rounded-lg border p-2.5 text-left transition-all",
                        active
                          ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                          : "border-border hover:border-border/80 hover:bg-muted/30"
                      )}
                    >
                      {/* Color swatches */}
                      <div className="flex w-full items-center gap-1">
                        <span
                          className="h-5 w-5 rounded ring-1 ring-black/5"
                          style={{ backgroundColor: preset.colors.primary }}
                        />
                        <span
                          className="h-5 w-5 rounded ring-1 ring-black/5"
                          style={{ backgroundColor: preset.colors.deep }}
                        />
                        <span
                          className="h-5 w-5 rounded ring-1 ring-black/5"
                          style={{ backgroundColor: preset.colors.light }}
                        />
                        {active && (
                          <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-2.5 w-2.5" strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 w-full">
                        <p className="text-[13px] font-semibold leading-tight text-foreground">
                          {preset.label}
                        </p>
                        <p className="line-clamp-2 break-words text-[11px] leading-snug text-muted-foreground">
                          {preset.description}
                        </p>
                      </div>
                    </button>
                  );
                })}

                {/* Custom option */}
                <button
                  type="button"
                  onClick={() => set("themePreset", "custom")}
                  className={cn(
                    "group relative flex flex-col items-start gap-1.5 rounded-lg border p-2.5 text-left transition-all",
                    draft.themePreset === "custom"
                      ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                      : "border-border hover:border-border/80 hover:bg-muted/30"
                  )}
                >
                  <div className="flex w-full items-center gap-1">
                    <Palette className="h-5 w-5 text-muted-foreground" />
                    {draft.themePreset === "custom" && (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-[13px] font-semibold leading-tight text-foreground">Custom</p>
                    <p className="line-clamp-2 break-words text-[11px] leading-snug text-muted-foreground">
                      Pick your own colors
                    </p>
                  </div>
                </button>
              </div>

              {errors.themePreset && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {errors.themePreset}
                </p>
              )}

              {/* Custom color pickers */}
              {draft.themePreset === "custom" && (
                <div className="grid gap-2.5 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-3">
                  <ColorPicker
                    label="Primary"
                    hint="Sidebar + buttons"
                    value={draft.customColors?.primary ?? themeColors.primary}
                    onChange={(v) =>
                      set("customColors", {
                        ...(draft.customColors ?? themeColors),
                        primary: v,
                      })
                    }
                  />
                  <ColorPicker
                    label="Deep"
                    hint="Gradients / dark chrome"
                    value={draft.customColors?.deep ?? themeColors.deep}
                    onChange={(v) =>
                      set("customColors", {
                        ...(draft.customColors ?? themeColors),
                        deep: v,
                      })
                    }
                  />
                  <ColorPicker
                    label="Light"
                    hint="Highlights + active strip"
                    value={draft.customColors?.light ?? themeColors.light}
                    onChange={(v) =>
                      set("customColors", {
                        ...(draft.customColors ?? themeColors),
                        light: v,
                      })
                    }
                  />
                </div>
              )}
            </div>
          </SectionCard>

          {/* ---- Section 4: Accent Color ---- */}
          <SectionCard
            title="Accent Color"
            description="Editorial highlight color used on dashboard heroes, charts, and emphasis chips."
            contentClassName="p-4"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              {ACCENT_SWATCHES.map((sw) => {
                const active = (draft.accentColor ?? "terracotta") === sw.value;
                return (
                  <button
                    key={sw.value}
                    type="button"
                    onClick={() => set("accentColor", sw.value)}
                    aria-pressed={active}
                    aria-label={`${sw.label} accent`}
                    className={cn(
                      "group flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-all",
                      active
                        ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                        : "border-border hover:border-border/80 hover:bg-muted/30"
                    )}
                  >
                    <span
                      className="relative flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-black/5"
                      style={{ backgroundColor: sw.hex }}
                    >
                      {active && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-medium text-foreground">{sw.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Current: <span className="font-semibold text-foreground capitalize">{draft.accentColor ?? "terracotta"}</span>
            </p>
          </SectionCard>

          {/* ---- Section 5: Hero Image ---- */}
          <SectionCard
            title="Hero Image"
            description="Single wide image shown on the login + dashboard heroes. Optimized to ≤ 200KB JPEG."
            contentClassName="p-4"
          >
            <div className="space-y-3">
              {/* 21:9 aspect ratio preview with fade-veil overlay matching the live hero */}
              <div className="relative aspect-[21/9] w-full overflow-hidden rounded-lg border border-border bg-muted/30">
                {draft.heroImage ? (
                  <>
                    <img
                      src={draft.heroImage}
                      alt="Hero preview"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    {/* Fade-veil overlay — matches the live hero gradient (darkest at bottom) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/40" />
                    {/* Brand text sample */}
                    <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                      <p className="text-sm font-bold leading-tight drop-shadow-sm">
                        {draft.name || "School Name"}
                      </p>
                      <p className="text-[11px] text-white/80 drop-shadow-sm">
                        {draft.tagline || "Tagline"}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
                    <ImageIcon className="h-8 w-8 opacity-40" />
                    <p className="text-xs">No hero image — gradient fallback will be used</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <UploadButton
                  accept="image/png,image/jpeg"
                  onFile={handleHeroUpload}
                  busy={busy === "hero"}
                  label={draft.heroImage ? "Replace hero image" : "Upload hero image"}
                  hint="PNG or JPG, 21:9 or wider preferred. Compressed to ≤ 200KB."
                />
                {draft.heroImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => set("heroImage", undefined)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </SectionCard>

          {/* ---- Section 6: Visible Dashboard Cards ---- */}
          <SectionCard
            title="Visible Dashboard Cards"
            description="Choose which cards students see on their bento dashboard."
            contentClassName="p-4"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <VisibleCardsToggle
                icon={<Clock className="h-4 w-4 text-primary" />}
                label="Time Clock"
                description="Clock in / out + live timer"
                checked={draft.visibleCards?.timeClock ?? true}
                onChange={(v) =>
                  set("visibleCards", {
                    ...(draft.visibleCards ?? {
                      timeClock: true,
                      draftingRoom: true,
                      timesheet: true,
                      evaluations: true,
                    }),
                    timeClock: v,
                  })
                }
              />
              <VisibleCardsToggle
                icon={<FileText className="h-4 w-4 text-primary" />}
                label="Drafting Room"
                description="Weekly journal drafting"
                checked={draft.visibleCards?.draftingRoom ?? true}
                onChange={(v) =>
                  set("visibleCards", {
                    ...(draft.visibleCards ?? {
                      timeClock: true,
                      draftingRoom: true,
                      timesheet: true,
                      evaluations: true,
                    }),
                    draftingRoom: v,
                  })
                }
              />
              <VisibleCardsToggle
                icon={<CalendarRange className="h-4 w-4 text-primary" />}
                label="Timesheet"
                description="Logged hours breakdown"
                checked={draft.visibleCards?.timesheet ?? true}
                onChange={(v) =>
                  set("visibleCards", {
                    ...(draft.visibleCards ?? {
                      timeClock: true,
                      draftingRoom: true,
                      timesheet: true,
                      evaluations: true,
                    }),
                    timesheet: v,
                  })
                }
              />
              <VisibleCardsToggle
                icon={<ClipboardCheck className="h-4 w-4 text-primary" />}
                label="Evaluations"
                description="Latest supervisor evaluation"
                checked={draft.visibleCards?.evaluations ?? true}
                onChange={(v) =>
                  set("visibleCards", {
                    ...(draft.visibleCards ?? {
                      timeClock: true,
                      draftingRoom: true,
                      timesheet: true,
                      evaluations: true,
                    }),
                    evaluations: v,
                  })
                }
              />
            </div>
          </SectionCard>
        </div>
      </div>

      <ActionBar>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="mr-auto text-destructive hover:text-destructive">
              <RotateCcw className="h-4 w-4" />
              Reset to Practo default
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all branding?</AlertDialogTitle>
              <AlertDialogDescription>
                This clears the school name, logo, and color theme, returning to
                the default look. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReset}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Reset everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="outline" onClick={() => setDraft(schoolIdentity)} disabled={!dirty}>
          Discard changes
        </Button>
        <Button onClick={handleSave} disabled={!dirty}>
          Save changes
        </Button>
      </ActionBar>
    </div>
  );
}

// ============================================================
// Upload button — drag-drop + click, single file
// ============================================================
function UploadButton({
  accept,
  onFile,
  busy,
  label,
  hint,
}: {
  accept: string;
  onFile: (file: File) => void;
  busy: boolean;
  label: string;
  hint?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <Upload className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-medium text-foreground">{busy ? "Processing…" : label}</span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ============================================================
// Color picker — hex input + native color swatch
// ============================================================
function ColorPicker({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <Label className="mb-1.5 text-xs font-semibold">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
          maxLength={7}
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ============================================================
// Visible cards toggle — icon + label + description + switch
// ============================================================
function VisibleCardsToggle({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ============================================================
// Field wrapper
// ============================================================
function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================
// Live preview — brand panel + sidebar mockup
// ============================================================
function LivePreview({ identity }: { identity: SchoolIdentity }) {
  const colors = resolveSchoolTheme(identity);
  return (
    <div className="space-y-2.5">
      {/* Brand panel preview */}
      <div
        className="relative overflow-hidden rounded-lg p-3 text-white"
        style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.deep} 100%)`,
        }}
      >
        <div className="relative flex items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/15 ring-1 ring-white/25"
          >
            {identity.logoDataUrl ? (
              
              <img
                src={identity.logoDataUrl}
                alt=""
                className="h-full w-full rounded-md object-contain p-0.5"
              />
            ) : (
              <School className="h-3.5 w-3.5" style={{ color: colors.light }} strokeWidth={2.2} />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold leading-tight">
              {identity.name || "School Name"}
            </p>
            <p className="truncate text-[10px] text-white/70">
              {identity.tagline || "Tagline"}
            </p>
          </div>
        </div>
        {identity.address && (
          <p className="relative mt-1.5 flex items-center gap-1 text-[10px] text-white/60">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{identity.address}</span>
          </p>
        )}
      </div>

      {/* Mini sidebar mockup */}
      <div
        className="overflow-hidden rounded-lg border"
        style={{ backgroundColor: colors.primary }}
      >
        <div className="flex items-center gap-2 border-b border-white/15 px-2.5 py-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-[3px] bg-white/15 ring-1 ring-white/20">
            {identity.logoDataUrl ? (
              
              <img
                src={identity.logoDataUrl}
                alt=""
                className="h-full w-full rounded-[3px] object-contain p-0.5"
              />
            ) : (
              <GraduationCap
                className="h-2.5 w-2.5"
                style={{ color: colors.light }}
                strokeWidth={2.4}
              />
            )}
          </div>
          <p className="truncate text-[11px] font-bold text-white">
            {identity.shortName || "School"}
          </p>
        </div>
        <div className="space-y-0.5 p-1.5">
          {["Dashboard", "Students", "Reports"].map((item, i) => (
            <div
              key={item}
              className={cn(
                "flex items-center gap-2 rounded-[3px] px-2 py-1 text-[10px] font-medium",
                i === 0 ? "bg-white/15 text-white" : "text-white/60"
              )}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: i === 0 ? colors.light : "currentColor" }}
              />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Primary button preview */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div
          className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-white"
          style={{ backgroundColor: colors.primary }}
        >
          Primary button
        </div>
        <div
          className="rounded-md border px-2.5 py-1 text-[11px] font-semibold"
          style={{ borderColor: colors.primary, color: colors.primary }}
        >
          Outline
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: colors.light, color: colors.primary }}
        >
          Badge
        </span>
      </div>
    </div>
  );
}
