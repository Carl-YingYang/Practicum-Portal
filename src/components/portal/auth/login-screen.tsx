"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { mockUsers } from "@/lib/mock-data";
import { COORDINATOR_DEPARTMENTS, ROLE_LABELS, type Role } from "@/lib/types";
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
import { Avatar } from "@/components/portal/shared/avatar";
import { CredentialsDialog } from "@/components/portal/shared/credentials-dialog";
import {
  GraduationCap,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Check,
  AlertCircle,
  UserPlus,
  Sun,
  Moon,
  User,
  Briefcase,
  ClipboardList,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================
// Login-page default theme — Azure Blue (default palette).
// Re-asserted as inline CSS vars so the login ignores any
// coordinator-configured school theme on :root.
// ============================================================
const LOGIN_DEFAULT_THEME_VARS = {
  "--primary": "#266ca9",
  "--ring": "#266ca9",
  "--info": "#266ca9",
  "--sidebar": "#266ca9",
  "--sidebar-primary": "#ade1fb",
  "--sidebar-primary-foreground": "#0f2573",
  "--sidebar-ring": "#ade1fb",
  "--topbar": "#266ca9",
  "--accent": "#ade1fb",
  "--accent-foreground": "#266ca9",
  "--blue-lightest": "#ade1fb",
  "--blue": "#266ca9",
  "--blue-deep": "#0f2573",
  "--blue-darker": "#041d56",
  "--chart-1": "#266ca9",
  "--chart-2": "#ade1fb",
  "--chart-3": "#0f2573",
  "--navy": "#266ca9",
  "--navy-deep": "#0f2573",
  "--navy-darker": "#041d56",
  "--navy-light": "#ade1fb",
  "--gold": "#ade1fb",
  "--gold-light": "#ade1fb",
} as React.CSSProperties;

// ============================================================
// Enterprise brand gradient — deep professional blue.
// #123B7A → #1E5AA8 (per enterprise SaaS spec).
// ============================================================
const HERO_GRADIENT =
  "linear-gradient(135deg, #123B7A 0%, #1E5AA8 100%)";

// Solid enterprise button colors (no gradient).
const BTN_PRIMARY = "#2563EB";
const BTN_PRIMARY_HOVER = "#1D4ED8";

// ============================================================
// Role metadata for the left hero panel's "Built for every
// role" section — flat, minimal, professional cards.
// ============================================================
const ROLE_SHOWCASE: {
  role: Role;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  blurb: string;
}[] = [
  {
    role: "student",
    icon: User,
    label: "Student",
    blurb: "Track hours, journals & evaluations",
  },
  {
    role: "supervisor",
    icon: Briefcase,
    label: "Company Supervisor",
    blurb: "Approve logs & assess interns",
  },
  {
    role: "coordinator",
    icon: ClipboardList,
    label: "Practicum Coordinator",
    blurb: "Oversee cohorts & exports",
  },
];

// ============================================================
// Light / dark theme toggle — minimal circular button pinned
// to the top-right corner of the auth panel.
// ============================================================
function LoginThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle light or dark mode"
      className="absolute right-6 top-6 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors duration-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
    >
      {mounted && theme === "dark" ? (
        <Sun className="h-[18px] w-[18px]" strokeWidth={2} />
      ) : (
        <Moon className="h-[18px] w-[18px]" strokeWidth={2} />
      )}
    </button>
  );
}

// ============================================================
// LEFT HERO PANEL (42% desktop / 40% tablet / full on mobile)
//
// Enterprise treatment:
//   • Base: deep blue gradient (#123B7A → #1E5AA8).
//   • Extremely subtle dotted grid texture.
//   • No illustrations, no photos, no 3D graphics.
//   • Flat minimal role cards with subtle borders.
//   • Footer pinned to the bottom.
// ============================================================
function HeroPanel() {
  return (
    <aside
      className="relative flex w-full flex-col overflow-hidden md:w-2/5 lg:w-[42%]"
      style={{ background: HERO_GRADIENT }}
      aria-label="Practicum Management brand showcase"
    >
      {/* Extremely subtle dotted grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgb(255 255 255 / 0.9) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Content — fills the panel, footer pinned to bottom */}
      <div className="relative z-10 flex h-full min-h-[480px] flex-1 flex-col justify-between px-8 py-10 text-white md:min-h-screen md:px-10 md:py-12 lg:px-12 lg:py-14">
        {/* Top — brand mark */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
            <GraduationCap className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold leading-tight tracking-tight">
              Practicum Management
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
              Practo Portal
            </p>
          </div>
        </div>

        {/* Middle — headline + description + role cards */}
        <div className="py-10 md:py-12">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
            Practicum, reimagined
          </p>
          <h2 className="text-[2.25rem] font-bold leading-[1.08] tracking-tight md:text-[2.5rem] lg:text-[2.75rem]">
            Practicum management,
            <br />
            simplified.
          </h2>
          <p className="mt-5 max-w-md text-[14px] font-medium leading-relaxed text-white/75 md:text-[14.5px]">
            One focused workspace for students, supervisors, and coordinators —
            track hours, approve journals, evaluate interns, and export
            accreditation-ready reports.
          </p>

          {/* Built for every role — flat minimal cards */}
          <div className="mt-10">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Built for every role
            </p>
            <div className="space-y-2.5">
              {ROLE_SHOWCASE.map(({ role, icon: Icon, label, blurb }) => (
                <div
                  key={role}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 transition-colors duration-200 hover:bg-white/[0.08]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/8 ring-1 ring-white/10">
                    <Icon className="h-4 w-4 text-white/90" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold leading-tight text-white">
                      {label}
                    </p>
                    <p className="mt-0.5 truncate text-[11.5px] text-white/55">
                      {blurb}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer — pinned to the bottom */}
        <div className="flex items-center justify-between border-t border-white/10 pt-5">
          <p className="text-[11px] font-medium text-white/45">
            © {new Date().getFullYear()} Practo Portal
          </p>
          <p className="text-[11px] font-medium text-white/45">
            Enterprise Edition
          </p>
        </div>
      </div>
    </aside>
  );
}

// ============================================================
// Coordinator self-registration form (unchanged logic, restyled
// to match the flat enterprise right-panel aesthetic).
// ============================================================
function CoordinatorRegisterForm({
  onBackToSignIn,
}: {
  onBackToSignIn: () => void;
}) {
  const createCoordinator = useAppStore((s) => s.createCoordinator);
  const coordinators = useAppStore((s) => s.coordinators);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [department, setDepartment] = React.useState<string>("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [credsOpen, setCredsOpen] = React.useState(false);
  const [createdCreds, setCreatedCreds] = React.useState<{
    name: string;
    email: string;
    tempPassword: string;
  } | null>(null);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email.";
    else {
      const emailLower = email.trim().toLowerCase();
      const dup =
        coordinators.some((c) => c.email.trim().toLowerCase() === emailLower);
      if (dup) next.email = "A coordinator with this email already exists.";
    }
    if (!title.trim()) next.title = "Title is required.";
    if (!department) next.department = "Department is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    // Final duplicate-safety net right before create.
    const emailLower = email.trim().toLowerCase();
    const dup =
      coordinators.some((c) => c.email.trim().toLowerCase() === emailLower);
    if (dup) {
      toast.error("Duplicate email", {
        description: "A coordinator with this email already exists.",
      });
      setErrors((prev) => ({
        ...prev,
        email: "A coordinator with this email already exists.",
      }));
      return;
    }
    const result = createCoordinator({
      name: name.trim(),
      email: email.trim(),
      title: title.trim(),
      department,
    });
    setCreatedCreds({
      name: name.trim(),
      email: email.trim(),
      tempPassword: result.tempPassword,
    });
    setCredsOpen(true);
  };

  return (
    <div className="w-full">
      <button
        onClick={onBackToSignIn}
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition-colors duration-200 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </button>

      <div className="mb-8">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ backgroundColor: BTN_PRIMARY }}>
          <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <h2 className="text-[1.875rem] font-bold leading-[1.12] tracking-tight text-slate-900 dark:text-slate-50">
          Create coordinator account
        </h2>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          University staff who run the practicum program can register here.
          Students and supervisors are added by a coordinator after sign-in.
        </p>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: BTN_PRIMARY }}>
          <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
            Coordinator accounts have full access
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            Coordinators can manage students, supervisors, and other
            coordinators, export reports, and configure practicum forms.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="reg-name" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="reg-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((p) => ({ ...p, name: "" }));
            }}
            placeholder="Prof. Patricia Lim"
            className="h-[50px] rounded-[10px] border-[#E5E7EB] bg-white text-[15px] transition-colors duration-200 focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/15 dark:border-slate-700 dark:bg-slate-800"
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="flex items-center gap-1 text-[12px] text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-email" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((p) => ({ ...p, email: "" }));
            }}
            placeholder="patricia.lim@university.edu"
            className="h-[50px] rounded-[10px] border-[#E5E7EB] bg-white text-[15px] transition-colors duration-200 focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/15 dark:border-slate-700 dark:bg-slate-800"
            autoComplete="email"
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="flex items-center gap-1 text-[12px] text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-title" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="reg-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setErrors((p) => ({ ...p, title: "" }));
            }}
            placeholder="Practicum Coordinator"
            className="h-[50px] rounded-[10px] border-[#E5E7EB] bg-white text-[15px] transition-colors duration-200 focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/15 dark:border-slate-700 dark:bg-slate-800"
            aria-invalid={!!errors.title}
          />
          {errors.title && (
            <p className="flex items-center gap-1 text-[12px] text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.title}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
            Academic Department <span className="text-destructive">*</span>
          </Label>
          <Select
            value={department}
            onValueChange={(v) => {
              setDepartment(v);
              setErrors((p) => ({ ...p, department: "" }));
            }}
          >
            <SelectTrigger className="h-[50px] w-full rounded-[10px] border-[#E5E7EB] bg-white transition-colors duration-200 focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/15 dark:border-slate-700 dark:bg-slate-800" aria-invalid={!!errors.department}>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {COORDINATOR_DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.department && (
            <p className="flex items-center gap-1 text-[12px] text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.department}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-[50px] w-full rounded-[10px] text-[15px] font-semibold text-white shadow-sm transition-colors duration-200 hover:text-white"
          style={{ backgroundColor: BTN_PRIMARY }}
        >
          <UserPlus className="h-4 w-4" />
          Create Coordinator Account
        </Button>
      </form>

      <div className="mt-7 text-center">
        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <button
            onClick={onBackToSignIn}
            className="font-semibold text-[#2563EB] underline-offset-2 transition-colors duration-200 hover:text-[#1D4ED8] hover:underline dark:text-blue-400"
          >
            Sign in
          </button>
        </p>
      </div>

      {createdCreds && (
        <CredentialsDialog
          open={credsOpen}
          onOpenChange={setCredsOpen}
          name={createdCreds.name}
          email={createdCreds.email}
          tempPassword={createdCreds.tempPassword}
          onDone={() => {
            toast.success("Coordinator account created", {
              description: `${createdCreds.name} can now sign in.`,
            });
            setName("");
            setEmail("");
            setTitle("");
            setDepartment("");
            setCreatedCreds(null);
            onBackToSignIn();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Right auth panel — shared shell used by both sign-in and
// register modes. Pure white background, vertically centered
// form (max-width 460px), theme toggle pinned top-right.
// ============================================================
function AuthPanel({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex w-full flex-1 items-center justify-center bg-white px-6 py-12 dark:bg-slate-950 md:w-3/5 md:px-10 lg:w-[58%] lg:px-14">
      <LoginThemeToggle />
      <div className="w-full max-w-[460px]">{children}</div>
    </main>
  );
}

// ============================================================
// Main login screen — fullscreen enterprise split layout.
//
// Layout:
//   • Page root — 100vw × 100vh, NO outer container, NO browser
//     mockup, NO floating card. The page IS the layout.
//   • LEFT (42% desktop / 40% tablet / full mobile) — HeroPanel:
//     deep blue gradient #123B7A → #1E5AA8 + subtle dotted grid
//     + flat minimal role cards + footer pinned to bottom.
//   • RIGHT (58% desktop / 60% tablet / full mobile) — AuthPanel:
//     pure white, vertically centered form (max-w 460px),
//     flat enterprise inputs (50px, 10px radius, #E5E7EB border),
//     solid blue Sign-in button (no gradient, 50px, 10px radius),
//     selectable demo cards with arrow icons.
//   • Mobile/tablet — stacked: hero on top, form below.
//
// ALL functional logic preserved exactly:
//   • loginByCredentials(email, password) with ok/no-user/
//     inactive/wrong-password states.
//   • quickFill(role) demo autofill.
//   • Coordinator register mode with validation + CredentialsDialog.
//   • Email=username, Password=User ID helper text.
//   • Forgot password link, coordinator register link.
// ============================================================
export function LoginScreen() {
  const loginByCredentials = useAppStore((s) => s.loginByCredentials);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);
  const [error, setError] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
  const [mode, setMode] = React.useState<"signin" | "register">("signin");
  const emailRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (mode === "signin") {
      emailRef.current?.focus();
    }
  }, [mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password (your User ID).");
      return;
    }
    // Validate email (username) + idNumber (password).
    const result = loginByCredentials(email, password);
    if (result === "ok") {
      toast.success("Welcome back");
      return;
    }
    if (result === "no-user") {
      setError("No account found with that email. Please check and try again.");
      return;
    }
    if (result === "inactive") {
      setError("This account has been deactivated. Contact your coordinator.");
      return;
    }
    // bad-pw
    setError("Incorrect password. Your password is your User ID (e.g. student number or EMP ID).");
  };

  const quickFill = (role: Role) => {
    const u = mockUsers.find((m) => m.role === role)!;
    setEmail(u.email);
    // Pre-fill the password with the user's idNumber (their login ID).
    setPassword(u.idNumber ?? "demo-password");
    setError("");
    setSelectedRole(role);
  };

  // ---- Coordinator self-registration mode ----
  if (mode === "register") {
    return (
      <div
        className="flex min-h-screen w-full flex-col md:flex-row"
        style={LOGIN_DEFAULT_THEME_VARS}
      >
        <HeroPanel />
        <AuthPanel>
          <CoordinatorRegisterForm onBackToSignIn={() => setMode("signin")} />
        </AuthPanel>
      </div>
    );
  }

  // ---- Default sign-in mode ----
  return (
    <div
      className="flex min-h-screen w-full flex-col md:flex-row"
      style={LOGIN_DEFAULT_THEME_VARS}
    >
      <HeroPanel />

      <AuthPanel>
        {/* Brand + headline */}
        <div className="mb-8">
          <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg text-white md:hidden" style={{ backgroundColor: BTN_PRIMARY }}>
            <GraduationCap className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-slate-50 md:text-[2.25rem]">
            Sign in
          </h1>
          <p className="mt-2.5 text-[14.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            Use your{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">email</span>{" "}
            as username and your{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">User ID</span>{" "}
            as password.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
              Email
            </Label>
            <Input
              id="email"
              ref={emailRef}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className="h-[50px] rounded-[10px] border-[#E5E7EB] bg-white text-[15px] transition-colors duration-200 focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/15 dark:border-slate-700 dark:bg-slate-800"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                Password
              </Label>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-[13px] font-semibold text-[#2563EB] transition-colors duration-200 hover:text-[#1D4ED8] dark:text-blue-400"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                placeholder="e.g. 2021-00123, EMP-001, COORD-001"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[50px] rounded-[10px] border-[#E5E7EB] bg-white pr-12 text-[15px] transition-colors duration-200 focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/15 dark:border-slate-700 dark:bg-slate-800"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? (
                  <EyeOff className="h-[18px] w-[18px]" />
                ) : (
                  <Eye className="h-[18px] w-[18px]" />
                )}
              </button>
            </div>
            <p className="text-[12px] text-slate-400 dark:text-slate-500">
              Students: student number · Supervisors: EMP ID · Coordinators: COORD ID
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-[10px] border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-[13px] text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="h-[50px] w-full rounded-[10px] text-[15px] font-semibold text-white shadow-sm transition-colors duration-200 hover:text-white"
            style={{ backgroundColor: BTN_PRIMARY }}
          >
            Sign in
            <ArrowRight className="h-[18px] w-[18px]" />
          </Button>
        </form>

        {/* Demo accounts divider */}
        <div className="my-8">
          <div className="relative flex items-center">
            <span className="flex-1 border-t border-slate-200 dark:border-slate-700" />
            <span className="px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
              Demo — explore as
            </span>
            <span className="flex-1 border-t border-slate-200 dark:border-slate-700" />
          </div>
        </div>

        {/* Demo account cards — clean selectable cards */}
        <div className="space-y-3">
          {mockUsers.map((u) => {
            const isSelected = selectedRole === u.role;
            return (
              <button
                key={u.id}
                onClick={() => quickFill(u.role)}
                className={cn(
                  "group flex w-full items-center gap-3.5 rounded-xl border bg-white p-3.5 text-left transition-colors duration-200 dark:bg-slate-900",
                  isSelected
                    ? "border-[#2563EB] bg-[#2563EB]/[0.03] dark:bg-[#2563EB]/[0.08]"
                    : "border-[#E5E7EB] hover:border-[#93C5FD] dark:border-slate-700 dark:hover:border-slate-600"
                )}
              >
                <Avatar name={u.name} size="md" color={u.avatarColor} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                    {u.name}
                  </p>
                  <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                    {ROLE_LABELS[u.role]}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    ID: <span className="font-mono text-slate-500 dark:text-slate-400">{u.idNumber ?? "—"}</span>
                  </p>
                </div>
                {isSelected ? (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: BTN_PRIMARY }}>
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors duration-200 group-hover:bg-[#2563EB]/10 group-hover:text-[#2563EB] dark:bg-slate-800 dark:group-hover:bg-blue-900/30">
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Coordinator register link */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-center text-[13px]">
          <span className="text-slate-500 dark:text-slate-400">
            University staff?
          </span>
          <button
            onClick={() => setMode("register")}
            className="inline-flex items-center gap-1 font-semibold text-[#2563EB] underline-offset-2 transition-colors duration-200 hover:text-[#1D4ED8] hover:underline dark:text-blue-400"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Create a coordinator account
          </button>
        </div>

        <p className="mt-8 text-center text-[12px] text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} Practo Portal · Practicum, reimagined.
        </p>
      </AuthPanel>
    </div>
  );
}
