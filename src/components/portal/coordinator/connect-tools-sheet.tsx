"use client";

import * as React from "react";
import { BottomSheet } from "@/components/portal/shared/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderOpen,
  FileText,
  ClipboardList,
  Clock,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAppStore } from "@/store/use-app-store";
import { validateToolUrl } from "@/lib/selectors";
import type { JournalDueDay, ToolsConfig } from "@/lib/types";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<Step, string> = {
  1: "Drive",
  2: "Journal",
  3: "Evaluation",
  4: "Jibble",
  5: "Schedule",
};

const DUE_DAYS: { value: JournalDueDay; label: string }[] = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

interface ConnectToolsSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface StepConfig {
  title: string;
  blurb: string;
  icon: typeof FolderOpen;
  accent: string;
}

const STEP_CONFIG: Record<Step, StepConfig> = {
  1: {
    title: "Connect Google Drive",
    blurb: "A shared folder where students store their journals and files. Each student gets a subfolder.",
    icon: FolderOpen,
    accent: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  2: {
    title: "Connect Journal Template",
    blurb: "A Google Doc students copy each week as their weekly journal. Real-time collab, version history, one-click PDF.",
    icon: FileText,
    accent: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  },
  3: {
    title: "Connect Evaluation Form",
    blurb: "A Google Form supervisors fill out for midterm/final evaluations. Responses flow to a linked Sheet.",
    icon: ClipboardList,
    accent: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  4: {
    title: "Connect Jibble",
    blurb: "Free time-tracking for attendance. Students clock in/out via mobile; you export weekly timesheets.",
    icon: Clock,
    accent: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  5: {
    title: "Set Weekly Schedule",
    blurb: "Term dates, journal due day, and required hours. The portal auto-generates weekly journal cards from this.",
    icon: Calendar,
    accent: "bg-primary/15 text-primary",
  },
};

export function ConnectToolsSheet({ open, onOpenChange }: ConnectToolsSheetProps) {
  const toolsConfig = useAppStore((s) => s.toolsConfig);
  const setToolsConfig = useAppStore((s) => s.setToolsConfig);

  const [step, setStep] = React.useState<Step>(1);
  const [draft, setDraft] = React.useState<ToolsConfig>(toolsConfig);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [attemptedNext, setAttemptedNext] = React.useState(false);

  // Reset draft to current config whenever the sheet opens.
  React.useEffect(() => {
    if (open) {
      setDraft(toolsConfig);
      setStep(1);
      setErrors({});
      setAttemptedNext(false);
    }
  }, [open, toolsConfig]);

  const set = <K extends keyof ToolsConfig>(k: K, v: ToolsConfig[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (errors[k]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[k];
        return next;
      });
    }
  };

  const validateStep = (s: Step): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      const e = validateToolUrl("drive", draft.driveFolderUrl);
      if (e) errs.driveFolderUrl = e;
    } else if (s === 2) {
      const e = validateToolUrl("journalTemplate", draft.journalTemplateUrl);
      if (e) errs.journalTemplateUrl = e;
    } else if (s === 3) {
      const e1 = validateToolUrl("form", draft.formUrl);
      if (e1) errs.formUrl = e1;
      const e2 = validateToolUrl("formCsv", draft.formResponsesCsvUrl);
      if (e2) errs.formResponsesCsvUrl = e2;
    } else if (s === 4) {
      const e = validateToolUrl("jibble", draft.jibbleInviteUrl);
      if (e) errs.jibbleInviteUrl = e;
    } else if (s === 5) {
      if (!draft.termStart) errs.termStart = "Pick a term start date.";
      if (!draft.termEnd) errs.termEnd = "Pick a term end date.";
      if (draft.termStart && draft.termEnd && draft.termEnd <= draft.termStart) {
        errs.termEnd = "Term end must be after term start.";
      }
      if (!draft.requiredHours || draft.requiredHours < 1) {
        errs.requiredHours = "Required hours must be at least 1.";
      }
    }
    return errs;
  };

  const handleNext = () => {
    const errs = validateStep(step);
    setErrors(errs);
    setAttemptedNext(true);
    if (Object.keys(errs).length === 0) {
      setStep((s) => Math.min(5, (s + 1) as Step));
      setAttemptedNext(false);
    }
  };

  const handleBack = () => {
    setErrors({});
    setAttemptedNext(false);
    setStep((s) => Math.max(1, (s - 1) as Step));
  };

  const handleSkip = () => {
    // Steps 1-4 are skippable (clear the field and advance).
    if (step === 1) set("driveFolderUrl", "");
    if (step === 2) set("journalTemplateUrl", "");
    if (step === 3) {
      set("formUrl", "");
      set("formResponsesCsvUrl", "");
    }
    if (step === 4) set("jibbleInviteUrl", "");
    setErrors({});
    setStep((s) => Math.min(5, (s + 1) as Step));
  };

  const handleSave = () => {
    const errs = validateStep(5);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setToolsConfig(draft);
    const connected = [
      draft.driveFolderUrl.trim(),
      draft.journalTemplateUrl.trim(),
      draft.formUrl.trim(),
      draft.jibbleInviteUrl.trim(),
    ].filter(Boolean).length;
    toast.success("Tools connected", {
      description: `${connected} of 4 external tools configured.`,
    });
    onOpenChange(false);
  };

  const cfg = STEP_CONFIG[step];
  const Icon = cfg.icon;

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wrench className="h-4 w-4" />
          </span>
          Connect practicum tools
        </span>
      }
      description="Link free tools your cohort already uses. Skip any you're not ready for."
      maxHeight={92}
      className="sm:max-w-xl"
    >
      <Stepper current={step} />

      {/* Step header */}
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", cfg.accent)}>
          <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{cfg.title}</p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{cfg.blurb}</p>
        </div>
      </div>

      {/* Step content */}
      <div className="pb-24">
        {step === 1 && (
          <FieldRow
            label="Google Drive folder URL"
            hint="Create a folder named e.g. 'Practicum 2025 / Journals', share it with the cohort, paste the link."
            error={errors.driveFolderUrl}
          >
            <Input
              value={draft.driveFolderUrl}
              onChange={(e) => set("driveFolderUrl", e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="h-11"
              inputMode="url"
              autoComplete="off"
            />
          </FieldRow>
        )}
        {step === 2 && (
          <FieldRow
            label="Journal template Doc URL"
            hint="A Google Doc with the required weekly structure (date, tasks, learnings, hours). Students copy it each week."
            error={errors.journalTemplateUrl}
          >
            <Input
              value={draft.journalTemplateUrl}
              onChange={(e) => set("journalTemplateUrl", e.target.value)}
              placeholder="https://docs.google.com/document/d/..."
              className="h-11"
              inputMode="url"
              autoComplete="off"
            />
          </FieldRow>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <FieldRow
              label="Evaluation Form URL"
              hint="A Google Form supervisors fill out. Set it to 'Collect email' so responses are attributable."
              error={errors.formUrl}
            >
              <Input
                value={draft.formUrl}
                onChange={(e) => set("formUrl", e.target.value)}
                placeholder="https://forms.gle/... or https://docs.google.com/forms/..."
                className="h-11"
                inputMode="url"
                autoComplete="off"
              />
            </FieldRow>
            <FieldRow
              label="Published responses CSV (optional)"
              hint="In the Form's linked Sheet: File → Share → Publish to web → CSV. Lets the portal read evaluation status."
              error={errors.formResponsesCsvUrl}
            >
              <Input
                value={draft.formResponsesCsvUrl}
                onChange={(e) => set("formResponsesCsvUrl", e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                className="h-11"
                inputMode="url"
                autoComplete="off"
              />
            </FieldRow>
          </div>
        )}
        {step === 4 && (
          <FieldRow
            label="Jibble project invite link"
            hint="Create a free Jibble project 'Practicum 2025', invite students, paste the invite link here."
            error={errors.jibbleInviteUrl}
          >
            <Input
              value={draft.jibbleInviteUrl}
              onChange={(e) => set("jibbleInviteUrl", e.target.value)}
              placeholder="https://www.jibble.io/..."
              className="h-11"
              inputMode="url"
              autoComplete="off"
            />
          </FieldRow>
        )}
        {step === 5 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldRow label="Term start" error={errors.termStart}>
                <Input
                  type="date"
                  value={draft.termStart}
                  onChange={(e) => set("termStart", e.target.value)}
                  className="h-11"
                />
              </FieldRow>
              <FieldRow label="Term end" error={errors.termEnd}>
                <Input
                  type="date"
                  value={draft.termEnd}
                  onChange={(e) => set("termEnd", e.target.value)}
                  className="h-11"
                />
              </FieldRow>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldRow
                label="Weekly journal due day"
                hint="Journals are due by end of this day each week."
              >
                <Select
                  value={draft.journalDueDay}
                  onValueChange={(v) => set("journalDueDay", v as JournalDueDay)}
                >
                  <SelectTrigger className="h-11 w-full" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DUE_DAYS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow
                label="Required practicum hours"
                hint="Cohort-wide target (e.g. 300 for a full term)."
                error={errors.requiredHours}
              >
                <Input
                  type="number"
                  min={1}
                  value={draft.requiredHours}
                  onChange={(e) => set("requiredHours", Number(e.target.value) || 0)}
                  className="h-11"
                />
              </FieldRow>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-snug text-muted-foreground">
                That's it. The portal uses these to auto-generate weekly journal
                cards and show progress on every dashboard. You can edit these
                anytime from the Tools button.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 mt-4 flex items-center gap-2 border-t border-border/60 bg-background/95 px-1 pb-1 pt-3 backdrop-blur">
        {step > 1 && (
          <Button variant="outline" onClick={handleBack} className="h-11" type="button">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
        {step < 5 ? (
          <>
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="h-11 text-muted-foreground"
              type="button"
            >
              Skip for now
            </Button>
            <Button onClick={handleNext} className="h-11 flex-1" type="button">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button onClick={handleSave} className="h-11 flex-1" type="button">
            <Check className="h-4 w-4" />
            Save & connect
          </Button>
        )}
      </div>
    </BottomSheet>
  );
}

// ============================================================
// Stepper (5 steps)
// ============================================================

function Stepper({ current }: { current: Step }) {
  const steps: Step[] = [1, 2, 3, 4, 5];
  return (
    <div className="mb-5" role="list" aria-label="Connect tools progress">
      <div className="flex items-center gap-1">
        {steps.map((s, i) => {
          const active = current === s;
          const complete = current > s;
          return (
            <div key={s} role="listitem" className="flex flex-1 items-center gap-1">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                  active && "bg-primary text-primary-foreground",
                  complete && "bg-primary/15 text-primary",
                  !active && !complete && "bg-muted text-muted-foreground",
                )}
              >
                {complete ? <Check className="h-3 w-3" strokeWidth={3} /> : s}
              </span>
              {i < steps.length - 1 && (
                <span
                  className={cn(
                    "h-px flex-1 transition-colors",
                    complete ? "bg-primary/30" : "bg-border",
                  )}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Step {current} of 5 · {STEP_LABELS[current]}
      </p>
    </div>
  );
}

// ============================================================
// Field row helper
// ============================================================

function FieldRow({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-medium text-foreground">{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive" role="alert">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
