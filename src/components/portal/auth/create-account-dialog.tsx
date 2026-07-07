"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { BottomSheet } from "@/components/portal/shared/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap,
  ClipboardCheck,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Mail,
  IdCard,
  Briefcase,
  Building2,
  User,
  Phone,
  Calendar,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Sparkles,
  Lock,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ROLE_LABELS,
  DEPARTMENTS,
  type Role,
  type Department,
} from "@/lib/types";
import { toast } from "sonner";
import {
  studentObjectSchema,
  supervisorObjectSchema,
  coordinatorObjectSchema,
  passwordStrength,
  checkEmailAvailability,
  graduationYearOptions,
  COMPANY_SIZES,
  COURSES,
  ROLE_BENEFITS,
  normalizePhone,
  normalizeStudentNumber,
  type PasswordStrength,
} from "@/lib/validation/auth";

// ============================================================
// Types
// ============================================================

type Step = 1 | 2 | 3 | 4;

interface FormState {
  role: Role | null;
  fullName: string;
  email: string;
  phone: string;
  // student
  studentNumber: string;
  course: string;
  position: string;
  graduationYear: string;
  // supervisor
  jobTitle: string;
  companyName: string;
  companySize: string;
  // coordinator
  universityDept: string;
  facultyId: string;
  // shared
  department: string;
  password: string;
  confirmPassword: string;
  termsAgreed: boolean;
}

const initialState: FormState = {
  role: null,
  fullName: "",
  email: "",
  phone: "",
  studentNumber: "",
  course: "",
  position: "",
  graduationYear: "",
  jobTitle: "",
  companyName: "",
  companySize: "",
  universityDept: "",
  facultyId: "",
  department: "",
  password: "",
  confirmPassword: "",
  termsAgreed: false,
};

type ErrorMap = Partial<Record<keyof FormState, string>>;

type EmailStatus = "idle" | "checking" | "available" | "taken" | "invalid";

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preselectRole?: Role;
}

const DRAFT_KEY = "pp:create-account:draft";
const DRAFT_TTL_MS = 30 * 60 * 1000; // 30 minutes

const STEP_LABELS: Record<Step, string> = {
  1: "Role",
  2: "Profile",
  3: "Security",
  4: "Review",
};

const ROLE_CARDS: {
  role: Role;
  icon: typeof GraduationCap;
  title: string;
  desc: string;
  accent: string;
  iconBg: string;
}[] = [
  {
    role: "student",
    icon: GraduationCap,
    title: "Student",
    desc: "Submit weekly journals and track practicum hours.",
    accent: "from-teal-400/20 to-teal-600/10",
    iconBg: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  },
  {
    role: "supervisor",
    icon: ClipboardCheck,
    title: "Company Supervisor",
    desc: "Evaluate interns and approve journals.",
    accent: "from-amber-400/20 to-amber-600/10",
    iconBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  {
    role: "coordinator",
    icon: ShieldCheck,
    title: "Practicum Coordinator",
    desc: "Manage the cohort, assign supervisors, export reports.",
    accent: "from-emerald-400/20 to-emerald-600/10",
    iconBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
];

// ============================================================
// Main component
// ============================================================

export function CreateAccountDialog({
  open,
  onOpenChange,
  preselectRole,
}: CreateAccountDialogProps) {
  const login = useAppStore((s) => s.login);

  const [step, setStep] = React.useState<Step>(1);
  const [state, setState] = React.useState<FormState>(initialState);
  const [errors, setErrors] = React.useState<ErrorMap>({});
  const [attemptedNext, setAttemptedNext] = React.useState(false);
  const [emailStatus, setEmailStatus] = React.useState<EmailStatus>("idle");
  const [showPass, setShowPass] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [focusField, setFocusField] = React.useState<keyof FormState | null>(null);

  // Reset / restore on open
  React.useEffect(() => {
    if (open) {
      const restored = restoreDraft();
      if (restored && !preselectRole) {
        setState(restored.state);
        setStep(restored.step);
        toast.info("Draft restored", {
          description: "Your previous progress was recovered.",
        });
      } else {
        const fresh = { ...initialState, role: preselectRole ?? null };
        setState(fresh);
        setStep(preselectRole ? 2 : 1);
        setErrors({});
        setAttemptedNext(false);
        setEmailStatus("idle");
        setShowPass(false);
        setShowConfirm(false);
        setSubmitting(false);
        setDone(false);
      }
    } else {
      // On close: if not done, save draft. If done, clear draft.
      if (!done) {
        saveDraft(state, step);
      } else {
        clearDraft();
      }
    }
    // Intentionally only re-runs on `open` change. `preselectRole`, `state`,
    // `step`, `done` are captured at open-time via closures above.
  }, [open]);

  // Autosave draft on state changes (debounced via microtask)
  React.useEffect(() => {
    if (open && !done) {
      saveDraft(state, step);
    }
  }, [state, step, open, done]);

  // Email availability check (debounced 600ms after email is valid format)
  React.useEffect(() => {
    if (step !== 2) return;
    const email = state.email.trim();
    if (!email) {
      setEmailStatus("idle");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus("invalid");
      return;
    }
    setEmailStatus("checking");
    let cancelled = false;
    const t = setTimeout(async () => {
      const available = await checkEmailAvailability(email);
      if (!cancelled) {
        setEmailStatus(available ? "available" : "taken");
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [state.email, step]);

  // Focus management on step change
  React.useEffect(() => {
    if (!open || done) return;
    if (focusField) {
      const el = document.querySelector<HTMLElement>(
        `[data-field="${focusField}"]`,
      );
      el?.focus();
      setFocusField(null);
    }
  }, [step, focusField, open, done]);

  // ---- Helpers ----
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setState((s) => ({ ...s, [k]: v }));
    // Clear field error on edit
    if (errors[k]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[k];
        return next;
      });
    }
  };

  const passwordStrengthInfo: PasswordStrength = React.useMemo(
    () => passwordStrength(state.password),
    [state.password],
  );

  const validateStep = (s: Step): ErrorMap => {
    const errs: ErrorMap = {};
    if (s === 1) {
      if (!state.role) errs.role = "Please select a role to continue.";
      return errs;
    }
    if (s === 2) {
      if (!state.role) return { role: "Please select a role first." };
      const schema =
        state.role === "student"
          ? studentObjectSchema.omit({ password: true, confirmPassword: true, termsAgreed: true })
          : state.role === "supervisor"
          ? supervisorObjectSchema.omit({ password: true, confirmPassword: true, termsAgreed: true })
          : coordinatorObjectSchema.omit({ password: true, confirmPassword: true, termsAgreed: true });
      const result = schema.safeParse(state);
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = issue.path[0] as keyof FormState;
          if (!errs[key]) errs[key] = issue.message;
        }
      }
      // Email availability is a separate concern (async) — block if taken/invalid/checking
      if (emailStatus === "taken") {
        errs.email = "An account with this email already exists.";
      } else if (emailStatus === "checking") {
        errs.email = "Checking email availability…";
      } else if (emailStatus === "invalid") {
        errs.email = "Please enter a valid email address.";
      }
      return errs;
    }
    if (s === 3) {
      if (!state.role) return { role: "Please select a role first." };
      const schema =
        state.role === "student"
          ? studentObjectSchema.pick({ password: true, confirmPassword: true, termsAgreed: true })
          : state.role === "supervisor"
          ? supervisorObjectSchema.pick({ password: true, confirmPassword: true, termsAgreed: true })
          : coordinatorObjectSchema.pick({ password: true, confirmPassword: true, termsAgreed: true });
      const result = schema.safeParse(state);
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = issue.path[0] as keyof FormState;
          if (!errs[key]) errs[key] = issue.message;
        }
      }
      return errs;
    }
    return {};
  };

  const handleNext = () => {
    const errs = validateStep(step);
    setErrors(errs);
    setAttemptedNext(true);
    if (Object.keys(errs).length === 0) {
      setStep((s) => Math.min(4, (s + 1) as Step));
    }
  };

  const handleBack = () => {
    setErrors({});
    setAttemptedNext(false);
    setStep((s) => Math.max(1, (s - 1) as Step));
  };

  const handleEditFromReview = (targetStep: Step, field: keyof FormState) => {
    setStep(targetStep);
    setFocusField(field);
  };

  const handleCreate = async () => {
    // Final validation across all steps
    const allErrs: ErrorMap = {
      ...validateStep(1),
      ...validateStep(2),
      ...validateStep(3),
    };
    setErrors(allErrs);
    if (Object.keys(allErrs).length > 0) {
      // Jump to the first invalid step
      if (allErrs.role || !state.role) {
        setStep(1);
      } else if (
        allErrs.fullName ||
        allErrs.email ||
        allErrs.studentNumber ||
        allErrs.course ||
        allErrs.position ||
        allErrs.graduationYear ||
        allErrs.jobTitle ||
        allErrs.companyName ||
        allErrs.universityDept ||
        allErrs.facultyId ||
        allErrs.department
      ) {
        setStep(2);
      } else {
        setStep(3);
      }
      return;
    }

    setSubmitting(true);
    // Simulate network call (1.2s)
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setDone(true);
  };

  const handleSuccessSignIn = () => {
    onOpenChange(false);
    // Focus returns to email field on login screen (handled by login screen's own effect)
  };

  const handleSuccessExplore = () => {
    if (!state.role) return;
    onOpenChange(false);
    toast.success("Exploring as demo", {
      description: `Signed in as ${ROLE_LABELS[state.role]} — ${state.fullName.split(" ")[0] || "new user"}.`,
    });
    setTimeout(() => login(state.role!), 50);
  };

  // ---- Render ----

  const stepDescription =
    step === 1
      ? "Select how you'll use the portal. You can't change this later."
      : step === 2
      ? `Tell us about you as a ${state.role ? ROLE_LABELS[state.role].toLowerCase() : "user"}.`
      : step === 3
      ? "Create a strong password and agree to the terms."
      : "Confirm your details and create your account.";

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="h-4 w-4" />
          </span>
          {done ? "Account created" : "Create account"}
        </span>
      }
      description={done ? "Your prototype account is ready." : stepDescription}
      maxHeight={92}
      className="sm:max-w-xl"
    >
      {done ? (
        <SuccessState
          role={state.role!}
          fullName={state.fullName}
          onSignIn={handleSuccessSignIn}
          onExplore={handleSuccessExplore}
        />
      ) : (
        <>
          {/* Stepper */}
          <Stepper current={step} />

          {/* Step content */}
          <div className="pb-24">
            {step === 1 && (
              <Step1Role
                state={state}
                set={set}
                error={errors.role}
                attempted={attemptedNext}
              />
            )}
            {step === 2 && (
              <Step2Profile
                state={state}
                set={set}
                errors={errors}
                attempted={attemptedNext}
                emailStatus={emailStatus}
              />
            )}
            {step === 3 && (
              <Step3Security
                state={state}
                set={set}
                errors={errors}
                attempted={attemptedNext}
                showPass={showPass}
                setShowPass={setShowPass}
                showConfirm={showConfirm}
                setShowConfirm={setShowConfirm}
                strength={passwordStrengthInfo}
              />
            )}
            {step === 4 && (
              <Step4Review
                state={state}
                onEdit={handleEditFromReview}
                submitting={submitting}
              />
            )}
          </div>

          {/* Sticky footer */}
          {!submitting && (
            <div className="sticky bottom-0 mt-4 flex items-center gap-2 border-t border-border/60 bg-background/95 px-1 pb-1 pt-3 backdrop-blur">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="h-11"
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              {step < 4 ? (
                <Button
                  onClick={handleNext}
                  className="h-11 flex-1"
                  type="button"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  className="h-11 flex-1"
                  type="button"
                  disabled={submitting}
                >
                  <Check className="h-4 w-4" />
                  Create account
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </BottomSheet>
  );
}

// ============================================================
// Stepper
// ============================================================

function Stepper({ current }: { current: Step }) {
  const steps: Step[] = [1, 2, 3, 4];
  return (
    <div className="mb-5" role="list" aria-label="Create account progress">
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => {
          const active = current === s;
          const complete = current > s;
          return (
            <div key={s} role="listitem" className="flex flex-1 items-center gap-1.5">
              <div className="flex items-center gap-1.5">
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
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:inline",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {STEP_LABELS[s]}
                </span>
              </div>
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
      <p className="mt-2 text-xs text-muted-foreground sm:hidden">
        Step {current} of 4 · {STEP_LABELS[current]}
      </p>
      <p className="mt-2 hidden text-xs text-muted-foreground sm:block">
        Step {current} of 4
      </p>
    </div>
  );
}

// ============================================================
// Step 1 — Role
// ============================================================

function Step1Role({
  state,
  set,
  error,
  attempted,
}: {
  state: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  error?: string;
  attempted: boolean;
}) {
  return (
    <div className="space-y-3">
      {ROLE_CARDS.map(({ role, icon: Icon, title, desc, iconBg, accent }) => {
        const selected = state.role === role;
        const benefits = ROLE_BENEFITS[role];
        return (
          <div key={role}>
            <button
              type="button"
              onClick={() => set("role", role)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card hover:bg-muted/30",
              )}
              aria-pressed={selected}
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
                  accent,
                )}
              >
                <Icon className={cn("h-5 w-5", iconBg)} strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {desc}
                </p>
              </div>
              {selected && (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              )}
            </button>
            {/* Expandable benefits */}
            {selected && (
              <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  What you'll get
                </p>
                <ul className="space-y-1.5">
                  {benefits.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2 text-xs leading-snug text-muted-foreground"
                    >
                      <Check
                        className="mt-0.5 h-3 w-3 shrink-0 text-primary"
                        strokeWidth={3}
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
      {attempted && error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================
// Step 2 — Profile
// ============================================================

function Step2Profile({
  state,
  set,
  errors,
  attempted,
  emailStatus,
}: {
  state: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: ErrorMap;
  attempted: boolean;
  emailStatus: EmailStatus;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Full name"
          icon={User}
          error={errors.fullName}
          required
          htmlFor="ca-fullName"
        >
          <Input
            id="ca-fullName"
            data-field="fullName"
            value={state.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="Juan Dela Cruz"
            className="h-11"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? "err-fullName" : undefined}
          />
        </Field>

        <Field
          label="Email"
          icon={Mail}
          error={errors.email}
          status={emailStatus}
          required
          htmlFor="ca-email"
        >
          <Input
            id="ca-email"
            data-field="email"
            type="email"
            value={state.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            className="h-11"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "err-email" : undefined}
          />
        </Field>
      </div>

      <Field
        label="Phone (optional)"
        icon={Phone}
        error={errors.phone}
        htmlFor="ca-phone"
        hint="e.g. 0917 123 4567 or +63 917 123 4567"
      >
        <Input
          id="ca-phone"
          data-field="phone"
          value={state.phone}
          onChange={(e) => set("phone", e.target.value)}
          onBlur={() => {
            const v = state.phone.trim();
            if (v) set("phone", normalizePhone(v));
          }}
          placeholder="0917 123 4567"
          className="h-11"
          autoComplete="tel"
          inputMode="tel"
          aria-invalid={!!errors.phone}
        />
      </Field>

      {/* Role-specific fields */}
      {state.role === "student" && (
        <StudentFields state={state} set={set} errors={errors} attempted={attempted} />
      )}
      {state.role === "supervisor" && (
        <SupervisorFields state={state} set={set} errors={errors} />
      )}
      {state.role === "coordinator" && (
        <CoordinatorFields state={state} set={set} errors={errors} />
      )}
    </div>
  );
}

function StudentFields({
  state,
  set,
  errors,
}: {
  state: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: ErrorMap;
  attempted: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Student number"
          icon={IdCard}
          error={errors.studentNumber}
          required
          htmlFor="ca-studentNumber"
          hint="e.g. 2025-00123 or 2023-0723-IC"
        >
          <Input
            id="ca-studentNumber"
            data-field="studentNumber"
            value={state.studentNumber}
            onChange={(e) => set("studentNumber", e.target.value)}
            onBlur={() => {
              const v = state.studentNumber.trim();
              if (v) set("studentNumber", normalizeStudentNumber(v));
            }}
            placeholder="2025-00123"
            className="h-11"
            autoComplete="off"
            aria-invalid={!!errors.studentNumber}
          />
        </Field>
        <Field
          label="Course"
          icon={GraduationCap}
          error={errors.course}
          required
          htmlFor="ca-course"
        >
          <Select
            value={state.course}
            onValueChange={(v) => set("course", v)}
          >
            <SelectTrigger
              id="ca-course"
              data-field="course"
              className="h-11 w-full"
              size="sm"
              aria-invalid={!!errors.course}
            >
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {COURSES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Internship position"
          icon={Briefcase}
          error={errors.position}
          required
          htmlFor="ca-position"
        >
          <Input
            id="ca-position"
            data-field="position"
            value={state.position}
            onChange={(e) => set("position", e.target.value)}
            placeholder="Frontend Developer Intern"
            className="h-11"
            aria-invalid={!!errors.position}
          />
        </Field>
        <Field
          label="Department"
          icon={Building2}
          error={errors.department}
          required
          htmlFor="ca-department"
        >
          <Select
            value={state.department}
            onValueChange={(v) => set("department", v as Department)}
          >
            <SelectTrigger
              id="ca-department"
              data-field="department"
              className="h-11 w-full"
              size="sm"
              aria-invalid={!!errors.department}
            >
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        label="Expected graduation year"
        icon={Calendar}
        error={errors.graduationYear}
        required
        htmlFor="ca-graduationYear"
      >
        <Select
          value={state.graduationYear}
          onValueChange={(v) => set("graduationYear", v)}
        >
          <SelectTrigger
            id="ca-graduationYear"
            data-field="graduationYear"
            className="h-11 w-full sm:max-w-[280px]"
            size="sm"
            aria-invalid={!!errors.graduationYear}
          >
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {graduationYearOptions().map((y) => (
              <SelectItem key={y.value} value={y.value}>
                {y.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}

function SupervisorFields({
  state,
  set,
  errors,
}: {
  state: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: ErrorMap;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Job title"
          icon={Briefcase}
          error={errors.jobTitle}
          required
          htmlFor="ca-jobTitle"
        >
          <Input
            id="ca-jobTitle"
            data-field="jobTitle"
            value={state.jobTitle}
            onChange={(e) => set("jobTitle", e.target.value)}
            placeholder="Senior Frontend Engineer"
            className="h-11"
            aria-invalid={!!errors.jobTitle}
          />
        </Field>
        <Field
          label="Company"
          icon={Building2}
          error={errors.companyName}
          required
          htmlFor="ca-companyName"
        >
          <Input
            id="ca-companyName"
            data-field="companyName"
            value={state.companyName}
            onChange={(e) => set("companyName", e.target.value)}
            placeholder="Acme Corp"
            className="h-11"
            aria-invalid={!!errors.companyName}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="Department"
          icon={Building2}
          error={errors.department}
          required
          htmlFor="ca-department"
        >
          <Select
            value={state.department}
            onValueChange={(v) => set("department", v as Department)}
          >
            <SelectTrigger
              id="ca-department"
              data-field="department"
              className="h-11 w-full"
              size="sm"
              aria-invalid={!!errors.department}
            >
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Company size (optional)"
          icon={Building2}
          htmlFor="ca-companySize"
        >
          <Select
            value={state.companySize}
            onValueChange={(v) => set("companySize", v)}
          >
            <SelectTrigger
              id="ca-companySize"
              data-field="companySize"
              className="h-11 w-full"
              size="sm"
            >
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </>
  );
}

function CoordinatorFields({
  state,
  set,
  errors,
}: {
  state: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: ErrorMap;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field
          label="University department"
          icon={Building2}
          error={errors.universityDept}
          required
          htmlFor="ca-universityDept"
        >
          <Input
            id="ca-universityDept"
            data-field="universityDept"
            value={state.universityDept}
            onChange={(e) => set("universityDept", e.target.value)}
            placeholder="College of Computer Studies"
            className="h-11"
            aria-invalid={!!errors.universityDept}
          />
        </Field>
        <Field
          label="Faculty ID"
          icon={IdCard}
          error={errors.facultyId}
          required
          htmlFor="ca-facultyId"
          hint="Format: F-NNNNN (e.g. F-00123)"
        >
          <Input
            id="ca-facultyId"
            data-field="facultyId"
            value={state.facultyId}
            onChange={(e) => set("facultyId", e.target.value)}
            onBlur={() => {
              const v = state.facultyId.trim();
              if (v) set("facultyId", v.toUpperCase());
            }}
            placeholder="F-00123"
            className="h-11"
            autoComplete="off"
            aria-invalid={!!errors.facultyId}
          />
        </Field>
      </div>

      {/* Access level info card */}
      <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">Admin access</p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              Coordinators can manage the entire cohort, assign supervisors, and
              export program-wide reports. This access level is verified by your
              university before activation.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Step 3 — Security
// ============================================================

function Step3Security({
  state,
  set,
  errors,
  attempted,
  showPass,
  setShowPass,
  showConfirm,
  setShowConfirm,
  strength,
}: {
  state: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: ErrorMap;
  attempted: boolean;
  showPass: boolean;
  setShowPass: (v: boolean) => void;
  showConfirm: boolean;
  setShowConfirm: (v: boolean) => void;
  strength: PasswordStrength;
}) {
  return (
    <div className="space-y-4">
      {/* Password */}
      <Field
        label="Password"
        icon={Lock}
        error={errors.password}
        required
        htmlFor="ca-password"
      >
        <div className="relative">
          <Input
            id="ca-password"
            data-field="password"
            type={showPass ? "text" : "password"}
            value={state.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="Create a strong password"
            className="h-11 pr-11"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "err-password" : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      {/* Strength meter */}
      {state.password.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-1.5 flex-1 gap-1">
              {[1, 2, 3, 4].map((seg) => (
                <span
                  key={seg}
                  className={cn(
                    "h-full flex-1 rounded-full transition-colors",
                    seg <= strength.score ? strength.barColor : "bg-muted",
                  )}
                  aria-hidden
                />
              ))}
            </div>
            <span className={cn("text-xs font-medium tabular-nums", strength.color)}>
              {strength.label}
            </span>
          </div>

          {/* Requirement checklist */}
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" aria-label="Password requirements">
            <RequirementItem ok={strength.checks.length} label="8+ characters" />
            <RequirementItem ok={strength.checks.uppercase} label="Uppercase letter" />
            <RequirementItem ok={strength.checks.lowercase} label="Lowercase letter" />
            <RequirementItem ok={strength.checks.number} label="Number" />
            <RequirementItem ok={strength.checks.symbol} label="Symbol (!@#$…)" />
          </ul>
        </div>
      )}

      {/* Confirm password */}
      <Field
        label="Confirm password"
        icon={Lock}
        error={errors.confirmPassword}
        required
        htmlFor="ca-confirmPassword"
      >
        <div className="relative">
          <Input
            id="ca-confirmPassword"
            data-field="confirmPassword"
            type={showConfirm ? "text" : "password"}
            value={state.confirmPassword}
            onChange={(e) => set("confirmPassword", e.target.value)}
            placeholder="Re-enter your password"
            className="h-11 pr-11"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? "err-confirmPassword" : undefined}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>

      {/* Security copy */}
      <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-snug text-muted-foreground">
          We hash passwords with bcrypt. We never store plain text or share your
          data with third parties.
        </p>
      </div>

      {/* Terms consent */}
      <div className="space-y-2">
        <label
          htmlFor="ca-terms"
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/30"
        >
          <Checkbox
            id="ca-terms"
            data-field="termsAgreed"
            checked={state.termsAgreed}
            onCheckedChange={(v) => set("termsAgreed", v === true)}
            className="mt-0.5"
            aria-invalid={!!errors.termsAgreed}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-snug text-foreground">
              I agree to the{" "}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Privacy Policy
              </a>
              .
            </p>
            {errors.termsAgreed && (
              <p
                id="err-termsAgreed"
                className="mt-1 flex items-center gap-1 text-xs text-destructive"
                role="alert"
              >
                <AlertCircle className="h-3 w-3" />
                {errors.termsAgreed}
              </p>
            )}
          </div>
        </label>
      </div>
    </div>
  );
}

function RequirementItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors",
          ok ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground",
        )}
      >
        {ok ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <span className="h-1 w-1 rounded-full bg-current" />}
      </span>
      <span className={cn(ok ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </li>
  );
}

// ============================================================
// Step 4 — Review & Create
// ============================================================

function Step4Review({
  state,
  onEdit,
  submitting,
}: {
  state: FormState;
  onEdit: (step: Step, field: keyof FormState) => void;
  submitting: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Role section */}
      <ReviewSection title="Role" onEdit={() => onEdit(1, "role")}>
        <ReviewRow label="Account type" value={state.role ? ROLE_LABELS[state.role] : "—"} />
      </ReviewSection>

      {/* Profile section */}
      <ReviewSection title="Profile" onEdit={() => onEdit(2, "fullName")}>
        <ReviewRow label="Full name" value={state.fullName} />
        <ReviewRow label="Email" value={state.email} />
        {state.phone && <ReviewRow label="Phone" value={state.phone} />}
        {state.role === "student" && (
          <>
            <ReviewRow label="Student number" value={state.studentNumber} />
            <ReviewRow
              label="Course"
              value={COURSES.find((c) => c.value === state.course)?.label ?? state.course}
            />
            <ReviewRow label="Position" value={state.position} />
            <ReviewRow label="Department" value={state.department} />
            <ReviewRow label="Graduation year" value={state.graduationYear} />
          </>
        )}
        {state.role === "supervisor" && (
          <>
            <ReviewRow label="Job title" value={state.jobTitle} />
            <ReviewRow label="Company" value={state.companyName} />
            <ReviewRow label="Department" value={state.department} />
            {state.companySize && (
              <ReviewRow
                label="Company size"
                value={COMPANY_SIZES.find((c) => c.value === state.companySize)?.label ?? state.companySize}
              />
            )}
          </>
        )}
        {state.role === "coordinator" && (
          <>
            <ReviewRow label="University dept" value={state.universityDept} />
            <ReviewRow label="Faculty ID" value={state.facultyId} />
          </>
        )}
      </ReviewSection>

      {/* Security section */}
      <ReviewSection title="Security" onEdit={() => onEdit(3, "password")}>
        <ReviewRow label="Password" value="••••••••" />
        <ReviewRow
          label="Terms & Privacy"
          value={state.termsAgreed ? "Agreed" : "Not agreed"}
        />
      </ReviewSection>

      <p className="text-xs leading-relaxed text-muted-foreground">
        This is a{" "}
        <span className="font-semibold text-foreground">prototype</span> — no real
        account is created. On confirm, you'll see a success screen with next
        steps.
      </p>

      {submitting && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium text-foreground">Creating your account…</span>
        </div>
      )}

      {/* Note: the primary "Create account" CTA lives in the sticky footer
          of the parent dialog (next to Back). No duplicate button here. */}
    </div>
  );
}

// ============================================================
// Success state
// ============================================================

function SuccessState({
  role,
  fullName,
  onSignIn,
  onExplore,
}: {
  role: Role;
  fullName: string;
  onSignIn: () => void;
  onExplore: () => void;
}) {
  const firstName = fullName.trim().split(/\s+/)[0] || "there";
  const nextSteps: Record<Role, string[]> = {
    student: [
      "Sign in to submit your first weekly journal.",
      "Track your practicum hours daily with the clock.",
      "Your supervisor will be assigned by the coordinator.",
    ],
    supervisor: [
      "Sign in to see your assigned interns.",
      "Evaluate weekly journals in under 3 minutes.",
      "Export signed evaluation PDFs instantly.",
    ],
    coordinator: [
      "Sign in to manage your cohort dashboard.",
      "Assign supervisors to interns in seconds.",
      "Export program-wide reports for accreditation.",
    ],
  };

  return (
    <div className="flex flex-col items-center py-4 text-center">
      {/* Animated check */}
      <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" style={{ animationDuration: "2s" }} />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" strokeWidth={2.2} />
        </span>
      </div>

      <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
        Account created
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Welcome, {firstName}. Your{" "}
        <span className="font-medium text-foreground">
          {ROLE_LABELS[role].toLowerCase()}
        </span>{" "}
        account is ready.
      </p>

      {/* What happens next */}
      <div className="mt-5 w-full rounded-2xl border border-border bg-card p-4 text-left">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          What happens next
        </p>
        <ol className="space-y-2.5">
          {nextSteps[role].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {i + 1}
              </span>
              <span className="pt-0.5 leading-snug text-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* CTAs */}
      <div className="mt-5 flex w-full flex-col gap-2">
        <Button onClick={onSignIn} className="h-11 w-full" type="button">
          Sign in now
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          onClick={onExplore}
          variant="outline"
          className="h-11 w-full"
          type="button"
        >
          <Sparkles className="h-4 w-4" />
          Explore as {ROLE_LABELS[role]} demo
        </Button>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        This was a prototype — no real account was created. In production, you'd
        receive a verification email at{" "}
        <span className="font-medium text-foreground">your address</span> to
        activate the account.
      </p>
    </div>
  );
}

// ============================================================
// Shared field components
// ============================================================

function Field({
  label,
  icon: Icon,
  error,
  status,
  hint,
  required,
  htmlFor,
  children,
}: {
  label: string;
  icon?: typeof User;
  error?: string;
  status?: EmailStatus;
  hint?: string;
  required?: boolean;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-[13px] font-medium text-foreground"
      >
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p
          id={`err-${htmlFor.replace("ca-", "")}`}
          className="flex items-center gap-1 text-xs text-destructive"
          role="alert"
        >
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
      {/* Email availability status line */}
      {status && status !== "idle" && !error && (
        <div className="flex items-center gap-1.5 text-xs">
          {status === "checking" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Checking availability…</span>
            </>
          )}
          {status === "available" && (
            <>
              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400">Email available</span>
            </>
          )}
          {status === "taken" && (
            <>
              <X className="h-3 w-3 text-destructive" />
              <span className="text-destructive">Already registered</span>
            </>
          )}
          {status === "invalid" && (
            <>
              <AlertCircle className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Enter a valid email to check</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </div>
      <dl className="space-y-2.5 text-sm">{children}</dl>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 text-right text-sm font-medium text-foreground">
        <span className="block truncate">{value || "—"}</span>
      </dd>
    </div>
  );
}

// ============================================================
// Draft persistence
// ============================================================

function saveDraft(state: FormState, step: Step) {
  // Only save if the user has entered meaningful data (not just the empty initial state).
  if (!isDraftWorthSaving(state)) return;
  try {
    const payload = { state, step, ts: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // localStorage might be unavailable (private mode) — fail silently.
  }
}

function isDraftWorthSaving(state: FormState): boolean {
  return (
    state.role !== null ||
    state.fullName.trim() !== "" ||
    state.email.trim() !== "" ||
    state.password !== "" ||
    state.termsAgreed
  );
}

function restoreDraft(): { state: FormState; step: Step } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state: FormState; step: Step; ts: number };
    if (Date.now() - parsed.ts > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    // Only restore if the draft has meaningful data.
    if (!isDraftWorthSaving(parsed.state)) return null;
    return { state: parsed.state, step: parsed.step };
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
