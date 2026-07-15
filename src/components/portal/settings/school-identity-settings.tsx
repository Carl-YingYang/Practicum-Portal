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

export function SchoolIdentitySettings() {
  const schoolIdentity = useAppStore((s) => s.schoolIdentity);
  const updateSchoolIdentity = useAppStore((s) => s.updateSchoolIdentity);
  const resetSchoolIdentity = useAppStore((s) => s.resetSchoolIdentity);

  // Local draft so changes can be saved/cancelled as a unit.
  const [draft, setDraft] = React.useState<SchoolIdentity>(schoolIdentity);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<"logo" | null>(null);
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
      bannerDataUrl: undefined,
      themePreset: draft.themePreset,
      customColors: draft.customColors,
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
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
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
