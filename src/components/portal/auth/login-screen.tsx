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
  ClipboardCheck,
  FileText,
  Check,
  AlertCircle,
  UserPlus,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================
// Role carousel data — cycles on the left brand panel
// ============================================================
const roleSlides: {
  role: Role;
  icon: typeof ShieldCheck;
  blurb: string;
}[] = [
  {
    role: "supervisor",
    icon: ClipboardCheck,
    blurb: "Evaluate interns and approve weekly journals in minutes.",
  },
  {
    role: "student",
    icon: FileText,
    blurb: "Submit weekly journals and track your practicum hours.",
  },
  {
    role: "coordinator",
    icon: ShieldCheck,
    blurb: "Manage the cohort, assign supervisors, and export reports.",
  },
];

const roleAccent: Record<Role, string> = {
  student: "from-sky-400/30 to-sky-600/20",
  supervisor: "from-amber-300/30 to-amber-500/20",
  coordinator: "from-emerald-300/30 to-emerald-500/20",
};

// ============================================================
// Login-page default theme — Azure Blue (default palette)
// ----------------------------------------
// The login page must NOT be affected by the coordinator-configured
// school theme (which SchoolThemeProvider writes onto :root). We
// re-assert the default Azure Blue palette as inline CSS variables
// on the login wrapper. CSS custom properties cascade, so an inline
// style on the login container overrides :root for everything inside
// the login screen — while the authenticated portal still reads the
// school theme from :root.
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
// Light / dark mode toggle — floating, top-right of login page
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
      className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-muted supports-[backdrop-filter]:bg-background/65"
    >
      {mounted && theme === "dark" ? (
        <Sun className="h-[18px] w-[18px]" strokeWidth={2.1} />
      ) : (
        <Moon className="h-[18px] w-[18px]" strokeWidth={2.1} />
      )}
    </button>
  );
}

// ============================================================
// Auto-scrolling role carousel
// ============================================================
function RoleCarousel() {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % roleSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div
      className="relative overflow-hidden rounded-md border border-white/10 bg-white/5 backdrop-blur-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide track */}
      <div
        className="flex transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {roleSlides.map(({ role, icon: Icon, blurb }, i) => (
          <div key={role} className="w-full shrink-0 px-5 py-5">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/12 ring-1 ring-white/20">
                <Icon className="h-5 w-5 text-[#ADE1FB]" strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-bold text-white">
                  {ROLE_LABELS[role]}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-white/70">
                  {blurb}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 pb-3.5">
        {roleSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index
                ? "w-6 bg-[#ADE1FB]"
                : "w-1.5 bg-white/30 hover:bg-white/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Hero slideshow — three cross-fading images on the brand panel.
// ----------------------------------------
// Uses plain <img> tags (NOT BlurImage) so there is no shimmer /
// placeholder flash on reload or first paint. All three images
// live in the DOM from the start with loading="eager", so the
// browser fetches them together and every later cross-fade is
// instant — no blank frame, no flicker.
//
// The fade is opacity-only (flat, simple, no slide/scale).
// Swap the files in /public (login-hero-1/2/3.png) to replace.
// ============================================================
const HERO_SLIDES = [
  "/login-hero-1.png",
  "/login-hero-2.png",
  "/login-hero-3.png",
] as const;

const HERO_FADE_MS = 1500;
const HERO_INTERVAL_MS = 6000;

function HeroSlideshow() {
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    HERO_SLIDES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % HERO_SLIDES.length);
    }, HERO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0">
      {HERO_SLIDES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          {...(i === 0 ? { fetchPriority: "high" as const } : {})}
          style={{
            transitionDuration: `${HERO_FADE_MS}ms`,
            transitionTimingFunction: "ease-in-out",
          }}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out",
            i === active ? "opacity-100" : "opacity-0"
          )}
        />
      ))}

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(15,37,115,0.88) 0%, rgba(15,37,115,0.55) 45%, rgba(15,37,115,0.30) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(4,29,86,0.72) 0%, rgba(4,29,86,0) 35%, rgba(4,29,86,0) 65%, rgba(4,29,86,0.40) 100%)",
        }}
      />
    </div>
  );
}

// ============================================================
// Left brand panel — shared by sign-in and register modes
// ============================================================
function BrandPanel() {
  return (
    <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-8 text-white md:flex lg:p-12">
      {/* Background — default navy gradient (login is never school-branded) */}
      <div className="bg-ici-navy-gradient absolute inset-0" />

      {/* Three cross-fading hero images (replace files in /public to swap) */}
      <HeroSlideshow />

      {/* Texture & glow on top of the photos */}
      <div className="bg-grid-texture pointer-events-none absolute inset-0 opacity-25" />
      <div className="bg-ici-dots pointer-events-none absolute left-8 top-8 h-24 w-24 opacity-40" />
      <div className="bg-ici-dots pointer-events-none absolute right-8 top-8 h-24 w-24 opacity-40" />
      <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[var(--blue-lightest)]/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />

      {/* Brand — compact product mark (no school name on login) */}
      <div className="relative">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <GraduationCap className="h-5 w-5 text-[var(--blue-lightest)]" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight tracking-tight">
              Practicum Management
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/55">
              Practo Portal
            </p>
          </div>
        </div>
      </div>

      {/* Motto + auto-scrolling role carousel */}
      <div className="relative max-w-md space-y-6">
        <div className="space-y-2.5">
          <h1 className="text-[2rem] font-extrabold leading-[1.1] tracking-tight">
            Practicum management,{" "}
            <span className="text-[var(--blue-lightest)]">simplified.</span>
          </h1>
          <p className="text-[14.5px] font-medium leading-relaxed text-white/85">
            One focused platform to evaluate interns, approve weekly journals,
            and export practicum accreditation reports.
          </p>
        </div>

        {/* Pale accent divider */}
        <div className="h-1 w-14 rounded-full bg-[var(--blue-lightest)]" />

        {/* Auto-scrolling role carousel */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
            Built for
          </p>
          <RoleCarousel />
        </div>
      </div>

      {/* User Agreement link */}
      <div className="relative">
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="text-xs font-medium text-white/60 transition-colors hover:text-white"
        >
          User Agreement
        </a>
      </div>
    </div>
  );
}

// ============================================================
// Mobile brand — shown on small screens (top of the right panel)
// ============================================================
function MobileBrand() {
  return (
    <div className="mb-7 flex items-center gap-2.5 md:hidden">
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-primary text-primary-foreground elev-sm">
        <GraduationCap className="h-5 w-5" strokeWidth={2.4} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-tight text-foreground">
          Practicum Management
        </p>
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Practo Portal
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Coordinator self-registration form
// Shown on the login page. Only coordinators can self-register —
// students and supervisors are still provisioned by a coordinator
// from inside the portal.
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
    <div className="w-full max-w-[400px]">
      <MobileBrand />

      <button
        onClick={onBackToSignIn}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </button>

      <div className="mb-6">
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <h2 className="text-[1.625rem] font-bold tracking-tight text-foreground">
          Create coordinator account
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          University staff who run the practicum program can register here.
          Students and supervisors are added by a coordinator after sign-in.
        </p>
      </div>

      {/* Info banner — explains the power of a coordinator account */}
      <div className="mb-5 flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-3.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Coordinator accounts have full access
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Coordinators can manage students, supervisors, and other
            coordinators, export reports, and configure practicum forms. Only
            register if you are an authorised university staff member.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reg-name" className="text-[13px] font-semibold">
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
            className="h-11"
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-email" className="text-[13px] font-semibold">
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
            className="h-11"
            autoComplete="email"
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-title" className="text-[13px] font-semibold">
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
            className="h-11"
            aria-invalid={!!errors.title}
          />
          {errors.title && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.title}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-[13px] font-semibold">
            Academic Department <span className="text-destructive">*</span>
          </Label>
          <Select
            value={department}
            onValueChange={(v) => {
              setDepartment(v);
              setErrors((p) => ({ ...p, department: "" }));
            }}
          >
            <SelectTrigger className="h-11 w-full" aria-invalid={!!errors.department}>
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
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errors.department}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="h-11 w-full">
          <UserPlus className="h-4 w-4" />
          Create Coordinator Account
        </Button>
      </form>

      <div className="mt-5 text-center">
        <p className="text-xs text-muted-foreground">
          Already have an account?{" "}
          <button
            onClick={onBackToSignIn}
            className="font-semibold text-foreground underline-offset-2 hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>

      {/* Mobile user agreement */}
      <div className="mt-6 text-center lg:hidden">
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          User Agreement
        </a>
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
            // Reset the form and return to the sign-in screen so the new
            // coordinator can immediately sign in with their credentials.
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
// Main login screen
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
        className="flex min-h-screen bg-background"
        style={LOGIN_DEFAULT_THEME_VARS}
      >
        <LoginThemeToggle />
        <BrandPanel />
        <div className="flex w-full flex-col items-center justify-center px-4 py-10 md:w-1/2">
          <CoordinatorRegisterForm
            onBackToSignIn={() => setMode("signin")}
          />
        </div>
      </div>
    );
  }

  // ---- Default sign-in mode ----
  return (
    <div
      className="flex min-h-screen bg-background"
      style={LOGIN_DEFAULT_THEME_VARS}
    >
      <LoginThemeToggle />

      {/* Left brand panel */}
      <BrandPanel />

      {/* Right form panel — clean flat white */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-10 md:w-1/2">
        <div className="w-full max-w-[400px]">
          <MobileBrand />

          <div className="mb-7">
            <h2 className="text-[1.625rem] font-bold tracking-tight text-foreground">
              Sign in to your account
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Use your <span className="font-medium text-foreground">email</span> as username and your{" "}
              <span className="font-medium text-foreground">User ID</span> as password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-semibold">
                Email <span className="font-normal text-muted-foreground">(username)</span>
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
                className="h-11"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] font-semibold">
                  Password <span className="font-normal text-muted-foreground">(your User ID)</span>
                </Label>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
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
                  className="h-11 pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Students: your student number · Supervisors: your EMP ID · Coordinators: your COORD ID
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="h-11 w-full">
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Account help — students/supervisors contact their coordinator.
              Coordinators can self-register via the link below. */}
          <div className="mt-5 space-y-2 text-center">
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <span className="font-medium text-foreground">
                Students &amp; supervisors: contact your practicum coordinator.
              </span>
            </p>
            <div className="flex items-center justify-center gap-2 text-xs">
              <span className="text-muted-foreground">University staff?</span>
              <button
                onClick={() => setMode("register")}
                className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-2 hover:underline"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Create a coordinator account
              </button>
            </div>
          </div>

          {/* Demo accounts */}
          <div className="mt-8">
            <div className="relative mb-4 text-center">
              <span className="relative z-10 inline-block bg-background px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Demo — explore as
              </span>
              <span className="absolute left-0 top-1/2 h-px w-full bg-border/70" />
            </div>
            <div className="space-y-2">
              {mockUsers.map((u) => {
                const isSelected = selectedRole === u.role;
                return (
                  <button
                    key={u.id}
                    onClick={() => quickFill(u.role)}
                    className={cn(
                      "group relative flex w-full items-center gap-3 rounded-md border bg-card p-3 text-left transition-all duration-200",
                      isSelected
                        ? "border-primary/50 ring-1 ring-primary/20 elev-sm"
                        : "border-border/70 hover:border-border hover:bg-muted/30 elev-xs"
                    )}
                  >
                    {/* Accent strip */}
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 w-1 rounded-l-md bg-gradient-to-b opacity-0 transition-opacity",
                        roleAccent[u.role],
                        isSelected && "opacity-100"
                      )}
                    />
                    <Avatar name={u.name} size="md" color={u.avatarColor} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {u.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ROLE_LABELS[u.role]}
                      </p>
                      {/* Show the User ID (password) so the demo is explorable. */}
                      <p className="mt-0.5 truncate text-[10.5px] font-medium text-muted-foreground/70">
                        ID: <span className="font-mono text-foreground/80">{u.idNumber ?? "—"}</span>
                      </p>
                    </div>
                    {isSelected ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    ) : (
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Pick an account to autofill — the User ID is filled in as your password.
            </p>
          </div>

          {/* Mobile user agreement */}
          <div className="mt-6 text-center lg:hidden">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              User Agreement
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
